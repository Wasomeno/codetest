import { createFileRoute } from '@tanstack/react-router'
import { SpecDetailPage } from '~/pages/spec-detail'

export const Route = createFileRoute('/specs/$id')({
  component: () => {
    const { id } = Route.useParams()
    return <SpecDetailPage specId={id} />
  },
})
