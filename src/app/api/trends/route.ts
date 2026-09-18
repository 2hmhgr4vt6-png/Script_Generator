import type { NextRequest } from 'next/server'
import { apiHandler } from '@/lib/api'
import { listTrendScans, runTrendScan } from '@/lib/trends/scan'
import { currentWorkspace } from '@/lib/user'
import { trendScanSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET() {
  return apiHandler(async () => {
    const user = await currentWorkspace()
    return { scans: await listTrendScans(user.id) }
  })
}

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const user = await currentWorkspace()
    const body = trendScanSchema.parse(await request.json().catch(() => ({})))
    return { scan: await runTrendScan({ userId: user.id, region: body.region }) }
  })
}
