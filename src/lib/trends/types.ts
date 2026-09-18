/** Shared types for content-performance analysis and trend research. */

/** One piece of published content, with whatever engagement its platform reports. */
export interface ContentSignal {
  id: string
  platform: 'youtube' | 'reddit' | 'stackexchange'
  title: string
  url: string
  author: string | null
  publishedAt: string | null
  /** Raw platform counters. Absent where the platform does not report one. */
  views: number | null
  likes: number | null
  comments: number | null
  /**
   * Comparable score across platforms, 0-100.
   *
   * Absolute counts cannot be compared between a YouTube video and a Reddit
   * post, so each item is ranked against the others from the same platform in
   * the same scan. This measures "did this do well for its platform", not
   * "is this big".
   */
  performance: number
  /** Assigned by the AI pass: what kind of content this is. */
  format: string | null
  angle: string | null
}

export interface PerformancePattern {
  pattern: string
  evidence: string
  recommendation: string
}

export interface PerformanceReport {
  id: string
  user_id: string
  topic: string
  region: string
  created_at: string
  is_demo: boolean
  signals: ContentSignal[]
  /** What the winning content has in common. */
  patterns: PerformancePattern[]
  /** Formats ranked by median performance within this scan. */
  formats: { format: string; count: number; medianPerformance: number }[]
  summary: string
  source_notes: string[]
}

/** A term or topic currently getting attention, from a platform that publishes such a list. */
export interface TrendItem {
  id: string
  source: 'google-trends' | 'youtube'
  title: string
  url: string | null
  /** Google Trends reports an approximate search volume; YouTube reports views. */
  volume: string | null
  volumeValue: number | null
  capturedAt: string
  relatedQueries: string[]
}

/** How Bhasika could use a trend without pretending to be something it is not. */
export interface TrendAngle {
  trend: string
  relevance: 'direct' | 'adaptable' | 'stretch'
  idea: string
  hook: string
  why: string
  caution: string | null
}

export interface TrendScan {
  id: string
  user_id: string
  region: string
  created_at: string
  is_demo: boolean
  trends: TrendItem[]
  angles: TrendAngle[]
  summary: string
  source_notes: string[]
}

/** Regions the trend feeds are requested for. */
export const TREND_REGIONS = [
  { value: 'NP', label: 'Nepal' },
  { value: 'DE', label: 'Germany' },
  { value: 'IN', label: 'India' },
  { value: 'US', label: 'United States' },
] as const
