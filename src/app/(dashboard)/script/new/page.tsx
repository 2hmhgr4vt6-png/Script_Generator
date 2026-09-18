import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ScriptWizard } from '@/components/scripts/script-wizard'
import { requirePageUser } from '@/lib/auth/guard'
import { getIdea, getPreferences, getProblem, getResearchSession } from '@/lib/data'

export const metadata: Metadata = { title: 'Script Studio' }
export const dynamic = 'force-dynamic'

export default async function NewScriptPage({
  searchParams,
}: {
  searchParams: { idea?: string; problem?: string; session?: string; sources?: string; angle?: string }
}) {
  const user = await requirePageUser()
  const [prefs, idea, problem, research] = await Promise.all([
    getPreferences(user.id),
    searchParams.idea ? getIdea(user.id, searchParams.idea) : null,
    searchParams.problem ? getProblem(user.id, searchParams.problem) : null,
    searchParams.session ? getResearchSession(user.id, searchParams.session) : null,
  ])

  return (
    <Suspense>
      <ScriptWizard
        idea={idea}
        problem={problem}
        session={research?.session ?? null}
        sources={research?.sources ?? []}
        preselectedSourceIds={searchParams.sources?.split(',').filter(Boolean) ?? []}
        angle={searchParams.angle ?? null}
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
