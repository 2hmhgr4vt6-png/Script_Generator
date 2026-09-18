'use client'

import { Database, Shield, Sparkles, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { IntegrationsPanel } from '@/components/settings/integrations-panel'
import type { IntegrationState } from '@/lib/credentials/registry'
import type { Insights } from '@/lib/learning'
import { DURATIONS, LANGUAGES, PLATFORMS, TONES, type UserPreferences } from '@/lib/types'
import { apiFetch } from '@/lib/utils'

interface Integrations {
  demoMode: boolean
  database: string
  generatedKey: boolean
  states: IntegrationState[]
}

export function SettingsWorkspace({
  preferences,
  insights,
  integrations,
}: {
  preferences: UserPreferences
  insights: Insights
  integrations: Integrations
}) {
  const router = useRouter()
  const toast = useToast()

  const [prefs, setPrefs] = useState(preferences)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  async function updatePrefs(patch: Partial<UserPreferences>) {
    setSavingPrefs(true)
    const optimistic = { ...prefs, ...patch }
    setPrefs(optimistic)
    try {
      const result = await apiFetch<{ preferences: UserPreferences }>('/api/settings/preferences', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      setPrefs(result.preferences)
      toast.success('Settings saved')
      router.refresh()
    } catch (error) {
      setPrefs(preferences)
      toast.error('Could not save', (error as Error).message)
    } finally {
      setSavingPrefs(false)
    }
  }

  async function clearLearning() {
    setClearing(true)
    try {
      const result = await apiFetch<{ removed: number }>('/api/settings/learning', { method: 'DELETE' })
      toast.success(`Deleted ${result.removed} learning events`)
      setConfirmClear(false)
      router.refresh()
    } catch (error) {
      toast.error('Could not clear history', (error as Error).message)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Settings</h1>
        <p className="mt-1.5 text-sm text-muted">Integrations, studio defaults and your data.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <IntegrationsPanel
          initialStates={integrations.states}
          generatedKey={integrations.generatedKey}
          databaseDriver={integrations.database}
        />

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-accent" /> Studio defaults
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Default language">
                <Select
                  value={prefs.default_language}
                  disabled={savingPrefs}
                  onChange={(event) => updatePrefs({ default_language: event.target.value as UserPreferences['default_language'] })}
                >
                  {LANGUAGES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Default duration">
                <Select
                  value={String(prefs.default_duration)}
                  disabled={savingPrefs}
                  onChange={(event) => updatePrefs({ default_duration: Number(event.target.value) })}
                >
                  {DURATIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Default platform">
                <Select
                  value={prefs.default_platform}
                  disabled={savingPrefs}
                  onChange={(event) => updatePrefs({ default_platform: event.target.value as UserPreferences['default_platform'] })}
                >
                  {PLATFORMS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Default tone">
                <Select
                  value={prefs.default_tone}
                  disabled={savingPrefs}
                  onChange={(event) => updatePrefs({ default_tone: event.target.value as UserPreferences['default_tone'] })}
                >
                  {TONES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Problem discovery schedule"
                hint="Discovery runs when this app is running and the sources are connected."
                className="sm:col-span-2"
              >
                <Select
                  value={prefs.research_schedule}
                  disabled={savingPrefs}
                  onChange={(event) =>
                    updatePrefs({ research_schedule: event.target.value as UserPreferences['research_schedule'] })
                  }
                >
                  <option value="off">Manual refresh only</option>
                  <option value="daily">Daily</option>
                  <option value="every-6-hours">Every 6 hours</option>
                  <option value="custom">Custom (cron)</option>
                </Select>
              </Field>
              {prefs.research_schedule === 'custom' ? (
                <Field label="Cron expression" hint="Used by the scheduled job described in the README." className="sm:col-span-2">
                  <Input
                    defaultValue={prefs.research_schedule_cron ?? '0 */6 * * *'}
                    onBlur={(event) => updatePrefs({ research_schedule_cron: event.target.value })}
                  />
                </Field>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-accent" /> Preference learning
              </CardTitle>
              <Badge variant={prefs.learning_enabled ? 'success' : 'outline'}>
                {prefs.learning_enabled ? 'On' : 'Off'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs leading-relaxed text-muted">
                Bhasika counts what you actually do — topics, durations, hook styles, editing actions — and uses simple
                rules to suggest what to make next. This is rule-based counting, not machine learning, and nothing leaves
                your database.
              </p>
              <label className="flex items-center gap-2.5 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={prefs.learning_enabled}
                  onChange={(event) => updatePrefs({ learning_enabled: event.target.checked })}
                  className="h-4 w-4 rounded border-line bg-surface accent-[#FF8C00]"
                />
                Track my content preferences
              </label>

              {insights.enabled && insights.eventCount > 0 ? (
                <dl className="space-y-2 border-t border-line pt-3 text-xs">
                  <Row label="Events recorded" value={String(insights.eventCount)} />
                  <Row label="Favourite hook style" value={insights.favouriteHookStyle?.style ?? '—'} />
                  <Row label="Most used duration" value={insights.mostUsedDuration ? `${insights.mostUsedDuration.seconds}s` : '—'} />
                  {insights.suggestedCta ? (
                    <div className="pt-1">
                      <dt className="text-faint">Suggested CTA</dt>
                      <dd className="mt-1 text-muted">{insights.suggestedCta}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}

              <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                <Button variant="danger" size="sm" onClick={() => setConfirmClear(true)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete learning history
                </Button>
                <Link href="/privacy">
                  <Button variant="ghost" size="sm">
                    <Shield className="h-3.5 w-3.5" /> Privacy policy
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearLearning}
        title="Delete learning history?"
        description="Every recorded preference event for this account will be deleted. Your ideas, research and scripts are not affected."
        confirmLabel="Delete history"
        destructive
        loading={clearing}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-faint">{label}</span>
      <span className="capitalize text-ink">{value}</span>
    </div>
  )
}
