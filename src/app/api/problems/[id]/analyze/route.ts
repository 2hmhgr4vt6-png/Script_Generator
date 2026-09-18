import type { NextRequest } from 'next/server'
import { AppError, apiHandler } from '@/lib/api'
import { currentWorkspace } from '@/lib/user'
import { getProblem } from '@/lib/data'
import { getStore, now } from '@/lib/db'
import { analyseProblem } from '@/lib/research/problems'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  return apiHandler(async () => {
    const user = await currentWorkspace()
    const problem = await getProblem(user.id, params.id)
    if (!problem) throw new AppError('That problem was not found.', 404, 'not_found')

    const result = await analyseProblem(problem)
    const store = await getStore()
    const updated = await store.update('audience_problems', params.id, {
      analysis: result.analysis,
      related_questions: result.relatedQuestions,
      updated_at: now(),
    })
    return { problem: updated, isDemo: result.isDemo }
  })
}
