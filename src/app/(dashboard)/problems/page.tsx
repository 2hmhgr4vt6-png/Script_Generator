import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ProblemBoard } from '@/components/problems/problem-board'
import { requirePageUser } from '@/lib/auth/guard'
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
  const user = await requirePageUser()
  const problems = await listProblems(user.id, {
    category: searchParams.category as never,
    platform: searchParams.platform,
    status: searchParams.status as never,
    language: searchParams.language as never,
    q: searchParams.q,
  })

  return (
    <Suspense>
      <ProblemBoard
        initialProblems={problems}
        sources={socialStatuses()}
        webSearchConnected={searchStatus().connected}
      />
    </Suspense>
  )
}
