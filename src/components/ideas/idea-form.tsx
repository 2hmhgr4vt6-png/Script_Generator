'use client'

import { Field, Input, Select, Textarea } from '@/components/ui/input'
import {
  AUDIENCES, CONTENT_TYPES, DURATIONS, LANGUAGES, PLATFORMS, TONES, TOPIC_CATEGORIES,
  type Audience, type ContentType, type Language, type Platform, type Tone, type TopicCategory,
} from '@/lib/types'

export interface IdeaFormValues {
  raw_text: string
  category: TopicCategory
  language: Language
  duration_seconds: number
  custom_duration: string
  content_type: ContentType
  audience: Audience
  audience_custom: string
  platform: Platform
  tone: Tone
}

export const PLACEHOLDER =
  'Enter your raw idea, confusion, topic, notes, or anything you want to turn into a video script...'

export function IdeaFields({
  values,
  onChange,
  errors,
  compact,
}: {
  values: IdeaFormValues
  onChange: (patch: Partial<IdeaFormValues>) => void
  errors?: Partial<Record<keyof IdeaFormValues, string>>
  compact?: boolean
}) {
  const usingCustomDuration = !DURATIONS.some((d) => d.value === values.duration_seconds)

  return (
    <div className="space-y-5">
      {!compact ? (
        <Field label="Raw idea / information" error={errors?.raw_text}>
          <Textarea
            value={values.raw_text}
            onChange={(event) => onChange({ raw_text: event.target.value })}
            placeholder={PLACEHOLDER}
            rows={7}
          />
        </Field>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Topic / category">
          <Select value={values.category} onChange={(event) => onChange({ category: event.target.value as TopicCategory })}>
            {TOPIC_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Language">
          <Select value={values.language} onChange={(event) => onChange({ language: event.target.value as Language })}>
            {LANGUAGES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label} · {item.native}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Script duration" error={errors?.duration_seconds}>
          <Select
            value={usingCustomDuration ? 'custom' : String(values.duration_seconds)}
            onChange={(event) => {
              if (event.target.value === 'custom') {
                onChange({ duration_seconds: 75, custom_duration: '75' })
              } else {
                onChange({ duration_seconds: Number(event.target.value), custom_duration: '' })
              }
            }}
          >
            {DURATIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
            <option value="custom">Custom duration</option>
          </Select>
        </Field>

        {usingCustomDuration ? (
          <Field label="Custom duration (seconds)">
            <Input
              type="number"
              min={10}
              max={1800}
              value={values.custom_duration}
              onChange={(event) =>
                onChange({ custom_duration: event.target.value, duration_seconds: Number(event.target.value) || 60 })
              }
            />
          </Field>
        ) : null}

        <Field label="Content type">
          <Select value={values.content_type} onChange={(event) => onChange({ content_type: event.target.value as ContentType })}>
            {CONTENT_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Target audience">
          <Select value={values.audience} onChange={(event) => onChange({ audience: event.target.value as Audience })}>
            {AUDIENCES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>

        {values.audience === 'custom' ? (
          <Field label="Describe the audience">
            <Input
              value={values.audience_custom}
              onChange={(event) => onChange({ audience_custom: event.target.value })}
              placeholder="e.g. BBS graduates applying for a Master"
            />
          </Field>
        ) : null}

        <Field label="Platform">
          <Select value={values.platform} onChange={(event) => onChange({ platform: event.target.value as Platform })}>
            {PLATFORMS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Tone">
          <Select value={values.tone} onChange={(event) => onChange({ tone: event.target.value as Tone })}>
            {TONES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </div>
  )
}
