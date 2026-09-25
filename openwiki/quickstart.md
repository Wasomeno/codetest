---
type: quickstart
title: Quickstart and Repository Map
description: Fast orientation for running codetest, understanding its frontend/backend boundary, and finding the right architecture or workflow documentation.
tags: [quickstart, repository-map, frontend, onboarding]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-05T08:35:18.937Z
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-5d948ad4edebc35d8b326bda
    resource: repo://src/api/project.ts
  - id: openwiki-source-74e028d116606642b1a7cd9d
    resource: repo://src/api/specs.ts
  - id: openwiki-source-0aecd48cba4fa767988cd877
    resource: repo://src/pages/run-detail.tsx
  - id: openwiki-source-96f88b300d05eecb2aa253df
    resource: repo://src/pages/test-detail.tsx
  - id: openwiki-source-71759f5f2f9fa4c42257c263
    resource: repo://src/pages/tests-list.tsx
  - id: openwiki-source-8409418e8d332431bc853dce
    resource: repo://src/router.tsx
  - id: openwiki-source-85ad1858164990828940180c
    resource: repo://src/routes/__root.tsx
  - id: openwiki-source-bc88bb4056143fba311ffefd
    resource: repo://src/services/api.ts
  - id: openwiki-source-5e1b077422a94ae165e88e4e
    resource: repo://vite.config.ts
generated: { by: "codex", at: "2026-09-05T08:35:18.937Z" }
---

# Quickstart and Repository Map

codetest is a TanStack Start/React frontend for a GitLab-connected QA workspace. It provides project setup and dashboards, repository-backed specifications, issue-generation UI, and test/automation presentation. The backend is not in this repository: browser code talks to an external API through `/api` by default.

## Run locally

```sh
bun install
bun run dev
```

The development server listens on port 3000. With no environment overrides, it proxies `/api` to `http://localhost:4000`, so run the matching backend there for live authentication, projects, specs, and GitLab integrations.

Useful commands are:

```sh
bun run generate-routes
bun run build
bun run preview
```

The repository defines no automated test or lint script. A build is the available compilation/bundling check, not proof that browser or backend workflows work.

## What is live and what is prototype data

The following UI surfaces are connected to backend API modules and React Query:

- GitLab OAuth session/current-user flow;
- workspace project discovery, creation, listing, dashboard aggregates, editing, deletion, activity, test context, uploads, and boards;
- GitLab-backed specification discovery, search, file content, editing/deletion, history, blame, and FSD-to-issue preview/creation; and
- project event-stream banners.

The test-scenario API client defines additional backend contracts for scenario synchronization, generation, manual results, test-case editing/runs, and bulk deletion. However, the current tests list, test detail, and run detail pages are still driven by `src/lib/mock-data-new.ts`. Their run logs, metrics, steps, automation states, and many action buttons are fixtures or not-implemented UI. Do not use those screens as evidence that automation or run persistence is wired end to end.

## Runtime map

| Area | Primary location | Responsibility |
| --- | --- | --- |
| Route definitions | `src/routes/` | File-based URLs, params, outlets, and root guard. |
| Generated route tree | `src/routeTree.gen.ts` | Generated typed hierarchy; do not edit directly. |
| Pages | `src/pages/` | Route-level screen behavior and interaction state. |
| API modules | `src/api/` | Domain endpoints and response types. |
| Query hooks | `src/hooks/api/` | Remote-state queries, mutations, and cache effects. |
| Transport | `src/services/api.ts`, `fetch-bridge.ts` | Base URL, session header, request encoding, response/failure normalization. |
| Session | `src/lib/auth-bootstrap.ts`, `src/utils/session.ts`, context/hooks | OAuth return extraction, local persistence, current-user state, logout. |
| Shared shell | `src/components/AppShell.tsx`, `Sidebar.tsx` | Authenticated layout, navigation, project rail, user actions. |
| Domain types | `src/types/` | Project, scenario, recording, and telemetry shapes. |
| Presentation | `src/styles.css`, `src/styles/qa-webapp.css`, `public/` | Tailwind entrypoint, migrated design CSS, static assets. |

At runtime, `src/router.tsx` imports authentication bootstrap and the generated route tree. The root route supplies the React Query and session providers, renders public/error pages directly, and wraps normal protected pages in `AppShell`. API functions return success envelopes; React Query hooks usually turn unsuccessful envelopes into thrown errors for pages to display.

## Find the right documentation

| If you are changing… | Read… |
| --- | --- |
| routes, providers, SSR behavior, sidebar, or error boundaries | [Runtime, Routing, and Application Shell](architecture/runtime-and-routing.md) |
| request behavior, cache keys, invalidation, local storage, or SSE | [Data Access and Client State](architecture/data-access-and-state.md) |
| OAuth callbacks, redirect behavior, current user, expiry, or logout | [GitLab Authentication and Session Lifecycle](workflows/authentication.md) |
| project bindings, creation, dashboard, context, activity, or deletion | [Project Lifecycle and GitLab Repository Binding](workflows/project-lifecycle.md) |
| specs files, commits, blame, search, or GitLab issue creation | [Specification Files and GitLab Issue Generation](workflows/specs-and-gitlab-issues.md) |
| scenario API contracts or the mock/live boundary for tests and runs | [Test Scenarios, Automation, and Run Views](workflows/test-scenarios-and-runs.md) |
| Bun/Vite commands, environment variables, aliases, builds, or assets | [Local Development, Build, and Configuration](operations/development.md) |

## Safe contribution patterns

- Treat source and tests as authoritative; this wiki is a navigation and evidence layer.
- Add routes in `src/routes` and regenerate instead of editing `routeTree.gen.ts`.
- Put endpoint details in a domain API module and server-state behavior in a React Query hook; explicitly invalidate every affected consumer key after mutations.
- Keep browser-only reads guarded from SSR, especially session and layout preferences in `localStorage`.
- Confirm whether a screen is live or fixture-backed before extending it. Wiring one button to a backend method may also require replacing fixture identity, loading/error states, and related cache behavior.
- Configure the backend intentionally: use `VITE_API_PROXY_TARGET` for Vite's local `/api` proxy, or `VITE_API_BASE_URL` for direct browser requests.

## Related pages

- [Runtime, Routing, and Application Shell](architecture/runtime-and-routing.md)
- [Data Access and Client State](architecture/data-access-and-state.md)
- [Local Development, Build, and Configuration](operations/development.md)
