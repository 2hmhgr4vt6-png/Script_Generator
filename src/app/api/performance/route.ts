import type { NextRequest } from 'next/server'
import { apiHandler } from '@/lib/api'
import { analysePerformance, listPerformanceReports } from '@/lib/trends/performance'
import { currentWorkspace } from '@/lib/user'
import { performanceScanSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET() {
  return apiHandler(async () => {
    const user = await currentWorkspace()
    return { reports: await listPerformanceReports(user.id) }
  })
}

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const user = await currentWorkspace()
    const body = performanceScanSchema.parse(await request.json().catch(() => ({})))
    return { report: await analysePerformance({ userId: user.id, topic: body.topic, limit: body.limit }) }
  })
}
