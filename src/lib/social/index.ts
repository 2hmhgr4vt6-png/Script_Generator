import 'server-only'
import { workspaceCredentials, type ResolvedCredentials } from '@/lib/credentials'
import { FacebookProvider, InstagramProvider } from './providers/meta'
import { RedditProvider } from './providers/reddit'
import { YouTubeProvider } from './providers/youtube'
import type { SocialProvider, SocialStatus } from './types'

export * from './types'

export function buildSocialProviders(credentials: ResolvedCredentials): SocialProvider[] {
  return [
    new RedditProvider(
      credentials.get('REDDIT_CLIENT_ID'),
      credentials.get('REDDIT_CLIENT_SECRET'),
      credentials.get('REDDIT_USER_AGENT'),
    ),
    new YouTubeProvider(credentials.get('YOUTUBE_API_KEY')),
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
