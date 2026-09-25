---
type: architecture
title: Runtime, Routing, and Application Shell
description: The TanStack Start runtime composition, file-based route tree, root providers, authorization boundary, and authenticated application shell.
tags: [architecture, routing, tanstack-start, react, application-shell]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-05T08:35:18.937Z
sources:
  - id: openwiki-source-697840bf3d8ff80c42e7f8b4
    resource: repo://src/components/AppShell.tsx
  - id: openwiki-source-3ebc5908ac6b484ea56fc63c
    resource: repo://src/components/Sidebar.tsx
  - id: openwiki-source-8409418e8d332431bc853dce
    resource: repo://src/router.tsx
  - id: openwiki-source-85ad1858164990828940180c
    resource: repo://src/routes/__root.tsx
  - id: openwiki-source-daa4f206345a4664d6aa712f
    resource: repo://src/routeTree.gen.ts
generated: { by: "codex", at: "2026-09-05T08:35:18.937Z" }
---

# Runtime, Routing, and Application Shell

codetest is a React application hosted by TanStack Start and Vite. Route modules in `src/routes` are the editable navigation surface; TanStack Router generates `src/routeTree.gen.ts`, and `src/router.tsx` turns that tree into the application router.

## Bootstrap and router policy

`getRouter()` imports the generated tree and creates a router with scroll restoration, intent-based preloading, zero preload stale time, and browser View Transitions enabled. Before router construction, its side-effect import of `src/lib/auth-bootstrap.ts` extracts an OAuth-returned session identifier early enough for both the first API query and the client-side route guard.

Do not edit `routeTree.gen.ts`. Its header identifies it as generated and overwriteable. Add or change route files, then run the route generator (or the normal Vite workflow that invokes the router plugin). The generated tree supplies typed paths and parent/child relationships for `/projects`, `/specs`, `/tests`, project-scoped specs and scenarios, and detail routes.

## Root document

`src/routes/__root.tsx` owns the HTML document, shared stylesheet, metadata, not-found and internal-error components, application providers, and the shell decision. Provider nesting is:

1. `QueryClientProvider`, using the singleton client;
2. `SessionProvider`, exposing current-user state;
3. `AuthBootstrap`, pre-warming the user query when a stored session exists; and
4. the current route content, optionally wrapped in `AppShell`.

Router and query devtools are mounted for the whole document. `HeadContent` and `Scripts` are emitted in their TanStack Start positions. A mounted flag is written to the body only after hydration so CSS can react without changing the initial server/client markup.

## Public and protected rendering

The exact public paths are `/`, `/login`, and `/about`. They bypass both the authorization redirect and `AppShell`. Router error and not-found pages also render outside the authenticated shell so a broken match is not obscured by navigation chrome.

For every other location, root `beforeLoad` checks for a stored session ID in the browser. Server rendering cannot access `localStorage`, so the guard deliberately allows the server request and repeats the decision after hydration. Consequently, a logged-out direct request can briefly render protected content before the client redirects to `/login`; API-level `401` handling is the second enforcement path. The redirect includes the original `location.href` as the login route's `redirect` search value.

This is a frontend navigation guard, not server authorization. The backend must validate the session on every protected API and stream request.

## Route composition

Leaf route files generally adapt URL parameters to page components. Parent route files such as `projects.tsx`, `projects.$id.tsx`, `specs.tsx`, and `tests.tsx` render an `Outlet`, allowing the generated hierarchy to compose index and detail screens. Project-scoped specification URLs use both a project route segment and an encoded spec identifier passed into the page; the workflow page explains that identity.

The top-level route groups are:

- public product pages: landing, login, and about;
- workspace pages: dashboard, profile, project creation, and project list;
- project context: dashboard, specs, and test-scenario children under `/projects/$id`;
- global resource views: `/specs`, `/tests`, and their detail routes; and
- run detail at `/runs/$id`.

## Authenticated application shell

`AppShell` is intentionally small: it keeps the `Sidebar` beside a persistent `<main class="main">`. That main node is the named view-transition layer, so authenticated route changes can animate as one surface. Public routes never receive the shell and therefore do not participate in that app-main transition.

The sidebar derives its projects from the backend query, maps them to stable presentation colors, and shows skeleton rows during the initial request. URL-prefix checks control global and per-project active states. The active project automatically expands, while user collapse/expansion preferences persist in `localStorage`. Those preferences are restored after mount to keep SSR markup compatible with the first browser render.

The sidebar also surfaces the session user and delegates sign-out to the logout hook before navigating to the landing page. Navigation behavior therefore depends on both cached server state (projects and user) and browser-owned UI preferences.

## Error and extension boundaries

Add navigation by creating a route module and a page/component, not by editing the generated tree. Put document-wide providers and error boundaries in the root only when every route needs them. Put authenticated navigation chrome in `AppShell` or `Sidebar`, and remember that public/error routes intentionally bypass both. Any browser-only read used during navigation or layout must be guarded for SSR and should preserve the first hydration markup.

## Related pages

- [Data Access and Client State](data-access-and-state.md)
- [GitLab Authentication and Session Lifecycle](../workflows/authentication.md)
- [Local Development, Build, and Configuration](../operations/development.md)
