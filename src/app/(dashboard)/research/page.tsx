import { Search } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DemoBadge, EmptyState } from '@/components/ui/states'
import { currentWorkspace } from '@/lib/user'
import { listResearchSessions } from '@/lib/data'
import { formatRelative, truncate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Research' }
export const dynamic = 'force-dynamic'

const STATUS_VARIANT = {
  complete: 'success',
  error: 'danger',
  searching: 'info',
  reading: 'info',
  extracting: 'info',
  'identifying-problems': 'info',
} as const

export default async function ResearchPage() {
  const user = await currentWorkspace()
  const sessions = await listResearchSessions(user.id)

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Research</h1>
          <p className="mt-1.5 text-sm text-muted">Every research pass, with the sources it actually used.</p>
        </div>
        <Link href="/ideas">
          <Button variant="primary">Research a new idea</Button>
        </Link>
      </header>

      {sessions.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No research sessions yet"
          description="Enter a raw idea and Bhasika will plan the queries, search the internet, and separate what is verifiable from what is opinion."
          action={
            <Link href="/ideas">
              <Button variant="primary">Start from an idea</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3">
          {sessions.map((session) => (
            <Link key={session.id} href={`/research/${session.id}`}>
              <Card className="transition-colors hover:border-accent-border">
                <CardContent className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{truncate(session.query, 110)}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant={STATUS_VARIANT[session.status] ?? 'default'}>{session.status}</Badge>
                      <Badge variant="outline">{session.provider}</Badge>
                      {session.is_demo ? <DemoBadge /> : null}
                      <span className="text-[11px] text-faint">{formatRelative(session.created_at)}</span>
                    </div>
                  </div>
                  <span className="text-xs text-faint">{session.facts.length} facts</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
