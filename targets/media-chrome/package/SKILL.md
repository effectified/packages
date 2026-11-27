---
name: effectified-media-chrome
description: Use media-chrome in Effect UI apps through @effectified/media-chrome. Use when an Effect UI view renders media-chrome: what the facade offers, how its bindings and mounts work, and tested examples.
---

# media-chrome through @effectified/media-chrome

47 player elements, play, mute and seek.

media-chrome for Effect UI: typed bindings and mounts, its events as messages, its instances scoped to their elements. Generated from media-chrome's own types (this copy: 4.19.5+4, for media-chrome 4.19.5), so its types are upstream's and a call the facade does not change behaves as upstream documents.

## Install

```sh
pnpm add https://effectified.dev/media-chrome.tgz effect https://pkg.pr.new/Effect-TS/ui/@effect/ui@2fd1a57
```

## Rules

- Import from `@effectified/media-chrome`. It runs in [Effect UI](https://ui.effect.website) views (`Html.component`), installed from its snapshot build.
- Elements are bindings: `AirplayButton(h)` renders `<media-airplay-button>`; set its properties as methods (`AirplayButton(h).disabled(...)`) and turn its custom events into messages with `.on("<event>", (detail) => Message.X(...))`. Importing a binding defines its element.
- Form controls report their state through their changes mount, not native `input`/`change` (Effect UI types those `never` on custom elements): `AudioTrackMenu(h).onMount(AudioTrackMenuChanges({}).pipe(Mount.map((state) => Message.X(state))))`, with `value`.
- Set the Model from the event that says a change is done (an element that animates closed fires a request event, then a completion event): setting it on the request asks again.
- Never reach into the element or instance to change what the Model owns: render the Model, and let messages change it.

## Examples

Each is code from a test that passes in CI.

### A player whose media state comes back as messages

```ts
import { Mount, UiSchema } from "@effect/ui";
import { BrowserHost, Html } from "@effect/ui/html";
import { Effect, Layer, Queue, Schema, Stream } from "effect";
import { ControlBar, Controller, MuteButton, PlayButton, TimeDisplay, TimeRange } from "@effectified/media-chrome";

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
```

From `test/fixtures/player.ts`.

## API

| Error | From | Reasons |
|---|---|---|
| `MediaChromeError` | any other failure | – |

| Handle | Effects | Of an `Option` | Streams | Events | Released by |
|---|---|---|---|---|---|
| `MediaAirplayButton` | – | – | – | – | – |
| `MediaCaptionsButton` | – | – | – | – | – |
| `MediaCastButton` | – | – | – | – | – |
| `MediaChromeButton` | – | – | – | – | – |
| `MediaChromeDialog` | – | – | – | – | – |
| `MediaChromeRange` | – | – | – | – | – |
| `MediaControlBar` | – | – | – | – | – |
| `MediaController` | `handleMediaUpdated` | – | – | – | – |
| `MediaDurationDisplay` | – | – | – | – | – |
| `MediaErrorDialog` | – | – | – | – | – |
| `MediaKeyboardShortcutsDialog` | – | – | – | – | – |
| `MediaFullscreenButton` | – | – | – | – | – |
| `MediaGestureReceiver` | – | – | – | – | – |
| `MediaLiveButton` | – | – | – | – | – |
| `MediaLoadingIndicator` | – | – | – | – | – |
| `MediaMuteButton` | – | – | – | – | – |
| `MediaPipButton` | – | – | – | – | – |
| `MediaPlaybackRateButton` | – | – | – | – | – |
| `MediaLoopButton` | – | – | – | – | – |
| `MediaPlayButton` | – | – | – | – | – |
| `MediaPosterImage` | – | – | – | – | – |
| `MediaPreviewChapterDisplay` | – | – | – | – | – |
| `MediaPreviewThumbnail` | – | – | – | – | – |
| `MediaPreviewTimeDisplay` | – | – | – | – | – |
| `MediaSeekBackwardButton` | – | – | – | – | – |
| `MediaSeekForwardButton` | – | – | – | – | – |
| `MediaTimeDisplay` | – | – | – | – | – |
| `MediaTimeRange` | – | – | – | – | – |
| `MediaTooltip` | – | – | – | – | – |
| `MediaVolumeRange` | – | – | – | – | – |
| `MediaContainer` | `handleMediaUpdated` | – | – | – | – |
| `MediaTextDisplay` | – | – | – | – | – |

| Element | Binding | Properties | Events |
|---|---|---|---|
| `<media-airplay-button>` | `AirplayButton` | `disabled`, `mediaAirplayUnavailable`, `mediaController`, `mediaIsAirplaying`, `noTooltip`, `preventClick`, `tooltipPlacement` | `mediaairplayrequest` |
| `<media-audio-track-menu>` | `AudioTrackMenu`, `AudioTrackMenuChanges` | `anchor`, `mediaAudioTrackEnabled`, `mediaAudioTrackList`, `value` | – |
| `<media-audio-track-menu-button>` | `AudioTrackMenuButton` | `disabled`, `invokeTarget`, `mediaAudioTrackEnabled`, `mediaController`, `noTooltip`, `preventClick`, `tooltipPlacement` | – |
| `<media-captions-button>` | `CaptionsButton` | `disabled`, `mediaController`, `mediaSubtitlesList`, `mediaSubtitlesShowing`, `noTooltip`, `preventClick`, `tooltipPlacement` | – |
| `<media-captions-menu>` | `CaptionsMenu`, `CaptionsMenuChanges` | `anchor`, `mediaSubtitlesList`, `mediaSubtitlesShowing`, `value` | – |
| `<media-captions-menu-button>` | `CaptionsMenuButton` | `disabled`, `invokeTarget`, `mediaController`, `mediaSubtitlesList`, `mediaSubtitlesShowing`, `noTooltip`, `preventClick`, `tooltipPlacement` | – |
| `<media-cast-button>` | `CastButton` | `disabled`, `mediaCastUnavailable`, `mediaController`, `mediaIsCasting`, `noTooltip`, `preventClick`, `tooltipPlacement` | `eventName` |
| `<media-chrome-button>` | `ChromeButton` | `disabled`, `mediaController`, `noTooltip`, `preventClick`, `tooltipPlacement` | – |
| `<media-chrome-dialog>` | `ChromeDialog` | `open` | `open` |
| `<media-chrome-menu>` | `ChromeMenu`, `ChromeMenuChanges` | `anchor`, `value` | – |
| `<media-chrome-menu-button>` | `ChromeMenuButton` | `disabled`, `invokeTarget`, `mediaController`, `noTooltip`, `preventClick`, `tooltipPlacement` | – |
| `<media-chrome-menu-item>` | `ChromeMenuItem` | `checked`, `invokeTarget`, `type`, `value` | – |
| `<media-chrome-range>` | `ChromeRange` | – | – |
| `<media-context-menu>` | `ContextMenu`, `ContextMenuChanges` | `anchor`, `value` | – |
| `<media-context-menu-item>` | `ContextMenuItem` | `checked`, `invokeTarget`, `type`, `value` | – |
| `<media-control-bar>` | `ControlBar` | – | – |
| `<media-controller>` | `Controller` | `audio`, `autohide`, `autohideOverControls`, `breakpoints`, `defaultDuration`, `defaultStreamType`, `defaultSubtitles`, `gesturesDisabled`, `hotkeys`, `keyboardControl`, `keysUsed`, `liveEdgeOffset`, `mediaStore`, `noAutoSeekToLive`, `noAutohide`, `noDefaultStore`, `noHotkeys`, `noMutedPref`, `noSubtitlesLangPref`, `noVolumePref` | `eventName` |
| `<media-duration-display>` | `DurationDisplay` | `mediaDuration` | – |
| `<media-error-dialog>` | `ErrorDialog` | `mediaError`, `mediaErrorCode`, `mediaErrorMessage`, `open` | `open` |
| `<media-fullscreen-button>` | `FullscreenButton` | `disabled`, `mediaController`, `mediaFullscreenUnavailable`, `mediaIsFullscreen`, `noTooltip`, `preventClick`, `tooltipPlacement` | – |
| `<media-gesture-receiver>` | `GestureReceiver` | `mediaPaused` | `eventName` |
| `<media-live-button>` | `LiveButton` | `disabled`, `mediaController`, `mediaPaused`, `mediaTimeIsLive`, `noTooltip`, `preventClick`, `tooltipPlacement` | `MEDIA_PLAY_REQUEST`, `MEDIA_SEEK_TO_LIVE_REQUEST` |
| `<media-loading-indicator>` | `LoadingIndicator` | `loadingDelay`, `mediaController`, `mediaLoading`, `mediaPaused`, `noAutohide` | – |
| `<media-loop-button>` | `LoopButton` | `disabled`, `mediaController`, `mediaLoop`, `noTooltip`, `preventClick`, `tooltipPlacement` | – |
| `<media-mute-button>` | `MuteButton` | `disabled`, `mediaController`, `mediaVolumeLevel`, `noTooltip`, `preventClick`, `tooltipPlacement` | `eventName` |
| `<media-pip-button>` | `PipButton` | `disabled`, `mediaController`, `mediaIsPip`, `mediaPipUnavailable`, `noTooltip`, `preventClick`, `tooltipPlacement` | `eventName` |
| `<media-play-button>` | `PlayButton` | `disabled`, `mediaController`, `mediaPaused`, `noTooltip`, `preventClick`, `tooltipPlacement` | `eventName` |
| `<media-playback-rate-button>` | `PlaybackRateButton` | `disabled`, `mediaController`, `mediaPlaybackRate`, `noTooltip`, `preventClick`, `rates`, `tooltipPlacement` | – |
| `<media-playback-rate-menu>` | `PlaybackRateMenu`, `PlaybackRateMenuChanges` | `anchor`, `mediaPlaybackRate`, `rates`, `value` | – |
| `<media-playback-rate-menu-button>` | `PlaybackRateMenuButton` | `disabled`, `invokeTarget`, `mediaController`, `mediaPlaybackRate`, `noTooltip`, `preventClick`, `tooltipPlacement` | – |
| `<media-poster-image>` | `PosterImage` | `placeholderSrc`, `src` | – |
| `<media-preview-chapter-display>` | `PreviewChapterDisplay` | `mediaPreviewChapter` | – |
| `<media-preview-thumbnail>` | `PreviewThumbnail` | `imgHeight`, `imgWidth`, `mediaPreviewCoords`, `mediaPreviewImage` | – |
| `<media-preview-time-display>` | `PreviewTimeDisplay` | `mediaPreviewTime` | – |
| `<media-rendition-menu>` | `RenditionMenu`, `RenditionMenuChanges` | `anchor`, `mediaHeight`, `mediaRenditionList`, `mediaRenditionSelected`, `mediaWidth`, `value` | – |
| `<media-rendition-menu-button>` | `RenditionMenuButton` | `disabled`, `invokeTarget`, `mediaController`, `mediaHeight`, `mediaRenditionSelected`, `noTooltip`, `preventClick`, `tooltipPlacement` | – |
| `<media-seek-backward-button>` | `SeekBackwardButton` | `disabled`, `mediaController`, `mediaCurrentTime`, `noTooltip`, `preventClick`, `seekOffset`, `tooltipPlacement` | – |
| `<media-seek-forward-button>` | `SeekForwardButton` | `disabled`, `mediaController`, `mediaCurrentTime`, `noTooltip`, `preventClick`, `seekOffset`, `tooltipPlacement` | – |
| `<media-settings-menu>` | `SettingsMenu`, `SettingsMenuChanges` | `anchor`, `value` | – |
| `<media-settings-menu-button>` | `SettingsMenuButton` | `disabled`, `invokeTarget`, `mediaController`, `noTooltip`, `preventClick`, `tooltipPlacement` | – |
| `<media-settings-menu-item>` | `SettingsMenuItem` | `checked`, `invokeTarget`, `type`, `value` | – |
| `<media-text-display>` | `TextDisplay` | – | – |
| `<media-theme>` | `Theme` | `renderer` | – |
| `<media-time-display>` | `TimeDisplay` | `mediaCurrentTime`, `mediaDuration`, `mediaSeekable`, `noToggle`, `remaining`, `showDuration` | – |
| `<media-time-range>` | `TimeRange` | `mediaBuffered`, `mediaChaptersCues`, `mediaCurrentTime`, `mediaDuration`, `mediaEnded`, `mediaLoading`, `mediaPaused`, `mediaPlaybackRate`, `mediaPreviewImage`, `mediaPreviewTime`, `mediaSeekable` | – |
| `<media-tooltip>` | `Tooltip` | `bounds`, `placement`, `updateXOffset` | – |
| `<media-volume-range>` | `VolumeRange` | `mediaMuted`, `mediaVolume`, `mediaVolumeUnavailable` | – |

More: https://effectified.dev/media-chrome
