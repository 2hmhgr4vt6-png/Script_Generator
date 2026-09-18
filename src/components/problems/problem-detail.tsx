'use client'

import { ArrowLeft, Bookmark, BrainCircuit, ExternalLink, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PlatformBadge } from '@/components/problems/problem-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DemoBadge, ErrorState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import type { AudienceProblem } from '@/lib/types'
import { TOPIC_CATEGORIES } from '@/lib/types'
import { apiFetch, formatDate, formatRelative } from '@/lib/utils'

export function ProblemDetail({ initialProblem }: { initialProblem: AudienceProblem }) {
  const router = useRouter()
  const toast = useToast()
  const [problem, setProblem] = useState(initialProblem)
  const [analysing, setAnalysing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const category = TOPIC_CATEGORIES.find((c) => c.value === problem.category)?.label ?? problem.category
  const analysis = problem.analysis

  async function analyse() {
    setAnalysing(true)
    setError(null)
    try {
      const result = await apiFetch<{ problem: AudienceProblem; isDemo: boolean }>(
        `/api/problems/${problem.id}/analyze`,
        { method: 'POST' },
      )
      setProblem(result.problem)
      if (result.isDemo) {
        toast.info('No AI provider connected', 'Add an API key in Settings to analyse problems automatically.')
      } else {
        toast.success('Analysis complete')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setAnalysing(false)
    }
  }

  async function toggleSaved() {
    setSaving(true)
    try {
      const nextStatus = problem.status === 'saved' ? 'new' : 'saved'
      const result = await apiFetch<{ problem: AudienceProblem }>(`/api/problems/${problem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      })
      setProblem(result.problem)
      toast.success(nextStatus === 'saved' ? 'Saved to your list' : 'Removed from saved')
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/problems" className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to problems
      </Link>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-snug tracking-tight text-ink">{problem.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <PlatformBadge platform={problem.platform} />
            <Badge>{category}</Badge>
            <Badge variant="outline">{problem.language === 'ne' ? 'Nepali' : 'English'}</Badge>
            {problem.is_demo ? <DemoBadge /> : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="secondary" onClick={toggleSaved} loading={saving}>
            <Bookmark className="h-4 w-4" /> {problem.status === 'saved' ? 'Saved' : 'Save'}
          </Button>
          <Link href={`/script/new?problem=${problem.id}`}>
            <Button variant="primary">
              <Sparkles className="h-4 w-4" /> Make a Script
            </Button>
          </Link>
        </div>
      </header>

      {error ? <ErrorState message={error} /> : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>The original question</CardTitle>
            </CardHeader>
            <CardContent>
              <blockquote className="border-l-2 border-accent pl-4 text-sm leading-relaxed text-ink/90">
                {problem.excerpt}
              </blockquote>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-3.5 w-3.5 text-accent" /> Problem analysis
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={analyse} loading={analysing}>
                {analysis ? 'Re-analyse' : 'Analyse'}
              </Button>
            </CardHeader>
            <CardContent>
              {!analysis ? (
                <p className="text-xs leading-relaxed text-muted">
                  Not analysed yet. Run the analysis to see what the audience is confused about, what misconception may
                  exist, and what the viewer should understand after watching.
                </p>
              ) : (
                <dl className="space-y-4">
                  {[
                    ['What is the audience confused about?', analysis.confusion],
                    ['What situation are they in?', analysis.situation],
                    ['What misconception might exist?', analysis.misconception],
                    ['What information is needed to answer?', analysis.information_needed],
                    ['What should the viewer understand after watching?', analysis.takeaway],
                    ['Why this matters to the audience', analysis.why_it_matters],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <dt className="text-[11px] font-medium uppercase tracking-wider text-faint">{label}</dt>
                      <dd className="mt-1 text-sm leading-relaxed text-muted">{value || '—'}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </CardContent>
          </Card>

          {analysis?.content_angles?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Suggested content angles</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.content_angles.map((angle, index) => (
                    <li key={index}>
                      <Link
                        href={`/script/new?problem=${problem.id}&angle=${encodeURIComponent(angle)}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-muted transition-colors hover:border-accent-border hover:text-ink"
                      >
                        {angle}
                        <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <Row label="Platform" value={problem.platform} />
              <Row label="Source name" value={problem.source_name} />
              <Row label="Posted" value={problem.posted_at ? formatDate(problem.posted_at) : 'Not reported'} />
              <Row label="Retrieved" value={formatRelative(problem.retrieved_at)} />
              <Row label="Relevance" value={`${problem.relevance}%`} />
              <div className="pt-1">
                <a href={problem.source_url} target="_blank" rel="noopener noreferrer" className="block">
                  <Button size="sm" variant="secondary" className="w-full">
                    <ExternalLink className="h-3.5 w-3.5" /> Open original source
                  </Button>
                </a>
                <p className="mt-2 break-all text-[11px] text-faint">{problem.source_url}</p>
              </div>
            </CardContent>
          </Card>

          {problem.related_questions.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Related questions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs leading-relaxed text-muted">
                  {problem.related_questions.map((question, index) => (
                    <li key={index} className="border-b border-line pb-2 last:border-0 last:pb-0">
                      {question}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line pb-2 last:border-0">
      <span className="text-faint">{label}</span>
      <span className="truncate text-right capitalize text-ink">{value}</span>
    </div>
  )
}
