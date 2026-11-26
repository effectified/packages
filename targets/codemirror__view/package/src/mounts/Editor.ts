// A CodeMirror 6 editor as an Effect UI mount: one EditorView on its element, created from the document and the
// extensions, updated in place (a new document is one change, new extensions a reconfiguration), its document and
// selection changes sent as messages, destroyed with the element. Written for the engine's recipe (ui.mounts), not
// generated.
import { Compartment, type Extension } from "@codemirror/state";
import { EditorView, type ViewUpdate } from "@codemirror/view";
import { instanceMount, typed } from "../internal/ui.ts";

/** What the editor reports, as plain data: its whole document after a change, or its main selection after a move. */
export type EditorChange =
	| { readonly _tag: "DocChanged"; readonly doc: string }
	| { readonly _tag: "SelectionChanged"; readonly anchor: number; readonly head: number };

/** The live editor: its view and the compartments the mount reconfigures. */
interface Editor {
	readonly view: EditorView;
	/** Holds the view's `extensions`. */
	readonly extensions: Compartment;
	/** Holds the update listener while the mount listens. */
	readonly listener: Compartment;
}

/**
 * `h.div.onMount(EditorMount({ doc, extensions }).pipe(Mount.map((change) => ...)))`. Give `extensions` a stable
 * value (a module constant): a different value, even an equal new array, reconfigures the editor.
 */
export const EditorMount = instanceMount(
	"Editor",
	{ args: { doc: typed<string>(), extensions: typed<Extension>() } },
	{
		create: (parent: HTMLElement, { doc, extensions }): Editor => {
			const compartments = { extensions: new Compartment(), listener: new Compartment() };
			const view = new EditorView({ doc, parent, extensions: [compartments.extensions.of(extensions), compartments.listener.of([])] });
			return { view, ...compartments };
		},
		update: (editor, next, previous) => {
			if (next.extensions !== previous.extensions) editor.view.dispatch({ effects: editor.extensions.reconfigure(next.extensions) });
			// Between the view's changes the editor owns its document; a Model giving back what the editor reported
			// equals it, and replacing it would move the cursor.
			if (next.doc !== previous.doc && next.doc !== editor.view.state.doc.toString()) {
				editor.view.dispatch({ changes: { from: 0, to: editor.view.state.doc.length, insert: next.doc } });
			}
		},
		release: (editor) => editor.view.destroy(),
		events: (editor, emit: (change: EditorChange) => void) => {
			editor.view.dispatch({ effects: editor.listener.reconfigure(EditorView.updateListener.of((update) => report(update, emit))) });
			return () => editor.view.dispatch({ effects: editor.listener.reconfigure([]) });
		},
	},
);

function report(update: ViewUpdate, emit: (change: EditorChange) => void): void {
	if (update.docChanged) emit({ _tag: "DocChanged", doc: update.state.doc.toString() });
	const { anchor, head } = update.state.selection.main;
	const before = update.startState.selection.main;
	if (anchor !== before.anchor || head !== before.head) emit({ _tag: "SelectionChanged", anchor, head });
}
