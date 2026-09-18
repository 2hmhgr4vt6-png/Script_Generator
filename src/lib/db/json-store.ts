import 'server-only'
import { promises as fs } from 'fs'
import path from 'path'
import { TABLES, type TableName } from './schema'
import type { ListOptions, Row, Store } from './store'

type Database = Record<string, Row[]>

const DATA_DIR = process.env.BHASIKA_DATA_DIR ?? path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'store.json')

/**
 * File-backed store used when no DATABASE_URL is configured.
 *
 * Writes are serialised through a single promise chain so concurrent requests
 * in the dev server cannot interleave a read-modify-write.
 */
export class JsonStore implements Store {
  readonly driver = 'json' as const
  private db: Database | null = null
  private queue: Promise<unknown> = Promise.resolve()

  async init(): Promise<void> {
    await this.load()
  }

  private async load(): Promise<Database> {
    if (this.db) return this.db
    try {
      const raw = await fs.readFile(DATA_FILE, 'utf8')
      this.db = JSON.parse(raw) as Database
    } catch {
      this.db = {}
    }
    for (const table of Object.keys(TABLES)) {
      if (!this.db[table]) this.db[table] = []
    }
    return this.db
  }

  private async flush(): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(DATA_FILE, JSON.stringify(this.db, null, 2), 'utf8')
  }

  /** Runs `fn` after every previously queued write has settled. */
  private serialise<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn, fn)
    this.queue = next.catch(() => undefined)
    return next
  }

  async insert<T extends Row>(table: TableName, row: T): Promise<T> {
    return this.serialise(async () => {
      const db = await this.load()
      db[table].push(row)
      await this.flush()
      return row
    })
  }

  async update<T extends Row>(table: TableName, id: string, patch: Row): Promise<T | null> {
    return this.serialise(async () => {
      const db = await this.load()
      const index = db[table].findIndex((r) => r.id === id)
      if (index === -1) return null
      db[table][index] = { ...db[table][index], ...patch }
      await this.flush()
      return db[table][index] as T
    })
  }

  async get<T extends Row>(table: TableName, id: string): Promise<T | null> {
    const db = await this.load()
    return (db[table].find((r) => r.id === id) as T) ?? null
  }

  async findOne<T extends Row>(table: TableName, where: Row): Promise<T | null> {
    const rows = await this.list<T>(table, { where, limit: 1 })
    return rows[0] ?? null
  }

  async list<T extends Row>(table: TableName, options: ListOptions = {}): Promise<T[]> {
    const db = await this.load()
    let rows = [...db[table]]

    if (options.where) {
      rows = rows.filter((row) => matches(row, options.where!))
    }
    if (options.search?.term) {
      const term = options.search.term.toLowerCase()
      rows = rows.filter((row) =>
        options.search!.columns.some((col) => String(row[col] ?? '').toLowerCase().includes(term)),
      )
    }

    const orderBy = options.orderBy ?? 'created_at'
    const direction = options.direction ?? 'desc'
    rows.sort((a, b) => {
      const av = a[orderBy]
      const bv = b[orderBy]
      if (av === bv) return 0
      const result = av > bv ? 1 : -1
      return direction === 'asc' ? result : -result
    })

    const offset = options.offset ?? 0
    return rows.slice(offset, options.limit ? offset + options.limit : undefined) as T[]
  }

  async count(table: TableName, where: Row = {}): Promise<number> {
    const db = await this.load()
    return db[table].filter((row) => matches(row, where)).length
  }

  async remove(table: TableName, id: string): Promise<boolean> {
    return this.serialise(async () => {
      const db = await this.load()
      const before = db[table].length
      db[table] = db[table].filter((r) => r.id !== id)
      await this.flush()
      return db[table].length < before
    })
  }

  async removeWhere(table: TableName, where: Row): Promise<number> {
    return this.serialise(async () => {
      const db = await this.load()
      const before = db[table].length
      db[table] = db[table].filter((row) => !matches(row, where))
      await this.flush()
      return before - db[table].length
    })
  }
}

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (Array.isArray(value)) return value.includes(row[key])
    return row[key] === value
  })
}
