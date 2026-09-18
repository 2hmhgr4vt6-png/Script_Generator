'use client'

import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  title: string
  description?: string
}

interface ToastApi {
  toast: (toast: Omit<Toast, 'id'>) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const api = useMemo<ToastApi>(() => {
    const push = (toast: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.random()
      setToasts((current) => [...current, { ...toast, id }].slice(-4))
      setTimeout(() => dismiss(id), toast.kind === 'error' ? 8000 : 4500)
    }
    return {
      toast: push,
      success: (title, description) => push({ kind: 'success', title, description }),
      error: (title, description) => push({ kind: 'error', title, description }),
      info: (title, description) => push({ kind: 'info', title, description }),
    }
  }, [dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'pointer-events-auto animate-slide-in rounded-lg border bg-elevated p-3.5 shadow-lg shadow-black/40',
              toast.kind === 'success' && 'border-success/30',
              toast.kind === 'error' && 'border-danger/40',
              toast.kind === 'info' && 'border-line',
            )}
          >
            <div className="flex items-start gap-2.5">
              {toast.kind === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />}
              {toast.kind === 'error' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />}
              {toast.kind === 'info' && <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{toast.title}</p>
                {toast.description ? <p className="mt-1 text-xs leading-relaxed text-muted">{toast.description}</p> : null}
              </div>
              <button onClick={() => dismiss(toast.id)} className="text-faint transition-colors hover:text-ink" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
