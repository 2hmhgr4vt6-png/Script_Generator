import { apiHandler } from '@/lib/api'
import { currentWorkspace } from '@/lib/user'
import { clearLearningData, getInsights } from '@/lib/learning'

export const dynamic = 'force-dynamic'

export async function GET() {
  return apiHandler(async () => {
    const user = await currentWorkspace()
    return { insights: await getInsights(user.id) }
  })
}

/** Deletes every behaviour event for this account. */
export async function DELETE() {
  return apiHandler(async () => {
    const user = await currentWorkspace()
    const removed = await clearLearningData(user.id)
    return { ok: true, removed }
  })
}
