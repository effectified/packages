---
name: effectified-nodemailer
description: Write Effect code that uses nodemailer through @effectified/nodemailer. Use when an Effect program needs nodemailer, or code calling nodemailer moves onto Effect: what the facade offers, how its Effects, scopes and errors work, and tested examples.
---

# nodemailer through @effectified/nodemailer

A scoped transport, error codes, callbacks as Effects.

nodemailer in Effect: its async calls as Effects, its iterables as Streams, its resources scoped, its failures tagged. Generated from nodemailer's own types (this copy: 10.6.1+4, for nodemailer 10.6.1), so its types are upstream's and a call the facade does not change behaves as upstream documents.

## Install

```sh
pnpm add https://effectified.dev/nodemailer.tgz effect
```

## Rules

- Import from `@effectified/nodemailer`, not from `nodemailer`. nodemailer's types are `Upstream.<Type>` (`import { Upstream } from "@effectified/nodemailer"`).
- An async call returns an `Effect`, run with `yield*` inside `Effect.gen`; an async iterable is a `Stream`; a handle a call returns is a facade too. A synchronous call stays synchronous (a builder chain stays a chain).
- Scoped: acquiring a `Mail` needs a `Scope` (`Effect.scoped`, or a layer), and closing the scope calls its release (`Mail.close`). Never call the release yourself.
- Services: `NodemailerMail` (a `Mail`). Provide one at the program's edge with `<Service>.layer(<acquiring Effect>)` and read it with `yield* <Service>`.
- Failures are tagged: `NodemailerError`. Handle one with `Effect.catchTag("<Tag>", ...)`; each carries `operation` (`"<Handle>.<method>"`), `message`, upstream's `code` when it has one, and `cause`.
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

### A failure is a tagged error with upstream's code

```ts
import { Effect } from "effect";
import { createTransport } from "@effectified/nodemailer";

// Port 1 on the loopback refuses connections at once.
const mail = yield* createTransport({ host: "127.0.0.1", port: 1, connectionTimeout: 1000 });
const error = yield* Effect.flip(mail.verify());
// error: NodemailerError { operation: "Mail.verify", code: "ECONNECTION", ... }
```

From `test/facade.test.ts`.

## API

Exports: `createTransport`, `createTestAccount`.

Services: `NodemailerMail` (a `Mail`, from `createTransport`).

| Error | From |
|---|---|
| `NodemailerError` | any other failure, codes `ECONNECTION`, `EAUTH`, `EENVELOPE`, `EPROTOCOL`, `ETLS`, `EMESSAGE`, `EREQUIRETLS`, `ESOCKET`, `ETIMEDOUT`, `EDNS`, `EHLO`, `ESTREAM`, `EABORT`, `EAI_AGAIN`, `ECONFIG`, `EFETCH`, `EFILEACCESS`, `EMAXLIMIT`, `EMAXRECIPIENTS`, `ENOAUTH` |

| Handle | Effects | Streams | Events | Released by |
|---|---|---|---|---|
| `Mail` | `sendMail`, `verify` | – | – | `close` |
| `Transport` | `send` | – | – | – |
| `Logger` | – | – | – | – |

More: https://effectified.dev/nodemailer
