import 'server-only'
import { env } from '@/lib/env'
import { ExaProvider } from './providers/exa'
import { SerperProvider } from './providers/serper'
import { TavilyProvider } from './providers/tavily'
import type { SearchProvider } from './types'

export * from './types'

/** Returns the configured search provider, or null when SEARCH_API_KEY is absent. */
export function getSearchProvider(): SearchProvider | null {
  if (!env.searchApiKey) return null
  switch ((env.searchProvider ?? 'tavily').toLowerCase()) {
    case 'serper':
    case 'serpapi':
      return new SerperProvider(env.searchApiKey)
    case 'exa':
      return new ExaProvider(env.searchApiKey)
    case 'tavily':
    default:
      return new TavilyProvider(env.searchApiKey)
  }
}

export function searchStatus(): { connected: boolean; provider: string | null } {
  const provider = getSearchProvider()
  return { connected: Boolean(provider), provider: provider?.name ?? (env.searchProvider ?? null) }
}
