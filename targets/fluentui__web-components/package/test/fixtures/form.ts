// A form of Fluent UI elements in an Effect UI component: a text input, a switch and a checkbox feed the Model through
// their changes mounts, a button opens a dialog through the DialogOpen mount, and the dialog's `toggle` (sent once it
// has opened or closed) sets the Model's `open`. Fluent's elements are not in HTMLElementTagNameMap, so the changes
// mounts report `unknown` state, read here as the string or boolean Fluent documents.
import { Mount, UiSchema } from "@effect/ui";
import { BrowserHost, Html } from "@effect/ui/html";
import { Effect, Layer, Schema } from "effect";
import {
	Button,
	Checkbox,
	CheckboxChanges,
	Dialog,
	DialogBody,
	DialogOpen,
	Switch,
	SwitchChanges,
	TextInput,
	TextInputChanges,
} from "../../src/index.ts";

const Message = UiSchema.TaggedEnum({
	ChangedName: { name: Schema.String },
	ToggledNotify: { notify: Schema.Boolean },
	CheckedAgreed: { agreed: Schema.Boolean },
	ClickedOpen: {},
	ClickedClose: {},
	ToggledDialog: { open: Schema.Boolean },
});

const Form = Html.component({
	name: "Form",
	model: Schema.Struct({
		name: Schema.String,
		notify: Schema.Boolean,
		agreed: Schema.Boolean,
		open: Schema.Boolean,
		closings: Schema.Number,
	}),
	message: Message,
}).make({
	init: () => ({ name: "", notify: false, agreed: false, open: false, closings: 0 }),
	update: {
		ChangedName: ($, { name }) => $.evolve({ name: () => name }),
		ToggledNotify: ($, { notify }) => $.evolve({ notify: () => notify }),
		CheckedAgreed: ($, { agreed }) => $.evolve({ agreed: () => agreed }),
		ClickedOpen: ($) => $.evolve({ open: () => true }),
		ClickedClose: ($) => $.evolve({ open: () => false }),
		ToggledDialog: ($, { open }) => (open ? $.evolve({ open: () => true }) : $.evolve({ open: () => false, closings: (closings) => closings + 1 })),
	},
	view: (h, model) =>
		h.div.children(
			TextInput(h)
				.id("name")
				.value(model.name)
				.onMount(TextInputChanges({}).pipe(Mount.map(({ value }) => Message.ChangedName({ name: String(value ?? "") }))))
				.children("Name"),
			Switch(h)
				.id("notify")
				.checked(model.notify)
				.onMount(SwitchChanges({}).pipe(Mount.map(({ checked }) => Message.ToggledNotify({ notify: checked === true })))),
			Checkbox(h)
				.id("agreed")
				.checked(model.agreed)
				.onMount(CheckboxChanges({}).pipe(Mount.map(({ checked }) => Message.CheckedAgreed({ agreed: checked === true })))),
			Button(h).id("open").on("click", Message.ClickedOpen()).children("Open"),
			Dialog(h)
				.id("dialog")
				.onMount(DialogOpen({ open: model.open }).pipe(Mount.map(({ open }) => Message.ToggledDialog({ open }))))
				.children(
					DialogBody(h).children(
						h.p.children(`Hello, ${model.name}`),
						Button(h).id("close").attr("slot", "action").on("click", Message.ClickedClose()).children("Close"),
					),
				),
			h.output.id("state").children(JSON.stringify(model)),
		),
});

Layer.launch(BrowserHost.mount(Form, {}, document.getElementById("root")!)).pipe(Effect.runFork);
