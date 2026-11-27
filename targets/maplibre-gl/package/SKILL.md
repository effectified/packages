---
name: effectified-maplibre-gl
description: Use maplibre-gl in Effect UI apps through @effectified/maplibre-gl. Use when an Effect UI view renders maplibre-gl: what the facade offers, how its bindings and mounts work, and tested examples.
---

# maplibre-gl through @effectified/maplibre-gl

A WebGL map whose camera is the Model.

maplibre-gl for Effect UI: typed bindings and mounts, its events as messages, its instances scoped to their elements. Generated from maplibre-gl's own types (this copy: 6.19.4, for maplibre-gl 6.19.0), so its types are upstream's and a call the facade does not change behaves as upstream documents.

## Install

```sh
pnpm add @effectified/maplibre-gl effect https://pkg.pr.new/Effect-TS/ui/@effect/ui@2fd1a57
```

## Rules

- Import from `@effectified/maplibre-gl`. It runs in [Effect UI](https://ui.effect.website) views (`Html.component`), installed from its snapshot build.
- Mounts: `MapMount`. A mount keeps one maplibre-gl instance on the element it renders into: `h.<tag>.onMount(<Name>Mount({ ...args }).pipe(Mount.map(...)))`. New args update the live instance; leaving the view releases it.
- Never reach into the element or instance to change what the Model owns: render the Model, and let messages change it.

## Examples

Each is code from a test that passes in CI.

### A map whose camera is the Model

```ts
import "maplibre-gl/dist/maplibre-gl.css";
import { Mount, UiSchema } from "@effect/ui";
import { BrowserHost, Html } from "@effect/ui/html";
import { Effect, Layer, Schema } from "effect";
import { type MapOptions, setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { MapMount } from "@effectified/maplibre-gl";

// MapLibre looks for its worker next to its own module, and Vite moves that module into its dependency cache: an app
// built with a bundler names the worker's URL, as this one does.
setWorkerUrl(workerUrl);

const style: NonNullable<MapOptions["style"]> = {
	version: 8,
	sources: {
		area: {
			type: "geojson",
			data: {
				type: "Feature",
				properties: {},
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[-10, -10],
							[10, -10],
							[10, 10],
							[-10, 10],
							[-10, -10],
						],
					],
				},
			},
		},
	},
	layers: [
		{ id: "background", type: "background", paint: { "background-color": "#dfe8f0" } },
		{ id: "area", type: "fill", source: "area", paint: { "fill-color": "#3a7bd5" } },
	],
};

const LngLat = Schema.Tuple([Schema.Number, Schema.Number]);

const Message = UiSchema.TaggedEnum({
	MovedMap: { center: LngLat, zoom: Schema.Number },
	ClickedMap: { lngLat: LngLat },
	ClickedJump: {},
	ClickedHide: {},
});

const Atlas = Html.component({
	name: "Atlas",
	model: Schema.Struct({ center: LngLat, zoom: Schema.Number, clicked: Schema.NullOr(LngLat), shown: Schema.Boolean }),
	message: Message,
}).make({
	init: () => ({ center: [0, 0] as const, zoom: 2, clicked: null, shown: true }),
	update: {
		MovedMap: ($, { center, zoom }) => $.evolve({ center: () => center, zoom: () => zoom }),
		ClickedMap: ($, { lngLat }) => $.evolve({ clicked: () => lngLat }),
		ClickedJump: ($) => $.evolve({ center: () => [10, 20] as const, zoom: () => 4 }),
		ClickedHide: ($) => $.evolve({ shown: () => false }),
	},
	view: (h, model) =>
		// The map comes first: the printed Model above it would grow with each camera and move it under the pointer.
		h.div.children(
			model.shown
				? h.div
						.id("map")
						.style({ width: "400px", height: "300px" })
						.onMount(
							// LngLatLike takes a mutable tuple, the Model holds a readonly one.
							MapMount({ style, center: [model.center[0], model.center[1]], zoom: model.zoom }).pipe(
								Mount.map((event) =>
									event.event === "moveend"
										? Message.MovedMap({ center: event.center, zoom: event.zoom })
										: Message.ClickedMap({ lngLat: event.lngLat }),
								),
							),
						)
				: h.p.id("hidden").children("hidden"),
			h.button.id("jump").on("click", Message.ClickedJump()).children("Jump"),
			h.button.id("hide").on("click", Message.ClickedHide()).children("Hide"),
			h.output.id("state").children(JSON.stringify(model)),
		),
});

Layer.launch(BrowserHost.mount(Atlas, {}, document.getElementById("root")!)).pipe(Effect.runFork);
```

From `test/fixtures/map.ts`.

## API

Services: `MaplibreGlMap$1` (a `Map$1`, from `Map`).

| Error | From | Reasons |
|---|---|---|
| `AJAXError` | `AJAXError` | – |
| `GPUInitializationError` | `GPUInitializationError` | – |
| `MaplibreGlError` | any other failure | – |

| Handle | Effects | Of an `Option` | Streams | Events | Released by |
|---|---|---|---|---|---|
| `Map$1` | `loadImage`, `once` | – | – | `boxzoomcancel`, `boxzoomend`, `boxzoomstart`, `click`, `contextmenu`, `cooperativegestureprevented`, `data`, `dataabort`, `dataloading`, `dblclick`, `drag`, `dragend`, `dragstart`, `error`, `idle`, `load`, `mousedown`, `mouseenter`, `mouseleave`, `mousemove`, `mouseout`, `mouseover`, `mouseup`, `move`, `moveend`, `movestart`, `pitch`, `pitchend`, `pitchstart`, `projectiontransition`, `remove`, `render`, `resize`, `roll`, `rollend`, `rollstart`, `rotate`, `rotateend`, `rotatestart`, `sourcedata`, `sourcedataabort`, `sourcedataloading`, `style.load`, `styledata`, `styledataloading`, `styleimagemissing`, `terrain`, `touchcancel`, `touchend`, `touchmove`, `touchstart`, `webglcontextlost`, `webglcontextrestored`, `wheel`, `zoom`, `zoomend`, `zoomstart` | `remove` |
| `LngLat` | – | – | – | – | – |
| `LngLatBounds` | – | – | – | – | – |
| `Point` | – | – | – | – | – |
| `Subscription` | – | – | – | – | – |
| `Terrain` | – | – | – | – | `destroy` |
| `Style` | `getDashes`, `getGlyphs`, `getImages`, `loadURL`, `once` | – | – | `boxzoomcancel`, `boxzoomend`, `boxzoomstart`, `click`, `contextmenu`, `cooperativegestureprevented`, `data`, `dataabort`, `dataloading`, `dblclick`, `drag`, `dragend`, `dragstart`, `error`, `idle`, `load`, `mousedown`, `mousemove`, `mouseout`, `mouseover`, `mouseup`, `move`, `moveend`, `movestart`, `pitch`, `pitchend`, `pitchstart`, `projectiontransition`, `remove`, `render`, `resize`, `roll`, `rollend`, `rollstart`, `rotate`, `rotateend`, `rotatestart`, `sourcedata`, `sourcedataabort`, `sourcedataloading`, `style.load`, `styledata`, `styledataloading`, `styleimagemissing`, `terrain`, `touchcancel`, `touchend`, `touchmove`, `touchstart`, `webglcontextlost`, `webglcontextrestored`, `wheel`, `zoom`, `zoomend`, `zoomstart` | `destroy` |
| `Painter` | – | – | – | – | `destroy` |
| `ScrollZoomHandler` | – | – | – | – | – |
| `BoxZoomHandler` | `once` | – | – | `boxzoomcancel`, `boxzoomend`, `boxzoomstart`, `click`, `contextmenu`, `cooperativegestureprevented`, `data`, `dataabort`, `dataloading`, `dblclick`, `drag`, `dragend`, `dragstart`, `error`, `idle`, `load`, `mousedown`, `mousemove`, `mouseout`, `mouseover`, `mouseup`, `move`, `moveend`, `movestart`, `pitch`, `pitchend`, `pitchstart`, `projectiontransition`, `remove`, `render`, `resize`, `roll`, `rollend`, `rollstart`, `rotate`, `rotateend`, `rotatestart`, `sourcedata`, `sourcedataabort`, `sourcedataloading`, `style.load`, `styledata`, `styledataloading`, `styleimagemissing`, `terrain`, `touchcancel`, `touchend`, `touchmove`, `touchstart`, `webglcontextlost`, `webglcontextrestored`, `wheel`, `zoom`, `zoomend`, `zoomstart` | – |
| `DragRotateHandler` | – | – | – | – | – |
| `DragPanHandler` | – | – | – | – | – |
| `KeyboardHandler` | – | – | – | – | – |
| `DoubleClickZoomHandler` | – | – | – | – | – |
| `TwoFingersTouchZoomRotateHandler` | – | – | – | – | – |
| `TwoFingersTouchPitchHandler` | – | – | – | – | – |
| `CooperativeGesturesHandler` | `once` | – | – | `boxzoomcancel`, `boxzoomend`, `boxzoomstart`, `click`, `contextmenu`, `cooperativegestureprevented`, `data`, `dataabort`, `dataloading`, `dblclick`, `drag`, `dragend`, `dragstart`, `error`, `idle`, `load`, `mousedown`, `mousemove`, `mouseout`, `mouseover`, `mouseup`, `move`, `moveend`, `movestart`, `pitch`, `pitchend`, `pitchstart`, `projectiontransition`, `remove`, `render`, `resize`, `roll`, `rollend`, `rollstart`, `rotate`, `rotateend`, `rotatestart`, `sourcedata`, `sourcedataabort`, `sourcedataloading`, `style.load`, `styledata`, `styledataloading`, `styleimagemissing`, `terrain`, `touchcancel`, `touchend`, `touchmove`, `touchstart`, `webglcontextlost`, `webglcontextrestored`, `wheel`, `zoom`, `zoomend`, `zoomstart` | – |
| `Framebuffer` | – | – | – | – | `destroy` |
| `Mesh` | – | – | – | – | `destroy` |
| `TerrainTileManager` | `once` | – | – | – | – |
| `TerrainCoverage` | – | – | – | – | – |
| `Dispatcher` | `broadcast`, `getActor`, `once`, `registerMessageHandler`, `unregisterMessageHandler`, `waitForInitComplete` | – | – | `error` | – |
| `ImageManager` | `getImages`, `once` | – | – | `error`, `styleimagemissing` | `destroy` |
| `PatternAtlas` | – | – | – | – | `destroy` |
| `GlyphManager` | `getGlyphs` | – | – | – | `destroy` |
| `LineAtlas` | – | – | – | – | – |
| `Light` | `once` | – | – | – | – |
| `Sky` | `once` | – | – | – | – |
| `ZoomHistory` | – | – | – | – | – |
| `CrossTileSymbolIndex` | – | – | – | – | – |
| `PauseablePlacement` | – | – | – | – | – |
| `Placement` | – | – | – | – | – |
| `Texture` | – | – | – | – | `destroy` |
| `Context` | – | – | – | – | `destroy` |
| `IRenderToTexture` | – | – | – | – | – |
| `VertexBuffer` | – | – | – | – | `destroy` |
| `SegmentVector` | – | – | – | – | `destroy` |
| `IndexBuffer` | – | – | – | – | `destroy` |
| `ProgramCache` | – | – | – | – | `destroy` |
| `ColorAttachment` | – | – | – | – | – |
| `DepthAttachment` | – | – | – | – | – |
| `Source` | `loadTile` | – | – | – | – |
| `Tile` | – | – | – | – | – |
| `TileManager` | `once` | – | – | `data`, `dataabort`, `dataloading`, `error` | – |
| `Actor` | `processTask`, `sendAsync` | – | – | – | – |
| `WorkerPool` | `acquire`, `once`, `release`, `restart`, `start` | – | – | `create`, `restart`, `terminate` | `release` |
| `RequestManager` | – | – | – | – | – |
| `FontFaceManager` | `getFontFamily` | `getFontFamily` | – | – | `destroy` |
| `PossiblyEvaluated` | – | – | – | – | – |
| `CrossTileIDs` | – | – | – | – | – |
| `CollisionIndex` | – | – | – | – | – |
| `CollisionGroups` | – | – | – | – | – |
| `ClearColor` | – | – | – | – | – |
| `ClearDepth` | – | – | – | – | – |
| `ClearStencil` | – | – | – | – | – |
| `ColorMask` | – | – | – | – | – |
| `DepthMask` | – | – | – | – | – |
| `StencilMask` | – | – | – | – | – |
| `StencilFunc` | – | – | – | – | – |
| `StencilOp` | – | – | – | – | – |
| `StencilTest` | – | – | – | – | – |
| `DepthRange` | – | – | – | – | – |
| `DepthTest` | – | – | – | – | – |
| `DepthFunc` | – | – | – | – | – |
| `Blend` | – | – | – | – | – |
| `BlendFunc` | – | – | – | – | – |
| `BlendColor` | – | – | – | – | – |
| `BlendEquation` | – | – | – | – | – |
| `CullFace` | – | – | – | – | – |
| `CullFaceSide` | – | – | – | – | – |
| `FrontFace` | – | – | – | – | – |
| `ProgramValue` | – | – | – | – | – |
| `ActiveTextureUnit` | – | – | – | – | – |
| `Viewport` | – | – | – | – | – |
| `BindFramebuffer` | – | – | – | – | – |
| `BindRenderbuffer` | – | – | – | – | – |
| `BindTexture` | – | – | – | – | – |
| `BindVertexBuffer` | – | – | – | – | – |
| `BindElementBuffer` | – | – | – | – | – |
| `BindVertexArray` | – | – | – | – | – |
| `PixelStoreUnpack` | – | – | – | – | – |
| `PixelStoreUnpackPremultiplyAlpha` | – | – | – | – | – |
| `PixelStoreUnpackFlipY` | – | – | – | – | – |
| `UniformBuffer` | – | – | – | – | `destroy` |
| `Program` | – | – | – | – | – |
| `Bucket` | – | – | – | – | `destroy` |
| `OverscaledTileID` | – | – | – | – | – |
| `ImageAtlas` | – | – | – | – | – |
| `AlphaImage` | – | – | – | – | – |
| `CollisionBoxArray` | – | – | – | – | – |
| `DEMData` | – | – | – | – | – |
| `SourceFeatureState` | – | – | – | – | – |
| `WorldCoordinateHelper` | – | – | – | – | – |
| `ActorTarget` | – | – | – | – | – |
| `ThrottledInvoker` | – | – | – | – | – |
| `GridIndex` | – | – | – | – | – |
| `Color` | – | – | – | – | – |

Mounts: `MapMount`.

More: https://effectified.dev/maplibre-gl
