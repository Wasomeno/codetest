---
type: workflow
title: Specification Files and GitLab Issue Generation
description: How codetest discovers GitLab-backed specs, addresses files across projects, edits repository content, shows history, and creates issues from FSD previews.
tags: [workflow, specifications, gitlab, files, issues]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-05T08:35:18.937Z
sources:
  - id: openwiki-source-5d948ad4edebc35d8b326bda
    resource: repo://src/api/project.ts
  - id: openwiki-source-74e028d116606642b1a7cd9d
    resource: repo://src/api/specs.ts
  - id: openwiki-source-b01b01393006e24de5288192
    resource: repo://src/hooks/api/useProjectSpecs.ts
  - id: openwiki-source-99b54a2d84e2248b07a71456
    resource: repo://src/pages/spec-detail.tsx
  - id: openwiki-source-7fc233a10c2687b9f068c473
    resource: repo://src/pages/specs-list.tsx
  - id: openwiki-source-bc88bb4056143fba311ffefd
    resource: repo://src/services/api.ts
generated: { by: "codex", at: "2026-09-05T08:35:18.937Z" }
---

# Specification Files and GitLab Issue Generation

Specifications are files in each workspace project's bound specs repository, not database records owned by this frontend. The UI discovers matching repository blobs, creates a browser navigation identity from the workspace project and file path, then delegates reads and mutations to project-scoped backend endpoints.

## Discovery and identity

`useProjectSpecs(projectId?)` first lists workspace projects. It either selects the requested project or uses all projects, then requests each selected project's recursive, enriched specs tree in parallel. Only blobs ending in `.md`, `.feature`, or `.gherkin` become `LiveSpec` entries. Enrichment supplies last-commit information when available; otherwise project timestamps and a generic repository source are used.

A `LiveSpec.id` is `${project.id}|${node.path}`. `decodeSpecId` splits only on the first pipe, yielding `{ projectId, path }`; this allows subsequent pipes to remain part of the repository path. The ID is a frontend navigation encoding, while the durable file identity remains the workspace project plus its path (and, at the API level, an optional Git ref).

The list exists globally at `/specs` and in a project-scoped form at `/projects/$id/specs`. The global view fetches all project trees and applies client-side filtering/search. The project view can use the backend content search endpoint, merging returned paths and match previews into the already-discovered live specs. Project filters, search, sorting, and page size reset pagination to the first page.

## Repository API surface

All specs endpoints are scoped beneath `/projects/$id/specs`, allowing the backend to resolve the project's specs repository binding. The frontend can:

- list a recursive/enriched tree or lazily fetch one directory;
- read a file at an optional ref;
- create/update or delete a file with branch and commit-message options;
- submit a multi-file commit containing create, update, delete, or move actions;
- list commits, optionally filtered by path/ref and pagination;
- fetch one commit and its diffs;
- normalize and display GitLab blame data; and
- search paths/content with optional directory and ref constraints.

The blame adapter accepts a bare array, a `{ blame }` wrapper, an already-flat list, or GitLab blame ranges. It flattens ranges into numbered lines; malformed or empty structures yield an empty list rather than breaking the detail page.

## Creating and editing specs

The list page creates a file by sending its project, path, content, `create` action, and a generated commit message. Success invalidates the `live-specs` query family so lists are rediscovered.

The detail page decodes the combined identifier and concurrently loads project detail, file content, commit history, and blame. Project and file are gating resources: invalid identity, pending reads, and read failures each have a dedicated page state. Commit detail is fetched only after a user selects a commit.

Editing initializes a local draft from the loaded content. Saving uses `update`, supplies either the user's commit message or `Update <path>`, then invalidates that page's file and commit-history keys. Deleting asks for confirmation, sends `Delete <path>`, and navigates back to the global specs list on success. The current delete path does not explicitly invalidate `live-specs`, so consumers may retain the deleted entry until a later refetch.

API helpers also support branch selection, but the current list/detail UI operates on the backend/default branch and labels that fact in the properties panel.

## FSD-to-issue workflow

From one spec detail page, “Create issues” is a two-stage action:

1. `POST /projects/$id/fsd-issues/preview` receives the selected spec path and returns editable issue drafts.
2. The user may revise each title, description, and comma-separated label list, then `POST /projects/$id/fsd-issues` sends those drafts to the project's bound issue repository.

The result contains aggregate created/failed counts and a row for each draft. Successful rows can link to the resulting GitLab issue; failed rows show their error. The shared API layer accepts HTTP 207 as successful partial data, so mixed results reach this page instead of being collapsed into a generic request failure. The detail page explicitly distinguishes all-success, all-failed, and mixed notices.

Preview data and edits are component state. They are not persisted until the create request, and clearing the preview discards them. Backend validation remains authoritative for destination access, labels, draft content, and duplicate behavior.

## Cache and failure considerations

- Tree discovery fails the entire `Promise.all` if any selected project's tree fails; the global list does not currently return successful projects alongside failed ones.
- Search errors are represented by their own query, while the underlying list remains independently cached.
- Save invalidation uses page-local keys (`spec-file`, `spec-commits`) rather than the centralized `qk.specsFile` and `qk.specsCommits` shapes; cache maintenance must match consumers exactly.
- Blame failure is nonfatal and renders “unavailable”; project/file failure is fatal to the detail screen.
- Issue creation preserves row-level partial results, but it does not automatically refresh the project activity or issue-board queries from this page.

## Related pages

- [Project Lifecycle and GitLab Repository Binding](project-lifecycle.md)
- [Data Access and Client State](../architecture/data-access-and-state.md)
- [Test Scenarios, Automation, and Run Views](test-scenarios-and-runs.md)
