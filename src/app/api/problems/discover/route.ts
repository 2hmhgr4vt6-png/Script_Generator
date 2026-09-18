import type { NextRequest } from 'next/server'
import { apiHandler } from '@/lib/api'
import { requireApiUser } from '@/lib/auth/guard'
import { recordEvent } from '@/lib/learning'
import { discoverProblems } from '@/lib/research/problems'
import { discoverSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const user = await requireApiUser()
    const body = discoverSchema.parse(await request.json().catch(() => ({})))
    const outcome = await discoverProblems({
      userId: user.id,
      keyword: body.keyword,
      sources: body.sources,
      limit: body.limit,
    })
    await recordEvent(user.id, 'problem.saved', { count: outcome.problems.length, demo: outcome.isDemo })
    return outcome
  })
}
