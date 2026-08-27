import { createFileRoute } from '@tanstack/react-router'
import { ProjectDashboardPage } from '~/pages/project-dashboard'

export const Route = createFileRoute('/projects/$id/')({
  component: () => {
    const { id } = Route.useParams()
    return <ProjectDashboardPage id={id} />
  },
})
