#!/usr/bin/env node
/**
 * Applies the SQL migrations in supabase/migrations against DATABASE_URL.
 *
 *   npm run db:migrate
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set. Without it the app uses the local JSON store and needs no migration.')
  process.exit(1)
}

const dir = path.join(process.cwd(), 'supabase', 'migrations')
const files = (await readdir(dir)).filter((file) => file.endsWith('.sql')).sort()

const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes('localhost') ? undefined : { rejectUnauthorized: false },
})
await client.connect()

try {
  for (const file of files) {
    process.stdout.write(`Applying ${file}... `)
    await client.query(await readFile(path.join(dir, file), 'utf8'))
    console.log('done')
  }
  console.log(`\n${files.length} migration(s) applied.`)
} catch (error) {
  console.error('\nMigration failed:', error.message)
  process.exitCode = 1
} finally {
  await client.end()
}
