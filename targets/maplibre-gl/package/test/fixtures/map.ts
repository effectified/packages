// A MapLibre GL map in an Effect UI component: the Model holds the camera, the map's `moveend` writes it back, a
// button sets it from the Model, a click on the map is a message, and hiding it removes the div (the map is removed
// with it). The style is local: a background and one GeoJSON polygon, no tiles, glyphs or sprite to fetch.
/// <reference types="vite/client" />
import "maplibre-gl/dist/maplibre-gl.css";
import { Mount, UiSchema } from "@effect/ui";
import { BrowserHost, Html } from "@effect/ui/html";
import { Effect, Layer, Schema } from "effect";
import { MapLibreMap, type MapOptions, setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { MapMount } from "../../src/index.ts";

// MapLibre looks for its worker next to its own module, and Vite moves that module into its dependency cache: an app
// built with a bundler names the worker's URL, as this one does.
setWorkerUrl(workerUrl);

declare global {
	interface Window {
		maps: Set<MapLibreMap>;
	}
}

// maplibre-gl keeps no registry of its maps (Chart.js has `Chart.instances`), so the page records each one it creates:
// every map calls `resize` from its constructor.
window.maps = new Set();
const resize = MapLibreMap.prototype.resize;
MapLibreMap.prototype.resize = function (this: MapLibreMap, ...args: Parameters<typeof resize>) {
	window.maps.add(this);
	return resize.apply(this, args);
};

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
