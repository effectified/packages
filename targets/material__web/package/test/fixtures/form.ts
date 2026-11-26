// A form of Material Web elements in an Effect UI component: a text field, a switch, a checkbox and a slider feed the
// Model through their generated changes mounts, a button opens a dialog through its `open` property, and the dialog's
// `opened` and `closed` events are messages. The Model closes the dialog on `closed`, not `close`: `close` fires before
// the close animation, and setting `open` to false then calls md-dialog's `close()` a second time (a second `close`).
import { Mount, UiSchema } from "@effect/ui";
import { BrowserHost, Html } from "@effect/ui/html";
import { Effect, Layer, Schema } from "effect";
import {
	Checkbox,
	CheckboxChanges,
	Dialog,
	FilledButton,
	OutlinedTextField,
	OutlinedTextFieldChanges,
	Slider,
	SliderChanges,
	Switch,
	SwitchChanges,
	TextButton,
} from "../../src/index.ts";

// #region example: A form and a dialog
const Message = UiSchema.TaggedEnum({
	ChangedName: { name: Schema.String },
	ToggledNotify: { notify: Schema.Boolean },
	CheckedAgreed: { agreed: Schema.Boolean },
	MovedVolume: { volume: Schema.Number },
	ClickedOpen: {},
	OpenedDialog: {},
	ClosedDialog: {},
});

const Form = Html.component({
	name: "Form",
	model: Schema.Struct({
		name: Schema.String,
		notify: Schema.Boolean,
		agreed: Schema.Boolean,
		volume: Schema.Number,
		open: Schema.Boolean,
		dialog: Schema.Literals(["closed", "opened"]),
		closings: Schema.Number,
	}),
	message: Message,
}).make({
	init: () => ({ name: "", notify: false, agreed: false, volume: 50, open: false, dialog: "closed" as const, closings: 0 }),
	update: {
		ChangedName: ($, { name }) => $.evolve({ name: () => name }),
		ToggledNotify: ($, { notify }) => $.evolve({ notify: () => notify }),
		CheckedAgreed: ($, { agreed }) => $.evolve({ agreed: () => agreed }),
		MovedVolume: ($, { volume }) => $.evolve({ volume: () => volume }),
		ClickedOpen: ($) => $.evolve({ open: () => true }),
		OpenedDialog: ($) => $.evolve({ dialog: () => "opened" as const }),
		ClosedDialog: ($) => $.evolve({ open: () => false, dialog: () => "closed" as const, closings: (closings) => closings + 1 }),
	},
	view: (h, model) =>
		h.div.children(
			OutlinedTextField(h)
				.id("name")
				.label("Name")
				.value(model.name)
				.onMount(OutlinedTextFieldChanges({}).pipe(Mount.map(({ value }) => Message.ChangedName({ name: value })))),
			Switch(h)
				.id("notify")
				.selected(model.notify)
				.onMount(SwitchChanges({}).pipe(Mount.map(({ selected }) => Message.ToggledNotify({ notify: selected })))),
			Checkbox(h)
				.id("agreed")
				.checked(model.agreed)
				.onMount(CheckboxChanges({}).pipe(Mount.map(({ checked }) => Message.CheckedAgreed({ agreed: checked })))),
			Slider(h)
				.id("volume")
				.min(0)
				.max(100)
				.step(10)
				.value(model.volume)
				.onMount(SliderChanges({}).pipe(Mount.map(({ value }) => Message.MovedVolume({ volume: value ?? 0 })))),
			FilledButton(h).id("open").on("click", () => Message.ClickedOpen()).children("Open"),
			Dialog(h)
				.id("dialog")
				.open(model.open)
				.on("opened", () => Message.OpenedDialog())
				.on("closed", () => Message.ClosedDialog())
				.children(
					h.div.attr("slot", "headline").children("Hello"),
					h.div.attr("slot", "content").children(`Hello, ${model.name}`),
					h.div.attr("slot", "actions").children(TextButton(h).id("ok").children("OK")),
				),
			h.output.id("state").children(JSON.stringify(model)),
		),
});

Layer.launch(BrowserHost.mount(Form, {}, document.getElementById("root")!)).pipe(Effect.runFork);
// #endregion
