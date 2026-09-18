import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(value: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', ...opts })
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const diff = Date.now() - date.getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(value)
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return `${text.slice(0, length).trimEnd()}…`
}

export function greeting(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Small typed fetch wrapper that surfaces the API's error message.
 *
 * When the response is not JSON — a gateway timeout, a proxy error page, a
 * crashed worker — there is no `error` field to read. Rather than substituting
 * a generic sentence (which hides the only evidence available), report the
 * status and the start of the body.
 */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch (error) {
    throw new Error(
      `Could not reach the server (${(error as Error).message}). Is it still running?`,
    )
  }

  const text = await response.text()
  let data: unknown = {}
  let parsed = true
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    parsed = false
  }

  if (!response.ok) {
    const apiMessage = parsed ? (data as { error?: string }).error : undefined
    if (apiMessage) throw new Error(apiMessage)

    const snippet = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
    if (response.status === 504 || response.status === 408) {
      throw new Error(
        `The request timed out (HTTP ${response.status}). Free AI tiers can be slow — try a shorter duration, or a faster model such as Groq.`,
      )
    }
    throw new Error(
      `HTTP ${response.status} from ${url}${snippet ? ` — ${snippet}` : ' with an empty body'}`,
    )
  }

  if (!parsed) throw new Error(`The server returned a response that was not JSON: ${text.slice(0, 200)}`)
  return data as T
}
