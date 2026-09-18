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
 * Errors whose message is written for the person using the studio.
 *
 * These are matched by name rather than by pattern-matching the message: a
 * regex over wording silently swallowed real provider errors ("Gemini returned
 * an empty response", "The AI response could not be parsed") and replaced them
 * with a generic sentence, which left no way to tell what had actually failed.
 */
const USER_FACING_ERRORS = new Set([
  'AIProviderError',
  'SearchProviderError',
  'SocialProviderError',
  'AppError',
])

/**
 * Wraps a route handler so every failure becomes a JSON error.
 *
 * Provider and validation errors are surfaced verbatim. Anything unexpected is
 * logged in full server-side and reported generically, since it may carry
 * internals that should not reach the client.
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

      const name = (error as Error)?.name ?? 'Error'
      const message = (error as Error)?.message ?? 'Something went wrong.'
      console.error('[bhasika:api]', name, message, (error as Error)?.stack)

      if (USER_FACING_ERRORS.has(name)) {
        const details = (error as { details?: string[] }).details
        return NextResponse.json(
          { error: message, code: 'provider_error', ...(details?.length ? { details } : {}) },
          { status: 502 },
        )
      }
      return NextResponse.json(
        { error: `Something went wrong: ${message}`, code: 'server_error' },
        { status: 500 },
      )
    })
}

export function noStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store')
  return response
}
