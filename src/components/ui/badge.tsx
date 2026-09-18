import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const badge = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-5',
  {
    variants: {
      variant: {
        default: 'border-line bg-elevated text-muted',
        accent: 'border-accent-border bg-accent-soft text-accent',
        success: 'border-success/30 bg-success/10 text-success',
        warning: 'border-warning/30 bg-warning/10 text-warning',
        danger: 'border-danger/30 bg-danger/10 text-danger',
        info: 'border-info/30 bg-info/10 text-info',
        outline: 'border-line text-faint',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badge> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badge({ variant }), className)} {...props} />
}
