---
name: effectify-sync
description: Bring effectified facades to upstream's latest release. Use when the scheduled sync opens a pull request, when asked to update a facade to a new upstream version, or when DRIFT.md shows breaking changes to decide.
---

# Follow upstream

```sh
pnpm effectify sync <name>    # one target
pnpm effectify sync           # every target under targets/
```

For each target whose upstream has a newer version, `sync` studies it, writes `targets/<name>/DRIFT.md` (every added, removed and changed export, method, property and event, and whether it breaks the facade's users), redrafts the recipe keeping every decision an agent or a person made, regenerates and reconciles with TypeScript 7, and runs the facade's tests. The scheduled workflow (`.github/workflows/sync.yml`) does the same every day and opens one pull request per target with DRIFT.md as its body.

## Reading a sync

- **Only additions**: new methods appear in the facade by themselves (their handle's method list is regenerated). Read DRIFT.md for new handles or events worth offering, decide them in the recipe (`effectify-recipe`), and merge.
- **Removals and changed signatures** (`breaking`): code written against the facade may no longer compile. The facade follows upstream (it has no compatibility layer of its own); the pull request says what users must change, taken from DRIFT.md. A removed export the recipe offered is dropped from `exports`, with a decision saying so.
- **The sync failed**: DRIFT.md is written before anything can fail. A reconcile that cannot settle, or a test that fails, is work for an agent: the failing step's output is in the workflow log. Treat it like a plan unit: fix the recipe or the tests, or report an engine gap.

## Rules

- Never pin a facade below upstream's latest to make a sync pass; the facade's version is upstream's.
- Never change a decision `by: "person"` without asking.
- One upstream release, one pull request: do not batch targets.
