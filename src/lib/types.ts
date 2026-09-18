/** Shared domain types for the Bhasika AI Content Studio. */

export type Language = 'ne' | 'en'

export const LANGUAGES: { value: Language; label: string; native: string }[] = [
  { value: 'ne', label: 'Nepali', native: 'नेपाली' },
  { value: 'en', label: 'English', native: 'English' },
]

export type ContentType =
  | 'educational'
  | 'problem-solving'
  | 'awareness'
  | 'myth-busting'
  | 'storytelling'
  | 'explainer'
  | 'comparison'
  | 'faq'

export const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'educational', label: 'Educational' },
  { value: 'problem-solving', label: 'Problem-solving' },
  { value: 'awareness', label: 'Awareness' },
  { value: 'myth-busting', label: 'Myth-busting' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'explainer', label: 'Explainer' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'faq', label: 'FAQ' },
]

export type Audience =
  | 'nepali-students'
  | 'germany-applicants'
  | 'bachelors-students'
  | 'masters-students'
  | 'parents'
  | 'general'
  | 'custom'

export const AUDIENCES: { value: Audience; label: string }[] = [
  { value: 'nepali-students', label: 'Nepali students' },
  { value: 'germany-applicants', label: 'Germany applicants' },
  { value: 'bachelors-students', label: "Bachelor's students" },
  { value: 'masters-students', label: "Master's students" },
  { value: 'parents', label: 'Parents' },
  { value: 'general', label: 'General audience' },
  { value: 'custom', label: 'Custom' },
]

export type Platform = 'tiktok' | 'instagram-reels' | 'facebook-reels' | 'youtube-shorts' | 'youtube'

export const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram-reels', label: 'Instagram Reels' },
  { value: 'facebook-reels', label: 'Facebook Reels' },
  { value: 'youtube-shorts', label: 'YouTube Shorts' },
  { value: 'youtube', label: 'YouTube' },
]

export type Tone = 'friendly' | 'relatable' | 'professional' | 'direct' | 'conversational' | 'storytelling'

export const TONES: { value: Tone; label: string }[] = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'relatable', label: 'Relatable' },
  { value: 'professional', label: 'Professional' },
  { value: 'direct', label: 'Direct' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'storytelling', label: 'Storytelling' },
]

export const DURATIONS: { value: number; label: string }[] = [
  { value: 30, label: '30 seconds' },
  { value: 45, label: '45 seconds' },
  { value: 60, label: '60 seconds' },
  { value: 90, label: '90 seconds' },
  { value: 120, label: '2 minutes' },
  { value: 180, label: '3 minutes' },
]

export type TopicCategory =
  | 'admission'
  | 'visa'
  | 'eligibility'
  | 'language'
  | 'ects'
  | 'tuition'
  | 'student-jobs'
  | 'cost-of-living'
  | 'career'
  | 'study-abroad'
  | 'other'

export const TOPIC_CATEGORIES: { value: TopicCategory; label: string }[] = [
  { value: 'admission', label: 'Admission confusion' },
  { value: 'visa', label: 'Visa confusion' },
  { value: 'eligibility', label: 'University eligibility' },
  { value: 'language', label: 'IELTS / German language' },
  { value: 'ects', label: 'ECTS' },
  { value: 'tuition', label: 'Tuition fees' },
  { value: 'student-jobs', label: 'Student jobs' },
  { value: 'cost-of-living', label: 'Cost of living' },
  { value: 'career', label: 'Career' },
  { value: 'study-abroad', label: 'General study abroad' },
  { value: 'other', label: 'Other' },
]

export type SourceType = 'official' | 'government' | 'university' | 'news' | 'community' | 'blog' | 'social' | 'unknown'

export type VerificationStatus =
  | 'verified-by-source'
  | 'needs-verification'
  | 'conflicting-sources'
  | 'opinion'
  | 'not-enough-information'

export type HookStyle = 'situation' | 'pain-point' | 'curiosity' | 'direct-question' | 'myth-busting'

