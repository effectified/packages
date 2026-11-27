---
name: effectified-nodemailer
description: Write Effect code that uses nodemailer through @effectified/nodemailer. Use when an Effect program needs nodemailer, or code calling nodemailer moves onto Effect: what the facade offers, how its Effects, scopes and errors work, and tested examples.
---

# nodemailer through @effectified/nodemailer

A scoped transport, error codes, callbacks as Effects.

nodemailer in Effect: its async calls as traced Effects, absent values as Options, its iterables as Streams, its resources scoped, its failures tagged. Generated from nodemailer's own types (this copy: 10.6.1+6, for nodemailer 10.6.1), so its types are upstream's and a call the facade does not change behaves as upstream documents.

## Install

```sh
pnpm add https://effectified.dev/nodemailer.tgz effect
```

## Rules

- Import from `@effectified/nodemailer`, not from `nodemailer`. nodemailer's types are re-exported by their own names (`import type { ... } from "@effectified/nodemailer"`), and all of it is `Upstream`.
- An async call returns an `Effect`, traced as `<Handle>.<method>` (a span and a stack frame per call, as `Effect.fn`): run it with `yield*` inside `Effect.gen` or your own `Effect.fn`. An async iterable is a `Stream`; a handle a call returns is a facade too. A synchronous call stays synchronous (a builder chain stays a chain).
- Scoped: acquiring a `Mail`, a `Transport` needs a `Scope` (`Effect.scoped`, or a layer), and closing the scope calls its release (`Mail.close`, `Transport.close`), even when you called that release yourself. Call a release yourself only when you need its result or its failure: the scope's release is then a second call, and when it fails (the handle is closed already) it is logged as a warning, `<Handle>.<release> failed while its scope closed`, and the scope still closes. A synchronous call that makes one hands you its facade, release methods and all: release it yourself. A handle nodemailer already holds (the receiver a chained call returns, a property's) is borrowed: its facade has no release method, which is its owner's.
- Services: `NodemailerMail` (a `Mail`). Provide one at the program's edge with `<Service>.layer(<acquiring Effect>)` and read it with `yield* <Service>`.
- Failures are branded `Schema.TaggedError`s: `NodemailerError`. Handle one with `Effect.catchTag("<Tag>", ...)`; each carries `operation` (`"<Handle>.<method>"`), `message`, upstream's `code` when it has one, the fields upstream's error declares, and upstream's failure as `cause`, `Redacted` (`Redacted.value(error.cause)`), printed nowhere. `Failure` is the Schema of every one: `Failure.match(error, { <Tag>: ... })`, `Failure.guards.<Tag>(value)`.
- `NodemailerError` carries `reason`, upstream's code as a tagged union (`ECONNECTION`, `EAUTH`, `EENVELOPE`...): pick one with `Effect.catchReason("NodemailerError", "ECONNECTION", (reason, error) => ...)`.
- Secrets are taken as `Redacted` too, so they never reach a log or a trace: `createTransport` (`0.auth.pass`, `0.auth.clientSecret`, `0.auth.refreshToken`, `0.auth.accessToken`, `0.auth.privateKey`, `0.dkim.privateKey`). Read them with `Config.Redacted("NAME")`; the facade reveals each to nodemailer only in the call, shows it as `Redacted` where a property or a method's result holds what nodemailer kept of it, scrubs it from the message and string fields of the failures of that call and of the handles it made (`<redacted>`; a code never, nor a secret shorter than four characters), and prints as its handle's name, never nodemailer's state. What still sees it is nodemailer's own: `.upstream`, and nodemailer's code (a logger you give it, a plugin it calls with its options).
- Two facades of one upstream object are `Equal` and hash alike: use them as keys of a `HashMap` or `HashSet`.
- What the facade does not wrap stays reachable: `.upstream` on every facade, `Upstream` for the package. Use them rather than importing `nodemailer` again.

## Examples

Each is code from a test that passes in CI.

### Send a message

```ts
import { Effect } from "effect";
import { createTransport } from "@effectified/nodemailer";

const message = { from: "a@example.com", to: "b@example.com", subject: "Hello", text: "From Effect" };

// The transport closes with the scope.
const mail = yield* createTransport({ jsonTransport: true });
const info = yield* mail.sendMail(message);
```

From `test/facade.test.ts`.

### The transport as a service

```ts
import { Effect } from "effect";
import { createTransport, NodemailerMail } from "@effectified/nodemailer";

const message = { from: "a@example.com", to: "b@example.com", subject: "Hello", text: "From Effect" };

const send = Effect.gen(function* () {
	const mail = yield* NodemailerMail;
	return yield* mail.sendMail(message);
});
// One transport for the program, closed when the layer is.
const MailLive = NodemailerMail.layer(createTransport({ jsonTransport: true }));
const program = send.pipe(Effect.provide(MailLive));
```

From `test/facade.test.ts`.

### Credentials from the environment, never logged

```ts
import { Config } from "effect";
import { createTransport } from "@effectified/nodemailer";

// `Config.Redacted` keeps the password out of logs and traces; the facade unwraps it for nodemailer alone.
const pass = yield* Config.Redacted("SMTP_PASS");
const mail = yield* createTransport({ host: "smtp.example.com", port: 587, auth: { user: "me@example.com", pass } });
```

From `test/facade.test.ts`.

### A failure is a tagged error with upstream's code as its reason

```ts
import { Effect } from "effect";
import { createTransport, NodemailerError } from "@effectified/nodemailer";

// Port 1 on the loopback refuses connections at once.
const mail = yield* createTransport({ host: "127.0.0.1", port: 1, connectionTimeout: 1000 });
const verified = yield* mail.verify().pipe(
	Effect.catchReason("NodemailerError", "ECONNECTION", (reason, error) => Effect.succeed(`${error.operation}: ${reason._tag}`)),
	Effect.catchReason("NodemailerError", "ESOCKET", (reason, error) => Effect.succeed(`${error.operation}: ${reason._tag}`)),
);
// verified: "Mail.verify: ECONNECTION"
```

From `test/facade.test.ts`.

## API

Exports: `createTransport`, `createTestAccount`.

Services: `NodemailerMail` (a `Mail`, from `createTransport`).

Secrets, also as `Redacted`: `createTransport` `0.auth.pass`, `0.auth.clientSecret`, `0.auth.refreshToken`, `0.auth.accessToken`, `0.auth.privateKey`, `0.dkim.privateKey`.

| Error | From | Reasons |
|---|---|---|
| `NodemailerError` | any other failure | `ECONNECTION`, `EAUTH`, `EENVELOPE`, `EPROTOCOL`, `ETLS`, `EMESSAGE`, `EREQUIRETLS`, `ESOCKET`, `ETIMEDOUT`, `EDNS`, `EHLO`, `ESTREAM`, `EABORT`, `EAI_AGAIN`, `ECONFIG`, `EFETCH`, `EFILEACCESS`, `EMAXLIMIT`, `EMAXRECIPIENTS`, `ENOAUTH` |

| Handle | Effects | Of an `Option` | Streams | Events | Released by |
|---|---|---|---|---|---|
| `Mail` | `sendMail`, `verify` | – | – | – | `close` |
| `Transport` | `send` | – | – | – | `close` |
| `Logger` | – | – | – | – | – |

More: https://effectified.dev/nodemailer
