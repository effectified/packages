// Web Awesome driven by Effect UI in Chrome: an input and a switch report their state through their changes mounts,
// a button opens a dialog through its `open` property, and Escape closes it through its `wa-hide` event.
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { chrome, fixture } from "./support/browser.ts";

/** The form's model, as its fixture prints it. */
const state = (page: { evaluate: (f: () => string | undefined) => Effect.Effect<unknown, unknown> }) =>
	Effect.map(page.evaluate(() => document.querySelector("#state")?.textContent ?? undefined), (text) => JSON.parse(String(text)));

describe.skipIf(chrome === undefined)("a Web Awesome form in Effect UI", () => {
	it.effect("types into wa-input, toggles wa-switch, opens and closes wa-dialog", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const { page, errors } = yield* fixture("form");
				yield* page.waitForFunction(() => customElements.get("wa-dialog") !== undefined && document.querySelector("#state") !== null);

				yield* page.click("#name");
				yield* page.keyboard.type("Ada");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"name":"Ada"') === true);

				yield* page.click("#agreed");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"agreed":true') === true);

				yield* page.click("#open");
				yield* page.waitForFunction(() => (document.querySelector("#dialog") as HTMLElement & { open: boolean }).open);
				expect(yield* state(page)).toMatchObject({ name: "Ada", agreed: true, open: true, closings: 0 });

				yield* page.keyboard.press("Escape");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"closings":1') === true);
				expect(yield* state(page)).toMatchObject({ open: false, closings: 1 });
				expect(errors).toStrictEqual([]);
			}),
		),
	);
});
