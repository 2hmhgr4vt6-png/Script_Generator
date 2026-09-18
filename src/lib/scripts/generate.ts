import 'server-only'
import { getAIProvider, parseJson } from '@/lib/ai'
import { pickSeed } from '@/lib/research/demo'
import type { AudienceProblem, HookOption, Idea, Language, ResearchSource, ScriptSection } from '@/lib/types'
import { targetWordCount } from './duration'
import { BHASIKA_SYSTEM, LANGUAGE_RULES, describeBrief, describeResearch, scriptShape } from './prompts'

export interface GenerateInput {
  idea: Partial<Idea>
  problem?: AudienceProblem | null
  sources?: ResearchSource[]
  hook?: HookOption | null
  researchSummary?: string
}

export interface GenerateOutcome {
  title: string
  sections: ScriptSection[]
  isDemo: boolean
}

const HEADINGS: Record<Language, Record<ScriptSection['key'], string>> = {
  ne: { hook: 'Hook', problem: 'Problem', solution: 'Solution', cta: 'CTA' },
  en: { hook: 'Hook', problem: 'Problem', solution: 'Solution', cta: 'CTA' },
}

export async function generateScript(input: GenerateInput): Promise<GenerateOutcome> {
  const language = input.idea.language ?? 'ne'
  const duration = input.idea.duration_seconds ?? 60
  const ai = await getAIProvider()

  if (!ai) return demoScript(input, language, duration)

  const words = targetWordCount(duration, language)
  const raw = await ai.complete(
    [
      {
        role: 'user',
        content: `Write a complete Bhasika video script.

${describeBrief(input.idea, input.problem)}

${input.hook ? `The hook has already been chosen. Use it as the opening line, unchanged:\n"${input.hook.text}"` : 'Open with a 3-5 second situation-based hook. Never introduce the topic generically.'}

RESEARCH
${describeResearch(input.sources ?? [])}
${input.researchSummary ? `\nResearcher's summary: ${input.researchSummary}` : ''}

${LANGUAGE_RULES[language]}

${scriptShape(words)}

The narration must read naturally out loud. Do not include stage directions, camera notes, or section labels inside the text.

Respond as JSON:
{"title": "short internal title", "hook": "...", "problem": "...", "solution": "...", "cta": "..."}`,
      },
    ],
    { system: BHASIKA_SYSTEM, json: true, temperature: 0.75, maxTokens: 2600 },
  )

  const parsed = parseJson<{ title?: string; hook?: string; problem?: string; solution?: string; cta?: string }>(raw)
  const sections: ScriptSection[] = [
    { key: 'hook', heading: HEADINGS[language].hook, content: (input.hook?.text ?? parsed.hook ?? '').trim() },
    { key: 'problem', heading: HEADINGS[language].problem, content: (parsed.problem ?? '').trim() },
    { key: 'solution', heading: HEADINGS[language].solution, content: (parsed.solution ?? '').trim() },
    { key: 'cta', heading: HEADINGS[language].cta, content: (parsed.cta ?? '').trim() },
  ]

  if (sections.every((s) => !s.content)) throw new Error('The AI returned an empty script. Please try again.')

  return {
    title: parsed.title?.trim() || deriveTitle(input),
    sections,
    isDemo: false,
  }
}

function deriveTitle(input: GenerateInput): string {
  const source = input.problem?.title ?? input.idea.raw_text ?? 'Untitled script'
  return source.replace(/\s+/g, ' ').trim().slice(0, 80)
}

/** Structured, clearly-labelled sample script used when no AI provider is configured. */
function demoScript(input: GenerateInput, language: Language, duration: number): GenerateOutcome {
  const seed = pickSeed(`${input.idea.raw_text ?? ''} ${input.problem?.title ?? ''}`)
  const hook = input.hook?.text ?? (language === 'ne'
    ? 'यो कुरा थाहा नपाई Germany को योजना नबनाऊ।'
    : 'Do not plan your move to Germany before you check this.')
  const analysis = seed.analysis

  const ne: Record<ScriptSection['key'], string> = {
    hook,
    problem: seed.ne.problem,
    solution: `${seed.ne.solution}\n\n${seed.facts
      .map((fact, index) => `${index + 1}. ${fact}`)
      .join('\n')}\n\nयी कुरा आफ्नै programme को official page मा confirm गर्नु सबैभन्दा सुरक्षित तरिका हो।`,
    cta: 'Germany को विकल्पबारे अन्योल छ? Bhasika लाई सोध्नुहोस्। नाम नभने पनि हुन्छ। हामी बुझाउँछौं, निर्णय तपाईंको।',
  }
  const en: Record<ScriptSection['key'], string> = {
    hook,
    problem: `${analysis.confusion} ${analysis.situation}`,
    solution: `${analysis.information_needed}\n\n${seed.facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\nCheck these against your own programme's official page before you act on them.`,
    cta: 'Confused about your Germany study options? Ask Bhasika — no name needed. We explain. You decide.',
  }
  const body = language === 'ne' ? ne : en

  return {
    title: `[Sample] ${seed.title}`,
    sections: (['hook', 'problem', 'solution', 'cta'] as ScriptSection['key'][]).map((key) => ({
      key,
      heading: HEADINGS[language][key],
      content: body[key],
    })),
    isDemo: true,
  }
}

export { HEADINGS as SECTION_HEADINGS }
