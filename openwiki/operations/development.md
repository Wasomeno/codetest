---
type: operations
title: Local Development, Build, and Configuration
description: How to install, run, configure, build, and validate the codetest TanStack Start frontend locally.
tags: [operations, development, bun, vite, configuration]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-05T08:35:18.937Z
sources:
  - id: openwiki-source-ea70eb6c045047448e446296
    resource: repo://.gitignore
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-bc88bb4056143fba311ffefd
    resource: repo://src/services/api.ts
  - id: openwiki-source-146419bb9b2415894a6bd677
    resource: repo://src/styles.css
  - id: openwiki-source-98d5ddb014a0fd4d678f6f2a
    resource: repo://tsconfig.json
  - id: openwiki-source-5e1b077422a94ae165e88e4e
    resource: repo://vite.config.ts
generated: { by: "codex", at: "2026-09-05T08:35:18.937Z" }
---

# Local Development, Build, and Configuration

The repository is an ESM TypeScript/React frontend built with Bun, Vite, and TanStack Start. It does not contain the backend implementation, so meaningful end-to-end development requires an API service reachable either through the Vite `/api` proxy or a configured absolute API base URL.

## Prerequisites and commands

Install dependencies from `bun.lock` with:

```sh
bun install
```

The package scripts are the authoritative command surface:

| Task | Command | Behavior |
| --- | --- | --- |
| Development | `bun run dev` | Runs Vite through Bun on port 3000. |
| Generate routes | `bun run generate-routes` | Regenerates TanStack Router's route tree from `src/routes`. |
| Production build | `bun run build` | Builds the TanStack Start application with Vite. |
| Preview build | `bun run preview` | Serves the built application through Vite preview. |

There are no repository-defined `test`, `lint`, or standalone `typecheck` scripts. Do not imply those checks ran merely because the production build passed. For a route change, the narrowest built-in validation is route generation followed by a production build; preserve complete output if either fails.

Generated build directories including `dist`, `.output`, `.tanstack`, `.nitro`, and `.vinxi` are ignored. They are disposable artifacts, not source inputs.

## Backend routing

Two environment variables address different stages of request resolution:

- `VITE_API_BASE_URL` is read by browser code. When set, the API client sends requests directly to that base after removing trailing slashes. When absent, requests use `/api` on the frontend origin. The SSE hook follows the same base selection.
- `VITE_API_PROXY_TARGET` is read by Vite configuration only for local development. It controls where the development server forwards `/api`; its default is `http://localhost:4000`.

The common local setup leaves `VITE_API_BASE_URL` unset and runs the backend on port 4000. Browser requests then go to `http://localhost:3000/api/...`, and Vite proxies them to the backend. Set `VITE_API_PROXY_TARGET` when that backend is at another local or remote address. Set `VITE_API_BASE_URL` when the browser should bypass the frontend proxy, such as a separately hosted API; that destination must then satisfy browser CORS requirements.

Environment files are intentionally ignored by Git. Avoid committing credentials or session identifiers. The frontend passes its session identifier at runtime, while Vite's proxy uses `changeOrigin: true` and disables upstream TLS verification with `secure: false`; review that development-oriented setting before reusing the configuration in a security-sensitive proxy context.

## Build plugins and TypeScript

Vite composes the TanStack devtools, Tailwind CSS, TanStack Start, and React plugins, and enables TypeScript path resolution. TypeScript targets ES2022 and the DOM, uses bundler module resolution, emits no JavaScript itself, and applies strict unused/fallthrough/side-effect checks. Aliases `#/*`, `~/*`, and `@/*` all lead into `src`, with more specific `@/api/*`, `@/components/*`, and similar mappings available.

TanStack Router is configured for React. `src/routeTree.gen.ts` is generated output; edit route modules and regenerate instead of patching it by hand.

## Styling and static assets

`src/styles.css` is the root stylesheet imported by the root route. It loads Tailwind CSS, the typography plugin, and the migrated `src/styles/qa-webapp.css` design system. The latter supplies the application's custom properties and component classes, including its color-scheme behavior.

Static files in `public` are copied/served as root assets. The current assets include the favicon, an icon sprite, and the QA automation demonstration video. Source-controlled assets should remain deterministic; generated build copies belong in ignored output directories.

## Practical change validation

Use validation proportional to the change:

- route modules: regenerate the route tree, inspect the diff, then build;
- TypeScript/API changes: build to exercise strict compilation and bundling;
- styles or components: build plus focused browser inspection of the affected route and responsive/error states;
- backend-connected workflows: run the matching backend, confirm the selected base/proxy configuration, and exercise both successful and failed responses; and
- authentication: use a real OAuth callback/session flow because localStorage and redirect ordering are browser-owned behavior.

Because no automated test suite is declared, a clean build proves compilation/bundling but not workflow correctness.

## Related pages

- [Quickstart and Repository Map](../quickstart.md)
- [Runtime, Routing, and Application Shell](../architecture/runtime-and-routing.md)
- [Data Access and Client State](../architecture/data-access-and-state.md)
