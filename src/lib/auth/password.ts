import 'server-only'
import bcrypt from 'bcryptjs'

const ROUNDS = 12

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash)
  } catch {
    return false
  }
}

export interface PasswordCheck {
  ok: boolean
  problems: string[]
}

/** Password policy applied when an admin changes their password. */
export function checkPasswordStrength(password: string): PasswordCheck {
  const problems: string[] = []
  if (password.length < 10) problems.push('Use at least 10 characters.')
  if (!/[a-z]/.test(password)) problems.push('Add a lowercase letter.')
  if (!/[A-Z]/.test(password)) problems.push('Add an uppercase letter.')
  if (!/[0-9]/.test(password)) problems.push('Add a number.')
  if (!/[^A-Za-z0-9]/.test(password)) problems.push('Add a symbol.')
  return { ok: problems.length === 0, problems }
}
