import 'server-only'
import { newId, now } from '@/lib/db'
import type {
  AudienceProblem, HookOption, Language, ProblemAnalysis, ResearchFact, ResearchSource, TopicCategory,
} from '@/lib/types'

/**
 * Demo content for local development.
 *
 * Every item produced here is flagged `is_demo: true` and is rendered with a
 * "Sample" badge. Nothing here is presented as a live internet result:
 * - sample sources point at the real homepage of the organisation named, and
 *   their excerpt is written as guidance, not quoted from the page;
 * - sample problems link to a live search URL on the platform, so the link
 *   always resolves to something real instead of a fabricated post.
 */

export const DEMO_NOTICE =
  'Demo mode — sample content generated locally. Add API keys in Settings to research the live internet.'

interface DemoSeed {
  category: TopicCategory
  title: string
  question: string
  keywords: string
  sources: { title: string; url: string; note: string }[]
  facts: string[]
  analysis: ProblemAnalysis
  /** Nepali narration for the sample script, so demo output is not half-translated. */
  ne: { problem: string; solution: string }
}

const SEEDS: DemoSeed[] = [
  {
    category: 'tuition',
    title: 'Is a German public university really completely free?',
    question:
      'Everyone says public universities in Germany are free, but a friend told me he still pays every semester. What is actually charged?',
    keywords: 'germany public university tuition free semester contribution',
    sources: [
      { title: 'DAAD — Study in Germany', url: 'https://www.daad.de/en/', note: 'Germany\'s academic exchange service; the reference point for tuition and funding questions.' },
      { title: 'Study in Germany — official portal', url: 'https://www.study-in-germany.de/en/', note: 'Official federal portal covering costs, semester contributions and living expenses.' },
    ],
    facts: [
      'Most public universities in Germany do not charge tuition for a first degree, but this is set per federal state and is not universal.',
      'A semester contribution (Semesterbeitrag) is charged separately from tuition and typically covers administration and student services.',
      'Living costs, health insurance and the blocked account requirement are separate from tuition and are the larger part of a student budget.',
    ],
    analysis: {
      confusion: '"Free" is heard as "no money at all", when tuition and the semester contribution are two different things.',
      situation: 'A student is budgeting for Germany and has been told the whole degree costs nothing.',
      misconception: 'That every public university in every German state charges a student nothing.',
      information_needed: 'What tuition actually means, what the semester contribution covers, and which costs sit outside both.',
      takeaway: 'Tuition-free is not cost-free — plan for the semester contribution, insurance and living costs.',
      why_it_matters: 'A student who budgets for zero cost discovers the gap after arriving, when it is hardest to fix.',
      content_angles: [
        'Myth-busting: "free" versus "tuition-free"',
        'A line-by-line first-semester budget',
        'What the semester contribution actually buys you',
      ],
    },
    ne: {
      problem:
        '"Germany मा पढ्न free हो" भन्ने सुनेर धेरैले पूरै खर्च शून्य हुन्छ भन्ठान्छन्। तर tuition र semester contribution फरक-फरक कुरा हुन्, र दुवैलाई एउटै ठान्दा budget बिग्रन्छ।',
      solution:
        'Tuition भनेको पढाइको शुल्क हो; semester contribution भनेको हरेक semester मा तिरिने अर्कै रकम हो। यी दुई बाहेक बस्ने खर्च, insurance र blocked account छँदैछ।',
    },
  },
  {
    category: 'eligibility',
    title: 'Can a BBS graduate do a Master in Germany?',
    question:
      'I completed BBS from Tribhuvan University. Can I apply for a Master in Germany, or do I need to redo a Bachelor?',
    keywords: 'BBS Tribhuvan Germany master eligibility anabin uni-assist',
    sources: [
      { title: 'anabin — recognition database (KMK)', url: 'https://anabin.kmk.org/', note: 'The German database that decides how a foreign qualification is recognised.' },
      { title: 'uni-assist', url: 'https://www.uni-assist.de/en/', note: 'Evaluates international applications and grade conversion for many German universities.' },
    ],
    facts: [
      'Recognition of a Nepali Bachelor is decided through the anabin database and the receiving university, not by a general rule.',
      'Many Master programmes require the previous degree to be in a related subject, with a minimum number of ECTS in specific areas.',
      'Some applicants are asked to complete additional coursework or a Studienkolleg depending on how their degree is assessed.',
    ],
    analysis: {
      confusion: 'Whether a Nepali commerce Bachelor counts as an equivalent degree for a German Master.',
      situation: 'A BBS graduate is deciding between reapplying at home and preparing a Germany application.',
      misconception: 'That a blanket yes-or-no answer exists for all universities and all programmes.',
      information_needed: 'How anabin and uni-assist assess the degree, and what subject-relatedness means in practice.',
      takeaway: 'Check your own degree in anabin and read the specific programme\'s admission page — the answer is per programme.',
      why_it_matters: 'Applying to the wrong programme wastes a full intake cycle and the application fee.',
      content_angles: [
        'How to check your degree on anabin in 3 steps',
        'What "subject-related" actually means to an admissions office',
        'BBS to Germany: the realistic paths',
      ],
    },
    ne: {
      problem:
        'BBS वा त्यस्तै degree सकेपछि "Germany मा Master गर्न मिल्छ कि मिल्दैन" भन्ने प्रश्न धेरैलाई आउँछ। सबैका लागि लागू हुने एउटै जवाफ छैन भन्ने कुरा नै मुख्य अन्योल हो।',
      solution:
        'तिम्रो degree कसरी गनिन्छ भन्ने anabin database र तिमीले apply गर्ने university ले निर्णय गर्छ। Programme को admission page मा subject र ECTS को शर्त लेखिएको हुन्छ।',
    },
  },
  {
    category: 'language',
    title: 'Good IELTS but still rejected — why?',
    question:
      'I have IELTS 7 overall and still got rejected by two German universities. Is my English score not enough?',
    keywords: 'germany admission rejection ielts 7 requirements',
    sources: [
      { title: 'DAAD — admission requirements', url: 'https://www.daad.de/en/', note: 'Explains what German admission assesses beyond language certificates.' },
      { title: 'Hochschulkompass', url: 'https://www.hochschulkompass.de/en/', note: 'Official directory of German degree programmes and their entry requirements.' },
    ],
    facts: [
      'A language certificate is one admission requirement among several; it does not by itself establish eligibility.',
      'Degree recognition, subject match, required ECTS and grade conversion are assessed separately from language ability.',
      'Places in many programmes are limited, so meeting the minimum requirements does not guarantee an offer.',
    ],
    analysis: {
      confusion: 'Treating the IELTS score as the thing that decides admission.',
      situation: 'A strong English speaker has been rejected and cannot see what went wrong.',
      misconception: 'That a high IELTS band compensates for a subject or credit mismatch.',
      information_needed: 'The full list of what an admissions office checks, in the order it checks them.',
      takeaway: 'Language is a gate, not a ranking — the subject match and recognised credits decide the outcome.',
      why_it_matters: 'Students repeat the same application with a higher IELTS and get the same result.',
      content_angles: [
        'The 5 things checked before your IELTS score',
        'Reading a rejection letter properly',
        'Subject match: the requirement nobody mentions',
      ],
    },
    ne: {
      problem:
        'IELTS राम्रो हुँदाहुँदै reject भएपछि "मेरो English कमजोर रहेछ" भन्ने लाग्नु स्वाभाविक हो। तर admission मा हेरिने कुरा त्यति मात्र होइन।',
      solution:
        'Language certificate एउटा शर्त हो, तर degree recognition, subject match र ECTS अलग्गै जाँचिन्छ। Seat सीमित भएकाले शर्त पुगे पनि offer नआउन सक्छ।',
    },
  },
  {
    category: 'student-jobs',
    title: 'How much does a HiWi job actually pay?',
    question:
      'People say you can cover your costs with a HiWi job in Germany. How many hours can a student work and is it enough to live on?',
    keywords: 'hiwi werkstudent germany student work hours pay',
    sources: [
      { title: 'Make it in Germany — official portal', url: 'https://www.make-it-in-germany.com/en/', note: 'Federal portal covering student work rules and employment conditions.' },
      { title: 'Study in Germany — financing your studies', url: 'https://www.study-in-germany.de/en/', note: 'Official guidance on student work limits and financing.' },
    ],
    facts: [
      'International students in Germany may work a limited number of days per year; the limit is set in law and changes over time.',
      'HiWi (student assistant) pay is set by the university and varies by state and by whether you already hold a Bachelor.',
      'Student work is intended to supplement financing, not to replace the proof of funds required for the visa.',
    ],
    analysis: {
      confusion: 'How far student work income actually goes against real monthly costs.',
      situation: 'A student is planning finances and counting on job income before arriving.',
      misconception: 'That a part-time job can fully fund studying and living in Germany.',
      information_needed: 'The legal working limit, realistic pay ranges, and how these interact with the blocked account.',
      takeaway: 'Work income helps, but the visa still expects proof you can fund yourself without it.',
      why_it_matters: 'Financial plans built on job income fall apart in the first semester, when studies matter most.',
      content_angles: [
        'HiWi vs Werkstudent vs Minijob',
        'What the work-day limit really means',
        'A realistic first-year money plan',
      ],
    },
    ne: {
      problem:
        'HiWi job ले सबै खर्च धानिन्छ भन्ने सुनेर धेरैले त्यही भरमा योजना बनाउँछन्। काम कति गर्न पाइन्छ र कति आम्दानी हुन्छ भन्ने नबुझी बनाएको योजना पछि बिग्रन्छ।',
      solution:
        'International student ले वर्षमा कति दिन काम गर्न पाउने भन्ने कानुनले तोकेको छ। HiWi को पारिश्रमिक university र state अनुसार फरक हुन्छ, र यो आम्दानीले visa को proof of funds लाई प्रतिस्थापन गर्दैन।',
    },
  },
  {
    category: 'visa',
    title: 'What happens after the visa interview?',
    question:
      'My student visa interview at the embassy is done. What is the next step and how long does the decision take?',
    keywords: 'germany student visa interview embassy kathmandu decision time',
    sources: [
      { title: 'German Embassy Kathmandu', url: 'https://kathmandu.diplo.de/', note: 'The authority for Nepal-specific visa procedure, documents and timelines.' },
      { title: 'Federal Foreign Office — visa information', url: 'https://www.auswaertiges-amt.de/en', note: 'Official German visa rules and categories.' },
    ],
    facts: [
      'Processing times for a national student visa are set by the responsible mission and vary by season and case.',
      'The embassy publishes the current document checklist; requirements differ by visa category and are updated periodically.',
      'Applicants should follow the status process the embassy itself publishes rather than third-party timelines.',
    ],
    analysis: {
      confusion: 'What actually happens between the interview and the decision, and how long to wait before acting.',
      situation: 'An applicant has finished the interview and is waiting without knowing what is normal.',
      misconception: 'That the timeline someone else got applies to every application.',
      information_needed: 'The embassy\'s own published process and where to check status.',
      takeaway: 'Follow the embassy\'s published process — timelines quoted by other applicants are not rules.',
      why_it_matters: 'Anxious applicants make costly decisions, like rebooking flights, on rumoured timelines.',
      content_angles: [
        'The visa timeline nobody explains',
        'What to prepare while you wait',
        'Where to check your status officially',
      ],
    },
    ne: {
      problem:
        'Visa interview सकिएपछि "अब के हुन्छ, कहिले जवाफ आउँछ" भन्ने अन्योलमा धेरै आवेदक पर्छन्। अरूको timeline सुनेर आफ्नो निर्णय गर्दा गल्ती हुन्छ।',
      solution:
        'Processing समय सम्बन्धित mission ले तोक्छ र case अनुसार फरक हुन्छ। Document checklist र status हेर्ने तरिका embassy ले आफैं publish गर्छ — त्यही नै भरपर्दो स्रोत हो।',
    },
  },
]

