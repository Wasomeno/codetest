import { createFileRoute } from '@tanstack/react-router'
import { ProjectsListPage } from '~/pages/projects-list'

export const Route = createFileRoute('/projects/')({
  component: ProjectsListPage,
})
