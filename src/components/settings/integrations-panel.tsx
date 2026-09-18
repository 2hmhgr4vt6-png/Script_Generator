'use client'

import { AlertTriangle, CheckCircle2, ExternalLink, KeyRound, Plug, Trash2, Zap } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/input'
import { ErrorState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { INTEGRATIONS, type IntegrationSpec, type IntegrationState } from '@/lib/credentials/registry'
import { apiFetch, cn, formatRelative } from '@/lib/utils'

const GROUP_LABEL = {
  ai: 'AI provider',
  search: 'Web search',
  social: 'Social sources',
} as const

export function IntegrationsPanel({
  initialStates,
  generatedKey,
  databaseDriver,
}: {
  initialStates: IntegrationState[]
  generatedKey: boolean
  databaseDriver: string
}) {
  const toast = useToast()
  const [states, setStates] = useState(initialStates)
  const [editing, setEditing] = useState<IntegrationSpec | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [removing, setRemoving] = useState<IntegrationSpec | null>(null)
  const [error, setError] = useState<string | null>(null)

  function stateFor(id: string): IntegrationState | undefined {
    return states.find((state) => state.id === id)
  }

  function openEditor(spec: IntegrationSpec) {
    const state = stateFor(spec.id)
    const initial: Record<string, string> = {}
    for (const field of spec.fields) {
      // Secrets start empty — they are never sent back to the browser. Visible
      // fields prefill with what is in use so editing one does not clear it.
      initial[field.key] = field.secret ? '' : (state?.values[field.key]?.preview ?? '')
    }
    setDraft(initial)
    setError(null)
    setEditing(spec)
  }

  async function save() {
    if (!editing) return
    const state = stateFor(editing.id)
    const missing = editing.fields.filter(
      (field) => field.required && !draft[field.key]?.trim() && !state?.values[field.key]?.set,
    )
    if (missing.length) {
      setError(`${missing.map((field) => field.label).join(' and ')} required.`)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const result = await apiFetch<{ integrations: IntegrationState[] }>('/api/settings/integrations', {
        method: 'PUT',
        body: JSON.stringify({ provider: editing.id, fields: draft }),
      })
      setStates(result.integrations)
      toast.success(`${editing.label} saved`, 'Run Test to confirm the credentials work.')
      setEditing(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function test(spec: IntegrationSpec) {
    setTesting(spec.id)
    try {
      const result = await apiFetch<{ ok: boolean; message: string }>(
        `/api/settings/integrations/${spec.id}/test`,
        { method: 'POST' },
      )
      const fresh = await apiFetch<{ integrations: IntegrationState[] }>('/api/settings/integrations')
      setStates(fresh.integrations)
      if (result.ok) toast.success(`${spec.label} works`, result.message)
      else toast.error(`${spec.label} test failed`, result.message)
    } catch (err) {
      toast.error(`${spec.label} test failed`, (err as Error).message)
    } finally {
      setTesting(null)
    }
  }

  async function remove() {
    if (!removing) return
    setSaving(true)
    try {
      const result = await apiFetch<{ integrations: IntegrationState[] }>('/api/settings/integrations', {
        method: 'DELETE',
        body: JSON.stringify({ provider: removing.id }),
      })
      setStates(result.integrations)
      toast.success(`${removing.label} credentials removed`)
      setRemoving(null)
    } catch (err) {
      toast.error('Could not remove', (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const groups: IntegrationSpec['group'][] = ['ai', 'search', 'social']

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-3.5 w-3.5 text-accent" /> API keys
        </CardTitle>
        <span className="text-[11px] text-faint">
          {states.filter((state) => state.connected).length} of {states.length} connected
        </span>
      </CardHeader>
      <CardContent className="space-y-5">
        {groups.map((group) => (
          <div key={group}>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-faint">{GROUP_LABEL[group]}</p>
            <div className="space-y-2">
              {INTEGRATIONS.filter((spec) => spec.group === group).map((spec) => {
                const state = stateFor(spec.id)
                const connected = state?.connected ?? false
                return (
                  <div key={spec.id} className="rounded-lg border border-line bg-surface px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn('h-1.5 w-1.5 rounded-full', connected ? 'bg-success' : 'bg-faint')}
                          aria-hidden
                        />
                        <p className="text-xs font-medium text-ink">{spec.label}</p>
                        {state?.origin === 'env' ? (
                          <Badge variant="outline" title="Value comes from an environment variable">
                            from env
                          </Badge>
                        ) : null}
                        {state?.lastTestStatus === 'ok' ? (
                          <Badge variant="success">
                            <CheckCircle2 className="h-3 w-3" /> Verified
                          </Badge>
                        ) : state?.lastTestStatus === 'failed' ? (
                          <Badge variant="danger">
                            <AlertTriangle className="h-3 w-3" /> Test failed
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEditor(spec)}>
                          <KeyRound className="h-3.5 w-3.5" /> {connected ? 'Update' : 'Add key'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!connected || testing !== null}
                          loading={testing === spec.id}
                          onClick={() => test(spec)}
                        >
                          <Zap className="h-3.5 w-3.5" /> Test
                        </Button>
                        {state?.origin === 'stored' ? (
                          <Button size="sm" variant="ghost" aria-label={`Remove ${spec.label}`} onClick={() => setRemoving(spec)}>
                            <Trash2 className="h-3.5 w-3.5 text-danger" />
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{spec.summary}</p>

                    {connected ? (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {spec.fields
                          .filter((field) => state?.values[field.key]?.set)
                          .map((field) => (
                            <code
                              key={field.key}
                              className="rounded border border-line bg-card px-1.5 py-0.5 text-[10px] text-faint"
                            >
                              {field.label}: {state?.values[field.key]?.preview}
                            </code>
                          ))}
                      </div>
                    ) : null}

                    {state?.lastTestMessage ? (
                      <p
                        className={cn(
                          'mt-2 text-[11px] leading-relaxed',
                          state.lastTestStatus === 'ok' ? 'text-success' : 'text-danger',
                        )}
                      >
                        {state.lastTestMessage}
                        {state.lastTestedAt ? (
                          <span className="text-faint"> · {formatRelative(state.lastTestedAt)}</span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div className="rounded-lg border border-line bg-surface px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
            <p className="text-xs font-medium text-ink">Database</p>
            <Badge variant="success">Connected</Badge>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
            {databaseDriver === 'postgres'
              ? 'Postgres / Supabase connected.'
              : 'Local JSON store (development). Set DATABASE_URL to use Postgres or Supabase.'}
          </p>
        </div>

        <div className="space-y-2 border-t border-line pt-3 text-[11px] leading-relaxed text-faint">
          <p>
            Keys are encrypted with AES-256-GCM before they are stored, and are never sent back to the browser — only
            the last four characters are shown. Environment variables still work and are used when nothing is stored
            here.
          </p>
          {generatedKey ? (
            <p className="text-warning">
              The encryption key was generated locally and saved to <code>data/credentials.key</code>. That is fine on
              one machine, but set <code>CREDENTIALS_SECRET</code> before deploying — otherwise stored keys become
              unreadable on redeploy or across instances.
            </p>
          ) : null}
          <p className="text-warning">
            This studio has no sign-in, so anyone who can reach it can use these keys. Keep it on localhost or behind
            your own access control.
          </p>
        </div>
      </CardContent>

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `${editing.label} credentials` : ''}
        description={editing?.caveat ?? editing?.summary}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} loading={saving}>
              Save
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="space-y-4">
            {editing.fields.map((field) => {
              const existing = stateFor(editing.id)?.values[field.key]
              const hint = field.secret && existing?.set
                ? `Currently ${existing.preview}${existing.origin === 'env' ? ' (from environment)' : ''}. Leave blank to keep it.`
                : field.help
              return (
                <Field key={field.key} label={field.label} hint={hint}>
                  {field.options ? (
                    <Select
                      value={draft[field.key] ?? field.options[0].value}
                      onChange={(event) => setDraft((d) => ({ ...d, [field.key]: event.target.value }))}
                    >
                      {field.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      type={field.secret ? 'password' : 'text'}
                      value={draft[field.key] ?? ''}
                      onChange={(event) => setDraft((d) => ({ ...d, [field.key]: event.target.value }))}
                      placeholder={field.placeholder}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  )}
                </Field>
              )
            })}

            {error ? <ErrorState message={error} /> : null}

            <a
              href={editing.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] text-accent hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Where to get this key
            </a>
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        title={`Remove ${removing?.label ?? ''} credentials?`}
        description="The stored keys are deleted. If the same variables are set in the environment, those take over again."
        confirmLabel="Remove"
        destructive
        loading={saving}
      />
    </Card>
  )
}
