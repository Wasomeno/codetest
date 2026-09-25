---
type: architecture
title: Data Access and Client State
description: How browser requests, API responses, React Query caching, local storage, and project event streams cooperate in the codetest frontend.
tags: [architecture, data-access, react-query, api, state]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-05T08:35:18.937Z
sources:
  - id: openwiki-source-b80df6dd3c5fcbd2d799b80a
    resource: repo://src/api/queryKeys.ts
  - id: openwiki-source-ae9c29f1a0c41c7fa516b78a
    resource: repo://src/hooks/api/useCreateAppProject.ts
  - id: openwiki-source-27afa672304d9de89a7eddb6
    resource: repo://src/hooks/api/useDeleteAppProject.ts
  - id: openwiki-source-040599f6fc5a74cb4dc2d118
    resource: repo://src/hooks/api/useProjectStream.ts
  - id: openwiki-source-55eacf9219794ccc9f9620e5
    resource: repo://src/hooks/api/useUpdateAppProject.ts
  - id: openwiki-source-5aacba641b9a562413576c20
    resource: repo://src/lib/query-client.ts
  - id: openwiki-source-bc88bb4056143fba311ffefd
    resource: repo://src/services/api.ts
  - id: openwiki-source-41439aa9e1faccd74f0160d3
    resource: repo://src/services/fetch-bridge.ts
generated: { by: "codex", at: "2026-09-05T08:35:18.937Z" }
---

# Data Access and Client State

The frontend has four distinct state layers. Remote resources are owned by the backend and reached through typed modules in `src/api`. React Query owns the browser cache of those resources. Small durable browser values—most importantly the session identifier—live in `localStorage`. Short-lived progress notifications arrive through a per-project Server-Sent Events (SSE) connection and remain component state rather than entering the query cache.

## Request pipeline

Feature code calls a domain function such as `listAppProjects`, `getSpecsFile`, or `testScenarioApi.getById`. These functions choose the endpoint and response type, then delegate to the shared `api` object. The API service:

1. selects `VITE_API_BASE_URL`, with trailing slashes removed, or defaults to same-origin `/api`;
2. adds JSON content type except for `FormData` uploads;
3. reads `qa_webapp_session_id` from `localStorage` and sends it as `X-Session-ID`;
4. defaults Fetch credentials to `omit`;
5. delegates transport and response parsing to `bridgeFetch`; and
6. returns an `ApiResponse<T>` rather than throwing for HTTP or network failure.

`bridgeFetch` normalizes the native Fetch response into status, headers, URL, and a decoded body. JSON, text, and base64-encoded binary are supported. A transport exception becomes a response with status `0`; response-body decoding failures are deliberately swallowed, so callers must not assume a failed response has a body.

Domain hooks convert unsuccessful `ApiResponse` values into thrown `Error` objects when React Query needs an error state. This division is important: raw API functions resolve with `{ success: false, error }`, while query and mutation hooks normally throw after inspecting that envelope.

## Success and failure semantics

Normal 2xx responses become `{ success: true, data }`. HTTP `207 Multi-Status` is also accepted and annotated as `meta: { partial: true, status: 207 }`; workflows such as GitLab issue creation can therefore display created and failed items from one operation.

For any other non-success status, the service prefers the response body's `error` or `message` and falls back to the HTTP status text. A `401` additionally clears both the cached session-user record and session ID, dispatches a synthetic `storage` event for same-tab listeners, and navigates to `/login` unless already there. Network failures are normalized to unsuccessful envelopes instead of escaping the service.

## React Query ownership

The root document provides one `QueryClient` to the application. Queries are fresh for 30 seconds, do not refetch merely because the window regains focus or the network reconnects, and retry once; mutations do not retry automatically. This makes explicit invalidation after a mutation the primary cache-consistency mechanism.

The `qk` factory centralizes stable keys for the current user, app projects, project activity/dashboard/test context, GitLab project metadata, and specs resources. Optional filters are normalized so `undefined` and empty values do not fragment caches. New hooks should reuse these keys instead of introducing equivalent string arrays. A few page-local specs queries currently use their own arrays; mutations must invalidate the exact keys actually used by their consumers.

Project mutations demonstrate the expected lifecycle:

- creation invalidates the project list and seeds the new project's detail cache;
- update replaces the detail cache and invalidates list and activity queries; and
- deletion removes detail state and invalidates the list.

The hooks are also the boundary that turns API-envelope failures into React Query errors, allowing pages to render pending, error, and success states consistently.

## Browser-local state

The session ID is intentionally not part of React Query. It is read synchronously before guarded navigation and before each API request. The generic `storageService` offers an asynchronous JSON wrapper around `localStorage`; reads return `undefined` for absent or malformed values, and writes/removals log or suppress browser storage errors rather than rejecting.

Component interaction state—open menus, form steps, selected tabs, drafts, notices—is ordinary React state. It should not be confused with backend state even when a screen uses both.

## Project event stream

`useProjectStream(projectId)` opens `${VITE_API_BASE_URL || '/api'}/stream` in the browser once both a project and session ID exist. Because `EventSource` cannot set the request header used by the normal API client, this connection sends `session_id` and `projectId` as query parameters.

Incoming JSON is retained only when it belongs to the project (directly or through its resource identifier), or is a non-system unscoped message. Silent connection lifecycle stages are ignored. `done` and `error` banners clear after eight seconds; malformed messages are ignored without closing the stream. Unmounting closes the connection and clears its timer. The browser's `EventSource` owns reconnection behavior; the hook only reports `connected` and does not copy stream data into React Query.

## Extension guidance

Add backend operations in the appropriate `src/api` module, preserve the shared response envelope, and wrap them in React Query hooks when the result is server state used by UI. Define reusable keys in `qk`, and make every mutation explicitly update, remove, or invalidate affected caches. Reserve `localStorage` for durable browser-owned values and SSE for transient progress; neither should silently become a second source of truth for backend records.

## Related pages

- [GitLab Authentication and Session Lifecycle](../workflows/authentication.md)
- [Project Lifecycle and GitLab Repository Binding](../workflows/project-lifecycle.md)
- [Specification Files and GitLab Issue Generation](../workflows/specs-and-gitlab-issues.md)
