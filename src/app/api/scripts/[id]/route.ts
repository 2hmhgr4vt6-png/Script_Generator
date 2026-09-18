import type { NextRequest } from 'next/server'
import { AppError, apiHandler } from '@/lib/api'
import { requireApiUser } from '@/lib/auth/guard'
import { getScript } from '@/lib/data'
import { getStore, newId, now } from '@/lib/db'
import { recordEvent } from '@/lib/learning'
import type { ScriptVersion } from '@/lib/types'
import { scriptUpdateSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  return apiHandler(async () => {
    const user = await requireApiUser()
    const script = await getScript(user.id, params.id)
    if (!script) throw new AppError('That script was not found.', 404, 'not_found')
    return { script }
  })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return apiHandler(async () => {
    const user = await requireApiUser()
    const script = await getScript(user.id, params.id)
    if (!script) throw new AppError('That script was not found.', 404, 'not_found')

    const body = scriptUpdateSchema.parse(await request.json())
    const store = await getStore()

    const patch: Record<string, unknown> = { updated_at: now() }
    for (const key of ['title', 'status', 'language', 'duration_seconds', 'platform', 'tone'] as const) {
      if (body[key] !== undefined) patch[key] = body[key]
    }

    // Editing the text always snapshots the previous version first.
    if (body.sections) {
      const changed = JSON.stringify(body.sections) !== JSON.stringify(script.sections)
      if (changed) {
        const version: ScriptVersion = {
          id: newId(),
          script_id: script.id,
          user_id: user.id,
          version: script.version_count + 1,
          sections: body.sections,
          label: body.version_label ?? 'Manual edit',
          created_at: now(),
        }
        await store.insert('script_versions', version)
        patch.sections = body.sections
        patch.version_count = script.version_count + 1
        await recordEvent(user.id, 'script.edited', { script_id: script.id })
      }
    }

    const updated = await store.update('scripts', params.id, patch)
    return { script: updated }
  })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  return apiHandler(async () => {
    const user = await requireApiUser()
    const script = await getScript(user.id, params.id)
    if (!script) throw new AppError('That script was not found.', 404, 'not_found')
    const store = await getStore()
    await store.removeWhere('script_versions', { script_id: params.id })
    await store.remove('scripts', params.id)
    return { ok: true }
  })
}
