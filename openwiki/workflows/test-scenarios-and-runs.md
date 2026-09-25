---
type: workflow
title: Test Scenarios, Automation, and Run Views
description: The implemented test-scenario API contract and the current boundary between backend-capable models and mock-driven scenario/run screens.
tags: [workflow, test-scenarios, automation, runs, prototype]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-05T08:35:18.937Z
sources:
  - id: openwiki-source-2594db0df4234b737ac4c6b3
    resource: repo://src/api/test-scenario.ts
  - id: openwiki-source-38ea92b3455ba380f2372ca1
    resource: repo://src/lib/mock-data-new.ts
  - id: openwiki-source-0aecd48cba4fa767988cd877
    resource: repo://src/pages/run-detail.tsx
  - id: openwiki-source-96f88b300d05eecb2aa253df
    resource: repo://src/pages/test-detail.tsx
  - id: openwiki-source-71759f5f2f9fa4c42257c263
    resource: repo://src/pages/tests-list.tsx
  - id: openwiki-source-8912f84a7059a1e60580a144
    resource: repo://src/routes/projects.%24id.test-scenarios.index.tsx
  - id: openwiki-source-595dccb4662a5ffbc1ee47c5
    resource: repo://src/types/test-scenario.ts
generated: { by: "codex", at: "2026-09-05T08:35:18.937Z" }
---

# Test Scenarios, Automation, and Run Views

This area has an important split: `src/api/test-scenario.ts` and `src/types/test-scenario.ts` define a broad backend integration contract, but the current `/tests`, `/tests/$id`, and `/runs/$id` pages do not call it. Those visible screens are a UI migration backed by fixtures in `src/lib/mock-data-new.ts`. Treat API capabilities and rendered behavior as separate until a page explicitly connects them.

## Domain model

A backend `TestScenario` can identify its workspace project and source repository file/SHA, contain ordered sections and test cases, expose generation/run status, aggregate statistics, active work, authentication configuration, and creator/timestamps. Test cases contain ordered steps plus priority, tags, processing status, automation status/category, and an optional generated automation record.

Automation category is `api`, `e2e`, or `manual`. Processing and run state are modeled separately so generation failure does not have to masquerade as an execution failure. Older scenario/test-case status fields remain in the type for compatibility and are marked deprecated.

Manual results are durable records scoped to a scenario and test case. They carry pass/fail status, description, tester/timestamps, and uploaded evidence metadata.

## Scenario ingestion and synchronization contracts

The API client supports two ingestion paths:

- spreadsheet-like upload sends a file, project ID, and serialized target `AuthConfig` as multipart form data; and
- specs synchronization starts either one scenario sync or a project-wide import.

Project-wide sync returns whether work started and an initial import status. Polling `/projects/$id/test-scenarios/import-status` can then report `idle`, `syncing`, `importing`, `completed`, or `error`, together with totals, the current source item, per-item feed status, timestamps, and an error message. The project SSE stream is a separate transient notification channel; this API explicitly offers a durable status snapshot suitable for refresh/recovery.

Listing supports global or project-scoped endpoints, search, page size/number, and additional string filters. Its adapter accepts either a bare array or several common pagination envelope shapes, normalizing them to scenarios, page, per-page, optional total, and optional `hasMore`.

## Scenario and test-case mutations

The client contract includes:

- get, update, synchronize, and delete one scenario;
- bulk deletion with deleted, missing, and error details;
- generate tests for selected sheets, sections, or cases;
- generate automation for a category/case set or start whole-scenario automation generation;
- update, add, delete, run, and reorder test cases inside sections; and
- assign or clear an automation category through either section-scoped or direct case endpoints.

Most methods accept an optional project ID and select the project-scoped endpoint when available. They throw when the shared API envelope is unsuccessful, so a consuming query/mutation must own cache invalidation and UI recovery.

No scenario-duplication or clone operation is present in this API client or current UI. If duplication is required, it needs an explicit backend contract and frontend method rather than being inferred from get/create or fixture copying.

## Manual execution and evidence

Manual result listing is scoped to project, scenario, and test case. Creating a result sends status and description plus zero or more evidence files through `FormData`. Because the shared API layer detects `FormData`, the browser supplies the multipart boundary rather than receiving a forced JSON content type.

## Current rendered pages are fixtures

The visible tests list imports `PROJECTS` and `TESTS` from `mock-data-new.ts`, then filters, searches, sorts, and paginates entirely in memory. The project-scoped route only supplies a default fixture project filter. “Export CSV” and “New test” display not-implemented alerts.

Test detail similarly looks up a fixture by ID and falls back to the first fixture when no match exists. Its scenario description, steps, recent runs, statistics, and automation states are demonstrations. Controls such as Edit, Run now, Generate, Regenerate, Add step, and retry/fix actions only show placeholder alerts or change local presentation state; they do not invoke `testScenarioApi`.

Run detail looks up a fixture run and falls back to the first one, always pairs it with the first fixture test, and renders fixture steps/logs and a local replay interaction. There is no run-fetching API in this repository. IDs shown in this screen therefore do not prove that a backend run exists.

## Integration path and invariants

When connecting these screens to the API:

1. replace fixture lookup/fallbacks with explicit loading, not-found, error, and empty states;
2. decide whether global or project-scoped scenario identity is canonical and use the matching endpoints consistently;
3. add React Query keys and invalidate lists/details after every mutation;
4. keep import polling recoverable across navigation, using SSE only as a timely supplement;
5. preserve the distinction among processing status, automation run status, and manual results; and
6. add a real run model/API before presenting run detail, logs, playback, or pass-rate values as backend data.

Do not silently combine fixture `Test` status (`passed`, `failed`, `flaky`, `draft`) with the richer backend `TestScenario` status model; define the product mapping deliberately.

## Related pages

- [Project Lifecycle and GitLab Repository Binding](project-lifecycle.md)
- [Specification Files and GitLab Issue Generation](specs-and-gitlab-issues.md)
- [Data Access and Client State](../architecture/data-access-and-state.md)
