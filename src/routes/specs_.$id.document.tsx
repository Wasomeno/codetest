import { createFileRoute } from '@tanstack/react-router'
import { SpecDocumentPage } from '~/pages/spec-document'

export const Route = createFileRoute('/specs_/$id/document')({
  component: () => {
    const { id } = Route.useParams()
    return <SpecDocumentPage specId={id} />
  },
})
