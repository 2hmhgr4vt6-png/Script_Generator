import type { NextRequest } from 'next/server'
import { apiHandler } from '@/lib/api'
import { requireApiUser } from '@/lib/auth/guard'
import { listProblems } from '@/lib/data'
import { socialStatuses } from '@/lib/social'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    const user = await requireApiUser()
    const params = request.nextUrl.searchParams
    const problems = await listProblems(user.id, {
      category: (params.get('category') as never) ?? undefined,
      platform: params.get('platform') ?? undefined,
      status: (params.get('status') as never) ?? undefined,
      language: (params.get('language') as never) ?? undefined,
      q: params.get('q') ?? undefined,
    })
    return { problems, sources: socialStatuses() }
  })
}
