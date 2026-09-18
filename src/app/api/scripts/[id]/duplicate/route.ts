import type { NextRequest } from 'next/server'
import { AppError, apiHandler } from '@/lib/api'
import { requireApiUser } from '@/lib/auth/guard'
import { getScript } from '@/lib/data'
import { getStore, newId, now } from '@/lib/db'
import type { Script, ScriptVersion } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  return apiHandler(async () => {
    const user = await requireApiUser()
    const original = await getScript(user.id, params.id)
    if (!original) throw new AppError('That script was not found.', 404, 'not_found')

    const store = await getStore()
    const copy: Script = {
      ...original,
      id: newId(),
      title: `${original.title} (copy)`,
      status: 'draft',
      version_count: 1,
      created_at: now(),
      updated_at: now(),
    }
    await store.insert('scripts', copy)
    await store.insert('script_versions', {
      id: newId(),
      script_id: copy.id,
      user_id: user.id,
      version: 1,
      sections: copy.sections,
      label: `Duplicated from "${original.title}"`,
      created_at: now(),
    } satisfies ScriptVersion)

    return { script: copy }
  })
}
