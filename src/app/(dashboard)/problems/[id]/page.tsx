import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProblemDetail } from '@/components/problems/problem-detail'
import { requirePageUser } from '@/lib/auth/guard'
import { getProblem } from '@/lib/data'

export const metadata: Metadata = { title: 'Problem detail' }
export const dynamic = 'force-dynamic'

export default async function ProblemDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePageUser()
  const problem = await getProblem(user.id, params.id)
  if (!problem) notFound()
  return <ProblemDetail initialProblem={problem} />
}
