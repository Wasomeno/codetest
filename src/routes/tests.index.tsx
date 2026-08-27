import { createFileRoute } from '@tanstack/react-router'
import { TestsListPage } from '~/pages/tests-list'

export const Route = createFileRoute('/tests/')({
  component: TestsListPage,
})
