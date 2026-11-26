// A MapLibre GL map driven by Effect UI in Chrome: the map loads its local style, a camera set from the Model moves
// the same map, a drag and a wheel zoom land their camera in the Model, a click reports where it hit, and removing the
// div removes the map.
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { chrome, fixture } from "./support/browser.ts";

/** The fixture's Model, as it prints it. */
interface State {
	readonly center: readonly [number, number];
	readonly zoom: number;
	readonly clicked: readonly [number, number] | null;
	readonly shown: boolean;
}

/** The map's camera, read from the map itself. */
interface Camera {
	readonly center: readonly [number, number];
	readonly zoom: number;
}

const readState = (page: { evaluate: (f: () => string | undefined) => Effect.Effect<unknown, unknown> }) =>
	Effect.map(page.evaluate(() => document.querySelector("#state")?.textContent ?? undefined), (text): State => JSON.parse(String(text)));

const readCamera = (page: { evaluate: (f: () => string) => Effect.Effect<unknown, unknown> }) =>
	Effect.map(
		page.evaluate(() => {
			const [map] = window.maps;
			return JSON.stringify({ center: map?.getCenter().toArray(), zoom: map?.getZoom() });
		}),
		(text): Camera => JSON.parse(String(text)),
	);

describe.skipIf(chrome === undefined)("a MapLibre GL map in Effect UI", () => {
	it.effect("loads, follows the Model's camera, reports moves and clicks, and is removed with its div", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const { page, errors } = yield* fixture("map");
				yield* page.waitForFunction(() => [...window.maps].some((map) => map.loaded()), { timeout: 20_000 });
				expect(Number(yield* page.evaluate(() => window.maps.size))).toBe(1);

				// The Model sets the camera: the map jumps there, and is still the one map the mount created.
				yield* page.click("#jump");
				yield* page.waitForFunction(() => {
					const [map] = window.maps;
					return map !== undefined && Math.abs(map.getCenter().lng - 10) < 1e-9 && Math.abs(map.getCenter().lat - 20) < 1e-9 && map.getZoom() === 4;
				});
				expect(Number(yield* page.evaluate(() => window.maps.size))).toBe(1);
				expect(Boolean(yield* page.evaluate(() => document.querySelectorAll("#map canvas.maplibregl-canvas").length === 1))).toBe(true);

				const box: { readonly x: number; readonly y: number; readonly width: number; readonly height: number } = JSON.parse(
					String(
						yield* page.evaluate(() => {
							const rect = document.querySelector("#map canvas")!.getBoundingClientRect();
							return JSON.stringify({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
						}),
					),
				);
				const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

				// A drag pans the map; when it settles, its `moveend` camera is the Model's.
				yield* page.mouse.move(middle.x, middle.y);
				yield* page.mouse.down();
				for (let step = 1; step <= 10; step++) yield* page.mouse.move(middle.x - step * 10, middle.y + step * 5);
				yield* page.mouse.up();
				yield* page.waitForFunction(() => {
					const [map] = window.maps;
					const state = JSON.parse(document.querySelector("#state")?.textContent ?? "{}");
					const center = map?.getCenter();
					return map !== undefined && !map.isMoving() && center !== undefined && center.lng > 10 && state.center[0] === center.lng && state.center[1] === center.lat;
				});
				const dragged = yield* readCamera(page);
				expect(dragged.zoom).toBe(4);
				expect(yield* readState(page)).toMatchObject({ center: dragged.center, zoom: dragged.zoom });

				// A wheel zoom: the Model gets the new zoom when the map settles.
				yield* page.mouse.move(middle.x, middle.y);
				yield* page.mouse.wheel({ deltaY: -300 });
				yield* page.waitForFunction(() => {
					const [map] = window.maps;
					const state = JSON.parse(document.querySelector("#state")?.textContent ?? "{}");
					return map !== undefined && !map.isMoving() && map.getZoom() > 4 && state.zoom === map.getZoom();
				});
				const zoomed = yield* readCamera(page);
				expect(yield* readState(page)).toMatchObject({ center: zoomed.center, zoom: zoomed.zoom });

				// A click reports the point under it, as the map itself unprojects it.
				const target = { x: box.x + box.width / 4, y: box.y + box.height / 3 };
				const expected: readonly [number, number] = JSON.parse(
					String(
						yield* page.evaluate(
							(x, y) => {
								const [map] = window.maps;
								return JSON.stringify(map?.unproject([x, y]).toArray());
							},
							target.x - box.x,
							target.y - box.y,
						),
					),
				);
				yield* page.mouse.click(target.x, target.y);
				yield* page.waitForFunction(() => JSON.parse(document.querySelector("#state")?.textContent ?? "{}").clicked !== null);
				const clicked = (yield* readState(page)).clicked;
				expect(clicked?.[0]).toBeCloseTo(expected[0], 9);
				expect(clicked?.[1]).toBeCloseTo(expected[1], 9);

				// Hiding the div removes the map: its canvas is gone from the page.
				yield* page.click("#hide");
				yield* page.waitForFunction(() => document.querySelector("#hidden") !== null);
				expect(Number(yield* page.evaluate(() => document.querySelectorAll("canvas.maplibregl-canvas").length))).toBe(0);
				expect(Boolean(yield* page.evaluate(() => [...window.maps].every((map) => !map.getCanvas().isConnected)))).toBe(true);
				expect(errors).toStrictEqual([]);
			}),
		),
	);
});
