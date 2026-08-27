import { useEffect, useState } from 'react'
import { getSessionId } from '~/utils/session'

export interface ProjectStreamEvent {
  type?: string
  resourceId?: string
  projectId?: string
  stage?: string
  message?: string
  importStatus?: unknown
  stepInfo?: { currentStep?: number; totalSteps?: number; stepName?: string }
}

const BANNER_CLEAR_MS = 8_000
const IGNORED_STAGES = new Set(['connected', 'closed'])

/**
 * Subscribe to the unified SSE stream for a project page.
 * Backend filters by `projectId` when provided; the socket stays open
 * across job completion so subsequent import/generation events surface.
 */
export function useProjectStream(projectId: string | undefined) {
  const [event, setEvent] = useState<ProjectStreamEvent | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!projectId || typeof window === 'undefined') return
    const sessionId = getSessionId()
    if (!sessionId) return

    const base = ((import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api').replace(/\/+$/, '')
    const url = new URL(`${base}/stream`, window.location.origin)
    url.searchParams.set('session_id', sessionId)
    url.searchParams.set('projectId', projectId)

    const source = new EventSource(url.toString())
    let clearTimer: ReturnType<typeof setTimeout> | null = null

    const scheduleClear = () => {
      if (clearTimer) clearTimeout(clearTimer)
      clearTimer = setTimeout(() => setEvent(null), BANNER_CLEAR_MS)
    }

    source.onopen = () => setConnected(true)
    source.onmessage = (message) => {
      try {
        const next = JSON.parse(message.data) as ProjectStreamEvent
        if (!isRelevantEvent(next, projectId)) return
        if (next.stage && IGNORED_STAGES.has(next.stage) && !next.message) return
        if (!next.message && next.stage !== 'done' && next.stage !== 'error') return

        setEvent(next)
        if (next.stage === 'done' || next.stage === 'error') {
          scheduleClear()
        } else if (clearTimer) {
          clearTimeout(clearTimer)
          clearTimer = null
        }
      } catch {
        // Ignore malformed events and keep the stream alive.
      }
    }
    source.onerror = () => {
      setConnected(false)
    }

    return () => {
      if (clearTimer) clearTimeout(clearTimer)
      source.close()
      setConnected(false)
    }
  }, [projectId])

  return { event, connected }
}

function isRelevantEvent(ev: ProjectStreamEvent, projectId: string): boolean {
  if (ev.projectId && ev.projectId === projectId) return true
  if (ev.resourceId) {
    if (ev.resourceId === projectId) return true
    if (ev.resourceId.includes(projectId)) return true
  }
  if (!ev.resourceId && !ev.projectId) {
    return Boolean(ev.message) && ev.type !== 'system'
  }
  return false
}
