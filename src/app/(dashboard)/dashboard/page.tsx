import {
  ArrowRight, FileText, Lightbulb, MessageCircleQuestion, PenLine, Search, Sparkles, TrendingUp,
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DemoBadge, EmptyState } from '@/components/ui/states'
import { requirePageUser } from '@/lib/auth/guard'
import { getDashboardData } from '@/lib/data'
import { getInsights } from '@/lib/learning'
import { TOPIC_CATEGORIES } from '@/lib/types'
import { formatRelative, greeting, truncate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

const SAMPLE_TOPICS = [
  'Germany student visa', 'Public university admission', 'IELTS requirements', 'German language',
  'ECTS and eligibility', 'Student jobs', 'Cost of living',
]

export default async function DashboardPage() {
  const user = await requirePageUser()
  const [data, insights] = await Promise.all([getDashboardData(user.id), getInsights(user.id)])

  const stats = [
    { label: 'Total Ideas', value: data.stats.ideas, icon: Lightbulb, href: '/ideas' },
    { label: 'Problems Discovered', value: data.stats.problems, icon: MessageCircleQuestion, href: '/problems' },
    { label: 'Scripts Generated', value: data.stats.scripts, icon: FileText, href: '/scripts' },
    { label: 'Saved Scripts', value: data.stats.saved, icon: Sparkles, href: '/scripts?status=ready' },
  ]

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{greeting()}, Bhasika 👋</h1>
          <p className="mt-1.5 text-sm text-muted">Turn real audience problems into content people care about.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/ideas">
            <Button variant="primary">+ Create New Script</Button>
          </Link>
          <Link href="/problems">
            <Button variant="secondary">Discover Problems</Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.label} href={stat.href} className="group">
              <Card className="transition-colors group-hover:border-line-strong">
                <CardContent className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-faint">{stat.label}</p>
                    <p className="mt-2 text-3xl font-semibold tabular-nums text-ink">{stat.value}</p>
                  </div>
                  <span className="rounded-lg border border-line bg-elevated p-2 text-muted transition-colors group-hover:text-accent">
                    <Icon className="h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {[
          { href: '/ideas', label: 'Start with a raw idea', description: 'Paste a confusion, note or question.', icon: Lightbulb },
          { href: '/problems', label: 'Find audience problems', description: 'See what people are actually asking.', icon: MessageCircleQuestion },
          { href: '/script/new', label: 'Generate a script', description: 'Hook, problem, solution, CTA.', icon: FileText },
          {
            href: data.recentScripts[0] ? `/scripts/${data.recentScripts[0].id}` : '/scripts',
            label: 'Continue editing',
            description: data.recentScripts[0] ? truncate(data.recentScripts[0].title, 38) : 'No script in progress yet.',
            icon: PenLine,
          },
        ].map((action) => {
          const Icon = action.icon
          return (
            <Link key={action.label} href={action.href}>
              <Card className="h-full transition-colors hover:border-accent-border">
                <CardContent>
                  <Icon className="h-4 w-4 text-accent" />
                  <p className="mt-3 text-sm font-medium text-ink">{action.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{action.description}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <Link href="/scripts" className="text-xs text-accent hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-6">
            <ActivityGroup
              title="Recently generated scripts"
              emptyText="No scripts yet."
              items={data.recentScripts.map((script) => ({
                id: script.id,
                href: `/scripts/${script.id}`,
                title: script.title,
                meta: `${script.language === 'ne' ? 'Nepali' : 'English'} · ${script.duration_seconds}s · edited ${formatRelative(script.updated_at)}`,
                demo: script.is_demo,
              }))}
            />
            <ActivityGroup
              title="Recently discovered problems"
              emptyText="No problems discovered yet."
              items={data.recentProblems.map((problem) => ({
                id: problem.id,
                href: `/problems/${problem.id}`,
                title: problem.title,
                meta: `${problem.source_name} · ${formatRelative(problem.retrieved_at)}`,
                demo: problem.is_demo,
              }))}
            />
            <ActivityGroup
              title="Recent raw ideas"
              emptyText="No ideas saved yet."
              items={data.recentIdeas.map((idea) => ({
                id: idea.id,
                href: `/ideas?idea=${idea.id}`,
                title: idea.title,
                meta: `${idea.category} · ${formatRelative(idea.created_at)}`,
                demo: false,
              }))}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-accent" /> Trending content topics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.trending.length ? (
                <>
                  <p className="mb-3 text-xs text-muted">Counted from problems you have discovered.</p>
                  <ul className="space-y-2">
                    {data.trending.map(([category, count]) => (
                      <li key={category}>
                        <Link
                          href={`/problems?category=${category}`}
                          className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted transition-colors hover:border-accent-border hover:text-ink"
                        >
                          <span>{TOPIC_CATEGORIES.find((t) => t.value === category)?.label ?? category}</span>
                          <span className="tabular-nums text-xs text-faint">{count}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <DemoBadge />
                    <p className="text-xs text-muted">Example topics — no discovery data yet.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SAMPLE_TOPICS.map((topic) => (
                      <Link key={topic} href={`/problems?q=${encodeURIComponent(topic)}`}>
                        <Badge variant="outline" className="hover:border-accent-border hover:text-ink">
                          {topic}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Learned from your work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {!insights.enabled ? (
                <p className="text-muted">
                  Preference learning is off.{' '}
                  <Link href="/settings" className="text-accent hover:underline">
                    Turn it on in Settings
                  </Link>
                  .
                </p>
              ) : insights.eventCount === 0 && !insights.topTopics.length ? (
                <p className="text-muted">Nothing learned yet. Create a few scripts and your patterns will appear here.</p>
              ) : (
                <>
                  {insights.reason ? <p className="text-accent">{insights.reason}</p> : null}
                  <InsightRow label="Favourite hook style" value={insights.favouriteHookStyle?.style ?? '—'} />
                  <InsightRow
                    label="Most used duration"
                    value={insights.mostUsedDuration ? `${insights.mostUsedDuration.seconds}s` : '—'}
                  />
                  <InsightRow
                    label="Language preference"
                    value={insights.preferredLanguage ? (insights.preferredLanguage.language === 'ne' ? 'Nepali' : 'English') : '—'}
                  />
                  {insights.recommendedTopics.length ? (
                    <div className="pt-1">
                      <p className="mb-2 text-faint">Recommended topics</p>
                      <ul className="space-y-1.5">
                        {insights.recommendedTopics.slice(0, 4).map((topic) => (
                          <li key={topic}>
                            <Link
                              href={`/ideas?seed=${encodeURIComponent(topic)}`}
                              className="flex items-center gap-1.5 text-muted transition-colors hover:text-ink"
                            >
                              <ArrowRight className="h-3 w-3 text-accent" /> {topic}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {data.recentSessions.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No research yet"
          description="Start from a raw idea and Bhasika will search the internet, gather sources and pull out what is actually verifiable."
          action={
            <Link href="/ideas">
              <Button variant="primary">Research your first idea</Button>
            </Link>
          }
        />
      ) : null}
    </div>
  )
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line pb-2 last:border-0">
      <span className="text-faint">{label}</span>
      <span className="font-medium capitalize text-ink">{value}</span>
    </div>
  )
}

function ActivityGroup({
  title,
  items,
  emptyText,
}: {
  title: string
  items: { id: string; href: string; title: string; meta: string; demo: boolean }[]
  emptyText: string
}) {
  return (
    <div>
      <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wider text-faint">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-start justify-between gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-elevated"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{truncate(item.title, 72)}</p>
                  <p className="mt-0.5 truncate text-[11px] text-faint">{item.meta}</p>
                </div>
                {item.demo ? <DemoBadge className="shrink-0" /> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
