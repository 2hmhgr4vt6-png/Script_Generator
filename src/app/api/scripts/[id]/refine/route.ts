import type { NextRequest } from 'next/server'
import { AppError, apiHandler } from '@/lib/api'
import { requireApiUser } from '@/lib/auth/guard'
import { getScript } from '@/lib/data'
import { recordEvent } from '@/lib/learning'
import { refineScript, refineSection, type EditAction } from '@/lib/scripts/edit'
import { refineSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * Returns the refined text without saving it. The editor shows it as a
 * proposal so a section rewrite never silently replaces the whole script.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return apiHandler(async () => {
    const user = await requireApiUser()
    const script = await getScript(user.id, params.id)
    if (!script) throw new AppError('That script was not found.', 404, 'not_found')

    const body = refineSchema.parse(await request.json())
    const action = body.action as EditAction
    await recordEvent(user.id, 'ai.action', { action, script_id: script.id })

    if (body.section_key) {
      const section = script.sections.find((s) => s.key === body.section_key)
      if (!section) throw new AppError('That section does not exist.', 404, 'not_found')
      const content = await refineSection({ script, section, action, customInstruction: body.instruction })
      return { scope: 'section', section_key: section.key, content }
    }

    const result = await refineScript({
      script,
      action,
      targetLanguage: body.target_language,
      targetSeconds: body.target_seconds,
      customInstruction: body.instruction,
    })
    return {
      scope: 'script',
      sections: result.sections,
      language: result.language,
      duration_seconds: result.durationSeconds,
    }
  })
}
