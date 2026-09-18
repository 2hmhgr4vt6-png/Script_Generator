/** Client-safe descriptions of the AI editing actions and their result shape. */

export type EditAction =
  | 'engaging-hook'
  | 'more-relatable'
  | 'more-professional'
  | 'shorter'
  | 'more-conversational'
  | 'improve-nepali'
  | 'improve-english'
  | 'add-example'
  | 'improve-cta'
  | 'regenerate'
  | 'shorten-30'
  | 'expand-90'
  | 'remove-filler'
  | 'short-form'
  | 'long-form'
  | 'translate'

export const EDIT_ACTIONS: { value: EditAction; label: string; scope: 'section' | 'script' }[] = [
  { value: 'engaging-hook', label: 'Make Hook More Engaging', scope: 'section' },
  { value: 'more-relatable', label: 'Make It More Relatable', scope: 'section' },
  { value: 'more-professional', label: 'Make It More Professional', scope: 'section' },
  { value: 'shorter', label: 'Make It Shorter', scope: 'section' },
  { value: 'more-conversational', label: 'Make It More Conversational', scope: 'section' },
  { value: 'improve-nepali', label: 'Improve Nepali', scope: 'section' },
  { value: 'improve-english', label: 'Improve English', scope: 'section' },
  { value: 'add-example', label: 'Add Practical Example', scope: 'section' },
  { value: 'improve-cta', label: 'Improve CTA', scope: 'section' },
  { value: 'regenerate', label: 'Regenerate This Section', scope: 'section' },
  { value: 'shorten-30', label: 'Shorten to 30 seconds', scope: 'script' },
  { value: 'expand-90', label: 'Expand to 90 seconds', scope: 'script' },
  { value: 'remove-filler', label: 'Remove Unnecessary Parts', scope: 'script' },
  { value: 'short-form', label: 'Create a Short-form Version', scope: 'script' },
  { value: 'long-form', label: 'Create a YouTube Long-form Version', scope: 'script' },
  { value: 'translate', label: 'Translate Script', scope: 'script' },
]

export interface ClaimCheck {
  claim: string
  source: string | null
  status: 'verified-by-source' | 'needs-verification' | 'conflicting-sources' | 'opinion' | 'not-enough-information'
  issue: string | null
  suggestion: string | null
}
