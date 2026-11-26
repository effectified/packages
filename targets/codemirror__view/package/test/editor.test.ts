// A CodeMirror editor driven by Effect UI in Chrome: typing updates the Model's document and selection without the
// echo resetting them, a document and extensions from the Model update the same EditorView in place, and removing
// the editor's element destroys the view.
import type { EditorView } from "@codemirror/view";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { chrome, fixture } from "./support/browser.ts";

declare global {
	interface Window {
		/** The view the page started with, kept by the test to compare later views against. */
		first: EditorView | null;
	}
}

describe.skipIf(chrome === undefined)("a CodeMirror editor in Effect UI", () => {
	it.effect("reports typing, takes the Model's document in place, and is destroyed with its element", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const { page, errors } = yield* fixture("editor");
				yield* page.waitForFunction(() => document.querySelector(".cm-editor") !== null);
				yield* page.evaluate(() => {
					window.first = window.EditorView.findFromDOM(document.querySelector<HTMLElement>(".cm-editor")!);
				});

				// The end of the document, in page coordinates, read from the editor itself.
				const end: { readonly x: number; readonly y: number } = JSON.parse(
					String(
						yield* page.evaluate(() => {
							const rect = window.first!.coordsAtPos(window.first!.state.doc.length);
							return JSON.stringify({ x: rect!.right, y: (rect!.top + rect!.bottom) / 2 });
						}),
					),
				);
				yield* page.mouse.click(end.x, end.y);
				yield* page.keyboard.type(" world");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"doc":"hello world"') === true);
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"anchor":11,"head":11') === true);
				// Typing in the middle: replacing the document with the Model's equal copy would move the cursor away.
				for (let step = 0; step < 6; step++) yield* page.keyboard.press("ArrowLeft");
				yield* page.keyboard.type(",");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"doc":"hello, world","anchor":6,"head":6') === true);
				// The Model gave the editor's own document back: the editor kept it and its cursor.
				const typed: { readonly doc: string; readonly head: number } = JSON.parse(
					String(yield* page.evaluate(() => JSON.stringify({ doc: window.first!.state.doc.toString(), head: window.first!.state.selection.main.head }))),
				);
				expect(typed).toStrictEqual({ doc: "hello, world", head: 6 });

				// Edits in tasks of their own, interleaved with the Model's work: each reaches the Model, and no document
				// the Model gives back undoes a later edit.
				yield* page.evaluate(() => {
					const edit = (left: number) => {
						const end = window.first!.state.doc.length;
						window.first!.dispatch({ changes: { from: end, insert: "!" }, selection: { anchor: end + 1 } });
						if (left > 1) setTimeout(() => edit(left - 1), 0);
					};
					edit(40);
				});
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes(`"doc":"hello, world${"!".repeat(40)}"`) === true);
				expect(yield* page.evaluate(() => window.first!.state.doc.toString())).toBe(`hello, world${"!".repeat(40)}`);

				yield* page.click("#set");
				yield* page.waitForFunction(() => document.querySelector(".cm-content")?.textContent === "set from the model");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"doc":"set from the model"') === true);
				// The same view, given the new document as one change instead of being created again.
				expect(yield* page.evaluate(() => window.EditorView.findFromDOM(document.querySelector<HTMLElement>(".cm-editor")!) === window.first)).toBe(true);

				yield* page.click("#lock");
				yield* page.waitForFunction(() => window.first!.state.readOnly);
				expect(yield* page.evaluate(() => window.EditorView.findFromDOM(document.querySelector<HTMLElement>(".cm-editor")!) === window.first)).toBe(true);

				yield* page.click("#hide");
				yield* page.waitForFunction(() => document.querySelector("#hidden") !== null);
				// destroy() takes the editor's DOM out of its parent; a view left alive would still sit in the removed div.
				expect(yield* page.evaluate(() => window.first!.dom.parentNode === null && document.querySelector(".cm-editor") === null)).toBe(true);
				expect(errors).toStrictEqual([]);
			}),
		),
	);
});
