import type { NextRequest } from 'next/server'
import { apiHandler } from '@/lib/api'
import { currentWorkspace } from '@/lib/user'
import { ensurePreferences } from '@/lib/user'
import { getStore, now } from '@/lib/db'
import { preferencesSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET() {
  return apiHandler(async () => {
    const user = await currentWorkspace()
    return { preferences: await ensurePreferences(user.id) }
  })
}

export async function PATCH(request: NextRequest) {
  return apiHandler(async () => {
    const user = await currentWorkspace()
    const prefs = await ensurePreferences(user.id)
    const body = preferencesSchema.parse(await request.json())
    const store = await getStore()
    const updated = await store.update('user_preferences', prefs.id, { ...body, updated_at: now() })
    return { preferences: updated }
  })
}
