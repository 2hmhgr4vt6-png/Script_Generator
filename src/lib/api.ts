import 'server-only'
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = 'bad_request',
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * Wraps a route handler so every failure becomes a safe JSON error.
 * Internal details are logged, never returned to the client.
 */
export function apiHandler<T>(handler: () => Promise<T>): Promise<NextResponse> {
  return handler()
    .then((data) => NextResponse.json(data ?? { ok: true }))
    .catch((error: unknown) => {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: error.issues[0]?.message ?? 'That input is not valid.', code: 'validation', issues: error.issues },
          { status: 422 },
        )
      }
      if (error instanceof AppError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      const message = (error as Error)?.message ?? 'Something went wrong.'
      console.error('[bhasika:api]', (error as Error)?.name, message)
      // Provider errors are written to be safe to surface; anything else is generic.
      const safe = /provider|api key|rate limit|timed out|not connected|AI |search|Reddit|YouTube/i.test(message)
      return NextResponse.json(
        { error: safe ? message : 'Something went wrong. Please try again.', code: 'server_error' },
        { status: 500 },
      )
    })
}

export function noStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store')
  return response
}
