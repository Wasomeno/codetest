---
type: workflow
title: GitLab Authentication and Session Lifecycle
description: End-to-end frontend behavior for GitLab OAuth, redirect restoration, session persistence, user hydration, route protection, expiry, and logout.
tags: [workflow, authentication, gitlab, oauth, session]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-05T08:35:18.937Z
sources:
  - id: openwiki-source-ea3c1c341c6468c97645f148
    resource: repo://src/api/auth.ts
  - id: openwiki-source-8ecd04ec7c5dad71f2e80402
    resource: repo://src/components/AuthBootstrap.tsx
  - id: openwiki-source-b835f40da3b5eb5929f2d1eb
    resource: repo://src/hooks/api/useCurrentUser.ts
  - id: openwiki-source-9a3bcd66c01cc07dc499b680
    resource: repo://src/hooks/api/useLogout.ts
  - id: openwiki-source-adad657b7d93b7a000aec45f
    resource: repo://src/hooks/use-logout.ts
  - id: openwiki-source-31837a9f05d8c9a8d6059a3b
    resource: repo://src/hooks/use-session-user.ts
  - id: openwiki-source-2700f90dda355a78db38937b
    resource: repo://src/lib/auth-bootstrap.ts
  - id: openwiki-source-6bec44a6a203e9e87f4b8a5e
    resource: repo://src/pages/login.tsx
  - id: openwiki-source-85ad1858164990828940180c
    resource: repo://src/routes/__root.tsx
  - id: openwiki-source-e0883b467b75ab0d90e1d341
    resource: repo://src/routes/login.tsx
  - id: openwiki-source-bc88bb4056143fba311ffefd
    resource: repo://src/services/api.ts
  - id: openwiki-source-8d11d4695e1c8bb493f6261a
    resource: repo://src/utils/session.ts
generated: { by: "codex", at: "2026-09-05T08:35:18.937Z" }
---

# GitLab Authentication and Session Lifecycle

codetest uses a backend-mediated GitLab OAuth flow. The browser never stores a GitLab token directly; it stores an application session identifier under `qa_webapp_session_id` and sends that value to the backend as `X-Session-ID` on ordinary API requests.

## Sign-in sequence

1. A client-side navigation to a protected route checks `localStorage`. If the session ID is absent, the root route redirects to `/login` and preserves the attempted URL in the `redirect` search parameter.
2. The login route validates that optional search value. Submitting the GitLab button calls `POST /auth/login`, including a URL-encoded `redirect_url` that points back to this frontend's `/login` route and retains the desired post-login destination.
3. The backend returns an OAuth URL. The frontend performs a full-page navigation to it.
4. Based on the frontend's API contract and comments, the backend owns the GitLab exchange, creates the application session, and redirects back with `session_id` in the query string. Those server operations are not implemented in this repository and must be verified against the backend.
5. On browser module load, before the router and React hooks run, `auth-bootstrap.ts` extracts `session_id`, removes it from the visible URL with `history.replaceState`, and persists it to `localStorage`.
6. The current-user query calls `GET /current-user`. Once session context contains a user, the login route navigates to the preserved destination or `/dashboard`.

The ordering in step 5 is intentional: request header creation and the root route guard both require the session ID before components mount. The bootstrap is guarded by `typeof window`, so it does nothing during server rendering.

## Session and current-user state

The application maintains two related browser records:

- `qa_webapp_session_id` is the credential-like session identifier used by route checks and API calls.
- `session_user` is a JSON snapshot used for immediate display while the backend identity request completes.

`useSessionUser` hydrates the user snapshot after mount, then reconciles it with the React Query current-user result. A successful query updates React state and `session_user`; a terminal query error clears the user snapshot. Storage events keep that user snapshot synchronized across tabs. The context's `loading` state remains true until local hydration finishes and any initially pending identity request has either yielded a user or failed.

The current-user query is cached for 60 seconds but refetches on mount and does not retry. `AuthBootstrap` also prefetches the same key when a session ID exists; React Query deduplicates that request with consumers. The network result, not the cached JSON snapshot, determines whether the backend still recognizes the session.

## Protection and SSR boundary

Only `/`, `/login`, and `/about` skip the root guard. In a browser, all other routes require a stored session ID. During SSR, `window` and `localStorage` are unavailable, so the root allows the render and defers enforcement until hydration. A logged-out direct load may therefore show protected markup briefly before redirecting.

The route guard proves only that an identifier is present, not that it is valid. Backend endpoints remain responsible for authorization. The shared API client's `401` path clears both browser records, emits a same-tab storage notification, and performs a full-page redirect to `/login` when necessary.

## Logout

The API mutation calls `POST /auth/logout`. Only after a successful response does it remove the session ID, clear the entire React Query cache, and dispatch `auth_logout`. The compatibility wrapper used by the sidebar also clears the shared session-user context. The sidebar then navigates to the landing page.

If the backend rejects logout because the session has already expired, normal `401` handling redirects to login first. Because mutation errors throw, callers can retain or show an error for other unsuccessful logout responses.

## Security and maintenance consequences

- A session ID appears briefly in the OAuth return URL before bootstrap removes it. Avoid logging or copying callback URLs, and keep backend redirect validation strict.
- `localStorage` is readable by any script executing on the origin, so XSS prevention is part of session security.
- Ordinary API requests send `X-Session-ID`; `EventSource` cannot set that header and instead uses a `session_id` query parameter for the stream.
- Public/protected classification uses exact paths. A new public page must be deliberately added to the root set; otherwise it is protected and receives the app shell.
- Frontend comments describe the expected callback, state, and session contract but do not establish backend implementation details. Confirm server-side expiry, revocation, redirect allowlisting, and GitLab token handling in the backend repository.

## Related pages

- [Runtime, Routing, and Application Shell](../architecture/runtime-and-routing.md)
- [Data Access and Client State](../architecture/data-access-and-state.md)
- [Project Lifecycle and GitLab Repository Binding](project-lifecycle.md)
