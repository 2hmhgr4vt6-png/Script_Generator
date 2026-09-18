import { apiHandler } from '@/lib/api'
import { requireApiUser } from '@/lib/auth/guard'
import { clearLearningData, getInsights } from '@/lib/learning'

export const dynamic = 'force-dynamic'

export async function GET() {
  return apiHandler(async () => {
    const user = await requireApiUser()
    return { insights: await getInsights(user.id) }
  })
}

/** Deletes every behaviour event for this account. */
export async function DELETE() {
  return apiHandler(async () => {
    const user = await requireApiUser()
    const removed = await clearLearningData(user.id)
    return { ok: true, removed }
  })
}
