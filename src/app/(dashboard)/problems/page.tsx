import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ProblemBoard } from '@/components/problems/problem-board'
import { currentWorkspace } from '@/lib/user'
import { listProblems } from '@/lib/data'
import { socialStatuses } from '@/lib/social'
import { searchStatus } from '@/lib/search'

export const metadata: Metadata = { title: 'Audience Problems' }
export const dynamic = 'force-dynamic'

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: { category?: string; platform?: string; status?: string; language?: string; q?: string }
}) {
  const user = await currentWorkspace()
  const [problems, sources, search] = await Promise.all([
    listProblems(user.id, {
      category: searchParams.category as never,
      platform: searchParams.platform,
      status: searchParams.status as never,
      language: searchParams.language as never,
      q: searchParams.q,
    }),
    socialStatuses(),
    searchStatus(),
  ])

  return (
    <Suspense>
      <ProblemBoard
        initialProblems={problems}
        sources={sources}
        webSearchConnected={search.connected}
      />
    </Suspense>
  )
}
