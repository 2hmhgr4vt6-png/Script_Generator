import type { SourceType, TopicCategory, VerificationStatus } from '@/lib/types'

/** Domains Bhasika treats as authoritative for Germany study content. */
const OFFICIAL_DOMAINS = [
  'daad.de', 'study-in-germany.de', 'make-it-in-germany.com', 'uni-assist.de', 'anabin.kmk.org',
  'auswaertiges-amt.de', 'bamf.de', 'kathmandu.diplo.de', 'germany.info', 'bmbf.de', 'hochschulkompass.de',
  'studienkollegs.de', 'aps-india.de', 'deutschland.de', 'europa.eu', 'kmk.org',
]
const GOVERNMENT_TLDS = ['.gov', '.gov.np', '.bund.de', '.europa.eu']
const NEWS_DOMAINS = ['dw.com', 'thelocal.de', 'spiegel.de', 'kathmandupost.com', 'onlinekhabar.com', 'bbc.com', 'reuters.com']
const COMMUNITY_DOMAINS = ['reddit.com', 'quora.com', 'facebook.com', 'instagram.com', 'youtube.com', 'tiktok.com', 'discord.com']

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'unknown'
  }
}

export function classifySource(url: string): SourceType {
  const domain = domainOf(url)
  if (OFFICIAL_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) return 'official'
  if (GOVERNMENT_TLDS.some((t) => domain.endsWith(t))) return 'government'
  if (domain.endsWith('.edu') || domain.endsWith('uni-muenchen.de') || /\b(uni|hochschule|tu)-/.test(domain) || domain.endsWith('.ac.uk')) {
    return 'university'
  }
  if (COMMUNITY_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) {
    return domain.includes('reddit') || domain.includes('quora') ? 'community' : 'social'
  }
  if (NEWS_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) return 'news'
  if (/blog|medium\.com|wordpress/.test(domain)) return 'blog'
  return 'unknown'
}

/** How much weight a source type carries before the AI reads it. */
export function baseRelevance(type: SourceType): number {
  switch (type) {
    case 'official':
    case 'government':
      return 95
    case 'university':
      return 90
    case 'news':
      return 70
    case 'community':
      return 55
    case 'blog':
      return 45
    case 'social':
      return 40
    default:
      return 50
  }
}

export function defaultVerification(type: SourceType): VerificationStatus {
  if (type === 'official' || type === 'government' || type === 'university') return 'verified-by-source'
  if (type === 'community' || type === 'social') return 'opinion'
  return 'needs-verification'
}

const CATEGORY_KEYWORDS: Record<TopicCategory, string[]> = {
  admission: ['admission', 'apply', 'application', 'uni-assist', 'offer letter', 'rejection', 'भर्ना', 'आवेदन'],
  visa: ['visa', 'embassy', 'blocked account', 'appointment', 'interview', 'भिसा', 'दूतावास'],
  eligibility: ['eligible', 'eligibility', 'requirement', 'backlog', 'gpa', 'studienkolleg', 'aps', 'योग्यता'],
  language: ['ielts', 'toefl', 'german language', 'a1', 'b1', 'b2', 'c1', 'testdaf', 'goethe', 'भाषा'],
  ects: ['ects', 'credit', 'credits', 'क्रेडिट'],
  tuition: ['tuition', 'semester fee', 'semester contribution', 'free', 'fees', 'शुल्क'],
  'student-jobs': ['hiwi', 'werkstudent', 'part time', 'part-time', 'minijob', 'student job', 'काम', 'जागिर'],
  'cost-of-living': ['cost of living', 'rent', 'wohnung', 'expenses', 'budget', 'खर्च'],
  career: ['job seeker', 'career', 'blue card', 'pr', 'permanent residence', 'salary', 'करियर'],
  'study-abroad': ['study abroad', 'abroad', 'overseas', 'विदेश'],
  other: [],
}

export function classifyCategory(text: string): TopicCategory {
  const lower = text.toLowerCase()
  let best: { category: TopicCategory; hits: number } = { category: 'other', hits: 0 }
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [TopicCategory, string[]][]) {
    const hits = keywords.filter((k) => lower.includes(k)).length
    if (hits > best.hits) best = { category, hits }
  }
  return best.category
}

export function detectLanguage(text: string): 'ne' | 'en' {
  const devanagari = (text.match(/[ऀ-ॿ]/g) ?? []).length
  return devanagari > text.length * 0.08 ? 'ne' : 'en'
}

/** Question-shaped text is the raw material for problem discovery. */
export function looksLikeQuestion(text: string): boolean {
  const lower = text.toLowerCase()
  if (text.includes('?')) return true
  return /\b(how|what|can i|should i|is it|does|do i|why|which|anyone|help|confused|kasari|kina|ho ki|हो कि|कसरी|किन|के गर्ने)\b/.test(lower)
}
