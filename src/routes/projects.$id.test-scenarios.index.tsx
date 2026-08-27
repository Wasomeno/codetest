import { createFileRoute } from '@tanstack/react-router'
import { TestsListPage } from '~/pages/tests-list'

export const Route = createFileRoute('/projects/$id/test-scenarios/')({
  component: () => {
    const { id } = Route.useParams()
    return (
      <TestsListPage
        defaultProject={id}
        pageSubtitle="Every automated test your team has committed to this project."
      />
    )
  },
})
