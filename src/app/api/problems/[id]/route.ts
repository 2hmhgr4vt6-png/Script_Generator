import type { NextRequest } from 'next/server'
import { AppError, apiHandler } from '@/lib/api'
import { currentWorkspace } from '@/lib/user'
import { getProblem } from '@/lib/data'
import { getStore, now } from '@/lib/db'
import { problemUpdateSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  return apiHandler(async () => {
    const user = await currentWorkspace()
    const problem = await getProblem(user.id, params.id)
    if (!problem) throw new AppError('That problem was not found.', 404, 'not_found')
    return { problem }
  })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return apiHandler(async () => {
    const user = await currentWorkspace()
    const problem = await getProblem(user.id, params.id)
    if (!problem) throw new AppError('That problem was not found.', 404, 'not_found')

    const body = problemUpdateSchema.parse(await request.json())
    const store = await getStore()
    const updated = await store.update('audience_problems', params.id, { ...body, updated_at: now() })
    return { problem: updated }
  })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  return apiHandler(async () => {
    const user = await currentWorkspace()
    const problem = await getProblem(user.id, params.id)
    if (!problem) throw new AppError('That problem was not found.', 404, 'not_found')
    const store = await getStore()
    await store.remove('audience_problems', params.id)
    return { ok: true }
  })
}
