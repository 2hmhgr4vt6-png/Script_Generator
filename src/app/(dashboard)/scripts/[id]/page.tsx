import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ScriptEditor } from '@/components/scripts/script-editor'
import { requirePageUser } from '@/lib/auth/guard'
import { getScript, listVersions } from '@/lib/data'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return { title: 'Script Studio' }
}

export default async function ScriptPage({ params }: { params: { id: string } }) {
  const user = await requirePageUser()
  const script = await getScript(user.id, params.id)
  if (!script) notFound()
  const versions = await listVersions(script.id)

  return <ScriptEditor initialScript={script} initialVersions={versions} />
}
