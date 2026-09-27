---
name: land
description: >-
  Land this project's changes only when explicitly requested.
  Do not use for review, preparation, or skill installation.
user-invocable: true
disable-model-invocation: true
metadata:
  delta-action: land
---

# Land changes (codetest)

Land the user's requested changes from this thread onto `master` on
`origin` (`https://github.com/Wasomeno/codetest.git`). The Land Changes
button / explicit land request **is** merge intent — do not ask again
whether to merge. Keep safeguards: stop on failed verification, ambiguous
scope, or unsafe Git operations.

## Scope and preflight

1. Confirm intent is landing (already true when this skill was invoked via
   Land Changes or an explicit land request).
2. Work in the **codetest** Delta worktree unless the user named another.
3. Inspect remotes and branch state (read-only first):
   - Expect `origin` → GitHub and optionally `local` → the user's primary
     checkout.
   - Default branch is `master` (see `gh repo view` / `origin/HEAD`).
4. Inventory the working tree. Land only files that belong to this thread's
   change. Do not commit secrets (`.env`), unrelated dirty files, or force
   overwrites of work you did not author. If unrelated dirty files would be
   destroyed or mixed in, stop and ask.
5. Prefer publishing via **`origin`**, not `local`, so the change reaches
   GitHub.

## Prepare a topic branch and commit

1. If `HEAD` is `master` (or another shared branch) with changes to land:
   - Create and switch to a topic branch, e.g.
     `land/<short-slug>-<yyyymmdd>` or `land/thread-<short-id>`.
   - Do not commit directly on `master` in this workflow.
2. Stage only the relevant paths (modified + intended untracked).
3. Commit with a concise message describing the user-facing outcome
   (sentence case, imperative). Use a non-interactive commit:
   `GIT_EDITOR=true git commit -m "..."`.
4. If there is nothing to commit and the branch already contains the
   intended commits, continue to verification/publish.

## Local verification

Prefer the narrowest quiet check that proves the change (see root
`AGENTS.md`).

- Typecheck (authoritative for this app's scripts/tooling):
  `bunx tsc --noEmit`
  (TypeScript project: `tsconfig.json`; package tooling: `package.json`)
- If typecheck fails, fix or stop — do not land.
- Optional deeper check when the change touches build/config:
  `bun --bun run build`
  (`package.json` → `scripts.build`)
- There is no app PR CI required today; the only GitHub Actions workflow is
  scheduled OpenWiki (`.github/workflows/openwiki-update.yml`), not a gate
  for feature PRs. Do not invent required checks that are not configured.

## Publish and open a PR

1. `git push -u origin HEAD` (non-interactive; no force to `master`).
2. Open a PR into `master` with `gh`:
   `gh pr create --base master --fill` (or `--title` / `--body` if fill is
   insufficient).
3. If a PR already exists for this branch, reuse it (`gh pr view`).

## Merge

1. Inspect PR checks: `gh pr checks` / `gh pr view --json statusCheckRollup`.
   - If any **required** checks are pending, failing, or missing, wait or
     stop — do not treat "started" as passed.
   - If no required checks are configured (current repo state), proceed after
     local typecheck succeeded.
2. Merge with GitHub CLI, non-interactive, e.g.
   `gh pr merge --merge --delete-branch`
   (squash is acceptable if the user prefers a single commit; default to
   `--merge` unless the PR already documents squash).
3. Conflict policy: **resolve automatically** when the intended result is
   clear (prefer the landed branch's intentional edits; keep unrelated
   upstream work). Pause and report failure only when resolution would be
   ambiguous or unsafe.
4. Do not force-push `master`. Do not bypass failing required checks.

## Verify landing

1. Fetch `origin` and confirm the landed commit is reachable from
   `origin/master` (e.g. `git fetch origin && git merge-base --is-ancestor
   <sha> origin/master`).
2. Record the short SHA and PR/commit URLs from `gh`.

## Outcome reporting

When running in a Land subthread and `report_subthread_status` is available,
report the final outcome to the parent. Otherwise report in this
conversation.

- `status: "success"` only after the change is on `origin/master`.
- `status: "failure"` for blockers (failed typecheck, push denied, unresolved
  ambiguous conflicts, required checks not green).
- Do **not** report success for merely committing, pushing a topic branch,
  opening a PR, or installing this skill.

Examples:

| Outcome | status | title | description |
| --- | --- | --- | --- |
| Verified on master | success | Landed on master | `[abc1234](<commit-url>) · PR merged.` |
| Typecheck failed | failure | Blocked by typecheck | `bunx tsc --noEmit` failed. Not landed. |
| Push denied | failure | Push blocked | Branch pushed checks ok locally; `origin` rejected the push. |

Keep `title` short (sentence case). Keep `description` to one short line with
verified links only.
