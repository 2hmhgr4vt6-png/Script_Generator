import type { NextRequest } from 'next/server'
import { AppError, apiHandler } from '@/lib/api'
import { requireApiUser } from '@/lib/auth/guard'
import { getScript, listVersions } from '@/lib/data'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  return apiHandler(async () => {
    const user = await requireApiUser()
    const script = await getScript(user.id, params.id)
    if (!script) throw new AppError('That script was not found.', 404, 'not_found')
    return { versions: await listVersions(params.id) }
  })
}
