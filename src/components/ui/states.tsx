import { AlertTriangle, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 py-14 text-center', className)}>
      <div className="mb-4 rounded-full border border-line bg-elevated p-3">
        <Icon className="h-5 w-5 text-faint" />
      </div>
      <h3 className="text-sm font-medium text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', message, action }: { title?: string; message: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{message}</p>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 w-full', className)} />
}

export function CardSkeleton() {
  return (
    <div className="panel space-y-3 p-5">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  )
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      title="Sample content generated locally. Connect a provider in Settings for live results."
      className={cn(
        'inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning',
        className,
      )}
    >
      Sample data
    </span>
  )
}
