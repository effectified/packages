---
name: effectify
description: Make a library Effect-native with the effectified engine. Use when given a GitHub repository URL or an npm package and asked to "effectify" it, add it to effectified, or wrap it in Effect. Runs the engine end to end, then hands the judgment work to agents (in T3 Code, through effectify-t3) and ships a tested facade package.
---

# Effectify a library

You are given a library: a GitHub URL (`https://github.com/taskforcesh/bullmq`, `…/tree/main/packages/<name>` for a monorepo) or an npm name (`bullmq`, `bullmq@6.7.10`). The result is a facade package, `@effectified/<name>`, in which:

- every async call is an `Effect`, traced as `<Handle>.<method>` (a span and a stack frame per call, as `Effect.fn`); every async iterable and event a `Stream`; every releasable resource scoped;
- a value upstream may not have (`T | null`) is an `Option`; ids and keys the recipe names are branded (`JobId`); secrets it names are taken as `Redacted`;
- every failure is a branded `Schema.TaggedError` carrying the operation, message, upstream code and cause, upstream's codes as a `reason` union (`Effect.catchReason`), and `Failure` is the Schema of all of them (`.match`, `.guards`);
- its types are derived from upstream's, so an upstream change that breaks the facade fails its build and names what moved.

The standard behind this is the engine's ("The standard" in `skills/effectify-engine/SKILL.md` of effectified/engine): the Effect team's `@effect/tsgo` rules and effectified's idioms (an oxlint plugin), which `reconcile` runs on every facade. The engine does the mechanical part. You do the part that needs judgment, and you do not edit generated code: you change `recipe.json` (or the engine) and regenerate.

## 1. Run the engine

From a checkout of this repository (`effectified/packages`, which pins the engine), after `pnpm install --ignore-scripts`:

```sh
pnpm effectify make <github url or npm name>
```

`make` runs four steps, each also a command of its own, each writing into `targets/<name>/`:

| Step | Command | Writes |
|---|---|---|
| study | `study <target>` | `surface.json` (what upstream's types expose, read with TypeScript 7's checker; which exports Node can import, read by importing the package, which runs the target library's own code: study only a library you would install, since its deadline and permissions are hygiene, not a sandbox), `scan.json` (what its JavaScript throws and emits, read with ast-grep) |
| draft | `draft <target>` | `recipe.json`: every decision the types cannot make, each with its answer, its reason and who made it |
| generate + reconcile | `reconcile <name>` | `package/`: the facade, regenerated until TypeScript 7 accepts it; what the compiler insists on is recorded in the recipe; then the standard's checks |
| verify | `verify <name>` | nothing: installs, type checks and runs the standard's checks |

If `make` fails, read the error's `reason`: it is the tool's own output. A study that fails on the target usually means a monorepo root (name the package directory) or a package without types (the engine then looks for `@types/<name>`). A reconcile that fails names the generated line: a line marked `// secret:` or `// brand:` is a recipe place upstream's types do not have (fix the recipe); any other is an engine gap, see `effectify-engine` (in effectified/engine). An `EffectNativeError` lists each finding of the standard as `effect|idioms <file>:<line>:<column>`: in a test or a mount, fix your code; in generated code, it is an engine gap. A test turns an Effect rule off only for one line, with its reason: `@effect-diagnostics-next-line <rule>:off <reason>`; any other directive is a finding (`suppression`).

## 2. Plan the judgment work

```sh
pnpm effectify plan <name>          # Markdown, for you
pnpm effectify plan <name> --json   # the same, for an orchestrator
```

The plan has units: review the recipe, test each handle (large handles in parts), settle the methods the compiler overrode, write the docs. Each unit has a brief a delegate can act on alone, the files it may touch, its dependencies and its acceptance commands.

- In T3 Code, fan the units out: follow `effectify-t3`.
- Alone, work through them in order: `recipe` first, the tests next (any order), `derived`, then `docs`.

## 3. The units

- **recipe**: follow `effectify-recipe`. Every decision `by: "engine"` becomes `by: "agent"` (kept or changed, with the reason).
- **test-<Handle>**: follow `effectify-tests`. Real library, real local services, never mocks of the library, never paid APIs.
- **derived**: follow `effectify-recipe` (Overrides).
- **docs**: the README, `SKILL.md` and the facade's page are generated, so the work is choosing what they show. Mark what a reader should see in the tests (and, for a frontend facade, its fixtures) with `// #region example: <title>` ... `// #endregion`: each region becomes an example in the facade's README, its `SKILL.md` and its page on effectified.dev, with the imports it uses (the facade by its name). Regions of one title join in order (a declaration above a test, then the test's body); openers on consecutive lines share one region. Keep assertions outside regions, and make each example read as a program someone would write. Aim for one example per service and per main handle, and one handled failure. Then write the recipe's `tagline`: one line on what the facade shows of its library (`a builder that is also a Node stream`).

## 4. Done means

```sh
pnpm effectify reconcile <name>   # generates, type checks with TypeScript 7, holds sources and tests to the standard
pnpm effectify test <name>        # every facade test passes (services up: see effectify-tests)
git diff --exit-code -- targets/<name>   # after reconcile and commit: what is committed is what the engine generates
(cd targets/<name>/package && node node_modules/typescript/bin/tsc -p tsconfig.build.json)   # the release build compiles
```

Once merged to `main`, CI releases it: `release.yml` publishes every facade whose version is not released yet as the GitHub release `<name>-v<version>` of effectified/packages (its version is upstream's).

Then commit `targets/<name>/` (surface, scan, recipe, package without node_modules, DRIFT.md if any) and say what remains: decisions you were unsure of, methods excluded and why, tests skipped for lack of a service.

## Rules

- Never edit `targets/<name>/package/src/` or `package.json`: they are generated. The tests in `package/test/` are yours and survive regeneration; they keep the standard's rules for tests (the presets correctness and antipattern), mounts the rules for sources.
- Never silence a rule of the standard to pass: a site that must break an idiom says why in the comment lines right above it (`// idiom-allow <rule>: <why>`, `<rule>` as the finding names it: `match`, `effect-fn`, ...), a tsgo rule that must stay off for every facade is an engine decision.
- Never run install scripts (`--ignore-scripts` everywhere); never use a version newer than the machine's release-age policy allows.
- A library that already has an Effect wrapper on npm, or is covered by Effect itself or by alchemy-run/distilled, is not a target: say so and stop.
