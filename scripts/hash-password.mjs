#!/usr/bin/env node
/**
 * Generates a bcrypt hash for BHASIKA_ADMIN_PASSWORD_HASH.
 *
 *   npm run hash-password
 *
 * The password is read from stdin so it does not land in your shell history,
 * and only the hash is printed. Never commit the plaintext anywhere.
 */
import { createInterface } from 'node:readline/promises'
import bcrypt from 'bcryptjs'

async function readPassword() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return await rl.question('New admin password: ')
  } finally {
    rl.close()
  }
}

const password = process.argv[2] ?? (await readPassword())

if (!password || password.length < 10) {
  console.error('\nThe password must be at least 10 characters.')
  process.exit(1)
}

const hash = await bcrypt.hash(password, 12)

// Dotenv expands unescaped "$", which would truncate the hash, so the line is
// printed ready-escaped.
console.log('\nAdd this line to your .env.local exactly as printed:\n')
console.log(`BHASIKA_ADMIN_PASSWORD_HASH=${hash.replaceAll('$', '\\$')}\n`)
console.log('Or, for a hosting provider UI that does not need escaping:\n')
console.log(`BHASIKA_ADMIN_PASSWORD_HASH_B64=${Buffer.from(hash, 'utf8').toString('base64')}\n`)
