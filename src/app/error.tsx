'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[bhasika:render]', error.message)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        The page could not be rendered. Try again — if it keeps happening, check the server logs.
      </p>
      <div className="mt-6 flex gap-2">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <a href="/dashboard">
          <Button variant="ghost">Back to dashboard</Button>
        </a>
      </div>
    </main>
  )
}
