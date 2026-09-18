'use client'

import { Menu, Search, Settings, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Wordmark } from './logo'
import { titleFor } from './nav-items'
import { SidebarNav } from './sidebar'

export function Topbar({ defaultLanguage, demoMode }: { defaultLanguage: 'ne' | 'en'; demoMode: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileNav, setMobileNav] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    setMobileNav(false)
  }, [pathname])

  function onSearch(event: React.FormEvent) {
    event.preventDefault()
    const term = query.trim()
    if (!term) return
    router.push(`/scripts?q=${encodeURIComponent(term)}`)
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur lg:px-6">
        <button
          className="rounded-lg p-2 text-muted transition-colors hover:bg-elevated hover:text-ink lg:hidden"
          onClick={() => setMobileNav(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="lg:hidden">
          <Wordmark />
        </div>

        <h1 className="hidden text-sm font-medium text-ink lg:block">{titleFor(pathname)}</h1>

        <form onSubmit={onSearch} className="ml-auto hidden max-w-xs flex-1 items-center md:flex">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search scripts…"
              aria-label="Search scripts"
              className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-faint transition-colors hover:border-line-strong focus:border-accent-border"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-3">
          {demoMode ? (
            <span className="hidden rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning sm:inline-flex">
              Demo mode
            </span>
          ) : null}
          <span
            title="Default script language"
            className="rounded-full border border-line bg-elevated px-2.5 py-1 text-[11px] font-medium text-muted"
          >
            {defaultLanguage === 'ne' ? 'नेपाली · NE' : 'English · EN'}
          </span>
          <Link
            href="/settings"
            aria-label="Settings"
            className="rounded-lg border border-line bg-elevated p-2 text-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div className={cn('fixed inset-0 z-50 lg:hidden', mobileNav ? '' : 'pointer-events-none')}>
        <div
          className={cn('absolute inset-0 bg-black/80 transition-opacity', mobileNav ? 'opacity-100' : 'opacity-0')}
          onClick={() => setMobileNav(false)}
        />
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex w-64 flex-col border-r border-line bg-surface transition-transform duration-200',
            mobileNav ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <Wordmark />
            <button onClick={() => setMobileNav(false)} aria-label="Close navigation" className="p-2 text-muted hover:text-ink">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            <SidebarNav onNavigate={() => setMobileNav(false)} />
          </div>
        </div>
      </div>
    </>
  )
}
