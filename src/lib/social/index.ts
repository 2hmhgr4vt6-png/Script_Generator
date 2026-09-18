import 'server-only'
import { FacebookProvider, InstagramProvider } from './providers/meta'
import { RedditProvider } from './providers/reddit'
import { YouTubeProvider } from './providers/youtube'
import type { SocialProvider, SocialStatus } from './types'

export * from './types'

export function getSocialProviders(): SocialProvider[] {
  return [new RedditProvider(), new YouTubeProvider(), new FacebookProvider(), new InstagramProvider()]
}

export function getSocialProvider(id: string): SocialProvider | undefined {
  return getSocialProviders().find((p) => p.id === id)
}

export function socialStatuses(): SocialStatus[] {
  return getSocialProviders().map((p) => p.status())
}

export function connectedSocialProviders(): SocialProvider[] {
  return getSocialProviders().filter((p) => p.status().connected)
}
