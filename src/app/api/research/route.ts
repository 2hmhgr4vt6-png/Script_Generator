import type { NextRequest } from 'next/server'
import { apiHandler } from '@/lib/api'
import { currentWorkspace } from '@/lib/user'
import { getIdea, listResearchSessions } from '@/lib/data'
import { recordEvent } from '@/lib/learning'
import { runResearch } from '@/lib/research/engine'
import { researchSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET() {
  return apiHandler(async () => {
    const user = await currentWorkspace()
    return { sessions: await listResearchSessions(user.id) }
  })
}

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const user = await currentWorkspace()
    const body = researchSchema.parse(await request.json())
    const idea = body.idea_id ? await getIdea(user.id, body.idea_id) : null

    const outcome = await runResearch({
      userId: user.id,
      text: body.text,
      idea,
      includeCommunity: body.include_community,
    })
    await recordEvent(user.id, 'research.run', { provider: outcome.session.provider, demo: outcome.session.is_demo })

    return outcome
  })
}
