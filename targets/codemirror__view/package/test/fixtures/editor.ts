// A CodeMirror editor in an Effect UI component: the Model holds the document and the selection, the editor's
// changes update them, buttons set the document and lock the editor from the Model, and hiding it removes the
// editor's element (the view is destroyed with it).
import { Mount, UiSchema } from "@effect/ui";
import { BrowserHost, Html } from "@effect/ui/html";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { Effect, Layer, Schema } from "effect";
import { EditorMount } from "../../src/index.ts";

declare global {
	interface Window {
		EditorView: typeof EditorView;
	}
}
window.EditorView = EditorView;

// Module constants: the mount reconfigures the editor only when the view gives it another value.
const editable = EditorView.lineWrapping;
const locked = [EditorView.lineWrapping, EditorState.readOnly.of(true)];

const Message = UiSchema.TaggedEnum({
	ChangedDoc: { doc: Schema.String },
	MovedSelection: { anchor: Schema.Number, head: Schema.Number },
	ClickedSet: {},
	ClickedLock: {},
	ClickedHide: {},
});

const Notes = Html.component({
	name: "Notes",
	model: Schema.Struct({ doc: Schema.String, anchor: Schema.Number, head: Schema.Number, locked: Schema.Boolean, shown: Schema.Boolean }),
	message: Message,
}).make({
	init: () => ({ doc: "hello", anchor: 0, head: 0, locked: false, shown: true }),
	update: {
		ChangedDoc: ($, { doc }) => $.evolve({ doc: () => doc }),
		MovedSelection: ($, { anchor, head }) => $.evolve({ anchor: () => anchor, head: () => head }),
		ClickedSet: ($) => $.evolve({ doc: () => "set from the model" }),
		ClickedLock: ($) => $.evolve({ locked: () => true }),
		ClickedHide: ($) => $.evolve({ shown: () => false }),
	},
	view: (h, model) =>
		h.div.children(
			h.button.id("set").on("click", Message.ClickedSet()).children("Set"),
			h.button.id("lock").on("click", Message.ClickedLock()).children("Lock"),
			h.button.id("hide").on("click", Message.ClickedHide()).children("Hide"),
			h.output.id("state").children(JSON.stringify(model)),
			model.shown
				? h.div.id("editor").onMount(
						EditorMount({ doc: model.doc, extensions: model.locked ? locked : editable }).pipe(
							Mount.map((change) =>
								change._tag === "DocChanged" ? Message.ChangedDoc({ doc: change.doc }) : Message.MovedSelection({ anchor: change.anchor, head: change.head }),
							),
						),
					)
				: h.p.id("hidden").children("hidden"),
		),
});

Layer.launch(BrowserHost.mount(Notes, {}, document.getElementById("root")!)).pipe(Effect.runFork);
