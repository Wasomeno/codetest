import { useState } from 'react'
import { uploadProjectFile } from '~/api/project'

export function ProjectArtifactUploader({ projectId }: { projectId: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const upload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    const response = await uploadProjectFile(projectId, file, file.name)
    setUploading(false)
    if (!response.success || !response.data?.url) {
      setError(response.error || 'Upload failed')
      return
    }
    setUrl(response.data.url)
  }

  const previewUrl = url
    ? `/api/files/proxy?url=${encodeURIComponent(url)}`
    : null

  return (
    <section className="panel" data-od-id="project-artifact-upload">
      <div className="panel-head">
        <span className="panel-title">Project files</span>
        <span className="panel-meta">Attachments</span>
      </div>
      <div className="panel-body" style={{ display: 'grid', gap: 10 }}>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12 }}>
          Upload a screenshot, log, or other file to keep with this project.
          Files open through a secure proxy link.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="file" onChange={(event) => { setFile(event.target.files?.[0] || null); setUrl(null); setError(null) }} />
          <button className="btn btn-secondary" type="button" disabled={!file || uploading} onClick={upload}>
            {uploading ? 'Uploading…' : 'Upload attachment'}
          </button>
        </div>
        {error && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</span>}
        {previewUrl && (
          <a className="btn btn-ghost" href={previewUrl} target="_blank" rel="noreferrer">
            Open {file?.name || 'file'}
          </a>
        )}
      </div>
    </section>
  )
}
