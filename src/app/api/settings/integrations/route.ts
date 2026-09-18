import type { NextRequest } from 'next/server'
import { AppError, apiHandler } from '@/lib/api'
import { credentialsHealth, integrationStates, saveIntegration, deleteIntegration } from '@/lib/credentials'
import { currentWorkspace } from '@/lib/user'
import { integrationSaveSchema, integrationDeleteSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

/** Returns configuration state and masked previews. Never returns a secret. */
export async function GET() {
  return apiHandler(async () => {
    const user = await currentWorkspace()
    const [integrations, health] = await Promise.all([integrationStates(user.id), credentialsHealth()])
    return { integrations, ...health }
  })
}

export async function PUT(request: NextRequest) {
  return apiHandler(async () => {
    const user = await currentWorkspace()
    const body = integrationSaveSchema.parse(await request.json())
    await saveIntegration(user.id, body.provider, body.fields)
    return { integrations: await integrationStates(user.id) }
  })
}

export async function DELETE(request: NextRequest) {
  return apiHandler(async () => {
    const user = await currentWorkspace()
    const body = integrationDeleteSchema.parse(await request.json())
    const removed = await deleteIntegration(user.id, body.provider)
    if (!removed) throw new AppError('Nothing was stored for that integration.', 404, 'not_found')
    return { integrations: await integrationStates(user.id) }
  })
}
