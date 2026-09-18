import { cn } from '@/lib/utils'

export function Wordmark({ className, showTagline }: { className?: string; showTagline?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-[15px] font-bold leading-none text-black">
        B
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-[0.18em] text-ink">BHASIKA</span>
        {showTagline ? <span className="block text-[11px] text-muted">We explain. You decide.</span> : null}
      </span>
    </div>
  )
}
