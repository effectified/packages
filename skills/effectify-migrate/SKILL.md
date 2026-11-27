---
name: effectify-migrate
description: Move an application from a library to its effectified facade. Use when asked to adopt an @effectified package in a codebase, or to turn an application's promise-based use of a library into Effect code.
---

# Move an application onto a facade

```sh
pnpm effectify usages <application source directory> <npm name>
```

`usages` lists, file by file, every import of the library and every call, construction and `await` of what those imports name, as a checklist. Work through it file by file; each file ends type checked and tested.

## Per use

| Before | After |
|---|---|
| `import { launch } from "puppeteer-core"` | `import { launch } from "@effectified/puppeteer-core"` (types: `import { Upstream } from "@effectified/puppeteer-core"`, then `Upstream.LaunchOptions`) |
| `const browser = await launch(options)` inside an `async` function | `const browser = yield* launch(options)` inside `Effect.gen`, in a `Scope` (the browser closes with it) or through the service's layer |
| `try { await page.goto(url) } catch (e) { if (e instanceof TimeoutError) ... }` | `page.goto(url).pipe(Effect.catchTag("TimeoutError", ...))` |
| `catch (e) { if (e.code === "EAUTH") ... }` | `Effect.catchReason("NodemailerError", "EAUTH", (reason, error) => ...)` |
| `const el = await page.$(sel); if (el === null) ...` | `page.$(sel).pipe(Effect.flatMap(Option.match({ onNone: ..., onSome: (el) => ... })))`: a value upstream may not have is an `Option` |
| `auth: { pass: process.env.SMTP_PASS }` | `auth: { pass: yield* Config.Redacted("SMTP_PASS") }` for every secret the facade names: it reveals the value only to upstream |
| `queue.getJob(id)` with any string | `queue.getJob(job.id)`, or `JobId.make(id)` where an id comes in as a string: ids are branded |
| `await browser.close()` in a `finally` | nothing: the scope releases it |
| `worker.on("completed", (job) => ...)` | `events.Worker.completed(worker).pipe(Stream.runForEach(([job]) => ...))`; `{ bufferSize: n }` when the consumer is slower than the emitter |
| a module-level client created once | the facade's service (`PuppeteerBrowser`, `NodemailerMail`, `SimpleGitService`) and its `layer` at the program's edge |

Functions that call the library become `Effect`s themselves, each `Effect.fn("<Module>.<name>")` so its span nests over the facade's (`Page.goto` under `Checkout.run`), up to the point where the application already runs Effect or where a single `Effect.runPromise` bridges to the rest; move that point outwards one file at a time.

## Rules

- Change behaviour nowhere: same calls, same arguments, same order. Error handling may only become more precise (a tag instead of `instanceof`).
- What the facade does not wrap stays reachable as `.upstream` (on every handle) or `Upstream` (the package); use them rather than reintroducing the library's import.
- Each file: the application's type check and its tests pass before the next file starts.
