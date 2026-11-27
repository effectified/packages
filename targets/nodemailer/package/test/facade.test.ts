// What the facade does with the real nodemailer: sending through its JSON transport (no network), the service and
// its layer, credentials read as Config.Redacted, every call traced, and a refused connection as a tagged error
// whose reason is upstream's code.
import { inspect } from "node:util";
import { describe, expect, it } from "@effect/vitest";
import { Config, ConfigProvider, Effect, Redacted, Tracer } from "effect";
import { createTransport, Failure, NodemailerError, NodemailerMail } from "../src/index.ts";

// #region example: Send a message
// #region example: The transport as a service
const message = { from: "a@example.com", to: "b@example.com", subject: "Hello", text: "From Effect" };
// #endregion

describe("@effectified/nodemailer", () => {
	it.effect("sends a message as an Effect", () =>
		Effect.scoped(
			Effect.gen(function* () {
				// #region example: Send a message
				// The transport closes with the scope.
				const mail = yield* createTransport({ jsonTransport: true });
				const info = yield* mail.sendMail(message);
				// #endregion
				expect(JSON.parse(info.message).subject).toBe("Hello");
			}),
		),
	);

	it.effect("provides the transport as a service, released with its layer", () => {
		// #region example: The transport as a service
		const send = Effect.gen(function* () {
			const mail = yield* NodemailerMail;
			return yield* mail.sendMail(message);
		});
		// One transport for the program, closed when the layer is.
		const MailLive = NodemailerMail.layer(createTransport({ jsonTransport: true }));
		const program = send.pipe(Effect.provide(MailLive));
		// #endregion
		return program.pipe(Effect.map((info) => expect(info.envelope.to).toStrictEqual(["b@example.com"])));
	});

	it.effect("takes the SMTP password as Redacted, read from the environment, and reveals it only to nodemailer", () =>
		Effect.scoped(
			Effect.gen(function* () {
				// #region example: Credentials from the environment, never logged
				// `Config.Redacted` keeps the password out of logs and traces; the facade unwraps it for nodemailer alone.
				const pass = yield* Config.Redacted("SMTP_PASS");
				const mail = yield* createTransport({ host: "smtp.example.com", port: 587, auth: { user: "me@example.com", pass } });
				// #endregion
				expect(String(pass)).not.toContain("hunter2");
				// What nodemailer keeps of its options shows the password as Redacted again, and the facade prints and
				// serialises without nodemailer's state.
				expect(mail.options.auth.user).toBe("me@example.com");
				expect(Redacted.isRedacted(mail.options.auth.pass)).toBe(true);
				for (const shown of [inspect(mail, { depth: 5 }), JSON.stringify(mail), inspect(mail.options, { depth: 5 }), JSON.stringify(mail.options)])
					expect(shown).not.toContain("hunter2");
				// nodemailer itself holds the plaintext it authenticates with; `upstream` is the way out to nodemailer.
				expect(mail.upstream.options.auth.pass).toBe("hunter2");
			}),
		).pipe(Effect.provide(ConfigProvider.layer(ConfigProvider.fromEnvRecord({ SMTP_PASS: "hunter2" })))),
	);

	it.effect("shows no DKIM private key, through its options or the signer nodemailer makes of it", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const privateKey = Redacted.make("-----BEGIN PRIVATE KEY-----hunter2");
				const mail = yield* createTransport({ jsonTransport: true, dkim: { domainName: "example.com", keySelector: "mail", privateKey } });
				expect(Redacted.isRedacted(mail.options.dkim.privateKey)).toBe(true);
				// nodemailer's signer keeps the key: the facade leaves it out, and the transport's way back to the Mail too.
				expect("dkim" in mail).toBe(false);
				expect("mailer" in mail.transporter).toBe(false);
				for (const shown of [inspect(mail, { depth: 8 }), JSON.stringify(mail), JSON.stringify(mail.options), inspect(mail.transporter, { depth: 8 })])
					expect(shown).not.toContain("hunter2");
			}),
		),
	);

	it.effect("offers no close on the transport a Mail holds: shutting the pool is the Mail's, with its scope", () =>
		Effect.gen(function* () {
			const upstream = yield* Effect.scoped(
				Effect.gen(function* () {
					const mail = yield* createTransport({ pool: true, host: "127.0.0.1", port: 1 });
					// `mail.transporter` is the pool the Mail owns: borrowed, so its release is not offered.
					expect("close" in mail.transporter).toBe(false);
					expect(mail.transporter.isIdle?.()).toBe(true);
					return mail.upstream;
				}),
			);
			// The Mail's scope closed it, and its pool with it (nodemailer's pool marks itself closed, a field it does not type).
			expect((upstream.transporter as unknown as { readonly _closed: boolean })._closed).toBe(true);
		}),
	);

	it.effect("fails with NodemailerError whose reason is upstream's code when the SMTP server is unreachable", () =>
		Effect.scoped(
			Effect.gen(function* () {
				// #region example: A failure is a tagged error with upstream's code as its reason
				// Port 1 on the loopback refuses connections at once.
				const mail = yield* createTransport({ host: "127.0.0.1", port: 1, connectionTimeout: 1000 });
				const verified = yield* mail.verify().pipe(
					Effect.catchReason("NodemailerError", "ECONNECTION", (reason, error) => Effect.succeed(`${error.operation}: ${reason._tag}`)),
					Effect.catchReason("NodemailerError", "ESOCKET", (reason, error) => Effect.succeed(`${error.operation}: ${reason._tag}`)),
				);
				// verified: "Mail.verify: ECONNECTION"
				// #endregion
				expect(["Mail.verify: ECONNECTION", "Mail.verify: ESOCKET"]).toContain(verified);
				const error = yield* Effect.flip(mail.verify());
				expect(error).toBeInstanceOf(NodemailerError);
				expect(Failure.guards.NodemailerError(error)).toBe(true);
				expect(error.operation).toBe("Mail.verify");
				expect(["ECONNECTION", "ESOCKET"]).toContain(error.code);
				expect(error.reason._tag).toBe(error.code);
			}),
		),
	);

	it.effect("runs every call in a span named after it", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const spans: Array<string> = [];
				const tracer = Tracer.make({
					span(options) {
						spans.push(options.name);
						return Tracer.nativeTracer.span(options);
					},
				});
				yield* Effect.flatMap(createTransport({ jsonTransport: true }), (mail) => mail.sendMail(message)).pipe(Effect.withTracer(tracer));
				expect(spans).toStrictEqual(["createTransport", "Mail.sendMail"]);
			}),
		),
	);
});
