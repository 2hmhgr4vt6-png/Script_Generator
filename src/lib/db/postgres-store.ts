import 'server-only'
import { Pool } from 'pg'
import { env } from '@/lib/env'
import { JSON_COLUMNS, assertColumn, type TableName } from './schema'
import type { ListOptions, Row, Store } from './store'

/**
 * Postgres / Supabase driver.
 *
 * Every identifier that reaches a query string is validated against the column
 * whitelist in schema.ts; every value is passed as a bound parameter.
 */
export class PostgresStore implements Store {
  readonly driver = 'postgres' as const
  private pool: Pool

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 5,
      ssl: connectionString.includes('localhost') ? undefined : { rejectUnauthorized: false },
    })
  }

  async init(): Promise<void> {
    await this.pool.query('select 1')
  }

  private serialise(table: TableName, row: Row): Row {
    const jsonCols = JSON_COLUMNS[table] ?? []
    const out: Row = {}
    for (const [key, value] of Object.entries(row)) {
      assertColumn(table, key)
      out[key] = jsonCols.includes(key) ? JSON.stringify(value ?? null) : value
    }
    return out
  }

  async insert<T extends Row>(table: TableName, row: T): Promise<T> {
    const data = this.serialise(table, row)
    const keys = Object.keys(data)
    const placeholders = keys.map((_, i) => `$${i + 1}`)
    const sql = `insert into ${table} (${keys.map(quote).join(', ')}) values (${placeholders.join(', ')}) returning *`
    const result = await this.pool.query(sql, Object.values(data))
    return result.rows[0] as T
  }

  async update<T extends Row>(table: TableName, id: string, patch: Row): Promise<T | null> {
    const data = this.serialise(table, patch)
    const keys = Object.keys(data)
    if (keys.length === 0) return this.get<T>(table, id)
    const assignments = keys.map((key, i) => `${quote(key)} = $${i + 1}`)
    const sql = `update ${table} set ${assignments.join(', ')} where id = $${keys.length + 1} returning *`
    const result = await this.pool.query(sql, [...Object.values(data), id])
    return (result.rows[0] as T) ?? null
  }

  async get<T extends Row>(table: TableName, id: string): Promise<T | null> {
    const result = await this.pool.query(`select * from ${table} where id = $1 limit 1`, [id])
    return (result.rows[0] as T) ?? null
  }

  async findOne<T extends Row>(table: TableName, where: Row): Promise<T | null> {
    const rows = await this.list<T>(table, { where, limit: 1 })
    return rows[0] ?? null
  }

  async list<T extends Row>(table: TableName, options: ListOptions = {}): Promise<T[]> {
    const params: unknown[] = []
    const clauses = buildWhere(table, options.where ?? {}, params)

    if (options.search?.term) {
      const columns = options.search.columns.map((col) => {
        assertColumn(table, col)
        return `coalesce(${quote(col)}::text, '')`
      })
      params.push(`%${options.search.term}%`)
      clauses.push(`(${columns.map((c) => `${c} ilike $${params.length}`).join(' or ')})`)
    }

    const orderBy = options.orderBy ?? 'created_at'
    assertColumn(table, orderBy)
    const direction = options.direction === 'asc' ? 'asc' : 'desc'

    let sql = `select * from ${table}`
    if (clauses.length) sql += ` where ${clauses.join(' and ')}`
    sql += ` order by ${quote(orderBy)} ${direction}`
    if (options.limit) {
      params.push(options.limit)
      sql += ` limit $${params.length}`
    }
    if (options.offset) {
      params.push(options.offset)
      sql += ` offset $${params.length}`
    }

    const result = await this.pool.query(sql, params)
    return result.rows as T[]
  }

  async count(table: TableName, where: Row = {}): Promise<number> {
    const params: unknown[] = []
    const clauses = buildWhere(table, where, params)
    let sql = `select count(*)::int as total from ${table}`
    if (clauses.length) sql += ` where ${clauses.join(' and ')}`
    const result = await this.pool.query(sql, params)
    return result.rows[0]?.total ?? 0
  }

  async remove(table: TableName, id: string): Promise<boolean> {
    const result = await this.pool.query(`delete from ${table} where id = $1`, [id])
    return (result.rowCount ?? 0) > 0
  }

  async removeWhere(table: TableName, where: Row): Promise<number> {
    const params: unknown[] = []
    const clauses = buildWhere(table, where, params)
    if (!clauses.length) throw new Error('removeWhere requires at least one condition')
    const result = await this.pool.query(`delete from ${table} where ${clauses.join(' and ')}`, params)
    return result.rowCount ?? 0
  }
}

function quote(identifier: string): string {
  return `"${identifier}"`
}

function buildWhere(table: TableName, where: Row, params: unknown[]): string[] {
  return Object.entries(where).map(([key, value]) => {
    assertColumn(table, key)
    if (Array.isArray(value)) {
      params.push(value)
      return `${quote(key)} = any($${params.length})`
    }
    if (value === null) return `${quote(key)} is null`
    params.push(value)
    return `${quote(key)} = $${params.length}`
  })
}

export function postgresConnectionString(): string | undefined {
  return env.databaseUrl
}
