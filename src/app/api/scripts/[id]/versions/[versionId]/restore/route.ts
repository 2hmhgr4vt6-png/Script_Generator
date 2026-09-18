import type { NextRequest } from 'next/server'
import { AppError, apiHandler } from '@/lib/api'
import { requireApiUser } from '@/lib/auth/guard'
import { getScript } from '@/lib/data'
import { getStore, newId, now } from '@/lib/db'
import type { ScriptVersion } from '@/lib/types'

export const dynamic = 'force-dynamic'

/** Restoring keeps history intact: the current text is saved as a new version first. */
export async function POST(_request: NextRequest, { params }: { params: { id: string; versionId: string } }) {
  return apiHandler(async () => {
    const user = await requireApiUser()
    const script = await getScript(user.id, params.id)
    if (!script) throw new AppError('That script was not found.', 404, 'not_found')

    const store = await getStore()
    const version = await store.get<ScriptVersion>('script_versions', params.versionId)
    if (!version || version.script_id !== script.id) {
      throw new AppError('That version was not found.', 404, 'not_found')
    }

    await store.insert('script_versions', {
      id: newId(),
      script_id: script.id,
      user_id: user.id,
      version: script.version_count + 1,
      sections: version.sections,
      label: `Restored version ${version.version}`,
      created_at: now(),
    } satisfies ScriptVersion)

    const updated = await store.update('scripts', script.id, {
      sections: version.sections,
      version_count: script.version_count + 1,
      updated_at: now(),
    })
    return { script: updated }
  })
}
