// A Chart.js chart as an Effect UI mount on a <canvas>: created from its configuration when the canvas is committed,
// updated in place when the view gives another configuration, its clicks on data sent as messages, destroyed with
// the canvas. Written for the engine's recipe (ui.mounts), not generated.
import { Chart, type ChartConfiguration, registerables } from "chart.js";
import { instanceMount, typed } from "../internal/ui.ts";

// Every controller, element, scale and plugin: a chart's `type` may name any of them.
Chart.register(...registerables);

/** A click on a data element: which dataset, and which element of it. */
export interface ChartClick {
	readonly datasetIndex: number;
	readonly index: number;
}

/** `h.canvas.onMount(ChartMount({ config }).pipe(Mount.map((click) => Message.Clicked(click))))` */
export const ChartMount = instanceMount(
	"Chart",
	{ args: { config: typed<ChartConfiguration>() } },
	{
		create: (canvas: HTMLCanvasElement, { config }) => new Chart(canvas, config),
		// In place: the chart keeps its canvas and animates from its old data to the new.
		update: (chart, { config }) => {
			chart.data = config.data;
			if (config.options !== undefined) chart.options = config.options;
			chart.update();
		},
		release: (chart) => chart.destroy(),
		events: (chart, emit: (click: ChartClick) => void) => {
			const listener = (event: MouseEvent) => {
				const [first] = chart.getElementsAtEventForMode(event, "nearest", { intersect: true }, false);
				if (first !== undefined) emit({ datasetIndex: first.datasetIndex, index: first.index });
			};
			chart.canvas.addEventListener("click", listener);
			return () => chart.canvas.removeEventListener("click", listener);
		},
	},
);
