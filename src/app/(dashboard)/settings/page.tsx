import type { Metadata } from 'next'
import { SettingsWorkspace } from '@/components/settings/settings-workspace'
import { aiStatus } from '@/lib/ai'
import { currentWorkspace, ensurePreferences } from '@/lib/user'
import { getStore } from '@/lib/db'
import { isDemoMode } from '@/lib/env'
import { getInsights } from '@/lib/learning'
import { searchStatus } from '@/lib/search'
import { socialStatuses } from '@/lib/social'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await currentWorkspace()
  const [prefs, insights, store] = await Promise.all([
    ensurePreferences(user.id),
    getInsights(user.id),
    getStore(),
  ])

  return (
    <SettingsWorkspace
      preferences={prefs}
      insights={insights}
      integrations={{
        demoMode: isDemoMode(),
        database: store.driver,
        ai: aiStatus(),
        search: searchStatus(),
        social: socialStatuses(),
      }}
    />
  )
}
