// A MapLibre GL map as an Effect UI mount on a <div>: created from its style and camera when the div is committed,
// updated in place when the view gives another style or camera, its settled camera and its clicks sent as messages,
// removed with the div. Written for the engine's recipe (ui.mounts), not generated.
import { Equal } from "effect";
import { type LngLatLike, MapLibreMap, type MapOptions } from "maplibre-gl";
import { instanceMount, typed } from "../internal/ui.ts";

/** What the map reports: its camera when a movement ends, and where it was clicked, as `[lng, lat]`. */
export type MapEvent =
	| { readonly event: "moveend"; readonly center: readonly [number, number]; readonly zoom: number }
	| { readonly event: "click"; readonly lngLat: readonly [number, number] };

/** A camera as plain data: `[lng, lat]` and a zoom. */
interface Camera {
	readonly center: readonly [number, number];
	readonly zoom: number;
}

// The camera each map last reported in `moveend`, read by `update`: a camera the Model echoes back while a new gesture
// already moves the map is the map's own, and jumping to it would interrupt that gesture.
const reported = new WeakMap<MapLibreMap, Camera>();

/** `h.div.onMount(MapMount({ style, center, zoom }).pipe(Mount.map((event) => ...)))`; the div needs a size. */
export const MapMount = instanceMount(
	"Map",
	{
		args: {
			style: typed<NonNullable<MapOptions["style"]>>(),
			center: typed<LngLatLike>(),
			zoom: typed<number>(),
		},
	},
	{
		create: (container: HTMLDivElement, { style, center, zoom }) => new MapLibreMap({ container, style, center, zoom }),
		update: (map, next, previous) => {
			// setStyle diffs against the live style, but a structurally equal style still costs a walk of both.
			if (!Equal.equals(next.style, previous.style)) map.setStyle(next.style);
			if (Equal.equals(next.center, previous.center) && next.zoom === previous.zoom) return;
			const camera: Camera = { center: lngLat(next.center), zoom: next.zoom };
			const own = reported.get(map);
			if (sameCamera(camera, cameraOf(map)) || (own !== undefined && sameCamera(camera, own))) return;
			map.jumpTo({ center: next.center, zoom: next.zoom });
		},
		release: (map) => map.remove(),
		events: (map, emit: (event: MapEvent) => void) => {
			const moved = map.on("moveend", () => {
				const camera = cameraOf(map);
				reported.set(map, camera);
				emit({ event: "moveend", ...camera });
			});
			const clicked = map.on("click", ({ lngLat }) => emit({ event: "click", lngLat: lngLat.toArray() }));
			return () => {
				moved.unsubscribe();
				clicked.unsubscribe();
			};
		},
	},
);

function cameraOf(map: MapLibreMap): Camera {
	return { center: map.getCenter().toArray(), zoom: map.getZoom() };
}

// maplibre-gl exports no LngLat class to convert with, and LngLatLike is an untagged union of upstream's shapes.
function lngLat(center: LngLatLike): readonly [number, number] {
	if (Array.isArray(center)) return [center[0], center[1]];
	return "lon" in center ? [center.lon, center.lat] : [center.lng, center.lat];
}

function sameCamera(a: Camera, b: Camera): boolean {
	return a.center[0] === b.center[0] && a.center[1] === b.center[1] && a.zoom === b.zoom;
}
