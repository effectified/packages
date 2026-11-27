---
name: effectified-codemirror-view
description: Use @codemirror/view in Effect UI apps through @effectified/codemirror-view. Use when an Effect UI view renders @codemirror/view: what the facade offers, how its bindings and mounts work, and tested examples.
---

# @codemirror/view through @effectified/codemirror-view

An editor whose document is the Model, its cursor kept.

@codemirror/view for Effect UI: typed bindings and mounts, its events as messages, its instances scoped to their elements. Generated from @codemirror/view's own types (this copy: 6.44.4, for @codemirror/view 6.44.0), so its types are upstream's and a call the facade does not change behaves as upstream documents.

## Install

```sh
pnpm add @effectified/codemirror-view effect https://pkg.pr.new/Effect-TS/ui/@effect/ui@2fd1a57
```

## Rules

- Import from `@effectified/codemirror-view`. It runs in [Effect UI](https://ui.effect.website) views (`Html.component`), installed from its snapshot build.
- Mounts: `EditorMount`. A mount keeps one @codemirror/view instance on the element it renders into: `h.<tag>.onMount(<Name>Mount({ ...args }).pipe(Mount.map(...)))`. New args update the live instance; leaving the view releases it.
- Never reach into the element or instance to change what the Model owns: render the Model, and let messages change it.

## Examples

Each is code from a test that passes in CI.

### An editor whose document is the Model

```ts
import { Mount, UiSchema } from "@effect/ui";
import { BrowserHost, Html } from "@effect/ui/html";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { Effect, Layer, Schema } from "effect";
import { EditorMount } from "@effectified/codemirror-view";

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
```

From `test/fixtures/editor.ts`.

## API

Services: `ViewEditorView` (a `EditorView`, from `EditorView`).

| Error | From | Reasons |
|---|---|---|
| `ViewError` | any other failure | – |

| Handle | Effects | Of an `Option` | Streams | Events | Released by |
|---|---|---|---|---|---|
| `EditorView` | – | – | – | – | `destroy` |

Mounts: `EditorMount`.

More: https://effectified.dev/codemirror-view
