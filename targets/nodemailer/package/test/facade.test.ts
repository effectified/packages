// What the facade does with the real nodemailer: sending through its JSON transport (no network), the service and
// its layer, and a rejected send as a tagged error carrying upstream's code.
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { createTransport, NodemailerError, NodemailerMail } from "../src/index.ts";

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

	it.effect("fails with NodemailerError and upstream's code when the SMTP server is unreachable", () =>
		Effect.scoped(
			Effect.gen(function* () {
				// #region example: A failure is a tagged error with upstream's code
				// Port 1 on the loopback refuses connections at once.
				const mail = yield* createTransport({ host: "127.0.0.1", port: 1, connectionTimeout: 1000 });
				const error = yield* Effect.flip(mail.verify());
				// error: NodemailerError { operation: "Mail.verify", code: "ECONNECTION", ... }
				// #endregion
				expect(error).toBeInstanceOf(NodemailerError);
				expect(error._tag).toBe("NodemailerError");
				expect(error.operation).toBe("Mail.verify");
				expect(["ECONNECTION", "ESOCKET"]).toContain(error.code);
			}),
		),
	);
});
