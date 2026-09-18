'use client'

import { ExternalLink, Flame, RefreshCw, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/input'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { TREND_REGIONS, type TrendAngle, type TrendScan } from '@/lib/trends/types'
import { apiFetch, formatRelative } from '@/lib/utils'

const RELEVANCE: Record<TrendAngle['relevance'], { label: string; variant: 'success' | 'accent' | 'outline' }> = {
  direct: { label: 'Direct fit', variant: 'success' },
  adaptable: { label: 'Adaptable', variant: 'accent' },
  stretch: { label: 'Stretch', variant: 'outline' },
}

export function TrendBoard({ initialScans }: { initialScans: TrendScan[] }) {
  const toast = useToast()
  const [scans, setScans] = useState(initialScans)
  const [region, setRegion] = useState('NP')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<string[] | undefined>(undefined)

  const scan = scans[0]

  async function run() {
    setScanning(true)
    setError(null)
    try {
      const result = await apiFetch<{ scan: TrendScan }>('/api/trends', {
        method: 'POST',
        body: JSON.stringify({ region }),
      })
      setScans((current) => [result.scan, ...current])
      toast.success(`Captured ${result.scan.trends.length} trends`, `${result.scan.angles.length} usable angles`)
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
          <h1 className="text-xl font-semibold tracking-tight text-ink">Trends</h1>
          <p className="mt-1.5 text-sm text-muted">
            What people are searching for right now — and the few pieces of it Bhasika can honestly use.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={region} onChange={(event) => setRegion(event.target.value)} className="w-auto">
            {TREND_REGIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Button variant="primary" onClick={run} loading={scanning}>
            <RefreshCw className="h-4 w-4" /> Scan trends
          </Button>
        </div>
      </header>

      {error ? <ErrorState title="Could not scan trends" message={error} details={details} /> : null}

      {!scan ? (
        <EmptyState
          icon={Flame}
          title="No trend scan yet"
          description="Reads Google's daily trending searches for the country you pick, plus YouTube's most-popular chart when connected, then works out which of it Bhasika could use without forcing it."
          action={
            <Button variant="primary" onClick={run} loading={scanning}>
              Run the first scan
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-accent" /> Marketing angles for Bhasika
                </CardTitle>
                <span className="text-[11px] text-faint">{formatRelative(scan.created_at)}</span>
              </CardHeader>
              <CardContent className="space-y-3">
                {scan.angles.length === 0 ? (
                  <p className="text-xs leading-relaxed text-muted">
                    No angle was worth recommending from this batch. That is a normal result — most trends have
                    nothing to do with studying in Germany, and forcing a link reads as desperate.
                  </p>
                ) : (
                  scan.angles.map((angle, index) => (
                    <article key={index} className="rounded-lg border border-line bg-surface p-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={RELEVANCE[angle.relevance].variant}>
                          {RELEVANCE[angle.relevance].label}
                        </Badge>
                        <span className="text-[11px] text-faint">riding: {angle.trend}</span>
                      </div>
                      <p className="mt-2.5 text-sm leading-relaxed text-ink">{angle.idea}</p>
                      <p className="mt-2 border-l-2 border-accent pl-3 text-sm leading-relaxed text-ink/90">
                        “{angle.hook}”
                      </p>
                      <p className="mt-2 text-[11px] leading-relaxed text-muted">{angle.why}</p>
                      {angle.caution ? (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-warning">Careful: {angle.caution}</p>
                      ) : null}
                      <Link
                        href={`/ideas?seed=${encodeURIComponent(`${angle.idea}\n\nHook: ${angle.hook}`)}`}
                        className="mt-3 inline-block"
                      >
                        <Button size="sm" variant="secondary">
                          Turn into a script
                        </Button>
                      </Link>
                    </article>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {scan.summary ? (
              <Card>
                <CardHeader>
                  <CardTitle>This week</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted">{scan.summary}</p>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Raw trends</CardTitle>
                <span className="text-[11px] text-faint">{scan.trends.length}</span>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {scan.trends.slice(0, 20).map((trend) => (
                  <a
                    key={trend.id}
                    href={trend.url ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start justify-between gap-2 rounded px-2 py-1.5 transition-colors hover:bg-elevated"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs text-muted">{trend.title}</span>
                    {trend.volume ? (
                      <span className="shrink-0 text-[11px] tabular-nums text-faint">{trend.volume}</span>
                    ) : null}
                    <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-faint" />
                  </a>
                ))}
              </CardContent>
            </Card>

            {scan.source_notes.length ? (
              <Card>
                <CardHeader>
                  <CardTitle>Coverage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {scan.source_notes.map((note, index) => (
                    <p key={index} className="text-[11px] leading-relaxed text-faint">
                      {note}
                    </p>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
