import { createFileRoute } from '@tanstack/react-router'
import { SpecsListPage } from '~/pages/specs-list'

export const Route = createFileRoute('/specs/')({
  component: SpecsListPage,
})
