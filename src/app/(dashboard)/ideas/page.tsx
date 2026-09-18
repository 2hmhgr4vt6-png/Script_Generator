import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requirePageUser } from '@/lib/auth/guard'
import { getPreferences, listIdeas } from '@/lib/data'
import { IdeaWorkspace } from '@/components/ideas/idea-workspace'

export const metadata: Metadata = { title: 'New Idea' }
export const dynamic = 'force-dynamic'

export default async function IdeasPage() {
  const user = await requirePageUser()
  const [prefs, ideas] = await Promise.all([getPreferences(user.id), listIdeas(user.id, 12)])

  return (
    <Suspense>
      <IdeaWorkspace
        recentIdeas={ideas.map((idea) => ({
          id: idea.id,
          title: idea.title,
          category: idea.category,
          created_at: idea.created_at,
        }))}
        defaults={{
          language: prefs?.default_language ?? 'ne',
          duration: prefs?.default_duration ?? 60,
          platform: prefs?.default_platform ?? 'instagram-reels',
          tone: prefs?.default_tone ?? 'relatable',
        }}
      />
    </Suspense>
  )
}
