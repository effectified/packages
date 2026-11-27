---
name: effectified-sharp
description: Write Effect code that uses sharp through @effectified/sharp. Use when an Effect program needs sharp, or code calling sharp moves onto Effect: what the facade offers, how its Effects, scopes and errors work, and tested examples.
---

# sharp through @effectified/sharp

A builder that is also a Node stream.

sharp in Effect: its async calls as traced Effects, absent values as Options, its iterables as Streams, its resources scoped, its failures tagged. Generated from sharp's own types (this copy: 0.35.5, for sharp 0.35.5), so its types are upstream's and a call the facade does not change behaves as upstream documents.

## Install

```sh
pnpm add @effectified/sharp effect
```

## Rules

- Import from `@effectified/sharp`, not from `sharp`. sharp's types are re-exported by their own names (`import type { ... } from "@effectified/sharp"`), and all of it is `Upstream`.
- An async call returns an `Effect`, traced as `<Handle>.<method>` (a span and a stack frame per call, as `Effect.fn`): run it with `yield*` inside `Effect.gen` or your own `Effect.fn`. An async iterable is a `Stream`; a handle a call returns is a facade too. A synchronous call stays synchronous (a builder chain stays a chain).
- Failures are branded `Schema.TaggedError`s: `SharpError`. Handle one with `Effect.catchTag("<Tag>", ...)`; each carries `operation` (`"<Handle>.<method>"`), `message`, upstream's `code` when it has one, the fields upstream's error declares, and upstream's failure as `cause`, `Redacted` (`Redacted.value(error.cause)`), printed nowhere. `Failure` is the Schema of every one: `Failure.match(error, { <Tag>: ... })`, `Failure.guards.<Tag>(value)`.
- `SharpError` carries `reason`, upstream's code as a tagged union (`ERR_DLOPEN_DISABLED`...): pick one with `Effect.catchReason("SharpError", "ERR_DLOPEN_DISABLED", (reason, error) => ...)`.
- Two facades of one upstream object are `Equal` and hash alike: use them as keys of a `HashMap` or `HashSet`.
- What the facade does not wrap stays reachable: `.upstream` on every facade, `Upstream` for the package. Use them rather than importing `sharp` again.

## Examples

Each is code from a test that passes in CI.

### Resize an image and read its metadata

```ts
import { sharp } from "@effectified/sharp";

const red = { create: { width: 4, height: 2, channels: 3, background: "#ff0000" } } as const;

const image = yield* sharp(red);
// The builder chain stays synchronous; toBuffer runs it, as an Effect.
const png = yield* image.resize(2, 1).png().toBuffer();
const metadata = yield* (yield* sharp(png)).metadata();
```

From `test/facade.test.ts`.

## API

Exports: `sharp`.

| Error | From | Reasons |
|---|---|---|
| `SharpError` | any other failure | `ERR_DLOPEN_DISABLED` |

| Handle | Effects | Of an `Option` | Streams | Events | Released by |
|---|---|---|---|---|---|
| `Sharp` | `metadata`, `stats`, `toBuffer`, `toFile`, `toUint8Array` | – | – | – | – |

More: https://effectified.dev/sharp
