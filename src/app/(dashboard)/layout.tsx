import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { currentWorkspace } from '@/lib/user'
import { getPreferences } from '@/lib/data'
import { isDemoMode } from '@/lib/credentials'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentWorkspace()
  const prefs = await getPreferences(user.id)
  const demoMode = await isDemoMode()

  return (
    <div className="flex min-h-screen">
      <Sidebar demoMode={demoMode} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar defaultLanguage={prefs?.default_language ?? 'ne'} demoMode={demoMode} />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
