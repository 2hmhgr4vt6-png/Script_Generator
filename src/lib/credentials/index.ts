import 'server-only'
import { getStore, newId, now } from '@/lib/db'
import { demoModeForced } from '@/lib/env'
import { decrypt, encrypt, maskPreview, usingGeneratedKey } from './crypto'
import {
  ALLOWED_FIELD_KEYS, INTEGRATIONS, isSecretField, type CredentialOrigin, type IntegrationId, type IntegrationState,
} from './registry'

export * from './registry'
export { usingGeneratedKey } from './crypto'

interface IntegrationRow {
  id: string
  user_id: string
  provider: string
  /** Field name -> value. Secret fields hold ciphertext; plain fields hold the literal. */
  config: Record<string, string>
  last_tested_at: string | null
  last_test_status: string | null
  last_test_message: string | null
  created_at: string
  updated_at: string
}

/**
 * Resolved credentials for the current workspace.
 *
 * Stored values win over environment variables, so a key added in Settings
 * overrides a stale one baked into the deployment. Env remains supported so
 * existing `.env` deployments keep working untouched.
 */
export interface ResolvedCredentials {
  get(key: string): string | undefined
  origin(key: string): CredentialOrigin
}

async function loadRows(userId: string): Promise<IntegrationRow[]> {
  const store = await getStore()
  return store.list<IntegrationRow>('api_integrations', { where: { user_id: userId } })
}

async function decryptRow(row: IntegrationRow): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(row.config ?? {})) {
    if (!value) continue
    if (isSecretField(key)) {
      const plain = await decrypt(value)
      if (plain) out[key] = plain
    } else {
      out[key] = value
    }
  }
  return out
}

/**
 * Base-URL overrides are honoured from the environment for every preset, so a
 * proxy or gateway can be pointed at without a code change. They are not shown
 * in Settings because they are an advanced escape hatch, not routine setup.
 */
export async function resolveCredentials(userId: string): Promise<ResolvedCredentials> {
  const stored: Record<string, string> = {}
  for (const row of await loadRows(userId)) {
    Object.assign(stored, await decryptRow(row))
  }

  return {
    get(key) {
      const value = stored[key] ?? process.env[key]
      return value && value.trim() !== '' ? value.trim() : undefined
    },
    origin(key) {
      if (stored[key]?.trim()) return 'stored'
      if (process.env[key]?.trim()) return 'env'
      return 'none'
    },
  }
}

/** Credentials for the single workspace, resolved lazily. */
export async function workspaceCredentials(): Promise<ResolvedCredentials> {
  const { getStudioUser } = await import('@/lib/user')
  const user = await getStudioUser()
  return resolveCredentials(user.id)
}

export async function saveIntegration(
  userId: string,
  provider: IntegrationId,
  fields: Record<string, string>,
): Promise<void> {
  const store = await getStore()
  const rows = await loadRows(userId)
  const existing = rows.find((row) => row.provider === provider)
  const config: Record<string, string> = { ...(existing?.config ?? {}) }

  for (const [key, raw] of Object.entries(fields)) {
    if (!ALLOWED_FIELD_KEYS.has(key)) continue
    const value = raw?.trim() ?? ''

    if (value === '') {
      // An empty secret means "leave what is already stored alone"; an empty
      // plain field means "clear it", since those are visible and editable.
      if (!isSecretField(key)) delete config[key]
      continue
    }
    config[key] = isSecretField(key) ? await encrypt(value) : value
  }

  if (existing) {
    await store.update('api_integrations', existing.id, {
      config,
      last_tested_at: null,
      last_test_status: null,
      last_test_message: null,
      updated_at: now(),
    })
    return
  }

  await store.insert('api_integrations', {
    id: newId(),
    user_id: userId,
    provider,
    config,
    last_tested_at: null,
    last_test_status: null,
    last_test_message: null,
    created_at: now(),
    updated_at: now(),
  } satisfies IntegrationRow)
}

export async function deleteIntegration(userId: string, provider: IntegrationId): Promise<boolean> {
  const store = await getStore()
  const rows = await loadRows(userId)
  const existing = rows.find((row) => row.provider === provider)
  if (!existing) return false
  await store.remove('api_integrations', existing.id)
  return true
}

export async function recordTestResult(
  userId: string,
  provider: IntegrationId,
  ok: boolean,
  message: string,
): Promise<void> {
  const store = await getStore()
  const rows = await loadRows(userId)
  const existing = rows.find((row) => row.provider === provider)
  const patch = {
    last_tested_at: now(),
    last_test_status: ok ? 'ok' : 'failed',
    last_test_message: message.slice(0, 300),
    updated_at: now(),
  }

  if (existing) {
    await store.update('api_integrations', existing.id, patch)
    return
  }
  // Env-configured integrations have no row yet; create one to hold the result.
  await store.insert('api_integrations', {
    id: newId(),
    user_id: userId,
    provider,
    config: {},
    created_at: now(),
    ...patch,
  } as IntegrationRow)
}

/**
 * The full picture for the Settings page: which integrations are configured,
 * where each value came from, and a masked preview. Secret values never leave
 * the server.
 */
export async function integrationStates(userId: string): Promise<IntegrationState[]> {
  const rows = await loadRows(userId)
  const decrypted = new Map<string, Record<string, string>>()
  for (const row of rows) decrypted.set(row.provider, await decryptRow(row))

  return INTEGRATIONS.map((spec) => {
    const stored = decrypted.get(spec.id) ?? {}
    const row = rows.find((r) => r.provider === spec.id)

    const values: IntegrationState['values'] = {}
    for (const field of spec.fields) {
      const storedValue = stored[field.key]?.trim()
      const envValue = process.env[field.key]?.trim()
      const value = storedValue || envValue
      const origin: CredentialOrigin = storedValue ? 'stored' : envValue ? 'env' : 'none'
      values[field.key] = {
        set: Boolean(value),
        preview: value ? (field.secret ? maskPreview(value) : value) : null,
        origin,
      }
    }

    const required = spec.fields.filter((field) => field.required)
    const connected = required.every((field) => values[field.key].set)
    const origin: CredentialOrigin = required.some((f) => values[f.key].origin === 'stored')
      ? 'stored'
      : required.some((f) => values[f.key].origin === 'env')
        ? 'env'
        : 'none'

    return {
      id: spec.id,
      label: spec.label,
      group: spec.group,
      connected,
      origin,
      values,
      lastTestedAt: row?.last_tested_at ?? null,
      lastTestStatus: (row?.last_test_status as 'ok' | 'failed' | null) ?? null,
      lastTestMessage: row?.last_test_message ?? null,
    }
  })
}

export async function credentialsHealth(): Promise<{ generatedKey: boolean }> {
  return { generatedKey: await usingGeneratedKey() }
}

/**
 * Demo mode = no AI provider resolves at all. Asking the AI factory rather than
 * checking two specific key names keeps this correct as providers are added —
 * an earlier version only looked for OpenAI and Anthropic keys, so configuring
 * Gemini left the whole UI still claiming to be in demo mode.
 */
export async function isDemoMode(): Promise<boolean> {
  if (demoModeForced()) return true
  const { buildAIProvider } = await import('@/lib/ai')
  return !buildAIProvider(await workspaceCredentials())
}
