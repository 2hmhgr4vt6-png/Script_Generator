'use client'

import { BarChart3, ExternalLink, Lightbulb, RefreshCw, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import type { ContentSignal, PerformanceReport } from '@/lib/trends/types'
import { apiFetch, cn, formatRelative, truncate } from '@/lib/utils'

const PLATFORM_LABEL: Record<string, string> = {
  youtube: 'YouTube',
  reddit: 'Reddit',
  stackexchange: 'Stack Exchange',
}

export function PerformanceBoard({ initialReports }: { initialReports: PerformanceReport[] }) {
  const toast = useToast()
  const [reports, setReports] = useState(initialReports)
  const [topic, setTopic] = useState('')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<string[] | undefined>(undefined)

  const report = reports[0]

  async function scan() {
    setScanning(true)
    setError(null)
    try {
      const result = await apiFetch<{ report: PerformanceReport }>('/api/performance', {
        method: 'POST',
        body: JSON.stringify({ topic: topic.trim() || undefined }),
      })
      setReports((current) => [result.report, ...current])
      toast.success(`Measured ${result.report.signals.length} pieces of content`)
    } catch (err) {
      setError((err as Error).message)
      setDetails((err as Error & { details?: string[] }).details)
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">What is working</h1>
          <p className="mt-1.5 text-sm text-muted">
            Which Germany content is actually getting engagement — measured, not guessed.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') scan()
            }}
            placeholder="Narrow it, e.g. blocked account"
            className="w-60"
          />
          <Button variant="primary" onClick={scan} loading={scanning}>
            <RefreshCw className="h-4 w-4" /> Measure now
          </Button>
        </div>
      </header>

      {error ? <ErrorState title="Could not measure" message={error} details={details} /> : null}

      {!report ? (
        <EmptyState
          icon={BarChart3}
          title="Nothing measured yet"
          description="This reads engagement counters straight from the platforms — YouTube views, Reddit scores, Stack Exchange votes — and ranks each item against others on its own platform."
          action={
            <Button variant="primary" onClick={scan} loading={scanning}>
              Run the first scan
            </Button>
          }
        />
      ) : (
        <>
          {report.source_notes.length ? (
            <Card className="border-warning/25">
              <CardContent className="space-y-1.5 py-3">
                {report.source_notes.map((note, index) => (
                  <p key={index} className="text-[11px] leading-relaxed text-warning">
                    {note}
                  </p>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top performers</CardTitle>
                  <span className="text-[11px] text-faint">
                    {report.signals.length} measured · {formatRelative(report.created_at)}
                  </span>
                </CardHeader>
                <CardContent className="space-y-2">
                  {report.signals.slice(0, 15).map((signal) => (
                    <SignalRow key={signal.id} signal={signal} />
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {report.summary ? (
                <Card>
                  <CardHeader>
                    <CardTitle>What this says</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted">{report.summary}</p>
                  </CardContent>
                </Card>
              ) : null}

              {report.formats.length ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Formats by median performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {report.formats.map((format) => (
                      <div key={format.format}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="capitalize text-ink">{format.format}</span>
                          <span className="tabular-nums text-faint">
                            {format.medianPerformance} · {format.count}
                          </span>
                        </div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-elevated">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${format.medianPerformance}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

              {report.patterns.length ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-3.5 w-3.5 text-accent" /> Patterns in the winners
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {report.patterns.map((pattern, index) => (
                      <div key={index} className="border-b border-line pb-3 last:border-0 last:pb-0">
                        <p className="text-xs font-medium text-ink">{pattern.pattern}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-faint">{pattern.evidence}</p>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-accent">{pattern.recommendation}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

              <Link href="/ideas">
                <Button variant="secondary" className="w-full">
                  <TrendingUp className="h-4 w-4" /> Turn this into a script
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SignalRow({ signal }: { signal: ContentSignal }) {
  return (
    <a
      href={signal.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 rounded-lg border border-line bg-surface px-3 py-2.5 transition-colors hover:border-accent-border"
    >
      <span
        className={cn(
          'mt-0.5 w-9 shrink-0 rounded px-1 py-0.5 text-center text-[11px] font-medium tabular-nums',
          signal.performance >= 70
            ? 'bg-success/15 text-success'
            : signal.performance >= 40
              ? 'bg-warning/15 text-warning'
              : 'bg-elevated text-faint',
        )}
        title="Rank against other items on the same platform in this scan"
      >
        {signal.performance}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs leading-snug text-ink">{truncate(signal.title, 96)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{PLATFORM_LABEL[signal.platform] ?? signal.platform}</Badge>
          {signal.format ? <Badge>{signal.format}</Badge> : null}
          <span className="text-[11px] text-faint">
            {signal.views !== null
              ? `${signal.views.toLocaleString()} views`
              : signal.likes !== null
                ? `${signal.likes} score`
                : ''}
          </span>
        </div>
        {signal.angle ? <p className="mt-1 text-[11px] text-muted">{signal.angle}</p> : null}
      </div>
      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint" />
    </a>
  )
}