function sampleSources(seed: DemoSeed, userId: string, sessionId: string): ResearchSource[] {
  return seed.sources.map((source, index) => ({
    id: newId(),
    user_id: userId,
    session_id: sessionId,
    title: `${source.title}`,
    url: source.url,
    domain: new URL(source.url).hostname.replace(/^www\./, ''),
    excerpt: `[Sample research note — not a quotation from the page] ${source.note}`,
    published_at: null,
    source_type: 'official' as const,
    relevance: 92 - index * 5,
    verification: 'needs-verification' as const,
    selected: true,
    is_demo: true,
    created_at: now(),
  }))
}

export function pickSeed(text: string): DemoSeed {
  const lower = text.toLowerCase()
  const scored = SEEDS.map((seed) => ({
    seed,
    score: seed.keywords.split(' ').filter((word) => lower.includes(word)).length,
  })).sort((a, b) => b.score - a.score)
  return scored[0].score > 0 ? scored[0].seed : SEEDS[0]
}

export function demoResearch(text: string, userId: string, sessionId: string) {
  const seed = pickSeed(text)
  const facts: ResearchFact[] = seed.facts.map((claim) => ({
    claim,
    source_url: seed.sources[0].url,
    source_title: seed.sources[0].title,
    status: 'needs-verification',
    kind: 'fact',
    note: 'Sample research note — confirm against the official source before publishing.',
  }))
  return {
    seed,
    sources: sampleSources(seed, userId, sessionId),
    facts,
    queries: [seed.keywords, `${seed.keywords} site:daad.de`, `${seed.title} nepali students`],
    conflicts: [] as string[],
    summary: `${DEMO_NOTICE}\n\n${seed.analysis.why_it_matters} ${seed.analysis.takeaway}`,
  }
}

