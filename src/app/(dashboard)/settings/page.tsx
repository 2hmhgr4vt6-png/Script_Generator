import type { Metadata } from 'next'
import { SettingsWorkspace } from '@/components/settings/settings-workspace'
import { credentialsHealth, integrationStates, isDemoMode } from '@/lib/credentials'
import { ensurePreferences, currentWorkspace } from '@/lib/user'
import { getStore } from '@/lib/db'
import { getInsights } from '@/lib/learning'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await currentWorkspace()
  const [prefs, insights, store, states, health, demoMode] = await Promise.all([
    ensurePreferences(user.id),
    getInsights(user.id),
    getStore(),
    integrationStates(user.id),
    credentialsHealth(),
    isDemoMode(),
  ])

  return (
    <SettingsWorkspace
      preferences={prefs}
      insights={insights}
      integrations={{
        demoMode,
        database: store.driver,
        generatedKey: health.generatedKey,
        states,
      }}
    />
  )
}
