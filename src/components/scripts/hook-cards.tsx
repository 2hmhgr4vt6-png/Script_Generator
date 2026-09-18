'use client'

import { Check, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { HookOption } from '@/lib/types'
import { HOOK_STYLES } from '@/lib/types'
import { cn } from '@/lib/utils'

export function HookCards({
  hooks,
  selectedId,
  onSelect,
}: {
  hooks: HookOption[]
  selectedId: string | null
  onSelect: (hook: HookOption) => void
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {hooks.map((hook) => {
        const selected = hook.id === selectedId
        const style = HOOK_STYLES.find((s) => s.value === hook.style)?.label ?? hook.style
        return (
          <button
            key={hook.id}
            type="button"
            onClick={() => onSelect(hook)}
            aria-pressed={selected}
            className={cn(
              'flex h-full flex-col rounded-xl border p-4 text-left transition-colors',
              selected ? 'border-accent bg-accent-soft' : 'border-line bg-card hover:border-line-strong',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium leading-relaxed text-ink">{hook.text}</p>
              {selected ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> : null}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={selected ? 'accent' : 'default'}>{style}</Badge>
              <Badge variant="outline">~{hook.estimated_seconds}s</Badge>
              {hook.recommended ? (
                <Badge variant="accent">
                  <Star className="h-3 w-3" /> Recommended
                </Badge>
              ) : null}
            </div>
            {hook.rationale ? (
              <p className="mt-3 text-[11px] leading-relaxed text-muted">{hook.rationale}</p>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
