import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getProjectTestContext, updateProjectTestContext } from '~/api/project'

export function ProjectTestContextEditor({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const [markdown, setMarkdown] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const contextQuery = useQuery({
    queryKey: ['projects', projectId, 'test-context'],
    queryFn: async () => {
      const response = await getProjectTestContext(projectId)
      if (!response.success || !response.data) throw new Error(response.error || 'Failed to load test context')
      return response.data
    },
  })

  useEffect(() => {
    if (contextQuery.data) setMarkdown(contextQuery.data.markdown)
  }, [contextQuery.data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await updateProjectTestContext(projectId, markdown)
      if (!response.success) throw new Error(response.error || 'Failed to save test context')
      return response.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'test-context'] })
      setNotice('Testing context saved.')
    },
    onError: (error) => setNotice(error.message),
  })

  return (
    <section className="panel" data-od-id="project-test-context">
      <div className="panel-head">
        <span className="panel-title">Testing context</span>
        <span className="panel-meta">Shared with automation</span>
      </div>
      <div className="panel-body" style={{ display: 'grid', gap: 10 }}>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12 }}>
          Keep environment facts, credentials guidance, and product rules that generated tests should know.
        </p>
        {contextQuery.isError ? (
          <p style={{ margin: 0, color: 'var(--danger)', fontSize: 12 }}>{String(contextQuery.error)}</p>
        ) : (
          <textarea
            className="textarea"
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            placeholder={contextQuery.data?.template || 'Add project testing context…'}
            maxLength={contextQuery.data?.maxBytes}
            rows={8}
            disabled={contextQuery.isPending || saveMutation.isPending}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6 }}
          />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-secondary" type="button" disabled={contextQuery.isPending || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? 'Saving…' : 'Save context'}
          </button>
          {notice && <span style={{ color: notice.includes('failed') || notice.includes('Failed') ? 'var(--danger)' : 'var(--muted)', fontSize: 12 }}>{notice}</span>}
        </div>
      </div>
    </section>
  )
}