/** Sample problems whose links open a live search on the real platform. */
export function demoProblems(userId: string, keyword?: string): AudienceProblem[] {
  const pool = keyword
    ? SEEDS.filter((s) => `${s.title} ${s.question} ${s.keywords}`.toLowerCase().includes(keyword.toLowerCase()))
    : SEEDS
  const seeds = pool.length ? pool : SEEDS

  return seeds.map((seed, index) => ({
    id: newId(),
    user_id: userId,
    session_id: null,
    title: seed.title,
    excerpt: seed.question,
    platform: 'sample',
    source_name: 'Sample problem (live Reddit search)',
    source_url: `https://www.reddit.com/search/?q=${encodeURIComponent(seed.keywords)}`,
    retrieved_at: now(),
    posted_at: null,
    category: seed.category,
    language: 'en' as Language,
    relevance: 90 - index * 4,
    status: 'new' as const,
    analysis: seed.analysis,
    related_questions: seed.analysis.content_angles,
    is_demo: true,
    created_at: now(),
    updated_at: now(),
  }))
}

export function demoHooks(language: Language, topic: string): HookOption[] {
  const seed = pickSeed(topic)
  const lines = HOOK_LINES[seed.category] ?? HOOK_LINES.tuition
  const styles: HookOption['style'][] = ['situation', 'pain-point', 'curiosity', 'direct-question', 'myth-busting']

  return styles.map((style, index) => {
    const line = lines[index]
    const text = language === 'ne' ? line.ne : line.en
    return {
      id: newId(),
      text,
      style,
      estimated_seconds: Math.max(3, Math.min(5, Math.round(text.split(/\s+/).length / (language === 'ne' ? 2.1 : 2.5)))),
      rationale: `Sample hook. Opens on the ${style.replace('-', ' ')} the viewer is already living with, instead of introducing the topic.`,
      recommended: index === 0,
    }
  })
}

