import type { NextRequest } from 'next/server'
import { apiHandler } from '@/lib/api'
import { requireApiUser } from '@/lib/auth/guard'
import { listIdeas } from '@/lib/data'
import { getStore, newId, now } from '@/lib/db'
import { recordEvent } from '@/lib/learning'
import { classifyCategory } from '@/lib/research/classify'
import type { Idea } from '@/lib/types'
import { ideaSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET() {
  return apiHandler(async () => {
    const user = await requireApiUser()
    return { ideas: await listIdeas(user.id) }
  })
}

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const user = await requireApiUser()
    const body = ideaSchema.parse(await request.json())
    const store = await getStore()

    const idea: Idea = {
      id: newId(),
      user_id: user.id,
      raw_text: body.raw_text,
      title: body.raw_text.replace(/\s+/g, ' ').trim().slice(0, 90),
      category: body.category === 'other' ? classifyCategory(body.raw_text) : body.category,
      language: body.language,
      duration_seconds: body.duration_seconds,
      content_type: body.content_type,
      audience: body.audience,
      audience_custom: body.audience_custom ?? null,
      platform: body.platform,
      tone: body.tone,
      created_at: now(),
      updated_at: now(),
    }
    await store.insert('ideas', idea)
    await recordEvent(user.id, 'idea.created', { category: idea.category, language: idea.language })

    return { idea }
  })
}
