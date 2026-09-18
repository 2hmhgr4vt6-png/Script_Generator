import 'server-only'
import type { TableName } from './schema'

export type Row = Record<string, any>

export interface ListOptions {
  where?: Row
  /** Case-insensitive "contains" match, applied across the given columns. */
  search?: { columns: string[]; term: string }
  orderBy?: string
  direction?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

/**
 * Minimal persistence contract. Two drivers implement it: a JSON file store
 * (zero-config local development) and Postgres/Supabase (production).
 */
export interface Store {
  readonly driver: 'json' | 'postgres'
  init(): Promise<void>
  insert<T extends Row>(table: TableName, row: T): Promise<T>
  update<T extends Row>(table: TableName, id: string, patch: Row): Promise<T | null>
  get<T extends Row>(table: TableName, id: string): Promise<T | null>
  findOne<T extends Row>(table: TableName, where: Row): Promise<T | null>
  list<T extends Row>(table: TableName, options?: ListOptions): Promise<T[]>
  count(table: TableName, where?: Row): Promise<number>
  remove(table: TableName, id: string): Promise<boolean>
  removeWhere(table: TableName, where: Row): Promise<number>
}
