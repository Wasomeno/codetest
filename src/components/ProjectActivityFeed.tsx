import { motion, useReducedMotion } from 'framer-motion'
import { useProjectActivity } from '~/hooks/api/useProjectActivity'
import { useCurrentUser } from '~/hooks/api/useCurrentUser'
import { useAppProject } from '~/hooks/api/useAppProject'
import { useProjectMembers } from '~/hooks/api/useProjectMembers'
import { formatActor } from '~/lib/actor'
import type { AppProjectActivity } from '~/types/project'

/**
 * Renders the audit-log activity feed for a project.
 *
 *   - Each entry maps an `AppProjectActivity.action` to a one-line
 *     narrative. `changes` are surfaced as a small detail line.
 *   - Actor names resolve against the current user first, then the
 *     issue-repo GitLab members directory (`issueRepoId`).
 *   - The feed respects `prefers-reduced-motion` and uses the same
 *     canonical ease-out as the rest of the codetest app.
 */
export function ProjectActivityFeed({ projectId }: { projectId: string }) {
  const reduce = useReducedMotion()
  const activity = useProjectActivity(projectId)
  const user = useCurrentUser()
  const project = useAppProject(projectId)
  const members = useProjectMembers(project.data?.issueRepoId)

  if (activity.isPending) {
    return (
      <div className="project-activity is-loading" data-od-id="project-activity-loading">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 32,
              borderRadius: 4,
              background: 'var(--border)',
              opacity: 0.4,
              marginBottom: 8,
            }}
            aria-hidden="true"
          />
        ))}
      </div>
    )
  }

  if (activity.isError) {
    return (
      <div className="project-activity is-error" data-od-id="project-activity-error">
        <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
          Couldn't load activity: {String((activity.error as Error)?.message || activity.error)}
        </p>
      </div>
    )
  }

  const events = activity.data ?? []

  if (events.length === 0) {
    return (
      <div className="project-activity is-empty" data-od-id="project-activity-empty">
        <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
          Project changes and scenario sync events will show up here.
        </p>
      </div>
    )
  }

  return (
    <ol className="project-activity" data-od-id="project-activity">
      {events.slice(0, 12).map((ev, i) => (
        <ActivityRow
          key={ev.id}
          ev={ev}
          actorName={formatActor(ev.actorId, user.data, members.data).label}
          index={i}
          reduce={reduce}
        />
      ))}
    </ol>
  )
}

function ActivityRow({
  ev,
  actorName,
  index,
  reduce,
}: {
  ev: AppProjectActivity
  actorName: string
  index: number
  reduce: boolean | null
}) {
  const narrative = narrate(ev)
  return (
    <motion.li
      className="project-activity-row"
      data-od-id={`project-activity-row-${ev.id}`}
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 10,
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px solid var(--border)',
        listStyle: 'none',
      }}
      initial={reduce ? false : { opacity: 0, transform: 'translateY(2px)' }}
      animate={{ opacity: 1, transform: 'translateY(0)' }}
      transition={{
        duration: reduce ? 0 : 0.25,
        delay: reduce ? 0 : Math.min(index * 0.04, 0.4),
      }}
    >
      <span
        className="project-activity-dot"
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          background: actionColor(ev.action),
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            color: 'var(--fg)',
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <strong style={{ fontWeight: 500 }}>{actorName}</strong>{' '}
          <span style={{ color: 'var(--muted)' }}>{narrative}</span>
        </div>
        {ev.changes && Object.keys(ev.changes).length > 0 ? (
          <div
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              fontFamily: 'var(--font-mono)',
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {summarizeChanges(ev.changes)}
          </div>
        ) : null}
      </div>
      <time
        dateTime={typeof ev.createdAt === 'string' ? ev.createdAt : ev.createdAt}
        style={{
          color: 'var(--muted)',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          whiteSpace: 'nowrap',
        }}
      >
        {fmtRel(ev.createdAt)}
      </time>
    </motion.li>
  )
}

function actionColor(action: AppProjectActivity['action']): string {
  switch (action) {
    case 'created':
      return 'oklch(70% 0.14 150)'
    case 'updated':
      return 'oklch(70% 0.14 255)'
    case 'deleted':
      return 'oklch(60% 0.18 25)'
    case 'scenario_sync_started':
      return 'oklch(70% 0.14 75)'
    case 'scenario_sync_completed':
      return 'oklch(70% 0.14 150)'
    case 'scenario_sync_failed':
      return 'oklch(60% 0.18 25)'
    case 'spec_saved':
      return 'oklch(70% 0.12 280)'
    case 'fsd_issues_created':
      return 'oklch(70% 0.14 200)'
    default:
      return 'var(--muted)'
  }
}

function narrate(ev: AppProjectActivity): string {
  switch (ev.action) {
    case 'created':
      return 'created this project'
    case 'updated': {
      const keys = Object.keys(ev.changes || {})
      if (keys.length === 0) return 'updated project settings'
      return `updated ${keys.join(', ')}`
    }
    case 'deleted':
      return 'deleted this project'
    case 'scenario_sync_started':
      return 'started scenario sync from specs'
    case 'scenario_sync_completed': {
      const count = ev.changes?.importedCount?.new
      if (typeof count === 'number') {
        return `finished scenario sync · ${count} scenario${count === 1 ? '' : 's'}`
      }
      return 'finished scenario sync'
    }
    case 'scenario_sync_failed': {
      const err = ev.changes?.error?.new
      if (typeof err === 'string') {
        return `scenario sync failed: ${err}`
      }
      return 'scenario sync failed'
    }
    case 'spec_saved': {
      const path = ev.changes?.path?.new
      const action = ev.changes?.action?.new
      if (typeof path === 'string' && path) {
        const verb =
          action === 'create' ? 'created' : action === 'delete' ? 'deleted' : 'saved'
        return `${verb} spec ${path}`
      }
      return 'saved a spec file'
    }
    case 'fsd_issues_created': {
      const created = ev.changes?.createdCount?.new
      const failed = ev.changes?.failedCount?.new
      if (typeof created === 'number') {
        const base = `created ${created} GitLab issue${created === 1 ? '' : 's'} from FSD`
        if (typeof failed === 'number' && failed > 0) {
          return `${base} (${failed} failed)`
        }
        return base
      }
      return 'created GitLab issues from FSD'
    }
    default:
      return ev.action
  }
}

function summarizeChanges(
  changes: NonNullable<AppProjectActivity['changes']>,
): string {
  const parts: string[] = []
  for (const [k, v] of Object.entries(changes)) {
    if (v == null) continue
    const o = v.old
    const n = v.new
    if (o == null && n != null) {
      parts.push(`${k} → ${formatVal(n)}`)
    } else if (o != null && n != null) {
      parts.push(`${formatVal(o)} → ${formatVal(n)}`)
    }
  }
  return parts.join(' · ')
}

function formatVal(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'string') return v.length > 40 ? v.slice(0, 40) + '…' : v
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return JSON.stringify(v).slice(0, 40)
}

function fmtRel(input: string | number | Date): string {
  const t = new Date(input).getTime()
  if (Number.isNaN(t)) return ''
  const diff = (Date.now() - t) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + 'd ago'
  if (diff < 86400 * 30) return Math.floor(diff / 86400 / 7) + 'w ago'
  return Math.floor(diff / 86400 / 30) + 'mo ago'
}
