'use client'

import { Check, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DemoBadge } from '@/components/ui/states'
import type { ResearchSource, SourceType, VerificationStatus } from '@/lib/types'
import { formatDate } from '@/lib/utils'

const SOURCE_LABEL: Record<SourceType, string> = {
  official: 'Official',
  government: 'Government',
  university: 'University',
  news: 'News',
  community: 'Community',
  blog: 'Blog',
  social: 'Social',
  unknown: 'Other',
}

const VERIFICATION_LABEL: Record<VerificationStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
  'verified-by-source': { label: 'Verified by source', variant: 'success' },
  'needs-verification': { label: 'Needs verification', variant: 'warning' },
  'conflicting-sources': { label: 'Conflicting sources', variant: 'danger' },
  opinion: { label: 'Opinion', variant: 'info' },
  'not-enough-information': { label: 'Not enough information', variant: 'default' },
}

export function SourceTypeBadge({ type }: { type: SourceType }) {
  const trusted = type === 'official' || type === 'government' || type === 'university'
  return <Badge variant={trusted ? 'accent' : 'default'}>{SOURCE_LABEL[type]}</Badge>
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const meta = VERIFICATION_LABEL[status]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}

export function SourceCard({
  source,
  selected,
  onToggle,
  onRemove,
}: {
  source: ResearchSource
  selected: boolean
  onToggle?: () => void
  onRemove?: () => void
}) {
  return (
    <article className="rounded-xl border border-line bg-card p-4 transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium leading-snug text-ink">{source.title}</h3>
          <p className="mt-1 truncate text-[11px] text-faint">{source.domain}</p>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-faint" title="Relevance">
          {source.relevance}%
        </span>
      </div>

      <p className="mt-3 line-clamp-4 text-xs leading-relaxed text-muted">{source.excerpt}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SourceTypeBadge type={source.source_type} />
        <VerificationBadge status={source.verification} />
        {source.published_at ? <Badge variant="outline">{formatDate(source.published_at)}</Badge> : null}
        {source.is_demo ? <DemoBadge /> : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
        <a href={source.url} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="ghost">
            <ExternalLink className="h-3.5 w-3.5" /> Open Source
          </Button>
        </a>
        {onToggle ? (
          <Button size="sm" variant={selected ? 'primary' : 'outline'} onClick={onToggle}>
            {selected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {selected ? 'Using in script' : 'Use in Script'}
          </Button>
        ) : null}
        {onRemove ? (
          <Button size="sm" variant="ghost" onClick={onRemove} aria-label="Remove source">
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </Button>
        ) : null}
      </div>
    </article>
  )
}
