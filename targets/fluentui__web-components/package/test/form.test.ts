// Fluent UI driven by Effect UI in Chrome: a text input, a switch and a checkbox report their state through their
// changes mounts, and a dialog opens from the Model through the DialogOpen mount and closes by Escape (the Model
// following Fluent's `toggle`) and by the Model (a Close button), each closing a single request to close.
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { chrome, fixture } from "./support/browser.ts";

/** The form's model, as its fixture prints it. */
const state = (page: { evaluate: (f: () => string | undefined) => Effect.Effect<unknown, unknown> }) =>
	Effect.map(page.evaluate(() => document.querySelector("#state")?.textContent ?? undefined), (text) => JSON.parse(String(text)));

/** Whether Fluent's native dialog is open, and how many requests to close it Fluent announced (`beforetoggle`). */
const dialog = (page: { evaluate: (f: () => string) => Effect.Effect<unknown, unknown> }) =>
	Effect.map(
		page.evaluate(() => {
			const element = document.querySelector("#dialog") as HTMLElement & { dialog: HTMLDialogElement };
			return JSON.stringify({ open: element.dialog.open, closeRequests: Number(element.dataset["closeRequests"] ?? 0) });
		}),
		(text) => JSON.parse(String(text)),
	);

describe.skipIf(chrome === undefined)("a Fluent UI form in Effect UI", () => {
	it.effect("types into fluent-text-input, toggles fluent-switch, checks fluent-checkbox, opens and closes fluent-dialog", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const { page, errors } = yield* fixture("form");
				yield* page.waitForFunction(() => customElements.get("fluent-dialog") !== undefined && document.querySelector("#state") !== null);
				// Counts Fluent's requests to close: a Model that followed `beforetoggle` would ask for a second one.
				yield* page.evaluate(() => {
					const element = document.querySelector("#dialog") as HTMLElement;
					// Fluent sends a CustomEvent under the native name, which lib.dom types as a ToggleEvent.
					element.addEventListener("beforetoggle", (event: Event) => {
						if ((event as CustomEvent<{ readonly newState: string }>).detail.newState === "closed") {
							element.dataset["closeRequests"] = String(Number(element.dataset["closeRequests"] ?? 0) + 1);
						}
					});
				});

				yield* page.click("#name");
				yield* page.keyboard.type("Ada");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"name":"Ada"') === true);
				expect(yield* state(page)).toStrictEqual({ name: "Ada", notify: false, agreed: false, open: false, closings: 0 });

				yield* page.click("#notify");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"notify":true') === true);
				expect(yield* state(page)).toStrictEqual({ name: "Ada", notify: true, agreed: false, open: false, closings: 0 });

				yield* page.click("#agreed");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"agreed":true') === true);
				expect(yield* state(page)).toStrictEqual({ name: "Ada", notify: true, agreed: true, open: false, closings: 0 });

				yield* page.click("#open");
				yield* page.waitForFunction(() => (document.querySelector("#dialog") as HTMLElement & { dialog: HTMLDialogElement }).dialog.open);
				expect(yield* state(page)).toStrictEqual({ name: "Ada", notify: true, agreed: true, open: true, closings: 0 });

				// Escape closes the dialog by itself; the Model follows the `toggle` Fluent sends once it has closed.
				yield* page.keyboard.press("Escape");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"closings":1') === true);
				expect(yield* state(page)).toStrictEqual({ name: "Ada", notify: true, agreed: true, open: false, closings: 1 });
				expect(yield* dialog(page)).toStrictEqual({ open: false, closeRequests: 1 });

				// Opened again and closed by the Model: the mount calls `hide`, and Fluent's `toggle` counts the closing.
				yield* page.click("#open");
				yield* page.waitForFunction(() => (document.querySelector("#dialog") as HTMLElement & { dialog: HTMLDialogElement }).dialog.open);
				yield* page.click("#close");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"closings":2') === true);
				expect(yield* state(page)).toStrictEqual({ name: "Ada", notify: true, agreed: true, open: false, closings: 2 });
				expect(yield* dialog(page)).toStrictEqual({ open: false, closeRequests: 2 });
				expect(errors).toStrictEqual([]);
			}),
		),
	);
});
