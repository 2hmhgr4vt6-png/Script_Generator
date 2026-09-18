import type { NextRequest } from 'next/server'
import { AppError, apiHandler } from '@/lib/api'
import { buildNamedAIProvider } from '@/lib/ai'
import { OpenAIProvider } from '@/lib/ai/providers/openai'
import { AI_PROVIDER_IDS, resolveCredentials, type AIProviderId } from '@/lib/credentials'
import { currentWorkspace } from '@/lib/user'

export const dynamic = 'force-dynamic'

/**
 * Lists the models the configured key actually serves.
 *
 * Model availability varies by provider, account and region, so the real list
 * beats any set of names hardcoded in this repository.
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  return apiHandler(async () => {
    if (!(AI_PROVIDER_IDS as readonly string[]).includes(params.id)) {
      throw new AppError('That provider does not expose a model list.', 400, 'unsupported')
    }

    const user = await currentWorkspace()
    const credentials = await resolveCredentials(user.id)
    const provider = buildNamedAIProvider(params.id as AIProviderId, credentials)

    if (!provider) throw new AppError('Add a key for this provider first.', 400, 'not_configured')
    if (!(provider instanceof OpenAIProvider)) {
      throw new AppError('This provider does not publish a model list.', 400, 'unsupported')
    }

    return { models: await provider.listModels() }
  })
}
