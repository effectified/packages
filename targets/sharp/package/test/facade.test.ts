// What the facade does with the real sharp: its builder chain stays synchronous and returns facades, its terminal
// calls are Effects, and an input it cannot read is a tagged SharpError.
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { SharpError, sharp } from "../src/index.ts";

const red = { create: { width: 4, height: 2, channels: 3, background: "#ff0000" } } as const;

describe("@effectified/sharp", () => {
	it.effect("chains builders and runs the output as an Effect", () =>
		Effect.gen(function* () {
			const image = yield* sharp(red);
			const png = yield* image.resize(2, 1).png().toBuffer();
			expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
			const metadata = yield* (yield* sharp(png)).metadata();
			expect([metadata.format, metadata.width, metadata.height]).toStrictEqual(["png", 2, 1]);
		}),
	);

	it.effect("fails with SharpError for input it cannot read", () =>
		Effect.gen(function* () {
			const image = yield* sharp(Buffer.from("not an image"));
			const error = yield* Effect.flip(image.metadata());
			expect(error).toBeInstanceOf(SharpError);
			expect(error.operation).toBe("Sharp.metadata");
			expect(error.message.length).toBeGreaterThan(0);
		}),
	);
});
