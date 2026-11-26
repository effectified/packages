// An xterm.js terminal driven by Effect UI in Chrome: keystrokes arrive in the Model and its echo shows in the
// terminal's buffer, a resize arrives as a message, a new font size reaches the same terminal, a shorter log resets
// it, and removing the div disposes it.
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { chrome, fixture } from "./support/browser.ts";

describe.skipIf(chrome === undefined)("an xterm.js terminal in Effect UI", () => {
	it.effect("echoes typing, takes options and output in place, reports resizes and is disposed with its div", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const { page, errors } = yield* fixture("terminal");
				yield* page.waitForFunction(() => window.terminals?.[0]?.buffer.active.getLine(0)?.translateToString(true) === "$ ");
				// The mount brought xterm's stylesheet: it hides the textarea that takes keystrokes.
				expect(yield* page.evaluate(() => getComputedStyle(window.terminals[0]!.textarea!).opacity)).toBe("0");

				yield* page.click("#terminal");
				yield* page.keyboard.type("hi");
				yield* page.keyboard.press("Enter");
				yield* page.keyboard.type("ok");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"received":"hi\\rok"') === true);
				// The Model's log holds the echo; xterm parses writes after a frame, so wait for its buffer to show them.
				const state: { readonly output: ReadonlyArray<string> } = JSON.parse(String(yield* page.evaluate(() => document.querySelector("#state")?.textContent)));
				expect(state.output.join("")).toBe("$ hi\r\nok");
				yield* page.waitForFunction(() => {
					const buffer = window.terminals[0]?.buffer.active;
					return buffer?.getLine(0)?.translateToString(true) === "$ hi" && buffer.getLine(1)?.translateToString(true) === "ok";
				});

				// What a fit addon or an app's layout does when the div changes size.
				yield* page.evaluate(() => window.terminals[0]?.resize(60, 10));
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"size":{"cols":60,"rows":10}') === true);

				yield* page.click("#bigger");
				yield* page.waitForFunction(() => window.terminals[0]?.options.fontSize === 20);
				// The same terminal, updated: the mount set the option instead of opening another.
				expect(Number(yield* page.evaluate(() => window.terminals.length))).toBe(1);

				yield* page.click("#clear");
				yield* page.waitForFunction(() => window.terminals[0]?.buffer.active.getLine(0)?.translateToString(true) === "");
				expect(Number(yield* page.evaluate(() => window.terminals.length))).toBe(1);

				yield* page.click("#hide");
				yield* page.waitForFunction(() => document.querySelector("#hidden") !== null);
				// Disposing takes the terminal's element out of the div it was opened on; without it, it would stay there.
				expect(yield* page.evaluate(() => window.terminals[0]?.element?.parentNode === null)).toBe(true);
				expect(errors).toStrictEqual([]);
			}),
		),
	);
});
