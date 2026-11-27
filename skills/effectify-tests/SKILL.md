---
name: effectify-tests
description: Write behaviour tests for an effectified facade (targets/<name>/package/test). Use when a plan unit says "test <Handle>", or to prove a facade works against the real library: real library, real local services, every error tag, every scope.
---

# Test a facade

A facade's types are checked against upstream when it is generated. Its tests check the other half: that the real library, called through the facade, does what the types say. They are the only hand-written code in a facade package, and they survive regeneration.

## Shape

One file per handle (`test/<handle>.test.ts`), `@effect/vitest`, and the facade imported from `../src/index.ts`:

```ts
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { launch, TimeoutError } from "../src/index.ts";

it.effect("fails with TimeoutError when a selector never appears", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const browser = yield* launch(options);
			const page = yield* browser.newPage();
			const error = yield* Effect.flip(page.waitForSelector("#never", { timeout: 100 }));
			expect(error).toBeInstanceOf(TimeoutError);
			expect(error.operation).toBe("Page.waitForSelector");
		}),
	),
);
```

The reference tests are `targets/*/package/test/facade.test.ts`: nodemailer (JSON transport and a refused SMTP port), simple-git (a repository in a temp directory), sharp (images built in memory), puppeteer-core (a local Chrome), bullmq (Redis in Docker).

## What each method gets

- **success**: the value through the facade (`yield*`), checked against what the library documents;
- **each failure it can produce**: `Effect.flip`, then the tag (`toBeInstanceOf`, `Failure.guards.<Tag>`), `operation` (`"<Handle>.<method>"`) and `code` when upstream has one; an error with codes also its `reason._tag`. Provoke failures for real: a closed port, a missing branch, a selector that never appears;
- **values that may be absent** (`<Handle>Optional` in the generated source): both cases, `Option.none()` and `Option.some` of the facade (`page.$("#missing")`, `page.$("#go")`);
- **scopes**: what a scoped acquisition opened is closed when the scope closes (read `.upstream` afterwards: `connected === false`, a released file, a closed connection);
- **streams**: take a few elements (`Stream.take`) with a timeout, never an unbounded run.

## What the facade shows once

Each facade's tests show its Effect-native parts once, in an example region where a user should see them (the references: nodemailer, bullmq, puppeteer-core):

- a failure picked by its reason: `Effect.catchReason("<Tag>", "<code>", (reason, error) => ...)`, for an error with codes;
- a secret the recipe names given as `Redacted`, read with `Config.Redacted("NAME")` from `ConfigProvider.layer(ConfigProvider.fromEnvRecord({ ... }))`, and what upstream received (the revealed value) next to `String(secret)` hiding it;
- a brand the recipe names: a call's result carries it (`job.id` is a `JobId`), and one is made with `JobId.make(value)`;
- the spans: a tracer that records span names (`Tracer.make` over `Tracer.nativeTracer`, `Effect.withTracer`) sees `<export>` and `<Handle>.<method>` in order;
- a service, provided with `<Service>.layer(<acquiring Effect>)`, for every service of the recipe;
- for a handle a program keeps as a key, `Equal.equals` of two facades of one upstream object.

## Environment

- Run the real library. Never mock it, never stub its methods: a test of a mock tests nothing of the facade.
- Services run locally: Docker (`docker run -d --rm -p 6390:6379 redis:7-alpine`), a temp directory, a local binary (Chrome through `CHROME_BIN`). A test that needs one reads its address from an environment variable and is skipped without it (`describe.skipIf(url === undefined)`), and its file's header says which variable and how to start the service.
- Never call a paid or remote API.
- Anything the tests import besides the toolchain goes in the recipe's `testDependencies` (exact version), never into `package.json` by hand.
- Tests keep the standard's rules for tests (`@effect/tsgo` presets correctness and antipattern; `reconcile` reports a finding as `tsgo test/<file>:<line>:<column> <rule>`): no floating Effect, no `catch` returning `unknown`, a `try`/`tryPromise` always with its `catch`. A test is an entry point, so it may `Effect.provide` a layer. Never wait on the real clock with a sleep: `it.effect` runs on the TestClock, `it.live` for real time.

## When the facade is wrong

If the library behaves differently from the facade's type (a method typed `Effect` returns synchronously, a value typed as a facade is a plain object), do not work around it in the test and do not edit `package/src`. Record it in the recipe (`methods` override or `exclude`, with a decision saying what you saw), rerun `reconcile`, and report it. If no override can fix it, it is an engine gap (`effectify-engine` (in effectified/engine)).

## Examples

Mark what a reader should see in the tests (and, for a frontend facade, its fixtures) with `// #region example: <title>` ... `// #endregion`: each region becomes an example in the facade's README, its `SKILL.md` and its page on effectified.dev, with the imports it uses (the facade by its name). Regions of one title join in order (a declaration above a test, then the test's body); openers on consecutive lines share one region. Keep assertions outside regions, and make each example read as a program someone would write.

## Done

`pnpm effectify reconcile <name>` (which type checks the tests and holds them to the standard) and `pnpm effectify test <name>` pass with the services up, and your report lists each test skipped without a service.
