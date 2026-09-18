import type { NextRequest } from 'next/server'
import { apiHandler } from '@/lib/api'
import { currentWorkspace } from '@/lib/user'
import { getProblem } from '@/lib/data'
import { getStore } from '@/lib/db'
import { generateHooks } from '@/lib/scripts/hooks'
import type { ResearchSource } from '@/lib/types'
import { hookSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const maxDuration = 90

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const user = await currentWorkspace()
    const body = hookSchema.parse(await request.json())
    const store = await getStore()

    const problem = body.problem_id ? await getProblem(user.id, body.problem_id) : null
    const sources = body.research_session_id
      ? (await store.list<ResearchSource>('research_sources', {
          where: { session_id: body.research_session_id, user_id: user.id },
          orderBy: 'relevance',
          limit: 10,
        }))
      : []

    const outcome = await generateHooks({
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
      sources: sources.filter((s) => s.selected).length ? sources.filter((s) => s.selected) : sources,
    })
    return outcome
  })
}
