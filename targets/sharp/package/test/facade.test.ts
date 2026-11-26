// What the facade does with the real sharp: its builder chain stays synchronous and returns facades, its terminal
// calls are Effects, and an input it cannot read is a tagged SharpError.
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { SharpError, sharp } from "../src/index.ts";

// #region example: Resize an image and read its metadata
const red = { create: { width: 4, height: 2, channels: 3, background: "#ff0000" } } as const;
// #endregion

describe("@effectified/sharp", () => {
	it.effect("chains builders and runs the output as an Effect", () =>
		Effect.gen(function* () {
			// #region example: Resize an image and read its metadata
			const image = yield* sharp(red);
			// The builder chain stays synchronous; toBuffer runs it, as an Effect.
			const png = yield* image.resize(2, 1).png().toBuffer();
			const metadata = yield* (yield* sharp(png)).metadata();
			// #endregion
			expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
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
