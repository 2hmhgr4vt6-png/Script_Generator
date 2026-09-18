import { apiHandler } from '@/lib/api'
import { aiStatus } from '@/lib/ai'
import { currentWorkspace } from '@/lib/user'
import { getStore } from '@/lib/db'
import { isDemoMode } from '@/lib/env'
import { searchStatus } from '@/lib/search'
import { socialStatuses } from '@/lib/social'
import type { ScheduledSync } from '@/lib/types'

export const dynamic = 'force-dynamic'

/** Integration status. Never returns key values — only whether one is present. */
export async function GET() {
  return apiHandler(async () => {
    const user = await currentWorkspace()
    const store = await getStore()
    const syncs = await store.list<ScheduledSync>('scheduled_syncs', {
      where: { user_id: user.id },
      orderBy: 'updated_at',
      limit: 5,
    })

    return {
      demoMode: isDemoMode(),
      database: store.driver,
      ai: aiStatus(),
      search: searchStatus(),
      social: socialStatuses(),
      lastSync: syncs[0] ?? null,
    }
  })
}
