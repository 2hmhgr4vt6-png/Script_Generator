'use client'

import { ArrowRight, ExternalLink, FileText, Sparkles, Wand2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { IdeaFields, PLACEHOLDER, type IdeaFormValues } from '@/components/ideas/idea-form'
import { HookCards } from '@/components/scripts/hook-cards'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DemoBadge, ErrorState, Skeleton } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { estimateSeconds, formatDuration, targetWordCount } from '@/lib/scripts/duration'
import type {
  AudienceProblem, HookOption, Idea, Language, Platform, ResearchSession, ResearchSource, Script, Tone,
} from '@/lib/types'
import { apiFetch, cn } from '@/lib/utils'

interface Props {
  idea: Idea | null
  problem: AudienceProblem | null
  session: ResearchSession | null
  sources: ResearchSource[]
  preselectedSourceIds: string[]
  angle: string | null
  defaults: { language: Language; duration: number; platform: Platform; tone: Tone }
}

const STEPS = ['Brief', 'Hook', 'Script'] as const

export function ScriptWizard({ idea, problem, session, sources, preselectedSourceIds, angle, defaults }: Props) {
  const router = useRouter()
  const toast = useToast()

  const seedText = [idea?.raw_text, problem ? `${problem.title}\n\n${problem.excerpt}` : null, angle]
    .filter(Boolean)
    .join('\n\n')

  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [values, setValues] = useState<IdeaFormValues>({
    raw_text: seedText,
    category: idea?.category ?? problem?.category ?? 'other',
    language: idea?.language ?? defaults.language,
    duration_seconds: idea?.duration_seconds ?? defaults.duration,
    custom_duration: '',
    content_type: idea?.content_type ?? 'educational',
    audience: idea?.audience ?? 'nepali-students',
    audience_custom: idea?.audience_custom ?? '',
    platform: idea?.platform ?? defaults.platform,
    tone: idea?.tone ?? defaults.tone,
  })
  const [selectedSources, setSelectedSources] = useState<string[]>(
    preselectedSourceIds.length ? preselectedSourceIds : sources.filter((s) => s.selected).map((s) => s.id),
  )
  const [hooks, setHooks] = useState<HookOption[]>([])
  const [hooksAreDemo, setHooksAreDemo] = useState(false)
  const [selectedHook, setSelectedHook] = useState<HookOption | null>(null)
  const [loading, setLoading] = useState<'hooks' | 'script' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const targetWords = targetWordCount(values.duration_seconds, values.language)

  function patch(next: Partial<IdeaFormValues>) {
    setValues((current) => ({ ...current, ...next }))
  }

  function brief() {
    return {
      idea_id: idea?.id ?? null,
      problem_id: problem?.id ?? null,
      research_session_id: session?.id ?? null,
      raw_text: values.raw_text.trim(),
      language: values.language,
      duration_seconds: values.duration_seconds,
      platform: values.platform,
      content_type: values.content_type,
      audience: values.audience,
      audience_custom: values.audience === 'custom' ? values.audience_custom : null,
      tone: values.tone,
    }
  }

  async function generateHooks() {
    if (values.raw_text.trim().length < 5) {
      setError('Add the idea or problem you want this script to answer.')
      return
    }
    setError(null)
    setLoading('hooks')
    try {
      const result = await apiFetch<{ hooks: HookOption[]; isDemo: boolean }>('/api/hooks', {
        method: 'POST',
        body: JSON.stringify(brief()),
      })
      setHooks(result.hooks)
      setHooksAreDemo(result.isDemo)
      setSelectedHook(result.hooks.find((hook) => hook.recommended) ?? result.hooks[0] ?? null)
      setStep(1)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(null)
    }
  }

  async function generateScript(withHook: HookOption | null) {
    setError(null)
    setLoading('script')
    setStep(2)
    try {
      const result = await apiFetch<{ script: Script }>('/api/scripts', {
        method: 'POST',
        body: JSON.stringify({
          ...brief(),
          category: values.category,
          hook: withHook,
          source_ids: selectedSources,
        }),
      })
      toast.success('Script generated', result.script.is_demo ? 'Sample script — connect an AI provider for live generation.' : undefined)
      router.push(`/scripts/${result.script.id}`)
    } catch (err) {
      setError((err as Error).message)
      setLoading(null)
      setStep(1)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Script Studio</h1>
          <p className="mt-1.5 text-sm text-muted">
            {problem ? 'Answering a real question from your audience.' : 'Turn the brief into a script people finish watching.'}
          </p>
        </div>
        <ol className="flex items-center gap-2">
          {STEPS.map((label, index) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium',
                  index === step ? 'bg-accent text-black' : index < step ? 'bg-accent-soft text-accent' : 'border border-line text-faint',
                )}
              >
                {index + 1}
              </span>
              <span className={cn('text-xs', index === step ? 'text-ink' : 'text-faint')}>{label}</span>
              {index < STEPS.length - 1 ? <span className="text-faint">·</span> : null}
            </li>
          ))}
        </ol>
      </header>

      {error ? <ErrorState message={error} /> : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {step === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Brief</CardTitle>
                <span className="text-[11px] text-faint">~{targetWords} words target</span>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="field-label">Idea / problem this script answers</label>
                  <textarea
                    value={values.raw_text}
                    onChange={(event) => patch({ raw_text: event.target.value })}
                    placeholder={PLACEHOLDER}
                    rows={6}
                    className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-2.5 text-sm leading-relaxed text-ink placeholder:text-faint transition-colors hover:border-line-strong focus:border-accent-border"
                  />
                </div>
                <IdeaFields values={values} onChange={patch} compact />
                <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                  <Button variant="primary" onClick={generateHooks} loading={loading === 'hooks'}>
                    <Wand2 className="h-4 w-4" /> Generate hooks
                  </Button>
                  <Button variant="secondary" onClick={() => generateScript(null)} loading={loading === 'script'}>
                    <Sparkles className="h-4 w-4" /> Skip hooks and generate
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 1 ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Choose the hook</CardTitle>
                  <p className="mt-1 text-xs text-muted">3-5 seconds. It has to make the viewer think &ldquo;that is exactly my problem&rdquo;.</p>
                </div>
                {hooksAreDemo ? <DemoBadge /> : null}
              </CardHeader>
              <CardContent className="space-y-4">
                <HookCards hooks={hooks} selectedId={selectedHook?.id ?? null} onSelect={setSelectedHook} />
                <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                  <Button
                    variant="primary"
                    onClick={() => generateScript(selectedHook)}
                    loading={loading === 'script'}
                    disabled={!selectedHook}
                  >
                    <Sparkles className="h-4 w-4" /> Generate script with this hook
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" onClick={generateHooks} loading={loading === 'hooks'}>
                    Regenerate hooks
                  </Button>
                  <Button variant="ghost" onClick={() => setStep(0)}>
                    Back to brief
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 2 ? (
            <Card>
              <CardHeader>
                <CardTitle>Writing the script…</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {['Hook', 'Problem', 'Solution', 'CTA'].map((section) => (
                  <div key={section} className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-faint">{section}</p>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-11/12" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          {problem ? (
            <Card>
              <CardHeader>
                <CardTitle>Audience problem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-snug text-ink">{problem.title}</p>
                <p className="line-clamp-4 text-xs leading-relaxed text-muted">{problem.excerpt}</p>
                <a href={problem.source_url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="ghost" className="px-0">
                    <ExternalLink className="h-3.5 w-3.5" /> {problem.source_name}
                  </Button>
                </a>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Research sources</CardTitle>
              <span className="text-[11px] text-faint">{selectedSources.length} selected</span>
            </CardHeader>
            <CardContent>
              {sources.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-xs leading-relaxed text-muted">
                    No research attached. The script will avoid stating specific fees, deadlines or rules.
                  </p>
                  <Link href="/ideas">
                    <Button size="sm" variant="secondary" className="w-full">
                      Research this idea first
                    </Button>
                  </Link>
                </div>
              ) : (
                <ul className="space-y-2">
                  {sources.map((source) => {
                    const selected = selectedSources.includes(source.id)
                    return (
                      <li key={source.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedSources((current) =>
                              current.includes(source.id)
                                ? current.filter((id) => id !== source.id)
                                : [...current, source.id],
                            )
                          }
                          className={cn(
                            'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                            selected ? 'border-accent-border bg-accent-soft' : 'border-line bg-surface hover:border-line-strong',
                          )}
                        >
                          <p className="truncate text-xs text-ink">{source.title}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="truncate text-[11px] text-faint">{source.domain}</span>
                            <Badge variant="outline">{source.source_type}</Badge>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Script settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Row label="Language" value={values.language === 'ne' ? 'Nepali · नेपाली' : 'English'} />
              <Row label="Target duration" value={formatDuration(values.duration_seconds)} />
              <Row label="Target word count" value={`~${targetWords}`} />
              <Row label="Platform" value={values.platform} />
              <Row label="Tone" value={values.tone} />
              {selectedHook ? (
                <Row label="Hook length" value={`~${estimateSeconds(selectedHook.text, values.language)}s`} />
              ) : null}
            </CardContent>
          </Card>

          <Link href="/scripts">
            <Button variant="ghost" className="w-full">
              <FileText className="h-4 w-4" /> Open script history
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line pb-2 last:border-0">
      <span className="text-faint">{label}</span>
      <span className="capitalize text-ink">{value}</span>
    </div>
  )
}
