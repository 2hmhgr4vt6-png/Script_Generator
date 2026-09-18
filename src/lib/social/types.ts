export interface SocialPost {
  id: string
  platform: string
  sourceName: string
  title: string
  excerpt: string
  url: string
  postedAt: string | null
  score?: number
}

export interface SocialStatus {
  id: string
  label: string
  connected: boolean
  /** Explains exactly what is missing, so Settings can tell the user what to add. */
  message: string
  docsUrl: string
  requiredEnv: string[]
}

export interface SocialProvider {
  readonly id: string
  readonly label: string
  status(): SocialStatus
  /** Only called when status().connected is true. */
  discover(query: string, options?: { limit?: number }): Promise<SocialPost[]>
}

export class SocialProviderError extends Error {
  constructor(
    message: string,
    readonly code: 'not-connected' | 'invalid-key' | 'rate-limited' | 'upstream' = 'upstream',
  ) {
    super(message)
    this.name = 'SocialProviderError'
  }
}
