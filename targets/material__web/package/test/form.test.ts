// Material Web driven by Effect UI in Chrome: a text field, a switch, a checkbox and a slider report their state
// through their changes mounts, a button opens a dialog through its `open` property, and Escape closes it, which the
// Model hears through the dialog's `closed` event.
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { chrome, fixture } from "./support/browser.ts";

/** The form's model, as its fixture prints it. */
const state = (page: { evaluate: (f: () => string | undefined) => Effect.Effect<unknown, unknown> }) =>
	Effect.map(page.evaluate(() => document.querySelector("#state")?.textContent ?? undefined), (text) => JSON.parse(String(text)));

describe.skipIf(chrome === undefined)("a Material Web form in Effect UI", () => {
	it.effect("types into md-outlined-text-field, toggles md-switch, checks md-checkbox, moves md-slider, opens and closes md-dialog", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const { page, errors } = yield* fixture("form");
				yield* page.waitForFunction(() => customElements.get("md-dialog") !== undefined && document.querySelector("#state") !== null);
				expect(yield* state(page)).toStrictEqual({ name: "", notify: false, agreed: false, volume: 50, open: false, dialog: "closed", closings: 0 });

				yield* page.click("#name");
				yield* page.keyboard.type("Ada");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"name":"Ada"') === true);

				yield* page.click("#notify");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"notify":true') === true);

				yield* page.click("#agreed");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"agreed":true') === true);
				expect(yield* state(page)).toMatchObject({ name: "Ada", notify: true, agreed: true, volume: 50 });

				// Tab moves focus from the checkbox to the slider; each arrow is one step of 10.
				yield* page.keyboard.press("Tab");
				yield* page.keyboard.press("ArrowRight");
				yield* page.keyboard.press("ArrowRight");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"volume":70') === true);

				// Count the dialog's close requests: syncing `open` on `closed` must leave exactly one.
				yield* page.evaluate(() => {
					const counts = { close: 0 };
					document.querySelector("#dialog")?.addEventListener("close", () => counts.close++);
					Object.assign(window, { counts });
				});
				yield* page.click("#open");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"dialog":"opened"') === true);
				expect(yield* state(page)).toMatchObject({ open: true, dialog: "opened", closings: 0 });
				expect(yield* page.evaluate(() => (document.querySelector("#dialog") as HTMLElement & { open: boolean }).open)).toBe(true);

				yield* page.keyboard.press("Escape");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"closings":1') === true);
				expect(yield* state(page)).toStrictEqual({ name: "Ada", notify: true, agreed: true, volume: 70, open: false, dialog: "closed", closings: 1 });
				expect(
					JSON.parse(String(yield* page.evaluate(() => JSON.stringify({ open: (document.querySelector("#dialog") as HTMLElement & { open: boolean }).open, ...(window as unknown as { counts: object }).counts })))),
				).toStrictEqual({ open: false, close: 1 });
				expect(errors).toStrictEqual([]);
			}),
		),
	);
});
