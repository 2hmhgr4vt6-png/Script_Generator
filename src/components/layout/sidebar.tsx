'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from './nav-items'
import { Wordmark } from './logo'

export function isActive(pathname: string, href: string, match?: string[]): boolean {
  if (pathname === href) return true
  return (match ?? []).some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href, item.match)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-accent-soft font-medium text-accent'
                : 'text-muted hover:bg-elevated hover:text-ink',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function Sidebar({ demoMode }: { demoMode: boolean }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
      <div className="flex h-16 items-center border-b border-line px-5">
        <Link href="/dashboard">
          <Wordmark showTagline />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <p className="px-6 pb-2 text-[10px] font-medium uppercase tracking-wider text-faint">Studio</p>
        <SidebarNav />
      </div>
      {demoMode ? (
        <div className="m-3 rounded-lg border border-warning/25 bg-warning/5 p-3">
          <p className="text-[11px] font-medium text-warning">Demo mode</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Generated content is sample data. Add API keys in Settings for live research.
          </p>
        </div>
      ) : null}
    </aside>
  )
}
