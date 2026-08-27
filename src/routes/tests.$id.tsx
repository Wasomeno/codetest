import { createFileRoute } from '@tanstack/react-router'
import { TestDetailPage } from '~/pages/test-detail'

export const Route = createFileRoute('/tests/$id')({
  component: () => {
    const { id } = Route.useParams()
    return <TestDetailPage testId={id} />
  },
})
