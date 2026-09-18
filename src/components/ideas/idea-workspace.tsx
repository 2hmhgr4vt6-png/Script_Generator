'use client'

import { Lightbulb, Save, Search, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { DEMO_IDEA_EXAMPLES } from '@/components/ideas/examples'
import { IdeaFields, PLACEHOLDER, type IdeaFormValues } from '@/components/ideas/idea-form'
import type { Idea, Language, Platform, ResearchSession, Tone } from '@/lib/types'
import { apiFetch, formatRelative, truncate } from '@/lib/utils'

interface Props {
  recentIdeas: { id: string; title: string; category: string; created_at: string }[]
  defaults: { language: Language; duration: number; platform: Platform; tone: Tone }
}

type Busy = 'research' | 'generate' | 'save' | null

export function IdeaWorkspace({ recentIdeas, defaults }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const toast = useToast()

  const [values, setValues] = useState<IdeaFormValues>({
    raw_text: params.get('seed') ?? '',
    category: 'other',
    language: defaults.language,
    duration_seconds: defaults.duration,
    custom_duration: '',
    content_type: 'educational',
    audience: 'nepali-students',
    audience_custom: '',
    platform: defaults.platform,
    tone: defaults.tone,
  })
  const [busy, setBusy] = useState<Busy>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  function patch(next: Partial<IdeaFormValues>) {
    setValues((current) => ({ ...current, ...next }))
  }

  function validate(): boolean {
    if (values.raw_text.trim().length < 10) {
      setError('Write at least a sentence so Bhasika has something to work with.')
      return false
    }
    setError(null)
    return true
  }

  async function saveIdea(): Promise<Idea> {
    const { idea } = await apiFetch<{ idea: Idea }>('/api/ideas', {
      method: 'POST',
      body: JSON.stringify({
        raw_text: values.raw_text.trim(),
        category: values.category,
        language: values.language,
        duration_seconds: values.duration_seconds,
        content_type: values.content_type,
        audience: values.audience,
        audience_custom: values.audience === 'custom' ? values.audience_custom : null,
        platform: values.platform,
        tone: values.tone,
      }),
    })
    return idea
  }

  async function onSave() {
    if (!validate()) return
    setBusy('save')
    try {
      await saveIdea()
      toast.success('Idea saved', 'You can pick it up again from the dashboard.')
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function onResearch() {
    if (!validate()) return
    setBusy('research')
    setStatus('Saving idea…')
    try {
      const idea = await saveIdea()
      setStatus('Searching the internet and reading sources…')
      const result = await apiFetch<{ session: ResearchSession }>('/api/research', {
        method: 'POST',
        body: JSON.stringify({ text: values.raw_text.trim(), idea_id: idea.id, include_community: true }),
      })
      if (result.session.status === 'error') {
        setError(result.session.error ?? 'Research could not be completed. Please try again.')
        setBusy(null)
        setStatus(null)
        return
      }
      router.push(`/research/${result.session.id}`)
    } catch (err) {
      setError((err as Error).message)
      setBusy(null)
      setStatus(null)
    }
  }

  async function onGenerateDirectly() {
    if (!validate()) return
    setBusy('generate')
    try {
      const idea = await saveIdea()
      router.push(`/script/new?idea=${idea.id}`)
    } catch (err) {
      setError((err as Error).message)
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-ink">New idea</h1>
        <p className="mt-1.5 text-sm text-muted">
          Start with anything — a confusion you heard, a note, a rejection story, a question a student asked.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardContent className="space-y-5 pt-5">
              <div>
                <label className="field-label">Raw idea / information</label>
                <textarea
                  value={values.raw_text}
                  onChange={(event) => patch({ raw_text: event.target.value })}
                  placeholder={PLACEHOLDER}
                  rows={7}
                  className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-2.5 text-sm leading-relaxed text-ink placeholder:text-faint transition-colors hover:border-line-strong focus:border-accent-border"
                />
                <div className="mt-2 flex items-center justify-between text-[11px] text-faint">
                  <span>{values.raw_text.trim().split(/\s+/).filter(Boolean).length} words</span>
                  <span>Nepali or English, whichever is faster for you.</span>
                </div>
              </div>

              <IdeaFields values={values} onChange={patch} compact />

              {error ? <ErrorState message={error} /> : null}
              {status ? (
                <p className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted">{status}</p>
              ) : null}

              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                <Button variant="primary" onClick={onResearch} loading={busy === 'research'} disabled={busy !== null}>
                  <Search className="h-4 w-4" /> Research This Idea
                </Button>
                <Button variant="secondary" onClick={onGenerateDirectly} loading={busy === 'generate'} disabled={busy !== null}>
                  <Sparkles className="h-4 w-4" /> Generate Directly
                </Button>
                <Button variant="ghost" onClick={onSave} loading={busy === 'save'} disabled={busy !== null}>
                  <Save className="h-4 w-4" /> Save Idea
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bhasika examples</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-muted">Click one to load it into the box.</p>
              <ul className="space-y-1.5">
                {DEMO_IDEA_EXAMPLES.map((example) => (
                  <li key={example}>
                    <button
                      onClick={() => patch({ raw_text: example })}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-left text-xs leading-relaxed text-muted transition-colors hover:border-accent-border hover:text-ink"
                    >
                      {example}
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-accent" /> Recent ideas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentIdeas.length === 0 ? (
                <p className="text-xs text-muted">Nothing saved yet.</p>
              ) : (
                <ul className="space-y-2">
                  {recentIdeas.map((idea) => (
                    <li key={idea.id}>
                      <Link
                        href={`/script/new?idea=${idea.id}`}
                        className="block rounded-lg px-2.5 py-2 transition-colors hover:bg-elevated"
                      >
                        <p className="text-xs text-ink">{truncate(idea.title, 64)}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="outline">{idea.category}</Badge>
                          <span className="text-[11px] text-faint">{formatRelative(idea.created_at)}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
