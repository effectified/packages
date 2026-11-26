// A media-chrome player in an Effect UI component: <media-controller> around a muted <video> and a control bar of
// play button, mute button, time range and time display. media-chrome's controls drive the video; the video's own
// media events bring its state into the Model as messages.
import { Mount, UiSchema } from "@effect/ui";
import { BrowserHost, Html } from "@effect/ui/html";
import { Effect, Layer, Queue, Schema, Stream } from "effect";
import { ControlBar, Controller, MuteButton, PlayButton, TimeDisplay, TimeRange } from "../../src/index.ts";

/** The video's state as one of its media events reports it. */
interface MediaState {
	readonly event: string;
	readonly paused: boolean;
	readonly muted: boolean;
	readonly time: number;
}

// Effect UI types no media event on `h.video` (`play`, `pause`, `volumechange`, `seeked` are not in Html.Events),
// and <media-controller>'s own state events (`mediapaused`, `mediamuted`) are in no manifest the binding is generated
// from, so the player listens on the video, as an app would.
const MEDIA_EVENTS = ["play", "pause", "volumechange", "seeked"] as const;

const MediaEvents = Mount.makeStream("MediaEvents", { args: {} }, (video: HTMLVideoElement) =>
	Stream.callback<MediaState>((queue) =>
		Effect.acquireRelease(
			Effect.sync(() => {
				// Chrome mutes a video for its `muted` attribute only when the HTML parser creates it; Effect UI creates
				// it with createElement, where the attribute sets `defaultMuted` alone, and `h.video` sets no `muted`.
				video.muted = video.defaultMuted;
				const listener = (event: Event) => {
					Queue.offerUnsafe(queue, { event: event.type, paused: video.paused, muted: video.muted, time: video.currentTime });
				};
				for (const name of MEDIA_EVENTS) video.addEventListener(name, listener);
				return listener;
			}),
			(listener) =>
				Effect.sync(() => {
					for (const name of MEDIA_EVENTS) video.removeEventListener(name, listener);
				}),
		),
	),
);

const Message = UiSchema.TaggedEnum({
	ChangedMedia: { event: Schema.String, paused: Schema.Boolean, muted: Schema.Boolean, time: Schema.Number },
});

const Player = Html.component({
	name: "Player",
	model: Schema.Struct({ paused: Schema.Boolean, muted: Schema.Boolean, seekedTo: Schema.Number, events: Schema.Array(Schema.String) }),
	message: Message,
}).make({
	init: () => ({ paused: true, muted: true, seekedTo: 0, events: [] }),
	update: {
		ChangedMedia: ($, { event, paused, muted, time }) =>
			$.evolve({
				paused: () => paused,
				muted: () => muted,
				seekedTo: (seekedTo) => (event === "seeked" ? time : seekedTo),
				events: (events) => [...events, event],
			}),
	},
	view: (h, model) =>
		h.div.children(
			Controller(h)
				.id("controller")
				// The clip is 16x16: sized by it, the controller would leave its control bar outside its own box.
				.style({ width: "480px", height: "270px" })
				.children(
					// A 2-second, 16x16 VP8 and Opus clip of 3.5 KB (ffmpeg's testsrc and a sine), committed next to this file;
					// looped, so it cannot end, and pause itself, between a test's play and pause.
					h.video
						.id("video")
						.attr("slot", "media")
						.attr("src", "./player.webm")
						.attr("muted", "")
						.attr("loop", "")
						.attr("preload", "auto")
						.onMount(MediaEvents({}).pipe(Mount.map((media) => Message.ChangedMedia(media)))),
					ControlBar(h).children(
						PlayButton(h).id("play"),
						MuteButton(h).id("mute"),
						TimeRange(h).id("range"),
						TimeDisplay(h).id("time").showDuration(true),
					),
				),
			h.output.id("state").children(JSON.stringify(model)),
		),
});

Layer.launch(BrowserHost.mount(Player, {}, document.getElementById("root")!)).pipe(Effect.runFork);