/** One line per hook style, so every option is genuinely different. */
const HOOK_LINES: Record<string, { ne: string; en: string }[]> = {
  tuition: [
    { ne: 'Germany को public university free छ भन्दैमा सबै खर्च free हुँदैन।', en: 'Tuition-free does not mean cost-free. Here is what still gets charged.' },
    { ne: 'हरेक semester मा तिर्नुपर्ने यो रकम कसैले भन्दैन।', en: 'There is one payment every semester that the "free education" posts never mention.' },
    { ne: 'Free education भनेको के हो, र के होइन?', en: 'What does "free education in Germany" actually cover?' },
    { ne: 'Germany को budget बनाउँदै छौ? यो line छुटाएका छौ कि?', en: 'Building your Germany budget? Check whether this line is missing from it.' },
    { ne: '"Germany मा पढ्न पैसा लाग्दैन" — यो वाक्य अधुरो छ।', en: '"Studying in Germany costs nothing" is a half-finished sentence.' },
  ],
  eligibility: [
    { ne: 'BBS पढेको छौ? Germany मा Master गर्न मिल्छ कि मिल्दैन?', en: 'You finished BBS. Can you actually do a Master in Germany?' },
    { ne: 'Degree मिल्दैन भनेर application छोड्नुअघि यो हेर।', en: 'Before you give up on applying, check how your degree is actually assessed.' },
    { ne: 'तिम्रो degree Germany मा कसरी गनिन्छ, आफैं जाँच्न सकिन्छ।', en: 'You can check how Germany reads your degree yourself, in a few minutes.' },
    { ne: 'Subject मिलेन भनेको के हो, कसले निर्णय गर्छ?', en: 'Who decides that your subject "does not match", and how?' },
    { ne: 'Germany को eligibility को एउटै नियम छैन — programme अनुसार फरक हुन्छ।', en: 'There is no single eligibility rule for Germany. It is decided per programme.' },
  ],
  language: [
    { ne: 'IELTS 7 छ, तर Germany मा admission किन आएन?', en: 'IELTS 7 and still rejected by Germany. The score was never the problem.' },
    { ne: 'IELTS बढाएर फेरि apply गर्दै छौ? समस्या त्यहाँ नहुन सक्छ।', en: 'Retaking IELTS to fix a rejection? That may not be what went wrong.' },
    { ne: 'Admission office ले IELTS भन्दा पहिले के हेर्छ?', en: 'What does an admissions office check before it ever looks at your IELTS?' },
    { ne: 'German language अनिवार्य हो कि होइन, कहिले?', en: 'Is German actually required — and when?' },
    { ne: 'राम्रो IELTS ले सबै कमजोरी ढाक्छ भन्ने सोच्यौ भने...', en: 'A strong IELTS band cannot cover the gap that actually gets you rejected.' },
  ],
  'student-jobs': [
    { ne: 'Germany मा HiWi job खोज्दैछौ? यो कुरा थाहा छ?', en: 'Planning to fund Germany with a HiWi job? Check this before you budget.' },
    { ne: 'Part-time job ले सबै खर्च धान्छ भन्ने सोचेको छौ?', en: 'If your Germany plan depends on part-time work, read this first.' },
    { ne: 'HiWi, Werkstudent र Minijob — फरक के हो?', en: 'HiWi, Werkstudent, Minijob — they are not the same thing.' },
    { ne: 'विद्यार्थीले वर्षमा कति दिन काम गर्न पाउँछ?', en: 'How many days a year can an international student actually work?' },
    { ne: 'Job को भरमा visa को proof of funds पुग्दैन।', en: 'Job income does not replace the proof of funds your visa needs.' },
  ],
  visa: [
    { ne: 'Visa interview सकियो, अब के गर्ने?', en: 'Your visa interview is done. Here is what actually happens next.' },
    { ne: 'Decision कहिले आउँछ भनेर दिन गन्दै छौ?', en: 'Counting days for your visa decision with no idea what is normal?' },
    { ne: 'Embassy ले document list कहाँ publish गर्छ?', en: 'Where does the embassy actually publish its document list?' },
    { ne: 'अरूको timeline तिम्रो timeline होइन।', en: 'Someone else\'s visa timeline is not a rule for yours.' },
    { ne: 'Visa पर्खिरहेको बेला flight book गर्नु अघि यो सोच।', en: 'Before you book a flight while waiting on a visa, think about this.' },
  ],
}

export const DEMO_IDEAS = [
  'Germany public university admission is not completely free.',
  'Why do students get rejected even with good IELTS?',
  'Is German language compulsory for studying in Germany?',
  'Can a BBS student study in Germany?',
  'How much does a student earn from a HiWi job?',
  'Students are confused about blocked accounts.',
]
