// A box animated by Motion from an Effect UI Model, and a section further down that reports when it is in view. The
// Model gives the box's target; each completed animation records the target it reached; buttons send the box far,
// bring it back, remove it and remove the section; scrolling the section in and out records each change. The page
// counts the animations Motion starts (`window.plays`) through the `onPlay` option.
import { Mount, UiSchema } from "@effect/ui";
import { BrowserHost, Html } from "@effect/ui/html";
import { Effect, Layer, Schema } from "effect";
import { AnimateMount, InViewMount } from "../../src/index.ts";

declare global {
	interface Window {
		/** How many animations Motion has started on the box: its `onPlay` runs once per `animate`. */
		plays: number;
	}
}
window.plays = 0;
// One function for every render: options compare by value, and a new closure per render would be other options.
const counted = () => {
	window.plays += 1;
};

const Target = Schema.Struct({ x: Schema.Number, opacity: Schema.Number, duration: Schema.Number });

const Message = UiSchema.TaggedEnum({
	ClickedFar: {},
	ClickedBack: {},
	ClickedHide: {},
	ClickedDrop: {},
	Finished: {},
	ChangedView: { inView: Schema.Boolean },
});

const Scene = Html.component({
	name: "Scene",
	model: Schema.Struct({ target: Target, arrivals: Schema.Array(Schema.Number), shown: Schema.Boolean, views: Schema.Array(Schema.Boolean), watched: Schema.Boolean }),
	message: Message,
}).make({
	init: () => ({ target: { x: 100, opacity: 0.5, duration: 0.2 }, arrivals: [], shown: true, views: [], watched: true }),
	update: {
		ClickedFar: ($) => $.evolve({ target: () => ({ x: 300, opacity: 1, duration: 1.5 }) }),
		ClickedBack: ($) => $.evolve({ target: () => ({ x: 0, opacity: 0.5, duration: 0.4 }) }),
		ClickedHide: ($) => $.evolve({ shown: () => false }),
		ClickedDrop: ($) => $.evolve({ watched: () => false }),
		Finished: ($) => $.evolve({ arrivals: (arrivals) => [...arrivals, $.model.target.x] }),
		ChangedView: ($, { inView }) => $.evolve({ views: (views) => [...views, inView] }),
	},
	view: (h, model) =>
		h.div.children(
			h.button.id("far").on("click", Message.ClickedFar()).children("Far"),
			h.button.id("back").on("click", Message.ClickedBack()).children("Back"),
			h.button.id("hide").on("click", Message.ClickedHide()).children("Hide"),
			h.button.id("drop").on("click", Message.ClickedDrop()).children("Drop"),
			h.output.id("state").children(JSON.stringify(model)),
			model.shown
				? h.div
						.id("box")
						.style({ width: "50px", height: "50px", background: "steelblue" })
						.onMount(
							AnimateMount({
								keyframes: { x: model.target.x, opacity: model.target.opacity },
								options: { duration: model.target.duration, ease: "linear", onPlay: counted },
							}).pipe(Mount.map(() => Message.Finished())),
						)
				: h.p.id("hidden").children("hidden"),
			h.div.style({ height: "2000px" }),
			model.watched
				? h.section
						.id("section")
						.style({ height: "300px", background: "khaki" })
						.onMount(InViewMount({ amount: 0.5 }).pipe(Mount.map(({ inView }) => Message.ChangedView({ inView }))))
				: h.p.id("dropped").children("dropped"),
			h.div.style({ height: "2000px" }),
		),
});

Layer.launch(BrowserHost.mount(Scene, {}, document.getElementById("root")!)).pipe(Effect.runFork);
