// A form of Web Awesome elements in an Effect UI component: an input and a switch feed the model through their
// native events, a button opens a dialog through its `open` property, and the dialog's `wa-after-hide` closes it in
// the Model. Not `wa-hide`: it fires before the dialog closes, and setting `open` to false then is a second request to
// close (Web Awesome fires `wa-hide` again).
import { Mount, UiSchema } from "@effect/ui";
import { BrowserHost, Html } from "@effect/ui/html";
import { Effect, Layer, Schema } from "effect";
import { Button, Dialog, Input, InputChanges, Switch, SwitchChanges } from "../../src/index.ts";

const Message = UiSchema.TaggedEnum({
	ChangedName: { name: Schema.String },
	ToggledAgreed: { agreed: Schema.Boolean },
	ClickedOpen: {},
	HidDialog: {},
});

const Form = Html.component({
	name: "Form",
	model: Schema.Struct({ name: Schema.String, agreed: Schema.Boolean, open: Schema.Boolean, closings: Schema.Number }),
	message: Message,
}).make({
	init: () => ({ name: "", agreed: false, open: false, closings: 0 }),
	update: {
		ChangedName: ($, { name }) => $.evolve({ name: () => name }),
		ToggledAgreed: ($, { agreed }) => $.evolve({ agreed: () => agreed }),
		ClickedOpen: ($) => $.evolve({ open: () => true }),
		HidDialog: ($) => $.evolve({ open: () => false, closings: (closings) => closings + 1 }),
	},
	view: (h, model) =>
		h.div.children(
			Input(h)
				.id("name")
				.label("Name")
				.value(model.name)
				.onMount(InputChanges({}).pipe(Mount.map(({ value }) => Message.ChangedName({ name: String(value ?? "") })))),
			Switch(h)
				.id("agreed")
				.checked(model.agreed)
				.onMount(SwitchChanges({}).pipe(Mount.map(({ checked }) => Message.ToggledAgreed({ agreed: checked })))),
			Button(h).id("open").variant("brand").on("click", () => Message.ClickedOpen()).children("Open"),
			Dialog(h).id("dialog").label("Hello").open(model.open).on("wa-after-hide", () => Message.HidDialog()).children(`Hello, ${model.name}`),
			h.output.id("state").children(JSON.stringify(model)),
		),
});

Layer.launch(BrowserHost.mount(Form, {}, document.getElementById("root")!)).pipe(Effect.runFork);
