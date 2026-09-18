'use client'

import { Archive, Copy, Download, FileText, Pencil, Search, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { DURATIONS, LANGUAGES, PLATFORMS, TOPIC_CATEGORIES, type Script } from '@/lib/types'
import { apiFetch, formatDate, formatRelative, truncate } from '@/lib/utils'

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

export function ScriptHistory({ initialScripts }: { initialScripts: Script[] }) {
  const router = useRouter()
  const params = useSearchParams()
  const toast = useToast()

  const [scripts, setScripts] = useState(initialScripts)
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [deleting, setDeleting] = useState<Script | null>(null)
  const [renaming, setRenaming] = useState<Script | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [busy, setBusy] = useState(false)

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    router.push(`/scripts?${next.toString()}`)
  }

  async function onDelete() {
    if (!deleting) return
    setBusy(true)
    try {
      await apiFetch(`/api/scripts/${deleting.id}`, { method: 'DELETE' })
      setScripts((current) => current.filter((s) => s.id !== deleting.id))
      toast.success('Script deleted')
      setDeleting(null)
    } catch (error) {
      toast.error('Could not delete', (error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function onRename() {
    if (!renaming) return
    setBusy(true)
    try {
      const result = await apiFetch<{ script: Script }>(`/api/scripts/${renaming.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: renameValue.trim() }),
      })
      setScripts((current) => current.map((s) => (s.id === result.script.id ? result.script : s)))
      toast.success('Renamed')
      setRenaming(null)
    } catch (error) {
      toast.error('Could not rename', (error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function onDuplicate(script: Script) {
    try {
      const result = await apiFetch<{ script: Script }>(`/api/scripts/${script.id}/duplicate`, { method: 'POST' })
      setScripts((current) => [result.script, ...current])
      toast.success('Duplicated')
    } catch (error) {
      toast.error('Could not duplicate', (error as Error).message)
    }
  }

  async function onArchive(script: Script) {
    try {
      const nextStatus = script.status === 'archived' ? 'draft' : 'archived'
      const result = await apiFetch<{ script: Script }>(`/api/scripts/${script.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      })
      setScripts((current) => current.map((s) => (s.id === result.script.id ? result.script : s)))
      toast.success(nextStatus === 'archived' ? 'Archived' : 'Restored to drafts')
    } catch (error) {
      toast.error('Could not update', (error as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Script history</h1>
          <p className="mt-1.5 text-sm text-muted">Every script, every version, searchable.</p>
        </div>
        <Link href="/ideas">
          <Button variant="primary">+ Create New Script</Button>
        </Link>
      </header>

      <div className="flex flex-wrap gap-2">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            setFilter('q', query.trim())
          }}
          className="relative"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles…"
            className="w-56 pl-9"
          />
        </form>
        <Select value={params.get('language') ?? ''} onChange={(event) => setFilter('language', event.target.value)} className="w-auto">
          <option value="">Any language</option>
          {LANGUAGES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select value={params.get('category') ?? ''} onChange={(event) => setFilter('category', event.target.value)} className="w-auto">
          <option value="">Any category</option>
          {TOPIC_CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select value={params.get('platform') ?? ''} onChange={(event) => setFilter('platform', event.target.value)} className="w-auto">
          <option value="">Any platform</option>
          {PLATFORMS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select value={params.get('duration') ?? ''} onChange={(event) => setFilter('duration', event.target.value)} className="w-auto">
          <option value="">Any duration</option>
          {DURATIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select value={params.get('status') ?? ''} onChange={(event) => setFilter('status', event.target.value)} className="w-auto">
          <option value="">Any status</option>
          {STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        {params.toString() ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery('')
              router.push('/scripts')
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>

      {scripts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No scripts yet"
          description="Generate your first script from a raw idea or a discovered audience problem."
          action={
            <Link href="/ideas">
              <Button variant="primary">Start a new script</Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="border-b border-line bg-surface text-[11px] uppercase tracking-wider text-faint">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Language</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Platform</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Versions</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {scripts.map((script) => (
                  <tr key={script.id} className="bg-card transition-colors hover:bg-elevated">
                    <td className="px-4 py-3">
                      <Link href={`/scripts/${script.id}`} className="font-medium text-ink hover:text-accent">
                        {truncate(script.title, 54)}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-faint">
                        {script.category} · created {formatDate(script.created_at)}
                        {script.is_demo ? ' · sample' : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted">{script.language === 'ne' ? 'Nepali' : 'English'}</td>
                    <td className="px-4 py-3 tabular-nums text-muted">{script.duration_seconds}s</td>
                    <td className="px-4 py-3 text-muted">
                      {PLATFORMS.find((p) => p.value === script.platform)?.label ?? script.platform}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={script.status === 'ready' ? 'success' : script.status === 'archived' ? 'outline' : 'default'}>
                        {script.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted">{script.version_count}</td>
                    <td className="px-4 py-3 text-muted">{formatRelative(script.updated_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/scripts/${script.id}`} title="Open">
                          <Button size="icon" variant="ghost" aria-label="Open script">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button size="icon" variant="ghost" aria-label="Duplicate" title="Duplicate" onClick={() => onDuplicate(script)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <a href={`/api/scripts/${script.id}/export?format=txt`} title="Export">
                          <Button size="icon" variant="ghost" aria-label="Export script">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                        <Button size="icon" variant="ghost" aria-label="Archive" title="Archive" onClick={() => onArchive(script)}>
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Rename"
                          title="Rename"
                          onClick={() => {
                            setRenaming(script)
                            setRenameValue(script.title)
                          }}
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Delete" title="Delete" onClick={() => setDeleting(script)}>
                          <Trash2 className="h-3.5 w-3.5 text-danger" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        title="Delete this script?"
        description={`"${deleting?.title ?? ''}" and all of its versions will be removed. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={busy}
      />

      <Dialog
        open={Boolean(renaming)}
        onClose={() => setRenaming(null)}
        title="Rename script"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onRename} loading={busy}>
              Save
            </Button>
          </>
        }
      >
        <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} autoFocus />
      </Dialog>
    </div>
  )
}
