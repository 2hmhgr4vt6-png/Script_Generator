'use client'

import { MessageCircleQuestion, RefreshCw } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { ProblemCard } from '@/components/problems/problem-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { CardSkeleton, EmptyState, ErrorState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import type { SocialStatus } from '@/lib/social/types'
import type { AudienceProblem } from '@/lib/types'
import { LANGUAGES, TOPIC_CATEGORIES } from '@/lib/types'
import { apiFetch, formatRelative } from '@/lib/utils'

const PLATFORM_OPTIONS = ['reddit', 'youtube', 'facebook', 'instagram', 'web', 'sample']
const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'saved', label: 'Saved' },
  { value: 'script-created', label: 'Script created' },
  { value: 'dismissed', label: 'Dismissed' },
]

export function ProblemBoard({
  initialProblems,
  sources,
  webSearchConnected,
}: {
  initialProblems: AudienceProblem[]
  sources: SocialStatus[]
  webSearchConnected: boolean
}) {
  const router = useRouter()
  const params = useSearchParams()
  const toast = useToast()

  const [problems, setProblems] = useState(initialProblems)
  const [keyword, setKeyword] = useState(params.get('q') ?? '')
  const [discovering, setDiscovering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(null)

  const connected = sources.filter((source) => source.connected)

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    router.push(`/problems?${next.toString()}`)
  }

  async function discover() {
    setDiscovering(true)
    setError(null)
    try {
      const result = await apiFetch<{ problems: AudienceProblem[]; isDemo: boolean; notes: string[] }>(
        '/api/problems/discover',
        { method: 'POST', body: JSON.stringify({ keyword: keyword.trim() || undefined }) },
      )
      setProblems((current) => [...result.problems, ...current])
      setLastSync(new Date().toISOString())
      if (result.notes.length) {
        toast.info('Some sources reported an issue', result.notes.join(' · '))
      }
      toast.success(
        result.problems.length ? `Found ${result.problems.length} problems` : 'No new problems found',
        result.isDemo ? 'Sample data — connect a provider in Settings for live results.' : undefined,
      )
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setDiscovering(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">What are people confused about?</h1>
          <p className="mt-1.5 text-sm text-muted">Find real questions. Turn them into useful content.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') discover()
            }}
            placeholder="Keyword, e.g. blocked account"
            className="w-56"
          />
          <Button variant="primary" onClick={discover} loading={discovering}>
            <RefreshCw className="h-4 w-4" /> Discover problems
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Connected sources</CardTitle>
          <span className="text-[11px] text-faint">
            {lastSync ? `Last sync ${formatRelative(lastSync)}` : 'No sync this session'}
          </span>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-3 py-2.5"
            >
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${source.connected ? 'bg-success' : 'bg-faint'}`}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink">{source.label}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{source.message}</p>
              </div>
            </div>
          ))}
          <div className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-3 py-2.5">
            <span
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${webSearchConnected ? 'bg-success' : 'bg-faint'}`}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-ink">Web search</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                {webSearchConnected
                  ? 'Connected. Public discussions are discovered through the search provider.'
                  : 'Not connected — add SEARCH_API_KEY in Settings to enable this source.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Select value={params.get('category') ?? ''} onChange={(event) => setFilter('category', event.target.value)} className="w-auto">
          <option value="">All topics</option>
          {TOPIC_CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select value={params.get('platform') ?? ''} onChange={(event) => setFilter('platform', event.target.value)} className="w-auto">
          <option value="">All platforms</option>
          {PLATFORM_OPTIONS.map((platform) => (
            <option key={platform} value={platform}>
              {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </option>
          ))}
        </Select>
        <Select value={params.get('status') ?? ''} onChange={(event) => setFilter('status', event.target.value)} className="w-auto">
          <option value="">Any status</option>
          {STATUS_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select value={params.get('language') ?? ''} onChange={(event) => setFilter('language', event.target.value)} className="w-auto">
          <option value="">Any language</option>
          {LANGUAGES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        {params.toString() ? (
          <Button variant="ghost" size="sm" onClick={() => router.push('/problems')}>
            Clear filters
          </Button>
        ) : null}
      </div>

      {error ? <ErrorState message={error} /> : null}

      {discovering && problems.length === 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : problems.length === 0 ? (
        <EmptyState
          icon={MessageCircleQuestion}
          title="No problems discovered yet"
          description={
            connected.length || webSearchConnected
              ? 'Run a discovery sweep to pull in the questions people are asking right now.'
              : 'No source is connected yet. Run a sweep to see clearly-labelled sample problems, or add API credentials in Settings for live discovery.'
          }
          action={
            <Button variant="primary" onClick={discover} loading={discovering}>
              Discover problems
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {problems.map((problem) => (
            <ProblemCard key={problem.id} problem={problem} />
          ))}
        </div>
      )}
    </div>
  )
}
