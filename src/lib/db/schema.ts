import 'server-only'

/**
 * Column whitelist per table.
 *
 * The Postgres driver builds SQL from these lists only — a caller can never
 * inject an identifier, because every column name is checked against this map
 * before it reaches a query string.
 */
export const TABLES = {
  users: ['id', 'email', 'name', 'role', 'created_at', 'updated_at'],
  user_preferences: [
    'id', 'user_id', 'default_language', 'default_duration', 'default_platform', 'default_tone',
    'learning_enabled', 'research_schedule', 'research_schedule_cron', 'created_at', 'updated_at',
  ],
  ideas: [
    'id', 'user_id', 'raw_text', 'title', 'category', 'language', 'duration_seconds', 'content_type',
    'audience', 'audience_custom', 'platform', 'tone', 'created_at', 'updated_at',
  ],
  research_sessions: [
    'id', 'user_id', 'idea_id', 'query', 'status', 'provider', 'is_demo', 'queries', 'facts',
    'conflicts', 'summary', 'error', 'created_at', 'updated_at',
  ],
  research_sources: [
    'id', 'user_id', 'session_id', 'title', 'url', 'domain', 'excerpt', 'published_at',
    'source_type', 'relevance', 'verification', 'selected', 'is_demo', 'created_at',
  ],
  audience_problems: [
    'id', 'user_id', 'session_id', 'title', 'excerpt', 'platform', 'source_name', 'source_url',
    'retrieved_at', 'posted_at', 'category', 'language', 'relevance', 'status', 'analysis',
    'related_questions', 'is_demo', 'created_at', 'updated_at',
  ],
  scripts: [
    'id', 'user_id', 'idea_id', 'problem_id', 'research_session_id', 'title', 'language',
    'duration_seconds', 'platform', 'category', 'content_type', 'audience', 'tone', 'hook_style',
    'sections', 'sources', 'status', 'is_demo', 'version_count', 'created_at', 'updated_at',
  ],
  script_versions: ['id', 'script_id', 'user_id', 'version', 'sections', 'label', 'created_at'],
  behavior_events: ['id', 'user_id', 'type', 'payload', 'created_at'],
  api_integrations: [
    'id', 'user_id', 'provider', 'config', 'last_tested_at', 'last_test_status', 'last_test_message',
    'created_at', 'updated_at',
  ],
  scheduled_syncs: [
    'id', 'user_id', 'source', 'frequency', 'cron', 'last_run_at', 'last_status', 'created_at', 'updated_at',
  ],
} as const

export type TableName = keyof typeof TABLES

/** Columns stored as jsonb in Postgres, and therefore parsed/serialised on the way in and out. */
export const JSON_COLUMNS: Partial<Record<TableName, string[]>> = {
  research_sessions: ['queries', 'facts', 'conflicts'],
  audience_problems: ['analysis', 'related_questions'],
  scripts: ['sections', 'sources'],
  script_versions: ['sections'],
  behavior_events: ['payload'],
  api_integrations: ['config'],
}

export function assertColumn(table: TableName, column: string): void {
  const allowed = TABLES[table] as readonly string[]
  if (!allowed.includes(column)) {
    throw new Error(`Unknown column "${column}" for table "${table}"`)
  }
}
