// A Chart.js chart driven by Effect UI in Chrome: the Model's data draws the chart, a new value updates the same
// chart in place, a click on a bar arrives as a message, and removing the canvas destroys the chart.
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { chrome, fixture } from "./support/browser.ts";

describe.skipIf(chrome === undefined)("a Chart.js chart in Effect UI", () => {
	it.effect("draws, updates in place, reports clicks and is destroyed with its canvas", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const { page, errors } = yield* fixture("chart");
				yield* page.waitForFunction(() => window.Chart?.getChart("chart") !== undefined);
				const first = Number(yield* page.evaluate(() => window.Chart.getChart("chart")?.id));

				yield* page.click("#add");
				yield* page.waitForFunction(() => window.Chart.getChart("chart")?.data.datasets[0]?.data.length === 4);
				// The same chart, updated: the mount gave it the new data instead of creating another.
				expect(Number(yield* page.evaluate(() => window.Chart.getChart("chart")?.id))).toBe(first);

				// Where bar #2 is drawn, in page coordinates, read from the chart itself.
				const point: { readonly x: number; readonly y: number } = JSON.parse(
					String(
						yield* page.evaluate(() => {
							const chart = window.Chart.getChart("chart");
							const bar = chart?.getDatasetMeta(0).data[2];
							const box = chart?.canvas.getBoundingClientRect();
							return JSON.stringify({ x: (box?.left ?? 0) + (bar?.x ?? 0), y: (box?.top ?? 0) + ((bar?.y ?? 0) + chart!.chartArea.bottom) / 2 });
						}),
					),
				);
				yield* page.mouse.click(point.x, point.y);
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"clicked":2') === true);

				yield* page.click("#hide");
				yield* page.waitForFunction(() => document.querySelector("#hidden") !== null);
				expect(Number(yield* page.evaluate(() => Object.keys(window.Chart.instances).length))).toBe(0);
				expect(errors).toStrictEqual([]);
			}),
		),
	);
});
