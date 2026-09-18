import type { NextRequest } from 'next/server'
import { AppError, apiHandler } from '@/lib/api'
import { currentWorkspace } from '@/lib/user'
import { getScript } from '@/lib/data'
import { recordEvent } from '@/lib/learning'
import { factCheckScript } from '@/lib/scripts/edit'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  return apiHandler(async () => {
    const user = await currentWorkspace()
    const script = await getScript(user.id, params.id)
    if (!script) throw new AppError('That script was not found.', 404, 'not_found')

    const claims = await factCheckScript(script)
    await recordEvent(user.id, 'ai.action', { action: 'fact-check', script_id: script.id })
    return { claims, sourceCount: script.sources.length }
  })
}
