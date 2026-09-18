'use client'

import { AlertTriangle, ArrowRight, Lock, Mail } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Wordmark } from '@/components/layout/logo'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/utils'

export function LoginForm({ provisioned }: { provisioned: boolean }) {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(
    params.get('error') === 'session-expired' ? 'Your session expired. Please sign in again.' : null,
  )
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      router.push(next && next.startsWith('/') ? next : '/dashboard')
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mb-6 flex justify-center">
          <Wordmark />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Bhasika AI Content Studio</h1>
        <p className="mt-2 text-sm text-muted">Your content research, powered by AI.</p>
      </div>

      <form onSubmit={onSubmit} className="panel space-y-4 p-6" noValidate>
        {!provisioned ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-xs leading-relaxed text-muted">
              No admin account is provisioned yet. Set <code className="text-ink">BHASIKA_ADMIN_EMAIL</code> and{' '}
              <code className="text-ink">BHASIKA_ADMIN_PASSWORD_HASH</code> in your environment — see the README.
            </p>
          </div>
        ) : null}

        <Field label="Email">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@bhasika.com"
              autoComplete="email"
              required
              className="pl-9"
            />
          </div>
        </Field>

        <Field label="Password">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="pl-9"
            />
          </div>
        </Field>

        {error ? (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="primary" className="w-full" loading={loading}>
          {loading ? 'Signing in…' : 'Log in'}
          {!loading ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-faint">
        Internal Bhasika tool. We explain. You decide.
      </p>
    </div>
  )
}
