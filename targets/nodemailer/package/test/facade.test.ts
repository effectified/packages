// What the facade does with the real nodemailer: sending through its JSON transport (no network), the service and
// its layer, and a rejected send as a tagged error carrying upstream's code.
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { createTransport, NodemailerError, NodemailerMail } from "../src/index.ts";

const message = { from: "a@example.com", to: "b@example.com", subject: "Hello", text: "From Effect" };

describe("@effectified/nodemailer", () => {
	it.effect("sends a message as an Effect", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const mail = yield* createTransport({ jsonTransport: true });
				const info = yield* mail.sendMail(message);
				expect(JSON.parse(info.message).subject).toBe("Hello");
			}),
		),
	);

	it.effect("provides the transport as a service, released with its layer", () =>
		Effect.gen(function* () {
			const mail = yield* NodemailerMail;
			const info = yield* mail.sendMail(message);
			expect(info.envelope.to).toStrictEqual(["b@example.com"]);
		}).pipe(Effect.provide(NodemailerMail.layer(createTransport({ jsonTransport: true })))),
	);

	it.effect("fails with NodemailerError and upstream's code when the SMTP server is unreachable", () =>
		Effect.scoped(
			Effect.gen(function* () {
				// Port 1 on the loopback refuses connections at once.
				const mail = yield* createTransport({ host: "127.0.0.1", port: 1, connectionTimeout: 1000 });
				const error = yield* Effect.flip(mail.verify());
				expect(error).toBeInstanceOf(NodemailerError);
				expect(error._tag).toBe("NodemailerError");
				expect(error.operation).toBe("Mail.verify");
				expect(["ECONNECTION", "ESOCKET"]).toContain(error.code);
			}),
		),
	);
});
