import 'server-only'
import { workspaceCredentials, type ResolvedCredentials } from '@/lib/credentials'
import { FacebookProvider, InstagramProvider } from './providers/meta'
import { RedditProvider } from './providers/reddit'
import { RedditPublicProvider } from './providers/reddit-public'
import { StackExchangeProvider } from './providers/stackexchange'
import { YouTubeProvider } from './providers/youtube'
import type { SocialProvider, SocialStatus } from './types'

export * from './types'

export function buildSocialProviders(credentials: ResolvedCredentials): SocialProvider[] {
  const reddit = new RedditProvider(
    credentials.get('REDDIT_CLIENT_ID'),
    credentials.get('REDDIT_CLIENT_SECRET'),
    credentials.get('REDDIT_USER_AGENT'),
  )

  return [
    // Keyless sources first, so discovery works with nothing configured.
    new StackExchangeProvider(credentials.get('STACKEXCHANGE_KEY'), credentials.get('STACKEXCHANGE_BASE_URL')),
    // The authenticated Reddit API is richer; its public feed is the fallback.
    reddit.status().connected ? reddit : new RedditPublicProvider(credentials.get('REDDIT_PUBLIC_BASE_URL')),
    new YouTubeProvider(credentials.get('YOUTUBE_API_KEY'), credentials.get('YOUTUBE_BASE_URL')),
    new FacebookProvider(credentials.get('FACEBOOK_ACCESS_TOKEN')),
    new InstagramProvider(credentials.get('INSTAGRAM_ACCESS_TOKEN')),
  ]
}

export async function getSocialProviders(): Promise<SocialProvider[]> {
  return buildSocialProviders(await workspaceCredentials())
}

export async function getSocialProvider(id: string): Promise<SocialProvider | undefined> {
  return (await getSocialProviders()).find((provider) => provider.id === id)
}

export async function socialStatuses(): Promise<SocialStatus[]> {
  return (await getSocialProviders()).map((provider) => provider.status())
}

export async function connectedSocialProviders(): Promise<SocialProvider[]> {
  return (await getSocialProviders()).filter((provider) => provider.status().connected)
}
