---
type: workflow
title: Project Lifecycle and GitLab Repository Binding
description: How workspace projects bind four GitLab repositories and move through discovery, creation, dashboard use, updates, activity, and deletion.
tags: [workflow, projects, gitlab, lifecycle, react-query]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-05T08:35:18.937Z
sources:
  - id: openwiki-source-5d948ad4edebc35d8b326bda
    resource: repo://src/api/project.ts
  - id: openwiki-source-634cc962706f6aee206fbc8b
    resource: repo://src/components/ProjectActivityFeed.tsx
  - id: openwiki-source-002d5cfefbec9bcf08561682
    resource: repo://src/components/ProjectTestContextEditor.tsx
  - id: openwiki-source-ae9c29f1a0c41c7fa516b78a
    resource: repo://src/hooks/api/useCreateAppProject.ts
  - id: openwiki-source-27afa672304d9de89a7eddb6
    resource: repo://src/hooks/api/useDeleteAppProject.ts
  - id: openwiki-source-55eacf9219794ccc9f9620e5
    resource: repo://src/hooks/api/useUpdateAppProject.ts
  - id: openwiki-source-f4161be13702cb5d2202c652
    resource: repo://src/pages/add-project.tsx
  - id: openwiki-source-cfb95cbb321ceb9edf757e41
    resource: repo://src/pages/project-dashboard.tsx
  - id: openwiki-source-983cce29faad16de7591842c
    resource: repo://src/types/project.ts
generated: { by: "codex", at: "2026-09-05T08:35:18.937Z" }
---

# Project Lifecycle and GitLab Repository Binding

An `AppProject` is codetest's workspace-level record that connects QA activity to four GitLab repositories. It is distinct from a raw `GitLabProject`: the frontend discovers repositories through GitLab-proxy endpoints, then persists selected repository IDs and names through `/projects` endpoints.

## Repository roles

Project creation requires four numeric GitLab project IDs:

- **Frontend repository**: the product UI under test.
- **Backend repository**: the service used by that frontend.
- **Specs repository**: the source of Gherkin/specification files and scenario imports.
- **Issues repository**: the destination for generated GitLab issues; it may be the same repository as specs.

The persisted project model exposes both IDs (when returned by medium/full API responses) and repository names. Specs operations depend on the specs binding, issue generation and activity actor resolution depend on the issues binding, and project presentation shows all four names. Code-facing automation contracts also carry frontend/backend identities.

## Discovery and creation

The add-project page maintains an independently debounced GitLab search for each picker. Each search calls `/gitlab/projects`, maps the large GitLab schema to a compact option, and shows loading, empty, and request-error feedback.

Submission requires a name and all four repository choices. Before creating the record, the page fetches branches for all four selections in parallel. Any failed request or repository with no branches stops the flow in its branch-verification error state. The displayed “Review checklist”/webhook stage is educational UI only; there is no frontend webhook API behind it.

After branch verification, the page posts the name, optional notes as both description and initial testing context, and the four IDs to `/projects`. The response carries the created project plus optional `scenariosImported` and `scenarioSyncStarted` indicators. The creation hook invalidates the shared project list and seeds the detail cache, allowing a success view to deep-link to the new dashboard without waiting for another detail request.

Repository branch verification is a client-side preflight, not a transaction with project creation. Repository state can change between checks and the POST, so the backend remains responsible for validating IDs, access, and durable setup.

## Lists and project identity

`useProjects` unwraps the backend's `{ projects }` response into `AppProject[]` under one shared query key. Both the project list and sidebar consume that cache. Project colors are derived deterministically from names and are presentation only; repository bindings and the `AppProject.id` are the durable identity.

The project list renders loading placeholders, request errors with retry, an empty state, and the project cards. It does not fall back to wireframe project fixtures. A `401` is intercepted globally; other failures remain visible in the page.

## Dashboard and supporting resources

The `/projects/$id` dashboard requests project detail and an aggregate dashboard independently, subscribes to the project SSE stream, and mounts supporting components for activity, testing context, artifact upload, and issue-board preview.

Project detail is the gating resource. While it is pending the page shows a skeleton; missing or failed detail renders a dedicated state with a route back to all projects. Dashboard aggregates may be absent while detail succeeds, in which case count tiles use neutral/zero fallbacks. The aggregate contract includes open issues, scenarios, recordings, fix sessions, pass rate, and today's issue activity.

Testing context is Markdown loaded from and saved to `/projects/$id/test-context`. The backend response supplies a template and byte limit; after a save, the editor invalidates the context query. It is project-shared guidance intended for automation, so changes affect downstream generation semantics rather than only page decoration.

The activity feed reads `/projects/$id/activity`, resolves actors against the current user and issue-repository membership, and renders creation, update, deletion, scenario-sync, spec-save, and FSD-issue events. It has explicit skeleton, error, and empty states and currently presents the first twelve returned entries.

SSE messages produce transient dashboard banners for relevant project jobs. Terminal messages clear automatically. The stream does not itself invalidate project queries, so a banner and cached dashboard values can momentarily represent different points in time unless the owning workflow refreshes them.

## Update and deletion

Dashboard editing currently sends name and description through `PATCH /projects/$id`. A successful update replaces cached detail and invalidates the project list and activity feed. Repository-binding fields exist in the update request type and API contract, but the dashboard editor does not expose them.

Deletion requires a browser confirmation, calls `DELETE /projects/$id`, removes the project's detail cache, invalidates the list, and navigates to `/projects`. The UI labels deletion irreversible; any cascading backend behavior is outside this repository and must be checked in the backend before relying on it.

## Failure and partial-result boundaries

- API-envelope failures are turned into React Query errors by hooks; pages own their loading, retry, and message presentation.
- Creation retains the form and exposes retry/back actions after branch or access failure.
- Dashboard aggregate failure does not replace a successfully loaded project-detail page with the fatal project error state.
- GitLab issue generation can be partially successful through HTTP 207, but that belongs to the specs workflow rather than project creation.
- Comments referencing backend jobs or limits describe expected integration contracts, not code implemented here.

## Related pages

- [Data Access and Client State](../architecture/data-access-and-state.md)
- [Specification Files and GitLab Issue Generation](specs-and-gitlab-issues.md)
- [Test Scenarios, Automation, and Run Views](test-scenarios-and-runs.md)
