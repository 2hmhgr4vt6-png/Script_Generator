import { z } from 'zod'

export const languageSchema = z.enum(['ne', 'en'])
export const contentTypeSchema = z.enum([
  'educational', 'problem-solving', 'awareness', 'myth-busting', 'storytelling', 'explainer', 'comparison', 'faq',
])
export const audienceSchema = z.enum([
  'nepali-students', 'germany-applicants', 'bachelors-students', 'masters-students', 'parents', 'general', 'custom',
])
export const platformSchema = z.enum(['tiktok', 'instagram-reels', 'facebook-reels', 'youtube-shorts', 'youtube'])
export const toneSchema = z.enum(['friendly', 'relatable', 'professional', 'direct', 'conversational', 'storytelling'])
export const categorySchema = z.enum([
  'admission', 'visa', 'eligibility', 'language', 'ects', 'tuition', 'student-jobs', 'cost-of-living', 'career',
  'study-abroad', 'other',
])
export const hookStyleSchema = z.enum(['situation', 'pain-point', 'curiosity', 'direct-question', 'myth-busting'])

export const ideaSchema = z.object({
  raw_text: z.string().trim().min(10, 'Write at least a sentence about the idea.').max(5000, 'That idea is too long.'),
  category: categorySchema.default('other'),
  language: languageSchema.default('ne'),
  duration_seconds: z.coerce.number().int().min(10, 'Use at least 10 seconds.').max(1800, 'Keep it under 30 minutes.').default(60),
  content_type: contentTypeSchema.default('educational'),
  audience: audienceSchema.default('nepali-students'),
  audience_custom: z.string().trim().max(120).optional().nullable(),
  platform: platformSchema.default('instagram-reels'),
  tone: toneSchema.default('relatable'),
})

export const researchSchema = z.object({
  text: z.string().trim().min(5, 'Describe the idea you want researched.').max(5000),
  idea_id: z.string().uuid().optional().nullable(),
  include_community: z.boolean().default(true),
})

export const discoverSchema = z.object({
  keyword: z.string().trim().max(200).optional(),
  sources: z.array(z.string()).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

export const hookSchema = z.object({
  idea_id: z.string().uuid().optional().nullable(),
  problem_id: z.string().uuid().optional().nullable(),
  research_session_id: z.string().uuid().optional().nullable(),
  raw_text: z.string().trim().min(5, 'Describe the idea first.').max(5000),
  language: languageSchema,
  duration_seconds: z.coerce.number().int().min(10).max(1800),
  platform: platformSchema,
  content_type: contentTypeSchema,
  audience: audienceSchema,
  audience_custom: z.string().trim().max(120).optional().nullable(),
  tone: toneSchema,
})

export const generateSchema = hookSchema.extend({
  category: categorySchema.default('other'),
  hook: z
    .object({
      id: z.string(),
      text: z.string().min(1),
      style: hookStyleSchema,
      estimated_seconds: z.coerce.number(),
      rationale: z.string().default(''),
      recommended: z.boolean().default(false),
    })
    .optional()
    .nullable(),
  source_ids: z.array(z.string()).optional(),
})

export const scriptUpdateSchema = z.object({
  title: z.string().trim().min(1, 'A title is required.').max(200).optional(),
  status: z.enum(['draft', 'ready', 'published', 'archived']).optional(),
  language: languageSchema.optional(),
  duration_seconds: z.coerce.number().int().min(10).max(1800).optional(),
  platform: platformSchema.optional(),
  tone: toneSchema.optional(),
  sections: z
    .array(
      z.object({
        key: z.enum(['hook', 'problem', 'solution', 'cta']),
        heading: z.string().trim().min(1).max(60),
        content: z.string().max(20000),
      }),
    )
    .optional(),
  version_label: z.string().trim().max(120).optional(),
})

export const refineSchema = z.object({
  action: z.string().min(1),
  section_key: z.enum(['hook', 'problem', 'solution', 'cta']).optional(),
  target_language: languageSchema.optional(),
  target_seconds: z.coerce.number().int().min(10).max(1800).optional(),
  instruction: z.string().trim().max(500).optional(),
})

export const preferencesSchema = z.object({
  default_language: languageSchema.optional(),
  default_duration: z.coerce.number().int().min(10).max(1800).optional(),
  default_platform: platformSchema.optional(),
  default_tone: toneSchema.optional(),
  learning_enabled: z.boolean().optional(),
  research_schedule: z.enum(['off', 'daily', 'every-6-hours', 'custom']).optional(),
  research_schedule_cron: z.string().trim().max(120).optional().nullable(),
})

export const problemUpdateSchema = z.object({
  status: z.enum(['new', 'saved', 'script-created', 'dismissed']).optional(),
})

export const integrationProviderSchema = z.enum([
  'ai-routing', 'gemini', 'groq', 'openrouter', 'ollama', 'deepseek', 'openai', 'anthropic',
  'search', 'reddit', 'youtube', 'facebook', 'instagram',
])

export const integrationSaveSchema = z.object({
  provider: integrationProviderSchema,
  /**
   * Field name -> value. Unknown field names are ignored by the store rather
   * than rejected, so a stale client cannot write arbitrary keys.
   */
  fields: z.record(z.string().max(4000)),
})

export const integrationDeleteSchema = z.object({
  provider: integrationProviderSchema,
})
