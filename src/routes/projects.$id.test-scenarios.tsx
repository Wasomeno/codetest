import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/projects/$id/test-scenarios')({
  component: () => <Outlet />,
})
