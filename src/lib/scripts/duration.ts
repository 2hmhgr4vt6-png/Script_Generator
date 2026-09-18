import type { Language, ScriptSection } from '@/lib/types'

/**
 * Words per second for calm, clear narration.
 *
 * Nepali is slower per word in delivery than English because Devanagari words
 * carry more syllables on average; these values are tuned for Bhasika's
 * conversational reel narration, not for news reading.
 */
const WORDS_PER_SECOND: Record<Language, number> = {
  ne: 2.1,
  en: 2.5,
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function estimateSeconds(text: string, language: Language): number {
  const words = countWords(text)
  if (words === 0) return 0
  return Math.round(words / WORDS_PER_SECOND[language])
}

export function targetWordCount(seconds: number, language: Language): number {
  return Math.round(seconds * WORDS_PER_SECOND[language])
}

export function sectionsToText(sections: ScriptSection[]): string {
  return sections.map((s) => s.content).join('\n\n')
}

export function estimateScriptSeconds(sections: ScriptSection[], language: Language): number {
  return estimateSeconds(sectionsToText(sections), language)
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export type DurationVerdict = 'on-target' | 'short' | 'long'

export function durationVerdict(estimated: number, target: number): DurationVerdict {
  const tolerance = Math.max(4, target * 0.12)
  if (estimated < target - tolerance) return 'short'
  if (estimated > target + tolerance) return 'long'
  return 'on-target'
}
