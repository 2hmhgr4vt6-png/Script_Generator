import type { Metadata } from 'next'
import { Suspense } from 'react'
import { isAdminProvisioned } from '@/lib/auth/service'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Sign in' }
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Suspense>
        <LoginForm provisioned={isAdminProvisioned()} />
      </Suspense>
    </main>
  )
}
