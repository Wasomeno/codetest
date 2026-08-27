import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/projects/$id/specs')({
  component: () => <Outlet />,
})
