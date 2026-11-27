---
name: effectified-chart-js
description: Use chart.js in Effect UI apps through @effectified/chart.js. Use when an Effect UI view renders chart.js: what the facade offers, how its bindings and mounts work, and tested examples.
---

# chart.js through @effectified/chart.js

A chart updated in place, clicks as messages.

chart.js for Effect UI: typed bindings and mounts, its events as messages, its instances scoped to their elements. Generated from chart.js's own types (this copy: 4.6.4, for chart.js 4.6.2), so its types are upstream's and a call the facade does not change behaves as upstream documents.

## Install

```sh
pnpm add @effectified/chart.js effect https://pkg.pr.new/Effect-TS/ui/@effect/ui@2fd1a57
```

## Rules

- Import from `@effectified/chart.js`. It runs in [Effect UI](https://ui.effect.website) views (`Html.component`), installed from its snapshot build.
- Mounts: `ChartMount`. A mount keeps one chart.js instance on the element it renders into: `h.<tag>.onMount(<Name>Mount({ ...args }).pipe(Mount.map(...)))`. New args update the live instance; leaving the view releases it.
- Never reach into the element or instance to change what the Model owns: render the Model, and let messages change it.

## Examples

Each is code from a test that passes in CI.

### A chart drawn from the Model, clicks as messages

```ts
import { Mount, UiSchema } from "@effect/ui";
import { BrowserHost, Html } from "@effect/ui/html";
import { Effect, Layer, Schema } from "effect";
import { ChartMount } from "@effectified/chart.js";

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
```

From `test/fixtures/chart.ts`.

## API

Services: `ChartJsAnimator` (a `Animator`, from `Animator`), `ChartJsChart` (a `Chart`, from `Chart`).

| Error | From | Reasons |
|---|---|---|
| `ChartJsError` | any other failure | – |

| Handle | Effects | Of an `Option` | Streams | Events | Released by |
|---|---|---|---|---|---|
| `Animator` | – | – | – | – | `stop` |
| `default` | – | – | – | – | – |
| `DatasetController` | – | – | – | – | – |
| `DoughnutController` | – | – | – | – | – |
| `PolarAreaController` | – | – | – | – | – |
| `Animation` | – | – | – | – | – |
| `Animations` | – | – | – | – | – |
| `Chart` | – | – | – | – | `destroy` |
| `Scale` | – | – | – | – | – |
| `BarElement` | – | – | – | – | – |
| `LineElement` | – | – | – | – | – |
| `BasePlatform` | – | – | – | – | – |
| `BasicPlatform` | – | – | – | – | – |
| `DomPlatform` | – | – | – | – | – |
| `RadialLinearScale` | – | – | – | – | – |
| `TimeScale` | – | – | – | – | – |

Mounts: `ChartMount`.

More: https://effectified.dev/chart.js
