---
name: effectified-motion
description: Use motion in Effect UI apps through @effectified/motion. Use when an Effect UI view renders motion: what the facade offers, how its bindings and mounts work, and tested examples.
---

# motion through @effectified/motion

Animations that continue from where they are, in-view as messages.

motion for Effect UI: typed bindings and mounts, its events as messages, its instances scoped to their elements. Generated from motion's own types (this copy: 14.14.0+3, for motion 14.14.0), so its types are upstream's and a call the facade does not change behaves as upstream documents.

## Install

```sh
pnpm add https://effectified.dev/motion.tgz effect https://pkg.pr.new/Effect-TS/ui/@effect/ui@2fd1a57
```

## Rules

- Import from `@effectified/motion`. It runs in [Effect UI](https://ui.effect.website) views (`Html.component`), installed from its snapshot build.
- Mounts: `AnimateMount`, `InViewMount`. A mount keeps one motion instance on the element it renders into: `h.<tag>.onMount(<Name>Mount({ ...args }).pipe(Mount.map(...)))`. New args update the live instance; leaving the view releases it.
- Never reach into the element or instance to change what the Model owns: render the Model, and let messages change it.

## Examples

Each is code from a test that passes in CI.

### Animate from the Model, and know when a section is in view

```ts
import { Mount, UiSchema } from "@effect/ui";
import { BrowserHost, Html } from "@effect/ui/html";
import { Effect, Layer, Schema } from "effect";
import { AnimateMount, InViewMount } from "@effectified/motion";

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
```

From `test/fixtures/animate.ts`.

## API

Services: `MotionTimeline` (a `Timeline`, from `animate`).

| Error | From |
|---|---|
| `MotionError` | any other failure |

| Handle | Effects | Streams | Events | Released by |
|---|---|---|---|---|
| `Timeline` | `then` | – | – | `stop` |

Mounts: `AnimateMount`, `InViewMount`.

More: https://effectified.dev/motion
