import { createFileRoute } from '@tanstack/react-router'
import { RunDetailPage } from '~/pages/run-detail'

export const Route = createFileRoute('/runs/$id')({
  component: () => {
    const { id } = Route.useParams()
    return <RunDetailPage runId={id} />
  },
})
