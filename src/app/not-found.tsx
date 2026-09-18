import Link from 'next/link'
import { Wordmark } from '@/components/layout/logo'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Wordmark />
      <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        That page does not exist, or the item you were looking for has been deleted.
      </p>
      <Link href="/dashboard" className="mt-6">
        <Button variant="primary">Back to dashboard</Button>
      </Link>
    </main>
  )
}
