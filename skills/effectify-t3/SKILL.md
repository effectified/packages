---
name: effectify-t3
description: Orchestrate the effectification of a library in T3 Code. Use as the orchestrator when T3 Code is asked to effectify a GitHub repository or npm package, or to process an engine plan: runs the engine, fans the plan's units out to delegate agents in worktrees, merges their work in order, and verifies the result.
---

# Effectify with T3 Code orchestrating

You are the orchestrator. The engine does the mechanical work in seconds; the plan's units are the judgment work, and each runs as its own delegate. You never write a unit's code yourself, and you never poll a delegate.

## 1. Mechanical part, in your own checkout

```sh
pnpm install --ignore-scripts
pnpm effectify make <github url or npm name>
pnpm effectify plan <name> --json > /tmp/plan-<name>.json
```

If `make` fails, stop and report its `reason` (see `effectify`, step 1). Commit `targets/<name>/` on a branch `effectify/<name>` and push it: every delegate starts from that commit.

## 2. Fan out

Call `orchestrator_capabilities` once. Then, for each unit whose `dependsOn` are all done:

- `delegate_task` with `isolation: "worktree"` based on the branch `effectify/<name>`;
- the task text is the unit's `brief`, then its `touches` ("change only these paths"), then its `acceptance` commands ("these must pass before you finish"), then: "Commit on your worktree branch. End with: files changed, commands run and their result, decisions you made, anything you could not settle.";
- name the task `<name>/<unit id>`.

Units with disjoint `touches` run at the same time; with this plan's shape that means: `recipe` alone first, then every `test-*` unit and `derived` together, then `docs`. Follow each delegate's `next`; do not call `task_status` in a loop, sleep or watch.

The skill each delegate needs is named in its brief (`effectify-recipe`, `effectify-tests`); the skills ship in this repository under `skills/`.

## 3. Merge, in dependency order

When a delegate finishes, read its report before merging:

- **accept**: its acceptance commands passed in its worktree and it touched only its `touches`. Merge its branch into `effectify/<name>`.
- **send back**: it changed generated files (`package/src`, `package/package.json`), mocked the library, or its commands failed. Start a new `delegate_task` with the original brief, the report, and what to fix. Never fix a unit's work yourself beyond a merge conflict in `recipe.json`.
- **recipe conflicts**: two units may both add to `recipe.json` (`methods`, `decisions`). Merge both sides' entries; each decision's `id` is unique.

After each merge, rerun `pnpm effectify reconcile <name>` in your checkout: a recipe change regenerates the package, and later units start from it.

## 4. Verify and hand back

```sh
pnpm effectify reconcile <name>
pnpm effectify test <name>      # with the services the tests need (see effectify-tests)
(cd targets/<name>/package && node node_modules/typescript/bin/tsc -p tsconfig.build.json)   # the release build compiles
```

Open one pull request for `effectify/<name>` with: the facade's handles, services and error tags (from `recipe.json`), each unit's result, the decisions agents changed and why, and every skipped test with the service it needs. Do not merge it: a person reviews the recipe.

## Engine gaps

A delegate that reports an engine gap (a facade type that is wrong for every user, a reconcile that cannot settle) gets its own unit: a delegate following `effectify-engine` (in effectified/engine), on a branch of effectified/engine, with the failing target as its reproduction. Once that engine is released and this repository moves to it, rerun `make` for the target and replan.
