import { useQuery } from '@tanstack/react-query'
import { getProjectBoards } from '~/api/project'

export function ProjectBoardPreview({ projectId }: { projectId: string }) {
  const query = useQuery({
    queryKey: ['projects', projectId, 'boards'],
    queryFn: async () => {
      const response = await getProjectBoards(projectId, { summary: true })
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load issue boards')
      }
      return response.data.boards ?? []
    },
    staleTime: 60_000,
  })

  const firstBoard = query.data?.[0]
  const meta = firstBoard?.name
    ? firstBoard.name
    : query.isPending
      ? '…'
      : 'GitLab'

  return (
    <section className="panel" data-od-id="project-board-preview">
      <div className="panel-head">
        <span className="panel-title">Issue board</span>
        <span className="panel-meta">{meta}</span>
      </div>
      {query.isPending && (
        <div className="panel-body" style={{ color: 'var(--muted)' }}>
          Loading board…
        </div>
      )}
      {query.isError && (
        <div className="panel-body" style={{ color: 'var(--danger)', fontSize: 12 }}>
          {humanizeBoardError(query.error)}
        </div>
      )}
      {query.data?.length === 0 && (
        <div className="panel-body" style={{ color: 'var(--muted)', fontSize: 12 }}>
          No GitLab issue boards on the issues repo.
        </div>
      )}
      {firstBoard && (
        <div
          className="panel-body"
          style={{ display: 'flex', gap: 10, overflowX: 'auto' }}
        >
          {firstBoard.lists.map((list) => (
            <div
              key={list.id}
              style={{
                minWidth: 150,
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 6,
              }}
            >
              <strong style={{ fontSize: 12 }}>
                {list.label?.name || 'Open'}
              </strong>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
                {list.issues.length} issue{list.issues.length === 1 ? '' : 's'}
              </div>
              {list.issues.slice(0, 3).map((issue) => (
                <div key={issue.id} style={{ marginTop: 8, fontSize: 12 }}>
                  {issue.title}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function humanizeBoardError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || '')
  if (/404|not found/i.test(message)) {
    return 'Issue boards are unavailable for this project’s issues repo.'
  }
  if (/403|unauthorized|forbidden/i.test(message)) {
    return 'You don’t have access to issue boards on this repository.'
  }
  if (/network|failed to fetch/i.test(message)) {
    return 'Couldn’t reach the API to load issue boards.'
  }
  return message || 'Failed to load issue boards.'
}
