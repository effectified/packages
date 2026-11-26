---
name: effectified-xterm
description: Use @xterm/xterm in Effect UI apps through @effectified/xterm. Use when an Effect UI view renders @xterm/xterm: what the facade offers, how its bindings and mounts work, and tested examples.
---

# @xterm/xterm through @effectified/xterm

A terminal fed from the Model, keystrokes as messages.

@xterm/xterm for Effect UI: typed bindings and mounts, its events as messages, its instances scoped to their elements. Generated from @xterm/xterm's own types (this copy: 6.0.0+3, for @xterm/xterm 6.0.0), so its types are upstream's and a call the facade does not change behaves as upstream documents.

## Install

```sh
pnpm add https://effectified.dev/xterm.tgz effect https://pkg.pr.new/Effect-TS/ui/@effect/ui@2fd1a57
```

## Rules

- Import from `@effectified/xterm`. It runs in [Effect UI](https://ui.effect.website) views (`Html.component`), installed from its snapshot build.
- Mounts: `TerminalMount`. A mount keeps one @xterm/xterm instance on the element it renders into: `h.<tag>.onMount(<Name>Mount({ ...args }).pipe(Mount.map(...)))`. New args update the live instance; leaving the view releases it.
- Never reach into the element or instance to change what the Model owns: render the Model, and let messages change it.

## Examples

Each is code from a test that passes in CI.

### A terminal fed from the Model, keystrokes as messages

```ts
import { Mount, UiSchema } from "@effect/ui";
import { BrowserHost, Html } from "@effect/ui/html";
import { Effect, Layer, Schema } from "effect";
import { TerminalMount } from "@effectified/xterm";

const Message = UiSchema.TaggedEnum({
	Typed: { data: Schema.String },
	Resized: { cols: Schema.Number, rows: Schema.Number },
	ClickedBigger: {},
	ClickedClear: {},
	ClickedHide: {},
});

/** The echo of typed data: printable characters as they are, Enter as a new line, other control characters dropped. */
const echo = (data: string): string =>
	[...data].map((char) => (char === "\r" ? "\r\n" : char >= " " && char !== "\x7f" ? char : "")).join("");

const Echo = Html.component({
	name: "Echo",
	model: Schema.Struct({
		output: Schema.Array(Schema.String),
		received: Schema.String,
		fontSize: Schema.Number,
		size: Schema.Struct({ cols: Schema.Number, rows: Schema.Number }),
		shown: Schema.Boolean,
	}),
	message: Message,
}).make({
	init: () => ({ output: ["$ "], received: "", fontSize: 14, size: { cols: 0, rows: 0 }, shown: true }),
	update: {
		Typed: ($, { data }) => $.evolve({ output: (output) => [...output, echo(data)], received: (received) => received + data }),
		Resized: ($, { cols, rows }) => $.evolve({ size: () => ({ cols, rows }) }),
		ClickedBigger: ($) => $.evolve({ fontSize: (fontSize) => fontSize + 6 }),
		ClickedClear: ($) => $.evolve({ output: () => [] }),
		ClickedHide: ($) => $.evolve({ shown: () => false }),
	},
	view: (h, model) =>
		h.div.children(
			h.button.id("bigger").on("click", Message.ClickedBigger()).children("Bigger"),
			h.button.id("clear").on("click", Message.ClickedClear()).children("Clear"),
			h.button.id("hide").on("click", Message.ClickedHide()).children("Hide"),
			h.output.id("state").children(JSON.stringify(model)),
			model.shown
				? h.div.id("terminal").style({ width: "640px", height: "240px" }).onMount(
						TerminalMount({ options: { fontSize: model.fontSize }, output: model.output }).pipe(
							Mount.map((event) => (event._tag === "Data" ? Message.Typed({ data: event.data }) : Message.Resized({ cols: event.cols, rows: event.rows }))),
						),
					)
				: h.p.id("hidden").children("hidden"),
		),
});

Layer.launch(BrowserHost.mount(Echo, {}, document.getElementById("root")!)).pipe(Effect.runFork);
```

From `test/fixtures/terminal.ts`.

## API

Services: `XtermTerminal` (a `Terminal`, from `Terminal`).

| Error | From |
|---|---|
| `XtermError` | any other failure, codes `EPIPE`, `ERROR` |

| Handle | Effects | Streams | Events | Released by |
|---|---|---|---|---|
| `Terminal` | – | – | – | `dispose` |
| `IDisposable` | – | – | – | `dispose` |
| `IMarker` | – | – | – | `dispose` |
| `IBufferNamespace` | – | – | – | – |
| `IParser` | – | – | – | – |
| `IUnicodeHandling` | – | – | – | – |
| `IBuffer` | – | – | – | – |
| `IBufferCell` | – | – | – | – |

Mounts: `TerminalMount`.

More: https://effectified.dev/xterm
