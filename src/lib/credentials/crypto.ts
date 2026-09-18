import 'server-only'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * AES-256-GCM for credentials at rest.
 *
 * The key comes from CREDENTIALS_SECRET. Without it, a random key is generated
 * once and written to data/credentials.key so local development works with no
 * setup — that file is git-ignored, and Settings warns when it is in use,
 * because a key on local disk does not survive a redeploy or span instances.
 */

const ALGORITHM = 'aes-256-gcm'
const DATA_DIR = process.env.BHASIKA_DATA_DIR ?? path.join(process.cwd(), 'data')
const KEY_FILE = path.join(DATA_DIR, 'credentials.key')

let keyPromise: Promise<{ key: Buffer; managed: boolean }> | null = null

async function getKey(): Promise<{ key: Buffer; managed: boolean }> {
  if (keyPromise) return keyPromise
  keyPromise = (async () => {
    const configured = process.env.CREDENTIALS_SECRET?.trim()
    if (configured) {
      // Any passphrase length is accepted; SHA-256 gives the 32 bytes AES needs.
      return { key: createHash('sha256').update(configured).digest(), managed: false }
    }

    try {
      const existing = (await fs.readFile(KEY_FILE, 'utf8')).trim()
      if (existing) return { key: Buffer.from(existing, 'hex'), managed: true }
    } catch {
      // Fall through and create one.
    }

    const generated = randomBytes(32)
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(KEY_FILE, generated.toString('hex'), { mode: 0o600 })
    return { key: generated, managed: true }
  })().catch((error) => {
    keyPromise = null
    throw error
  })
  return keyPromise
}

/** True when the encryption key is a locally generated file rather than CREDENTIALS_SECRET. */
export async function usingGeneratedKey(): Promise<boolean> {
  return (await getKey()).managed
}

export async function encrypt(plaintext: string): Promise<string> {
  const { key } = await getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`
}

/**
 * Returns null rather than throwing when a value cannot be decrypted — which
 * happens when the encryption key changes. The caller then treats the
 * credential as missing and asks for it again, instead of crashing the page.
 */
export async function decrypt(payload: string): Promise<string | null> {
  try {
    const [version, iv, tag, data] = payload.split('.')
    if (version !== 'v1' || !iv || !tag || !data) return null
    const { key } = await getKey()
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

/** Last four characters, for confirming which key is in place without revealing it. */
export function maskPreview(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length <= 4) return '••••'
  return `••••${trimmed.slice(-4)}`
}