export const HOOK_STYLES: { value: HookStyle; label: string }[] = [
  { value: 'situation', label: 'Situation-based' },
  { value: 'pain-point', label: 'Pain-point' },
  { value: 'curiosity', label: 'Curiosity' },
  { value: 'direct-question', label: 'Direct question' },
  { value: 'myth-busting', label: 'Myth-busting' },
]

export type ScriptStatus = 'draft' | 'ready' | 'published' | 'archived'
export type ProblemStatus = 'new' | 'saved' | 'script-created' | 'dismissed'

export interface User {
  id: string
  email: string
  name: string | null
  role: string
  created_at: string
  updated_at: string
}

export interface UserPreferences {
  id: string
  user_id: string
  default_language: Language
  default_duration: number
  default_platform: Platform
  default_tone: Tone
  learning_enabled: boolean
  research_schedule: 'off' | 'daily' | 'every-6-hours' | 'custom'
  research_schedule_cron: string | null
  created_at: string
  updated_at: string
}

export interface Idea {
  id: string
  user_id: string
  raw_text: string
  title: string
  category: TopicCategory
  language: Language
  duration_seconds: number
  content_type: ContentType
  audience: Audience
  audience_custom: string | null
  platform: Platform
  tone: Tone
  created_at: string
  updated_at: string
}

export interface ResearchSession {
  id: string
  user_id: string
  idea_id: string | null
  query: string
  status: 'searching' | 'reading' | 'extracting' | 'identifying-problems' | 'complete' | 'error'
  provider: string
  is_demo: boolean
  queries: string[]
  facts: ResearchFact[]
  conflicts: string[]
  summary: string
  error: string | null
  created_at: string
  updated_at: string
}

export interface ResearchFact {
  claim: string
  source_url: string | null
  source_title: string | null
  status: VerificationStatus
  kind: 'fact' | 'opinion'
  note?: string
}

export interface ResearchSource {
  id: string
  user_id: string
  session_id: string
  title: string
  url: string
  domain: string
  excerpt: string
  published_at: string | null
  source_type: SourceType
  relevance: number
  verification: VerificationStatus
  selected: boolean
  is_demo: boolean
  created_at: string
}

export interface AudienceProblem {
  id: string
  user_id: string
  session_id: string | null
  title: string
  excerpt: string
  platform: string
  source_name: string
  source_url: string
  retrieved_at: string
  posted_at: string | null
  category: TopicCategory
  language: Language
  relevance: number
  status: ProblemStatus
  analysis: ProblemAnalysis | null
  related_questions: string[]
  is_demo: boolean
  created_at: string
  updated_at: string
}

export interface ProblemAnalysis {
  confusion: string
  situation: string
  misconception: string
  information_needed: string
  takeaway: string
  why_it_matters: string
  content_angles: string[]
}

export interface HookOption {
  id: string
  text: string
  style: HookStyle
  estimated_seconds: number
  rationale: string
  recommended: boolean
}

export interface ScriptSection {
  key: 'hook' | 'problem' | 'solution' | 'cta'
  heading: string
  content: string
}

export interface Script {
  id: string
  user_id: string
  idea_id: string | null
  problem_id: string | null
  research_session_id: string | null
  title: string
  language: Language
  duration_seconds: number
  platform: Platform
  category: TopicCategory
  content_type: ContentType
  audience: Audience
  tone: Tone
  hook_style: HookStyle | null
  sections: ScriptSection[]
  sources: { title: string; url: string }[]
  status: ScriptStatus
  is_demo: boolean
  version_count: number
  created_at: string
  updated_at: string
}

export interface ScriptVersion {
  id: string
  script_id: string
  user_id: string
  version: number
  sections: ScriptSection[]
  label: string
  created_at: string
}

export interface BehaviorEvent {
  id: string
  user_id: string
  type: string
  payload: Record<string, unknown>
  created_at: string
}

export interface ScheduledSync {
  id: string
  user_id: string
  source: string
  frequency: 'off' | 'daily' | 'every-6-hours' | 'custom'
  cron: string | null
  last_run_at: string | null
  last_status: string | null
  created_at: string
  updated_at: string
}
