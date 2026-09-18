import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ResearchDetail } from '@/components/research/research-detail'
import { currentWorkspace } from '@/lib/user'
import { getResearchSession } from '@/lib/data'

export const metadata: Metadata = { title: 'Research session' }
export const dynamic = 'force-dynamic'

export default async function ResearchSessionPage({ params }: { params: { id: string } }) {
  const user = await currentWorkspace()
  const result = await getResearchSession(user.id, params.id)
  if (!result) notFound()

  return <ResearchDetail session={result.session} sources={result.sources} />
}
