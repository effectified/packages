// An echoing terminal in an Effect UI component: what the user types arrives as a message, a tiny line discipline
// appends its echo to the Model's output log, the font size comes from the Model, clearing the log resets the
// terminal, and hiding it removes the div (the terminal is disposed with it).
import { Mount, UiSchema } from "@effect/ui";
import { BrowserHost, Html } from "@effect/ui/html";
import { Terminal } from "@xterm/xterm";
import { Effect, Layer, Schema } from "effect";
import { TerminalMount } from "../../src/index.ts";

declare global {
	interface Window {
		terminals: Array<Terminal>;
	}
}
// The mount owns its terminal and xterm keeps no registry of instances (Chart.js has Chart.getChart): record each
// terminal the page opens, so the test can read its buffer and options and see it disposed.
window.terminals = [];
const open = Terminal.prototype.open;
Terminal.prototype.open = function (this: Terminal, parent: HTMLElement) {
	window.terminals.push(this);
	open.call(this, parent);
};

// #region example: A terminal fed from the Model, keystrokes as messages
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
// #endregion
