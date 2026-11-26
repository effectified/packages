// Motion driven by Effect UI in Chrome: a box animates to the Model's target and reports it finished, a new target
// mid-animation continues from where the box is and only that last animation reports, a section reports entering
// and leaving the viewport (its observer removed with it), and removing the box stops its animation.
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { chrome, fixture } from "./support/browser.ts";

declare global {
	interface Window {
		/** The box's x on each frame, recorded by the retarget test. */
		samples: Array<number>;
		/** The box, kept after the view removed it. */
		detached: HTMLElement | null;
		/** The box's Web Animations, kept from before the view removed it. */
		held: Array<Animation>;
		/** How many IntersectionObservers were disconnected since the test began counting. */
		disconnects: number;
	}
}

/** The fixture's Model, as it prints it. */
interface Model {
	readonly arrivals: ReadonlyArray<number>;
	readonly views: ReadonlyArray<boolean>;
}

/** The page the fixture opens, as these tests use it. */
type Page = Effect.Success<ReturnType<typeof fixture>>["page"];

const state = (page: Page) =>
	Effect.map(page.evaluate(() => document.querySelector("#state")?.textContent ?? ""), (text): Model => JSON.parse(String(text)));

/** Waits until the Model has recorded these arrivals. */
const arrived = (page: Page, arrivals: ReadonlyArray<number>) =>
	page.waitForFunction((expected) => document.querySelector("#state")?.textContent?.includes(`"arrivals":${expected}`) === true, {}, JSON.stringify(arrivals));

/** Waits until the box is past `x`, mid-animation. */
const past = (page: Page, x: number) =>
	page.waitForFunction((x) => new DOMMatrix(getComputedStyle(document.querySelector("#box")!).transform).m41 > x, {}, x);

/** Waits until the page's clock is `ms` later than now. */
const elapse = (page: Page, ms: number) =>
	Effect.flatMap(page.evaluate((ms) => performance.now() + ms, ms), (until) => page.waitForFunction((until) => performance.now() > until, {}, Number(until)));

describe.skipIf(chrome === undefined)("Motion in Effect UI", () => {
	it.effect("animates the box to the Model's target and reports it finished", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const { page, errors } = yield* fixture("animate");
				yield* arrived(page, [100]);
				const style: { readonly x: number; readonly opacity: number } = JSON.parse(
					String(
						yield* page.evaluate(() => {
							const computed = getComputedStyle(document.querySelector("#box")!);
							return JSON.stringify({ x: new DOMMatrix(computed.transform).m41, opacity: Number(computed.opacity) });
						}),
					),
				);
				expect(style).toStrictEqual({ x: 100, opacity: 0.5 });
				expect((yield* state(page)).arrivals).toStrictEqual([100]);
				// One animation: neither the mount's start nor the re-render its message caused started another.
				expect(yield* page.evaluate(() => window.plays)).toBe(1);
				expect(errors).toStrictEqual([]);
			}),
		),
	);

	it.effect("continues from where the box is to a new target, and only the last animation finishes", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const { page, errors } = yield* fixture("animate");
				yield* arrived(page, [100]);
				yield* page.evaluate(() => {
					window.samples = [];
					const sample = () => {
						const box = document.querySelector("#box");
						if (box !== null) window.samples.push(new DOMMatrix(getComputedStyle(box).transform).m41);
						requestAnimationFrame(sample);
					};
					requestAnimationFrame(sample);
				});

				// Far: 100 -> 300 over 1.5 s. Halfway there, back: -> 0 over 0.4 s.
				yield* page.click("#far");
				yield* past(page, 150);
				yield* page.click("#back");
				yield* arrived(page, [100, 0]);
				// Past the moment the far animation would have ended, had it not been interrupted.
				yield* elapse(page, 1500);

				const samples: ReadonlyArray<number> = JSON.parse(String(yield* page.evaluate(() => JSON.stringify(window.samples))));
				const peak = Math.max(...samples);
				// It turned back between where it was and the far target: neither finished far nor restarted from 100.
				expect(peak).toBeGreaterThan(150);
				expect(peak).toBeLessThan(300);
				// No snap: every frame is a small step from the one before.
				expect(Math.max(...samples.slice(1).map((x, index) => Math.abs(x - (samples[index] ?? x))))).toBeLessThan(40);
				expect(samples.at(-1)).toBe(0);
				expect((yield* state(page)).arrivals).toStrictEqual([100, 0]);
				// The first, far and back: each new target animated once.
				expect(yield* page.evaluate(() => window.plays)).toBe(3);
				expect(errors).toStrictEqual([]);
			}),
		),
	);

	it.effect("reports the section entering and leaving the viewport, and removes its observer with it", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const { page, errors } = yield* fixture("animate");
				yield* arrived(page, [100]);
				expect((yield* state(page)).views).toStrictEqual([]);

				yield* page.mouse.wheel({ deltaY: 2100 });
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"views":[true]') === true);
				yield* page.mouse.wheel({ deltaY: -2100 });
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"views":[true,false]') === true);

				expect((yield* state(page)).views).toStrictEqual([true, false]);

				// A spy on the browser's observer, not on Motion: Motion's inView disconnects the observer it made.
				yield* page.evaluate(() => {
					window.disconnects = 0;
					const disconnect = IntersectionObserver.prototype.disconnect;
					IntersectionObserver.prototype.disconnect = function (this: IntersectionObserver) {
						window.disconnects += 1;
						disconnect.call(this);
					};
				});
				yield* page.click("#drop");
				yield* page.waitForFunction(() => document.querySelector("#dropped") !== null);
				yield* page.waitForFunction(() => window.disconnects === 1);
				expect(errors).toStrictEqual([]);
			}),
		),
	);

	it.effect("stops the box's animation when the view removes it", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const { page, errors } = yield* fixture("animate");
				yield* arrived(page, [100]);
				yield* page.click("#far");
				yield* past(page, 150);
				yield* page.evaluate(() => {
					window.detached = document.querySelector("#box");
					window.held = window.detached?.getAnimations() ?? [];
				});
				yield* page.click("#hide");
				yield* page.waitForFunction(() => document.querySelector("#hidden") !== null);

				// The far animation's Web Animations (x and opacity), and the styles Motion left on the removed box.
				const read = page.evaluate(() =>
					JSON.stringify({
						states: window.held.map((animation) => animation.playState),
						x: new DOMMatrix(window.detached?.style.transform).m41,
						opacity: window.detached?.style.opacity,
					}),
				);
				const stopped: { readonly states: ReadonlyArray<string>; readonly x: number } = JSON.parse(String(yield* read));
				// Cancelled, not running on: stopped where it was, between the first target and the far one.
				expect(stopped.states).toStrictEqual(["idle", "idle"]);
				expect(stopped.x).toBeGreaterThan(150);
				expect(stopped.x).toBeLessThan(300);
				yield* elapse(page, 300);
				expect(JSON.parse(String(yield* read))).toStrictEqual(stopped);
				// Stopped is not finished: the far animation never reported.
				expect((yield* state(page)).arrivals).toStrictEqual([100]);
				expect(errors).toStrictEqual([]);
			}),
		),
	);
});
