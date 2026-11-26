---
name: effectify-recipe
description: Review and decide an effectified recipe (targets/<name>/recipe.json). Use when a plan unit says "review the recipe" or "settle the methods the compiler overrode", or when a facade wraps the wrong exports, releases a handle wrongly, or maps errors badly.
---

# Review a recipe

`recipe.json` holds every decision the types cannot make. The generator reads nothing else, so a better facade always starts here. Each decision in `decisions` has an `id`, a `question`, an `answer`, a `why` and `by` (`engine`, `agent`, `person`). A redraft (when upstream releases) replaces only the engine's: yours stay.

## How to decide

For each decision `by: "engine"`: read the upstream README (in `.cache/workspaces/<name>@<version>/node_modules/<name>/`), the types (`surface.json`, and the `.d.ts` files next to the README), and what the source does (`scan.json`). Then keep the answer or change it, set `by: "agent"`, and write a `why` a person can check in a minute. Then edit the matching field (below) so the decision and the field say the same, and run `pnpm effectify reconcile <name>`.

| Decision | Field | Decide |
|---|---|---|
| `exports` | `exports` | The functions and classes a program starts from: what the README's examples call. Not helpers, not internals (BullMQ exports Postgres backends and raw Redis commands; a facade offers Queue, Worker, QueueEvents, FlowProducer). |
| `handles.<H>.release` | `handles.<H>.release` | The one method that gives the resource back: `close` for a browser, a queue, a transport. `none` when the object owns nothing (a job, a request). A wrong release leaks or closes twice: read its docs. Releasing makes every acquisition need a `Scope`, so pages, connections and workers close with their scope. |
| `handles.<H>.events` | `handles.<H>.events` | Events worth a `Stream` (`completed`, `failed`, `console`), not internals (`ioredis:close`). `none` is fine. |
| `errors` | `errors` | One tag per exported error class a user would catch differently, subclasses before their bases (the first match wins), and last the catch-all `<Prefix>Error`. Upstream codes (`EAUTH`) stay in the catch-all's `code` unless a user would handle one differently; then give it a tag with `codes`. |
| `services` | `services` | Handles a program holds for its lifetime (a browser, a transport, a queue) become `Context.Service`s with a `layer`. Not per-request objects. |

## Overrides

- `methods`: per `<Handle>.<method>`, overriding what the analyzer read: `async`, `stream`, `sync`, or `exclude` (left out of the facade). `reconcile` writes the ones the compiler demands; read each: a method the compiler calls `sync` that upstream documents as async is a wrong upstream type, so exclude it and say so.
- `derived`: generic methods whose exact signature names a type upstream does not export, so the facade keeps the derived type (its type parameters become their constraints). Acceptable; note it in the docs when users will feel it.
- `testDependencies`: what the facade's tests need besides the toolchain (a Redis client), by exact version.

Never edit `package/`: it is regenerated from the recipe. If no recipe field can express what the facade needs, that is an engine gap: see `effectify-engine` (in effectified/engine).

## Done

`pnpm effectify reconcile <name>` and `pnpm effectify test <name>` pass, no decision is left `by: "engine"`, and your report lists each changed decision with its reason.
