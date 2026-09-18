'use client'

import { ExternalLink, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DemoBadge } from '@/components/ui/states'
import type { AudienceProblem } from '@/lib/types'
import { TOPIC_CATEGORIES } from '@/lib/types'
import { formatDate, formatRelative, truncate } from '@/lib/utils'

const STATUS_META = {
  new: { label: 'New', variant: 'info' as const },
  saved: { label: 'Saved', variant: 'accent' as const },
  'script-created': { label: 'Script created', variant: 'success' as const },
  dismissed: { label: 'Dismissed', variant: 'outline' as const },
}

export function PlatformBadge({ platform }: { platform: string }) {
  const label = platform === 'sample' ? 'Sample' : platform.charAt(0).toUpperCase() + platform.slice(1)
  return <Badge variant="outline">{label}</Badge>
}

export function ProblemCard({ problem }: { problem: AudienceProblem }) {
  const status = STATUS_META[problem.status]
  const category = TOPIC_CATEGORIES.find((c) => c.value === problem.category)?.label ?? problem.category

  return (
    <article className="flex h-full flex-col rounded-xl border border-line bg-card p-4 transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium leading-snug text-ink">{truncate(problem.title, 110)}</h3>
        <span className="shrink-0 text-xs tabular-nums text-faint" title="Relevance to Bhasika's audience">
          {problem.relevance}%
        </span>
      </div>

      <p className="mt-2.5 line-clamp-3 text-xs leading-relaxed text-muted">
        <span className="text-faint">Question: </span>
        {problem.excerpt}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PlatformBadge platform={problem.platform} />
        <Badge>{category}</Badge>
        <Badge variant={status.variant}>{status.label}</Badge>
        {problem.is_demo ? <DemoBadge /> : null}
      </div>

      <dl className="mt-3 space-y-1 text-[11px] text-faint">
        <div className="flex gap-1.5">
          <dt>Source:</dt>
          <dd className="truncate text-muted">{problem.source_name}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>{problem.posted_at ? 'Posted:' : 'Retrieved:'}</dt>
          <dd>{problem.posted_at ? formatDate(problem.posted_at) : formatRelative(problem.retrieved_at)}</dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-3">
        <Link href={`/problems/${problem.id}`}>
          <Button size="sm" variant="secondary">
            View Problem
          </Button>
        </Link>
        <a href={problem.source_url} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="ghost">
            <ExternalLink className="h-3.5 w-3.5" /> View Source
          </Button>
        </a>
        <Link href={`/script/new?problem=${problem.id}`} className="ml-auto">
          <Button size="sm" variant="primary">
            <Sparkles className="h-3.5 w-3.5" /> Make a Script
          </Button>
        </Link>
      </div>
    </article>
  )
}
