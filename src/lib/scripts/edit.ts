import 'server-only'
import { getAIProvider } from '@/lib/ai'
import { AppError } from '@/lib/api'
import type { ClaimCheck, EditAction } from './actions'
import type { Language, Script, ScriptSection } from '@/lib/types'
import { sectionsToText, targetWordCount } from './duration'
import { BHASIKA_SYSTEM, LANGUAGE_RULES } from './prompts'

export type { EditAction, ClaimCheck } from './actions'
export { EDIT_ACTIONS } from './actions'

const INSTRUCTIONS: Record<EditAction, string> = {
  'engaging-hook': 'Rewrite it as a sharper 3-5 second hook that names the viewer\'s exact situation. No generic opener, no greeting.',
  'more-relatable': 'Rewrite it so it sounds like a friend who has been through it. Keep every fact intact.',
  'more-professional': 'Rewrite it in a composed, credible register. Keep it spoken, not academic.',
  shorter: 'Cut it to the essentials. Remove repetition and filler, but never remove a fact or its caveat.',
  'more-conversational': 'Rewrite it as natural spoken language with shorter sentences.',
  'improve-nepali': 'Rewrite the Nepali so it sounds like a Nepali speaker wrote it, not a translation. Keep established English terms in Latin script.',
  'improve-english': 'Rewrite the English so it is clear, natural and easy to narrate.',
  'add-example': 'Add one short, concrete example a Nepali student would recognise. Do not invent statistics, fees or deadlines.',
  'improve-cta': 'Rewrite the close as a natural Bhasika CTA. It must not sound like an advertisement.',
  regenerate: 'Write this section again from scratch, same purpose, different wording.',
  'shorten-30': 'Rewrite the whole script to fit 30 seconds of narration. Keep the hook sharp and keep the essential facts with their caveats.',
  'expand-90': 'Expand the whole script to fit 90 seconds. Add explanation and examples, not filler.',
  'remove-filler': 'Remove anything that does not earn its time. Keep all facts and caveats.',
  'short-form': 'Rewrite as a tight vertical short-form script of about 45 seconds.',
  'long-form': 'Rewrite as a YouTube long-form script of about 3 minutes, with more context and worked examples.',
  translate: 'Translate the script into the target language. Do not translate word for word — rewrite it so a native speaker would say it that way. Keep established English technical terms.',
}

export interface RefineSectionInput {
  script: Script
  section: ScriptSection
  action: EditAction
  customInstruction?: string
}

export async function refineSection(input: RefineSectionInput): Promise<string> {
  const ai = requireAI()
  const language = input.script.language

  const result = await ai.complete(
    [
      {
        role: 'user',
        content: `Improve one section of a Bhasika script. Return only the rewritten section text — no labels, no quotes, no commentary.

Script title: ${input.script.title}
Section: ${input.section.heading}
Target duration for the whole script: ${input.script.duration_seconds}s
Platform: ${input.script.platform}
Audience: ${input.script.audience}

Current text:
"""
${input.section.content}
"""

Rest of the script for context:
"""
${input.script.sections.filter((s) => s.key !== input.section.key).map((s) => `${s.heading}: ${s.content}`).join('\n\n')}
"""

Sources available:
${input.script.sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`).join('\n') || 'None attached. Do not add specific figures, rules or deadlines.'}

Instruction: ${input.customInstruction ?? INSTRUCTIONS[input.action]}

${LANGUAGE_RULES[language]}`,
      },
    ],
    { system: BHASIKA_SYSTEM, temperature: 0.75, maxTokens: 1200 },
  )
  return result.trim().replace(/^["'`]+|["'`]+$/g, '')
}

export interface RefineScriptInput {
  script: Script
  action: EditAction
  targetLanguage?: Language
  targetSeconds?: number
  customInstruction?: string
}

export async function refineScript(input: RefineScriptInput): Promise<{ sections: ScriptSection[]; language: Language; durationSeconds: number }> {
  const ai = requireAI()
  const language = input.targetLanguage ?? input.script.language
  const seconds =
    input.targetSeconds ??
    (input.action === 'shorten-30' ? 30 : input.action === 'expand-90' ? 90 : input.action === 'short-form' ? 45 : input.action === 'long-form' ? 180 : input.script.duration_seconds)
  const words = targetWordCount(seconds, language)

  const raw = await ai.complete(
    [
      {
        role: 'user',
        content: `Rewrite this Bhasika script.

Current script:
"""
${input.script.sections.map((s) => `${s.heading.toUpperCase()}\n${s.content}`).join('\n\n')}
"""

Sources available:
${input.script.sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`).join('\n') || 'None attached. Do not add specific figures, rules or deadlines.'}

Instruction: ${input.customInstruction ?? INSTRUCTIONS[input.action]}
Target length: about ${words} words (${seconds} seconds of narration).

${LANGUAGE_RULES[language]}

Never drop a factual caveat just to hit the length. If the facts cannot fit, keep the facts and say so in the CTA.

Respond as JSON: {"hook": "...", "problem": "...", "solution": "...", "cta": "..."}`,
      },
    ],
    { system: BHASIKA_SYSTEM, json: true, temperature: 0.7, maxTokens: 2800 },
  )

  const { parseJson } = await import('@/lib/ai')
  const parsed = parseJson<Record<string, string>>(raw)
  const sections: ScriptSection[] = input.script.sections.map((section) => ({
    ...section,
    content: (parsed[section.key] ?? section.content).trim(),
  }))
  return { sections, language, durationSeconds: seconds }
}

export async function factCheckScript(script: Script): Promise<ClaimCheck[]> {
  const ai = requireAI()
  const raw = await ai.complete(
    [
      {
        role: 'user',
        content: `Fact-check this Bhasika script against the attached sources only.

Script:
"""
${sectionsToText(script.sections)}
"""

Sources:
${script.sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`).join('\n') || 'No sources attached.'}

For every factual claim the script makes, decide whether the attached sources support it. If nothing supports it, say so — do not fill the gap from memory. Flag any claim about fees, deadlines, visa rules, university requirements or earnings that is not backed by a source.

Respond as JSON:
{"claims": [{"claim": "...", "source_index": 1, "status": "verified-by-source|needs-verification|conflicting-sources|opinion|not-enough-information", "issue": "what is wrong or risky, or null", "suggestion": "a safer wording, or null"}]}`,
      },
    ],
    { system: BHASIKA_SYSTEM, json: true, temperature: 0.1, maxTokens: 2000 },
  )

  const { parseJson } = await import('@/lib/ai')
  const parsed = parseJson<{ claims?: { claim: string; source_index?: number; status?: string; issue?: string | null; suggestion?: string | null }[] }>(raw)
  return (parsed.claims ?? []).map((claim) => ({
    claim: claim.claim,
    source: typeof claim.source_index === 'number' ? script.sources[claim.source_index - 1]?.url ?? null : null,
    status: (claim.status as ClaimCheck['status']) ?? 'needs-verification',
    issue: claim.issue ?? null,
    suggestion: claim.suggestion ?? null,
  }))
}

function requireAI() {
  const ai = getAIProvider()
  if (!ai) {
    throw new AppError(
      'AI editing needs a provider. Add OPENAI_API_KEY or ANTHROPIC_API_KEY in Settings to enable rewriting and fact checking.',
      503,
      'provider_not_configured',
    )
  }
  return ai
}
