'use client'

import {
  Archive, CheckCheck, Copy, Download, History, Languages, Link2, RotateCcw, Save, Sparkles, Timer, Wand2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/input'
import { DemoBadge, ErrorState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { EDIT_ACTIONS, type ClaimCheck } from '@/lib/scripts/actions'
import { countWords, durationVerdict, estimateScriptSeconds, estimateSeconds, formatDuration } from '@/lib/scripts/duration'
import type { Language, Script, ScriptSection, ScriptVersion } from '@/lib/types'
import { DURATIONS, LANGUAGES, PLATFORMS, TONES } from '@/lib/types'
import { apiFetch, cn, formatRelative } from '@/lib/utils'

const SECTION_ORDER: ScriptSection['key'][] = ['hook', 'problem', 'solution', 'cta']

const VERIFICATION_VARIANT: Record<ClaimCheck['status'], 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  'verified-by-source': 'success',
  'needs-verification': 'warning',
  'conflicting-sources': 'danger',
  opinion: 'info',
  'not-enough-information': 'default',
}

interface Proposal {
  scope: 'section' | 'script'
  sectionKey?: ScriptSection['key']
  content?: string
  sections?: ScriptSection[]
  language?: Language
  durationSeconds?: number
  actionLabel: string
}

export function ScriptEditor({
  initialScript,
  initialVersions,
}: {
  initialScript: Script
  initialVersions: ScriptVersion[]
}) {
  const router = useRouter()
  const toast = useToast()

  const [script, setScript] = useState(initialScript)
  const [sections, setSections] = useState<ScriptSection[]>(initialScript.sections)
  const [title, setTitle] = useState(initialScript.title)
  const [versions, setVersions] = useState(initialVersions)
  const [activeSection, setActiveSection] = useState<ScriptSection['key']>('hook')
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [pendingScriptAction, setPendingScriptAction] = useState<{ action: string; label: string; language?: Language } | null>(null)
  const [claims, setClaims] = useState<ClaimCheck[] | null>(null)
  const [showVersions, setShowVersions] = useState(false)
  const sectionRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  const dirty = useMemo(
    () => JSON.stringify(sections) !== JSON.stringify(script.sections) || title !== script.title,
    [sections, script.sections, script.title, title],
  )

  const estimated = estimateScriptSeconds(sections, script.language)
  const words = sections.reduce((total, section) => total + countWords(section.content), 0)
  const verdict = durationVerdict(estimated, script.duration_seconds)

  useEffect(() => {
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const save = useCallback(
    async (patch: Partial<Script> = {}, label?: string) => {
      setSaving(true)
      setError(null)
      try {
        const result = await apiFetch<{ script: Script }>(`/api/scripts/${script.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ title, sections, version_label: label, ...patch }),
        })
        setScript(result.script)
        setSections(result.script.sections)
        setTitle(result.script.title)
        const fresh = await apiFetch<{ versions: ScriptVersion[] }>(`/api/scripts/${script.id}/versions`)
        setVersions(fresh.versions)
        toast.success('Saved')
        router.refresh()
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setSaving(false)
      }
    },
    [router, script.id, sections, title, toast],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault()
        if (dirty) void save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dirty, save])

  function updateSection(key: ScriptSection['key'], patch: Partial<ScriptSection>) {
    setSections((current) => current.map((section) => (section.key === key ? { ...section, ...patch } : section)))
  }

  async function runSectionAction(action: string, label: string) {
    setRunning(action)
    setError(null)
    try {
      const result = await apiFetch<{ content: string; section_key: ScriptSection['key'] }>(
        `/api/scripts/${script.id}/refine`,
        { method: 'POST', body: JSON.stringify({ action, section_key: activeSection }) },
      )
      setProposal({ scope: 'section', sectionKey: result.section_key, content: result.content, actionLabel: label })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRunning(null)
    }
  }

  async function runScriptAction(action: string, label: string, language?: Language) {
    // A whole-script rewrite replaces work in progress, so unsaved edits are confirmed first.
    if (dirty) {
      setPendingScriptAction({ action, label, language })
      return
    }
    await executeScriptAction(action, label, language)
  }

  async function executeScriptAction(action: string, label: string, language?: Language) {
    setRunning(action)
    setError(null)
    setPendingScriptAction(null)
    try {
      const result = await apiFetch<{
        sections: ScriptSection[]
        language: Language
        duration_seconds: number
      }>(`/api/scripts/${script.id}/refine`, {
        method: 'POST',
        body: JSON.stringify({ action, target_language: language }),
      })
      setProposal({
        scope: 'script',
        sections: result.sections,
        language: result.language,
        durationSeconds: result.duration_seconds,
        actionLabel: label,
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRunning(null)
    }
  }

  function acceptProposal() {
    if (!proposal) return
    if (proposal.scope === 'section' && proposal.sectionKey && proposal.content !== undefined) {
      updateSection(proposal.sectionKey, { content: proposal.content })
    } else if (proposal.sections) {
      setSections(proposal.sections)
      if (proposal.language && proposal.language !== script.language) {
        void save({ language: proposal.language, duration_seconds: proposal.durationSeconds })
      }
    }
    setProposal(null)
    toast.success('Applied', 'Remember to save.')
  }

  async function runFactCheck() {
    setRunning('fact-check')
    setError(null)
    try {
      const result = await apiFetch<{ claims: ClaimCheck[] }>(`/api/scripts/${script.id}/fact-check`, { method: 'POST' })
      setClaims(result.claims)
      toast.success(`Checked ${result.claims.length} claims`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRunning(null)
    }
  }

  async function restoreVersion(version: ScriptVersion) {
    setRunning('restore')
    try {
      const result = await apiFetch<{ script: Script }>(
        `/api/scripts/${script.id}/versions/${version.id}/restore`,
        { method: 'POST' },
      )
      setScript(result.script)
      setSections(result.script.sections)
      const fresh = await apiFetch<{ versions: ScriptVersion[] }>(`/api/scripts/${script.id}/versions`)
      setVersions(fresh.versions)
      setShowVersions(false)
      toast.success(`Restored version ${version.version}`)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRunning(null)
    }
  }

  async function copyToClipboard() {
    const text = sections.map((section) => `${section.heading.toUpperCase()}\n${section.content}`).join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Script copied')
    } catch {
      toast.error('Could not copy', 'Your browser blocked clipboard access.')
    }
  }

  async function duplicate() {
    try {
      const result = await apiFetch<{ script: Script }>(`/api/scripts/${script.id}/duplicate`, { method: 'POST' })
      router.push(`/scripts/${result.script.id}`)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const sectionActions = EDIT_ACTIONS.filter((action) => action.scope === 'section')
  const scriptActions = EDIT_ACTIONS.filter((action) => action.scope === 'script' && action.value !== 'translate')

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-label="Script title"
            className="w-full truncate rounded-lg border border-transparent bg-transparent px-2 py-1 text-xl font-semibold tracking-tight text-ink transition-colors hover:border-line focus:border-accent-border"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2 px-2">
            <Badge variant={script.status === 'ready' ? 'success' : 'default'}>{script.status}</Badge>
            <Badge variant="outline">{script.language === 'ne' ? 'Nepali' : 'English'}</Badge>
            <Badge variant="outline">v{script.version_count}</Badge>
            {script.is_demo ? <DemoBadge /> : null}
            <span className="text-[11px] text-faint">Updated {formatRelative(script.updated_at)}</span>
            {dirty ? <span className="text-[11px] text-warning">Unsaved changes</span> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => save()} loading={saving} disabled={!dirty}>
            <Save className="h-4 w-4" /> Save
          </Button>
          <Button variant="secondary" onClick={copyToClipboard}>
            <Copy className="h-4 w-4" /> Copy
          </Button>
          <a href={`/api/scripts/${script.id}/export?format=txt`}>
            <Button variant="ghost">
              <Download className="h-4 w-4" /> Export
            </Button>
          </a>
          <Button variant="ghost" onClick={duplicate}>
            <Copy className="h-4 w-4" /> Duplicate
          </Button>
          <Button variant="ghost" onClick={() => setShowVersions(true)}>
            <History className="h-4 w-4" /> Versions
          </Button>
        </div>
      </header>

      {error ? <ErrorState message={error} /> : null}

      <div className="grid gap-5 xl:grid-cols-[14rem_minmax(0,1fr)_20rem]">
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {SECTION_ORDER.map((key) => {
                const section = sections.find((s) => s.key === key)
                if (!section) return null
                const seconds = estimateSeconds(section.content, script.language)
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveSection(key)
                      sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      sectionRefs.current[key]?.focus()
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      activeSection === key ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-elevated hover:text-ink',
                    )}
                  >
                    <span>{section.heading}</span>
                    <span className="text-[11px] tabular-nums text-faint">{seconds}s</span>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-3.5 w-3.5 text-accent" /> Timing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-faint">Estimated</span>
                <span
                  className={cn(
                    'font-medium tabular-nums',
                    verdict === 'on-target' ? 'text-success' : verdict === 'long' ? 'text-danger' : 'text-warning',
                  )}
                >
                  {formatDuration(estimated)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-faint">Target</span>
                <span className="tabular-nums text-ink">{formatDuration(script.duration_seconds)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-faint">Word count</span>
                <span className="tabular-nums text-ink">{words}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-elevated">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    verdict === 'on-target' ? 'bg-success' : verdict === 'long' ? 'bg-danger' : 'bg-warning',
                  )}
                  style={{ width: `${Math.min(100, (estimated / Math.max(script.duration_seconds, 1)) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] leading-relaxed text-faint">
                {verdict === 'on-target'
                  ? 'On target for natural narration.'
                  : verdict === 'long'
                    ? 'Longer than the target. Trim wording, not facts.'
                    : 'Shorter than the target. There is room for an example.'}
              </p>
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-4">
          {SECTION_ORDER.map((key) => {
            const section = sections.find((s) => s.key === key)
            if (!section) return null
            return (
              <Card key={key} className={cn(activeSection === key && 'border-accent-border')}>
                <CardHeader>
                  <input
                    value={section.heading}
                    onChange={(event) => updateSection(key, { heading: event.target.value })}
                    aria-label={`${key} heading`}
                    className="rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-ink transition-colors hover:border-line focus:border-accent-border"
                  />
                  <span className="text-[11px] tabular-nums text-faint">
                    {countWords(section.content)} words · {estimateSeconds(section.content, script.language)}s
                  </span>
                </CardHeader>
                <CardContent>
                  <textarea
                    ref={(element) => {
                      sectionRefs.current[key] = element
                    }}
                    value={section.content}
                    onFocus={() => setActiveSection(key)}
                    onChange={(event) => updateSection(key, { content: event.target.value })}
                    rows={key === 'hook' || key === 'cta' ? 3 : 8}
                    className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-2.5 text-[15px] leading-7 text-ink placeholder:text-faint transition-colors hover:border-line-strong focus:border-accent-border"
                    placeholder={`Write the ${section.heading.toLowerCase()}…`}
                  />
                </CardContent>
              </Card>
            )
          })}

          {claims ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCheck className="h-3.5 w-3.5 text-accent" /> Fact check
                </CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setClaims(null)}>
                  Hide
                </Button>
              </CardHeader>
              <CardContent>
                {claims.length === 0 ? (
                  <p className="text-xs text-muted">No factual claims were identified in this script.</p>
                ) : (
                  <ul className="space-y-4">
                    {claims.map((claim, index) => (
                      <li key={index} className="border-b border-line pb-4 last:border-0 last:pb-0">
                        <p className="text-sm leading-relaxed text-ink">{claim.claim}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant={VERIFICATION_VARIANT[claim.status]}>{claim.status.replace(/-/g, ' ')}</Badge>
                          {claim.source ? (
                            <a
                              href={claim.source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
                            >
                              <Link2 className="h-3 w-3" /> Source
                            </a>
                          ) : null}
                        </div>
                        {claim.issue ? <p className="mt-2 text-xs leading-relaxed text-warning">{claim.issue}</p> : null}
                        {claim.suggestion ? (
                          <p className="mt-1.5 text-xs leading-relaxed text-muted">
                            <span className="text-faint">Suggested: </span>
                            {claim.suggestion}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-3.5 w-3.5 text-accent" /> AI tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-wider text-faint">
                  On “{sections.find((s) => s.key === activeSection)?.heading}”
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {sectionActions.map((action) => (
                    <Button
                      key={action.value}
                      size="sm"
                      variant="outline"
                      loading={running === action.value}
                      disabled={running !== null}
                      onClick={() => runSectionAction(action.value, action.label)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="border-t border-line pt-3">
                <p className="mb-2 text-[11px] uppercase tracking-wider text-faint">Whole script</p>
                <div className="flex flex-wrap gap-1.5">
                  {scriptActions.map((action) => (
                    <Button
                      key={action.value}
                      size="sm"
                      variant="outline"
                      loading={running === action.value}
                      disabled={running !== null}
                      onClick={() => runScriptAction(action.value, action.label)}
                    >
                      {action.label}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    loading={running === 'translate'}
                    disabled={running !== null}
                    onClick={() =>
                      runScriptAction('translate', 'Translate Script', script.language === 'ne' ? 'en' : 'ne')
                    }
                  >
                    <Languages className="h-3.5 w-3.5" />
                    Translate to {script.language === 'ne' ? 'English' : 'Nepali'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={running === 'fact-check'}
                    disabled={running !== null}
                    onClick={runFactCheck}
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Fact Check This Script
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Script settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="field-label">Status</label>
                <Select
                  value={script.status}
                  onChange={(event) => save({ status: event.target.value as Script['status'] })}
                >
                  <option value="draft">Draft</option>
                  <option value="ready">Ready</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </Select>
              </div>
              <div>
                <label className="field-label">Target duration</label>
                <Select
                  value={String(script.duration_seconds)}
                  onChange={(event) => save({ duration_seconds: Number(event.target.value) })}
                >
                  {DURATIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                  {!DURATIONS.some((d) => d.value === script.duration_seconds) ? (
                    <option value={script.duration_seconds}>{script.duration_seconds} seconds</option>
                  ) : null}
                </Select>
              </div>
              <div>
                <label className="field-label">Language</label>
                <Select value={script.language} onChange={(event) => save({ language: event.target.value as Language })}>
                  {LANGUAGES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
                <p className="mt-1.5 text-[11px] text-faint">
                  Changing this relabels the script. Use “Translate” to rewrite the text.
                </p>
              </div>
              <div>
                <label className="field-label">Platform</label>
                <Select value={script.platform} onChange={(event) => save({ platform: event.target.value as Script['platform'] })}>
                  {PLATFORMS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="field-label">Tone</label>
                <Select value={script.tone} onChange={(event) => save({ tone: event.target.value as Script['tone'] })}>
                  {TONES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5 border-t border-line pt-3 text-xs">
                <Row label="Audience" value={script.audience.replace(/-/g, ' ')} />
                <Row label="Content type" value={script.content_type.replace(/-/g, ' ')} />
                <Row label="Hook style" value={script.hook_style?.replace(/-/g, ' ') ?? '—'} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Research sources</CardTitle>
              <span className="text-[11px] text-faint">{script.sources.length}</span>
            </CardHeader>
            <CardContent>
              {script.sources.length === 0 ? (
                <p className="text-xs leading-relaxed text-muted">
                  No sources attached. Anything factual in this script should be checked before publishing.
                </p>
              ) : (
                <ul className="space-y-2">
                  {script.sources.map((source, index) => (
                    <li key={index}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg border border-line bg-surface px-3 py-2 transition-colors hover:border-accent-border"
                      >
                        <p className="truncate text-xs text-ink">{source.title}</p>
                        <p className="mt-0.5 truncate text-[11px] text-faint">{source.url}</p>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {script.problem_id ? (
                <Link href={`/problems/${script.problem_id}`} className="mt-3 block">
                  <Button size="sm" variant="ghost" className="w-full">
                    View the original problem
                  </Button>
                </Link>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog
        open={Boolean(proposal)}
        onClose={() => setProposal(null)}
        title={proposal?.actionLabel ?? 'Proposed rewrite'}
        description={
          proposal?.scope === 'script'
            ? 'Review the rewritten script before it replaces what is in the editor.'
            : 'Review the rewritten section before it replaces what is in the editor.'
        }
        className="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setProposal(null)}>
              Discard
            </Button>
            <Button variant="primary" onClick={acceptProposal}>
              Apply
            </Button>
          </>
        }
      >
        <div className="max-h-[50vh] space-y-4 overflow-y-auto">
          {proposal?.scope === 'section' ? (
            <p className="prose-script">{proposal.content}</p>
          ) : (
            proposal?.sections?.map((section) => (
              <div key={section.key}>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-faint">{section.heading}</p>
                <p className="prose-script">{section.content}</p>
              </div>
            ))
          )}
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingScriptAction)}
        onClose={() => setPendingScriptAction(null)}
        onConfirm={() => {
          if (pendingScriptAction) {
            void executeScriptAction(pendingScriptAction.action, pendingScriptAction.label, pendingScriptAction.language)
          }
        }}
        title="You have unsaved edits"
        description={`"${pendingScriptAction?.label ?? ''}" rewrites the whole script. Your unsaved edits will be sent for rewriting, and you will still be able to review the result before it replaces the editor.`}
        confirmLabel="Continue"
      />

      <Dialog
        open={showVersions}
        onClose={() => setShowVersions(false)}
        title="Version history"
        description={`${versions.length} version${versions.length === 1 ? '' : 's'} saved for this script.`}
        className="max-w-xl"
      >
        <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
          {versions.map((version) => (
            <li
              key={version.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink">
                  Version {version.version} · {version.label}
                </p>
                <p className="mt-0.5 text-[11px] text-faint">{formatRelative(version.created_at)}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => restoreVersion(version)}
                loading={running === 'restore'}
                disabled={version.version === script.version_count}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restore
              </Button>
            </li>
          ))}
        </ul>
      </Dialog>
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
