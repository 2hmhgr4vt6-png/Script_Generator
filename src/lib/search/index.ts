import 'server-only'
import { workspaceCredentials, type ResolvedCredentials } from '@/lib/credentials'
import { ExaProvider } from './providers/exa'
import { SerperProvider } from './providers/serper'
import { TavilyProvider } from './providers/tavily'
import type { SearchProvider } from './types'

export * from './types'

export function buildSearchProvider(credentials: ResolvedCredentials): SearchProvider | null {
  const apiKey = credentials.get('SEARCH_API_KEY')
  if (!apiKey) return null

  switch ((credentials.get('SEARCH_PROVIDER') ?? 'tavily').toLowerCase()) {
    case 'serper':
    case 'serpapi':
      return new SerperProvider(apiKey)
    case 'exa':
      return new ExaProvider(apiKey)
    case 'tavily':
    default:
      return new TavilyProvider(apiKey)
  }
}

export async function getSearchProvider(): Promise<SearchProvider | null> {
  return buildSearchProvider(await workspaceCredentials())
}

export async function searchStatus(): Promise<{ connected: boolean; provider: string | null }> {
  const credentials = await workspaceCredentials()
  const provider = buildSearchProvider(credentials)
  return { connected: Boolean(provider), provider: provider?.name ?? credentials.get('SEARCH_PROVIDER') ?? null }
}
