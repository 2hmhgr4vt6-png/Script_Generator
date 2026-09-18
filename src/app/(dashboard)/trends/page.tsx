import type { Metadata } from 'next'
import { TrendBoard } from '@/components/trends/trend-board'
import { listTrendScans } from '@/lib/trends/scan'
import { currentWorkspace } from '@/lib/user'

export const metadata: Metadata = { title: 'Trends' }
export const dynamic = 'force-dynamic'

export default async function TrendsPage() {
  const user = await currentWorkspace()
  return <TrendBoard initialScans={await listTrendScans(user.id)} />
}
