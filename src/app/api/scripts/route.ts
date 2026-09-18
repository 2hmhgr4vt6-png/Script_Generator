import type { NextRequest } from 'next/server'
import { apiHandler } from '@/lib/api'
import { requireApiUser } from '@/lib/auth/guard'
import { getProblem, listScripts } from '@/lib/data'
import { getStore, newId, now } from '@/lib/db'
import { recordEvent } from '@/lib/learning'
import { classifyCategory } from '@/lib/research/classify'
import { generateScript } from '@/lib/scripts/generate'
import type { ResearchSession, ResearchSource, Script, ScriptVersion } from '@/lib/types'
import { generateSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    const user = await requireApiUser()
    const params = request.nextUrl.searchParams
    return {
      scripts: await listScripts(user.id, {
        q: params.get('q') ?? undefined,
        language: params.get('language') ?? undefined,
        category: params.get('category') ?? undefined,
        platform: params.get('platform') ?? undefined,
        status: params.get('status') ?? undefined,
        duration: params.get('duration') ?? undefined,
      }),
    }
  })
}

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const user = await requireApiUser()
    const body = generateSchema.parse(await request.json())
    const store = await getStore()

    const problem = body.problem_id ? await getProblem(user.id, body.problem_id) : null

    let sources: ResearchSource[] = []
    let researchSummary = ''
    if (body.research_session_id) {
      const session = await store.get<ResearchSession>('research_sessions', body.research_session_id)
      if (session && session.user_id === user.id) {
        researchSummary = session.summary
        sources = await store.list<ResearchSource>('research_sources', {
          where: { session_id: session.id },
          orderBy: 'relevance',
          limit: 20,
        })
      }
    }
    if (body.source_ids?.length) {
      sources = sources.filter((s) => body.source_ids!.includes(s.id))
    } else {
      const selected = sources.filter((s) => s.selected)
      if (selected.length) sources = selected
    }
    sources = sources.slice(0, 10)

    const generated = await generateScript({
      idea: {
        raw_text: body.raw_text,
        language: body.language,
        duration_seconds: body.duration_seconds,
        platform: body.platform,
        content_type: body.content_type,
        audience: body.audience,
        audience_custom: body.audience_custom ?? null,
        tone: body.tone,
      },
      problem,
      sources,
      hook: body.hook ?? null,
      researchSummary,
    })

    const script: Script = {
      id: newId(),
      user_id: user.id,
      idea_id: body.idea_id ?? null,
      problem_id: body.problem_id ?? null,
      research_session_id: body.research_session_id ?? null,
      title: generated.title,
      language: body.language,
      duration_seconds: body.duration_seconds,
      platform: body.platform,
      category: body.category === 'other' ? classifyCategory(body.raw_text) : body.category,
      content_type: body.content_type,
      audience: body.audience,
      tone: body.tone,
      hook_style: body.hook?.style ?? null,
      sections: generated.sections,
      sources: sources.map((s) => ({ title: s.title, url: s.url })),
      status: 'draft',
      is_demo: generated.isDemo,
      version_count: 1,
      created_at: now(),
      updated_at: now(),
    }
    await store.insert('scripts', script)

    const version: ScriptVersion = {
      id: newId(),
      script_id: script.id,
      user_id: user.id,
      version: 1,
      sections: generated.sections,
      label: 'Generated',
      created_at: now(),
    }
    await store.insert('script_versions', version)

    if (problem) {
      await store.update('audience_problems', problem.id, { status: 'script-created', updated_at: now() })
    }
    if (body.hook) await recordEvent(user.id, 'hook.selected', { style: body.hook.style })
    await recordEvent(user.id, 'script.generated', {
      category: script.category,
      language: script.language,
      duration: script.duration_seconds,
      demo: script.is_demo,
    })

    return { script }
  })
}
