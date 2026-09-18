import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ScriptHistory } from '@/components/scripts/script-history'
import { currentWorkspace } from '@/lib/user'
import { listScripts, type ScriptFilters } from '@/lib/data'

export const metadata: Metadata = { title: 'Script History' }
export const dynamic = 'force-dynamic'

export default async function ScriptsPage({ searchParams }: { searchParams: ScriptFilters }) {
  const user = await currentWorkspace()
  const scripts = await listScripts(user.id, searchParams)
  return (
    <Suspense>
      <ScriptHistory initialScripts={scripts} />
    </Suspense>
  )
}
