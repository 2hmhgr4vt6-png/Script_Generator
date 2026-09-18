import type { Metadata } from 'next'
import { PerformanceBoard } from '@/components/trends/performance-board'
import { listPerformanceReports } from '@/lib/trends/performance'
import { currentWorkspace } from '@/lib/user'

export const metadata: Metadata = { title: 'What is working' }
export const dynamic = 'force-dynamic'

export default async function PerformancePage() {
  const user = await currentWorkspace()
  return <PerformanceBoard initialReports={await listPerformanceReports(user.id)} />
}
