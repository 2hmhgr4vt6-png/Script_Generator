'use client'

import { ChevronDown, LogOut, Menu, Search, Settings, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { Wordmark } from './logo'
import { titleFor } from './nav-items'
import { SidebarNav } from './sidebar'

export function Topbar({
  user,
  defaultLanguage,
  demoMode,
}: {
  user: { email: string; name: string | null }
  defaultLanguage: 'ne' | 'en'
  demoMode: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const toast = useToast()
  const [mobileNav, setMobileNav] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMobileNav(false)
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  async function logout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch {
      toast.error('Could not sign out', 'Please try again.')
      setLoggingOut(false)
    }
  }

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
            className="hidden rounded-full border border-line bg-elevated px-2.5 py-1 text-[11px] font-medium text-muted sm:inline-flex"
          >
            {defaultLanguage === 'ne' ? 'नेपाली · NE' : 'English · EN'}
          </span>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-lg border border-line bg-elevated px-2.5 py-1.5 text-sm text-muted transition-colors hover:border-line-strong hover:text-ink"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-black">
                {(user.name ?? user.email).charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[10rem] truncate sm:block">{user.email}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 w-56 animate-fade-in rounded-lg border border-line bg-elevated p-1.5 shadow-xl shadow-black/50"
              >
                <div className="border-b border-line px-2.5 py-2">
                  <p className="truncate text-xs font-medium text-ink">{user.name ?? 'Bhasika'}</p>
                  <p className="truncate text-[11px] text-muted">{user.email}</p>
                </div>
                <Link
                  href="/settings"
                  className="mt-1 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted transition-colors hover:bg-card hover:text-ink"
                >
                  <Settings className="h-4 w-4" /> Settings
                </Link>
                <button
                  onClick={logout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-muted transition-colors hover:bg-card hover:text-danger disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" /> {loggingOut ? 'Signing out…' : 'Log out'}
                </button>
              </div>
            ) : null}
          </div>
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
          <div className="border-t border-line p-3">
            <Button variant="ghost" className="w-full justify-start" onClick={logout} loading={loggingOut}>
              <LogOut className="h-4 w-4" /> Log out
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
