// A media-chrome player driven by Effect UI in Chrome: a click on the play button plays and pauses the video, the
// mute button mutes and unmutes it, and a click on the time range seeks it, each change reaching the Model as a
// message from the video's media events, and the controller handing the new state back to its controls.
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { chrome, fixture } from "./support/browser.ts";

/** The page, as far as these helpers read it. */
interface Page {
	readonly evaluate: (f: () => string | undefined) => Effect.Effect<unknown, unknown>;
}

/** The player's Model, as its fixture prints it. */
const model = (page: Page) =>
	Effect.map(page.evaluate(() => document.querySelector("#state")?.textContent ?? undefined), (text) => JSON.parse(String(text)));

/** What the user sees: the video's own state, and the state the controller handed to its controls. */
const seen = (page: Page) =>
	Effect.map(
		page.evaluate(() => {
			const video = document.querySelector("video")!;
			return JSON.stringify({
				paused: video.paused,
				muted: video.muted,
				time: video.currentTime,
				playButtonPaused: document.querySelector("#play")!.hasAttribute("mediapaused"),
				muteButtonLevel: document.querySelector("#mute")!.getAttribute("mediavolumelevel"),
				// The display separates its times with non-breaking spaces.
				timeDisplay: document.querySelector("#time")!.shadowRoot?.querySelector("slot")?.textContent?.replace(/\s+/g, " ").trim(),
			});
		}),
		(text) => JSON.parse(String(text)),
	);

describe.skipIf(chrome === undefined)("a media-chrome player in Effect UI", () => {
	it.effect("plays, pauses, unmutes, mutes and seeks the video through its controls", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const { page, errors } = yield* fixture("player");
				// The controller has the video's metadata once the time display shows the clip's duration.
				yield* page.waitForFunction(() => document.querySelector("#time")?.shadowRoot?.querySelector("slot")?.textContent?.includes("0:02") === true);
				expect(yield* seen(page)).toMatchObject({ paused: true, muted: true, playButtonPaused: true, muteButtonLevel: "off", timeDisplay: "0:00 / 0:02" });

				yield* page.click("#play");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"paused":false') === true);
				yield* page.waitForFunction(() => document.querySelector("video")!.currentTime > 0.5);
				expect(yield* seen(page)).toMatchObject({ paused: false, playButtonPaused: false });

				yield* page.click("#play");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"paused":true') === true);
				expect(yield* seen(page)).toMatchObject({ paused: true, playButtonPaused: true });

				// Muted by its `muted` attribute, the video is unmuted by the first click and muted again by the second.
				yield* page.click("#mute");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"muted":false') === true);
				expect(yield* seen(page)).toMatchObject({ muted: false, muteButtonLevel: "high" });
				yield* page.click("#mute");
				yield* page.waitForFunction(() => document.querySelector("#state")?.textContent?.includes('"muted":true') === true);
				expect(yield* seen(page)).toMatchObject({ muted: true, muteButtonLevel: "off" });

				// Three quarters along the time range, where the user clicks to jump to about 1.5 s of the 2 s clip.
				const point: { readonly x: number; readonly y: number } = JSON.parse(
					String(
						yield* page.evaluate(() => {
							const box = document.querySelector("#range")!.getBoundingClientRect();
							return JSON.stringify({ x: box.left + box.width * 0.75, y: box.top + box.height / 2 });
						}),
					),
				);
				yield* page.mouse.click(point.x, point.y);
				// Past 1 s: the looping clip also reports `seeked` each time it wraps to 0.
				yield* page.waitForFunction(() => JSON.parse(document.querySelector("#state")?.textContent ?? "{}").seekedTo > 1);
				const after = yield* model(page);
				expect(after).toMatchObject({ paused: true, muted: true });
				expect(after.seekedTo).toBeGreaterThan(1);
				expect(after.seekedTo).toBeLessThan(2);
				yield* page.waitForFunction(() => document.querySelector("#time")?.shadowRoot?.querySelector("slot")?.textContent?.startsWith("0:01") === true);
				expect(after.events).toStrictEqual(expect.arrayContaining(["play", "pause", "volumechange", "seeked"]));
				expect(errors).toStrictEqual([]);
			}),
		),
	);
});
