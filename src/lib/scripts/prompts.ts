import type { AudienceProblem, Idea, ResearchSource, Script } from '@/lib/types'
import { AUDIENCES, CONTENT_TYPES, LANGUAGES, PLATFORMS, TONES } from '@/lib/types'

export const BHASIKA_SYSTEM = `You write for BHASIKA, a Nepali digital student guidance platform.

Positioning: "We explain. You decide."
Bhasika helps students understand their options instead of telling them what to do.

Audience: Nepali students and their families researching Germany's public universities, admission, eligibility, ECTS, IELTS, the German language, student visas, blocked accounts, student jobs, living costs and careers.

Non-negotiable rules:
- Never invent facts, deadlines, fees, university requirements, visa rules, or earnings figures.
- Use only the research provided. If the research does not cover something, say the viewer should verify it with the official source, and name which one.
- Never claim every German public university is tuition-free. Semester contributions, some states and most private universities charge.
- Never treat a Reddit or forum comment as an official rule. Attribute it as what people report.
- Never use manipulative or fear-based claims that the research does not support.
- Explain, do not order. The viewer decides.`

function label<T extends { value: string; label: string }>(list: T[], value: string): string {
  return list.find((item) => item.value === value)?.label ?? value
}

export function describeBrief(idea: Partial<Idea>, problem?: AudienceProblem | null): string {
  const lines = [
    `Raw idea: ${idea.raw_text ?? '(none)'}`,
    `Language: ${label(LANGUAGES as any, idea.language ?? 'ne')}`,
    `Target duration: ${idea.duration_seconds ?? 60} seconds`,
    `Platform: ${label(PLATFORMS, idea.platform ?? 'instagram-reels')}`,
    `Content type: ${label(CONTENT_TYPES, idea.content_type ?? 'educational')}`,
    `Audience: ${idea.audience === 'custom' ? idea.audience_custom : label(AUDIENCES, idea.audience ?? 'nepali-students')}`,
    `Tone: ${label(TONES, idea.tone ?? 'relatable')}`,
  ]
  if (problem) {
    lines.push(
      `Audience problem being answered: "${problem.title}"`,
      `In their words: "${problem.excerpt.slice(0, 400)}"`,
      `Found on: ${problem.source_name} (${problem.source_url})`,
    )
  }
  return lines.join('\n')
}

export function describeResearch(sources: ResearchSource[]): string {
  if (!sources.length) return 'No research sources were attached. Do not state specific figures, rules or deadlines.'
  return sources
    .map(
      (source, index) =>
        `[${index + 1}] ${source.title} — ${source.domain} (${source.source_type}, ${source.verification})\n` +
        `URL: ${source.url}\n` +
        `Extract: ${source.excerpt.slice(0, 700)}`,
    )
    .join('\n\n')
}

export const LANGUAGE_RULES: Record<string, string> = {
  ne: `Write in natural spoken Nepali using Devanagari.
- Conversational, the way a helpful senior explains something to a junior.
- Keep established English terms in Latin script: IELTS, ECTS, Germany, Visa, HiWi, Master, Bachelor, blocked account, semester, APS, Uni-Assist.
- Never produce a stiff word-for-word translation of English sentences.
- Short sentences. A narrator has to be able to say each line in one breath.`,
  en: `Write in natural spoken English.
- Clear, engaging and easy to narrate out loud.
- Plain words over academic ones. Short sentences.
- No filler openers such as "In today's video" or "Hello everyone".`,
}

export const HOOK_RULES = `A hook is 3-5 seconds of spoken audio: roughly 8-14 words.

Banned openers — never produce anything like these:
- "Today we are going to talk about Germany."
- "Hello everyone, welcome back."
- "Do you want to study abroad?"

A good hook names the viewer's exact situation, mistake, fear or confusion, so they think "wait, that is exactly my problem". Ground it in the research and the audience problem. Do not promise anything the research cannot support.`

export function scriptShape(targetWords: number): string {
  return `Return the script in four sections, roughly ${targetWords} words in total:

HOOK — 3-5 seconds. Situation-based and specific.
PROBLEM — name the confusion precisely so the viewer feels understood. Use a relatable example.
SOLUTION — answer it in simple language using the researched facts. Break the complex parts down. Give practical steps where they apply. Attribute anything uncertain.
CTA — a natural Bhasika close. Never a hard sell. Examples to vary between: "Confused about your Germany study options? Let Bhasika explain.", "Ask anything. No name needed.", "We explain. You decide.", "Save this for later.", "Comment your question.", "Visit www.bhasika.com".`
}

export function scriptToPlainText(script: Script): string {
  const header = [
    script.title,
    `Language: ${script.language === 'ne' ? 'Nepali' : 'English'}`,
    `Target duration: ${script.duration_seconds}s`,
    `Platform: ${label(PLATFORMS, script.platform)}`,
  ].join('\n')

  const body = script.sections.map((section) => `${section.heading.toUpperCase()}\n${section.content}`).join('\n\n')

  const sources = script.sources.length
    ? `SOURCES\n${script.sources.map((source, index) => `[${index + 1}] ${source.title} — ${source.url}`).join('\n')}`
    : ''

  return [header, body, sources].filter(Boolean).join('\n\n---\n\n')
}
