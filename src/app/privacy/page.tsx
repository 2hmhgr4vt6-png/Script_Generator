import type { Metadata } from 'next'
import Link from 'next/link'
import { Wordmark } from '@/components/layout/logo'

export const metadata: Metadata = { title: 'Privacy' }

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'What this tool stores',
    body: [
      'Bhasika AI Content Studio is an internal tool for the Bhasika content team. It stores the raw ideas you type, the research sessions you run and the sources they returned, the audience problems discovered from public sources, the scripts you generate and every version you save, and a log of your own content preferences.',
      'There are no user accounts and no passwords. The studio is a single shared workspace, so it stores no personal credentials of any kind.',
    ],
  },
  {
    title: 'What it does not collect',
    body: [
      'No analytics or advertising trackers are embedded. No personal information is collected about the people whose public questions appear in problem discovery beyond what the platform itself publishes, and no attempt is made to infer sensitive attributes about anyone.',
      'Private accounts, private groups, and content behind a login wall are never accessed. Discovery uses official platform APIs and public search results only, within their terms of service and robots.txt.',
    ],
  },
  {
    title: 'Preference learning',
    body: [
      'Preference learning counts what you do inside the studio — topics, durations, hook styles, editing actions — and applies simple rules to suggest what to make next. It is rule-based counting, not machine learning, and it is described honestly as such throughout the interface.',
      'It can be switched off at any time in Settings, and the entire event history can be deleted from the same screen.',
    ],
  },
  {
    title: 'Third-party providers',
    body: [
      'When an AI provider is configured, the text you submit for research, hook generation, script generation, rewriting and fact checking is sent to that provider for processing. When a search provider is configured, your generated search queries are sent to it.',
      'Bhasika does not train any public AI model on your data. Review the terms and data-retention policy of whichever providers you configure before sending confidential material through them.',
    ],
  },
  {
    title: 'Access and retention',
    body: [
      'This deployment has no sign-in. Anyone who can reach its URL can read and change everything stored in it, so it is intended to run on a local machine or behind separate access control such as a VPN or an authenticating proxy. Whoever operates the deployment is responsible for that boundary.',
      'You can delete any script, problem or learning event from inside the app. Deleting a script removes its versions with it.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <Link href="/dashboard">
        <Wordmark showTagline />
      </Link>

      <h1 className="mt-10 text-2xl font-semibold tracking-tight text-ink">Privacy</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        How Bhasika AI Content Studio handles data. Written for the team that uses it, not for a legal department.
      </p>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-sm font-semibold text-ink">{section.title}</h2>
            {section.body.map((paragraph, index) => (
              <p key={index} className="mt-2.5 text-sm leading-relaxed text-muted">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-line pt-6 text-xs text-faint">
        Questions about this page belong with whoever administers this deployment.
      </p>
    </main>
  )
}
