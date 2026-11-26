// A bar chart in an Effect UI component: its data comes from the Model, a click on a bar is a message, and hiding it
// removes the canvas (the chart is destroyed with it).
import { Mount, UiSchema } from "@effect/ui";
import { BrowserHost, Html } from "@effect/ui/html";
import { Chart } from "chart.js";
import { Effect, Layer, Schema } from "effect";
import { ChartMount } from "../../src/index.ts";

declare global {
	interface Window {
		Chart: typeof Chart;
	}
}
window.Chart = Chart;

// #region example: A chart drawn from the Model, clicks as messages
const Message = UiSchema.TaggedEnum({
	ClickedAdd: {},
	ClickedBar: { index: Schema.Number },
	ClickedHide: {},
});

const Bars = Html.component({
	name: "Bars",
	model: Schema.Struct({ values: Schema.Array(Schema.Number), clicked: Schema.Number, shown: Schema.Boolean }),
	message: Message,
}).make({
	init: () => ({ values: [3, 1, 2], clicked: -1, shown: true }),
	update: {
		ClickedAdd: ($) => $.evolve({ values: (values) => [...values, values.length + 1] }),
		ClickedBar: ($, { index }) => $.evolve({ clicked: () => index }),
		ClickedHide: ($) => $.evolve({ shown: () => false }),
	},
	view: (h, model) =>
		h.div.children(
			h.button.id("add").on("click", Message.ClickedAdd()).children("Add"),
			h.button.id("hide").on("click", Message.ClickedHide()).children("Hide"),
			h.output.id("state").children(JSON.stringify(model)),
			model.shown
				? h.div.style({ width: "400px", height: "200px" }).children(
						h.canvas.id("chart").onMount(
							ChartMount({
								config: {
									type: "bar",
									data: { labels: model.values.map((_, index) => `#${index}`), datasets: [{ label: "values", data: [...model.values] }] },
									options: { animation: false, responsive: true, maintainAspectRatio: false },
								},
							}).pipe(Mount.map(({ index }) => Message.ClickedBar({ index }))),
						),
					)
				: h.p.id("hidden").children("hidden"),
		),
});

Layer.launch(BrowserHost.mount(Bars, {}, document.getElementById("root")!)).pipe(Effect.runFork);
// #endregion
