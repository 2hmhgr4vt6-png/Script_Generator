import 'server-only'
import { getAIProvider, parseJson } from '@/lib/ai'
import { newId } from '@/lib/db'
import { demoHooks } from '@/lib/research/demo'
import type { AudienceProblem, HookOption, Idea, ResearchSource } from '@/lib/types'
import { estimateSeconds } from './duration'
import { BHASIKA_SYSTEM, HOOK_RULES, LANGUAGE_RULES, describeBrief, describeResearch } from './prompts'

export interface HookInput {
  idea: Partial<Idea>
  problem?: AudienceProblem | null
  sources?: ResearchSource[]
}

export interface HookOutcome {
  hooks: HookOption[]
  isDemo: boolean
}

export async function generateHooks(input: HookInput): Promise<HookOutcome> {
  const language = input.idea.language ?? 'ne'
  const ai = getAIProvider()

  if (!ai) {
    return { hooks: demoHooks(language, `${input.idea.raw_text ?? ''} ${input.problem?.title ?? ''}`), isDemo: true }
  }

  const raw = await ai.complete(
    [
      {
        role: 'user',
        content: `Write 5 hook options for a Bhasika video.

${describeBrief(input.idea, input.problem)}

RESEARCH
${describeResearch(input.sources ?? [])}

${HOOK_RULES}

${LANGUAGE_RULES[language]}

Produce exactly one hook per style: situation, pain-point, curiosity, direct-question, myth-busting.
Mark the single strongest option as recommended.

Respond as JSON:
{"hooks": [{"text": "...", "style": "situation", "rationale": "why this matches the audience", "recommended": true}]}`,
      },
    ],
    { system: BHASIKA_SYSTEM, json: true, temperature: 0.85, maxTokens: 1200 },
  )

  const parsed = parseJson<{ hooks?: { text: string; style: string; rationale?: string; recommended?: boolean }[] }>(raw)
  const hooks = (parsed.hooks ?? []).slice(0, 5).map((hook, index) => ({
    id: newId(),
    text: hook.text.trim(),
    style: (hook.style as HookOption['style']) ?? 'situation',
    estimated_seconds: Math.max(2, estimateSeconds(hook.text, language)),
    rationale: hook.rationale ?? '',
    recommended: hook.recommended ?? index === 0,
  }))

  if (!hooks.length) throw new Error('The AI returned no hooks. Please try again.')
  if (!hooks.some((h) => h.recommended)) hooks[0].recommended = true
  return { hooks, isDemo: false }
}
