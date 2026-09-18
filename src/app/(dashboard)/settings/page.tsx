import type { Metadata } from 'next'
import { SettingsWorkspace } from '@/components/settings/settings-workspace'
import { aiStatus } from '@/lib/ai'
import { requirePageUser } from '@/lib/auth/guard'
import { ensurePreferences } from '@/lib/auth/service'
import { getStore } from '@/lib/db'
import { isDemoMode } from '@/lib/env'
import { getInsights } from '@/lib/learning'
import { searchStatus } from '@/lib/search'
import { socialStatuses } from '@/lib/social'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await requirePageUser()
  const [prefs, insights, store] = await Promise.all([
    ensurePreferences(user.id),
    getInsights(user.id),
    getStore(),
  ])

  return (
    <SettingsWorkspace
      user={{ email: user.email, name: user.name }}
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
