import type { NextRequest } from 'next/server'
import { AppError, apiHandler } from '@/lib/api'
import { buildAIProvider } from '@/lib/ai'
import { integrationById, recordTestResult, resolveCredentials, type IntegrationId } from '@/lib/credentials'
import { buildSearchProvider } from '@/lib/search'
import { buildSocialProviders } from '@/lib/social'
import { currentWorkspace } from '@/lib/user'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Makes the cheapest real call each provider allows, so "Connected" means the
 * credential actually works rather than merely being present.
 */
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  return apiHandler(async () => {
    const spec = integrationById(params.id)
    if (!spec) throw new AppError('Unknown integration.', 404, 'not_found')

    const user = await currentWorkspace()
    const credentials = await resolveCredentials(user.id)
    const provider = spec.id as IntegrationId

    try {
      const message = await runTest(provider, credentials)
      await recordTestResult(user.id, provider, true, message)
      return { ok: true, message }
    } catch (error) {
      const message = (error as Error).message || 'The test failed.'
      await recordTestResult(user.id, provider, false, message)
      return { ok: false, message }
    }
  })
}

async function runTest(
  provider: IntegrationId,
  credentials: Awaited<ReturnType<typeof resolveCredentials>>,
): Promise<string> {
  if (provider === 'openai' || provider === 'anthropic') {
    const forced = {
      get: (key: string) => (key === 'AI_PROVIDER' ? provider : credentials.get(key)),
      origin: credentials.origin,
    }
    const ai = buildAIProvider(forced)
    if (!ai) throw new Error('No API key is configured for this provider.')
    const reply = await ai.complete([{ role: 'user', content: 'Reply with the single word: ready' }], {
      maxTokens: 8,
      temperature: 0,
    })
    return `${ai.name} responded using ${ai.model}: "${reply.trim().slice(0, 40)}"`
  }

  if (provider === 'search') {
    const search = buildSearchProvider(credentials)
    if (!search) throw new Error('No search API key is configured.')
    const results = await search.search('DAAD study in Germany requirements', { limit: 3 })
    if (!results.length) throw new Error('The provider accepted the key but returned no results.')
    return `${search.name} returned ${results.length} results, e.g. ${new URL(results[0].url).hostname}`
  }

  const social = buildSocialProviders(credentials).find((p) => p.id === provider)
  if (!social) throw new Error('Unknown social provider.')
  if (!social.status().connected) throw new Error(`${social.label} has no credentials configured.`)
  await social.verify()
  return `${social.label} accepted the credentials.`
}
