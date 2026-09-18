'use client'

import { AlertTriangle, ArrowRight, FileSearch, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { SourceCard, VerificationBadge } from '@/components/research/source-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DemoBadge, EmptyState, ErrorState } from '@/components/ui/states'
import type { ResearchSession, ResearchSource } from '@/lib/types'
import { formatRelative } from '@/lib/utils'

const STAGES = [
  { key: 'searching', label: 'Searching' },
  { key: 'reading', label: 'Reading sources' },
  { key: 'extracting', label: 'Extracting facts' },
  { key: 'identifying-problems', label: 'Identifying audience problems' },
  { key: 'complete', label: 'Research complete' },
]

export function ResearchDetail({ session, sources }: { session: ResearchSession; sources: ResearchSource[] }) {
  const [removed, setRemoved] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>(sources.filter((s) => s.selected).map((s) => s.id))

  const visible = sources.filter((source) => !removed.includes(source.id))
  const facts = session.facts.filter((fact) => fact.kind === 'fact')
  const opinions = session.facts.filter((fact) => fact.kind === 'opinion')

  const scriptHref = `/script/new?session=${session.id}${session.idea_id ? `&idea=${session.idea_id}` : ''}${
    selected.length ? `&sources=${selected.join(',')}` : ''
  }`

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-faint">Research session</p>
          <h1 className="mt-1.5 text-xl font-semibold leading-snug tracking-tight text-ink">{session.query}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={session.status === 'error' ? 'danger' : session.status === 'complete' ? 'success' : 'info'}>
              {STAGES.find((s) => s.key === session.status)?.label ?? session.status}
            </Badge>
            <Badge variant="outline">Provider: {session.provider}</Badge>
            {session.is_demo ? <DemoBadge /> : null}
            <span className="text-[11px] text-faint">{formatRelative(session.created_at)}</span>
          </div>
        </div>
        <Link href={scriptHref} className="shrink-0">
          <Button variant="primary">
            <Sparkles className="h-4 w-4" /> Use in a script
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </header>

      {session.status === 'error' ? (
        <ErrorState
          title="Research could not be completed"
          message={session.error ?? 'Please try again.'}
          action={
            <Link href="/ideas">
              <Button size="sm" variant="secondary">
                Try again
              </Button>
            </Link>
          }
        />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-ink">Sources used ({visible.length})</h2>
            <span className="text-xs text-faint">{selected.length} selected for the script</span>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={FileSearch}
              title="No sources found"
              description="Nothing relevant came back for this idea. Try rephrasing it with more specific wording, or connect a search provider in Settings."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visible.map((source) => (
                <SourceCard
                  key={source.id}
                  source={source}
                  selected={selected.includes(source.id)}
                  onToggle={() =>
                    setSelected((current) =>
                      current.includes(source.id) ? current.filter((id) => id !== source.id) : [...current, source.id],
                    )
                  }
                  onRemove={() => {
                    setRemoved((current) => [...current, source.id])
                    setSelected((current) => current.filter((id) => id !== source.id))
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {session.summary ? (
            <Card>
              <CardHeader>
                <CardTitle>Research summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted">{session.summary}</p>
              </CardContent>
            </Card>
          ) : null}

          {session.conflicts.length ? (
            <Card className="border-warning/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" /> Conflicting information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs leading-relaxed text-muted">
                  {session.conflicts.map((conflict, index) => (
                    <li key={index} className="border-l-2 border-warning/40 pl-3">
                      {conflict}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Facts ({facts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {facts.length === 0 ? (
                <p className="text-xs text-muted">
                  No facts were extracted. Connect an AI provider in Settings to enable fact extraction.
                </p>
              ) : (
                <ul className="space-y-3">
                  {facts.map((fact, index) => (
                    <li key={index} className="border-b border-line pb-3 last:border-0 last:pb-0">
                      <p className="text-xs leading-relaxed text-ink">{fact.claim}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <VerificationBadge status={fact.status} />
                        {fact.source_url ? (
                          <a
                            href={fact.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate text-[11px] text-accent hover:underline"
                          >
                            {fact.source_title ?? 'Source'}
                          </a>
                        ) : null}
                      </div>
                      {fact.note ? <p className="mt-1.5 text-[11px] text-faint">{fact.note}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {opinions.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Opinions & community reports ({opinions.length})</CardTitle>
                <span className="text-[11px] text-faint">Not verified</span>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {opinions.map((opinion, index) => (
                    <li key={index} className="text-xs leading-relaxed text-muted">
                      {opinion.claim}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {session.queries.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Search queries used</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {session.queries.map((query, index) => (
                    <li key={index} className="text-[11px] text-faint">
                      {query}
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
