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
| `errors` | `errors` | One tag per exported error class a user would catch differently, subclasses before their bases (the first match wins), and last the catch-all `<Prefix>Error`. The `codes` of an error are the cases of its `reason` (`Effect.catchReason("<Tag>", "EAUTH", ...)`): keep the codes upstream really sets and a user would tell apart, drop what the scan picked up by mistake (Redis command names, parser tokens). A code a user handles as a different failure altogether gets a tag of its own with `codes`. |
| `services` | `services` | Handles a program holds for its lifetime become `Context.Service`s with a `layer`: a browser, a transport, a queue, and a client that owns nothing to release (simple-git's `SimpleGit`, bound to one directory). Not per-request objects (a page, a job, an image builder). |
| `brands` | `brands` | Ids and keys that must not mix, by name: `JobId: Job.id, Queue.getJob(0)`. Places: a property (`Handle.property`), a parameter (`call(<index>)`, a path into an options object after it: `Queue.add(2).jobId`), a field of what an async call resolves to (`Mail.sendMail().messageId`). The draft proposes a handle's string `id` and the `<handle>Id` parameters; add result fields, remove ids of different things that share a name. A brand on a generic method's result is refused (its type parameters would be lost). |
| `secrets` | `secrets` | Every argument path that carries a password, token or key, by call: `createTransport: 0.auth.pass`. Read upstream's option types and README; each path must be a string in upstream's types (the generated code checks it). The facade takes each also as `Redacted` (`Config.Redacted("SMTP_PASS")`). |
| `untraced` | `untraced` | Calls on a per-item hot path (per row, per frame, per chunk) that should run without a span. Usually none: an upstream call costs more than its span. |

## Overrides

- `methods`: per `<Handle>.<method>`, overriding what the analyzer read: `async`, `stream`, `sync`, or `exclude` (left out of the facade). `reconcile` writes the ones the compiler demands; read each: a method the compiler calls `sync` that upstream documents as async is a wrong upstream type, so exclude it and say so.
- `derived`: generic methods whose exact signature names a type upstream does not export, so the facade keeps the derived type (its type parameters become their constraints). Acceptable; note it in the docs when users will feel it.
- What the recipe does not decide, because the types do: a method whose value may be absent in every overload is an `Option` (`<Handle>Optional` in the generated source); every Effect is traced; facades are `Equal` by their upstream object. A wrong `Option` is a wrong upstream type: report it, do not work around it.
- `testDependencies`: what the facade's tests need besides the toolchain (a Redis client), by exact version.

Never edit `package/`: it is regenerated from the recipe. If no recipe field can express what the facade needs, that is an engine gap: see `effectify-engine` (in effectified/engine).

## Done

`pnpm effectify reconcile <name>` (with the standard's checks) and `pnpm effectify test <name>` pass, no decision is left `by: "engine"`, and your report lists each changed decision with its reason. A recipe change to a released facade also raises `revision`, with a decision `revision` saying what users get.
