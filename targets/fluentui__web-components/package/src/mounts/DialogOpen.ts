// The open state of a <fluent-dialog> as an Effect UI mount. Fluent opens and closes its dialog with methods (`show`,
// `hide`) and has no `open` property a view could set, so the mount applies the view's `open` through them and
// reports Fluent's `toggle`, which fires once the dialog has opened or closed. Written for the engine's recipe
// (ui.mounts), not generated.
import type { Dialog } from "@fluentui/web-components";
import { Schema } from "effect";
import { instanceMount } from "../internal/ui.ts";

/** The dialog's state after it opened or closed, from Fluent's `toggle`. */
export interface DialogToggle {
	readonly open: boolean;
}

/**
 * `Dialog(h).onMount(DialogOpen({ open }).pipe(Mount.map(({ open }) => Message.ToggledDialog({ open }))))`: shows or
 * hides the dialog when the view's `open` changes, and sends its state after each toggle. Set the Model's `open` from
 * that message, not before: the user closes the dialog with Escape or a click outside, and the Model must follow.
 */
export const DialogOpen = instanceMount(
	"DialogOpen",
	{ args: { open: Schema.Boolean } },
	{
		create: (node: HTMLElement, { open }) => {
			// Mounted on <fluent-dialog>, whose class upstream does not name in HTMLElementTagNameMap: the binding hands
			// over an HTMLElement.
			const dialog = node as Dialog;
			apply(dialog, open);
			return dialog;
		},
		update: (dialog, { open }) => apply(dialog, open),
		// The instance is the view's own element and leaves with it: there is nothing to give back.
		release: () => {},
		events: (dialog, emit: (toggle: DialogToggle) => void) => {
			// Fluent's `toggle` is its own CustomEvent (no ToggleEvent states): the native dialog it wraps says where it is.
			const listener = () => emit({ open: dialog.dialog.open });
			dialog.addEventListener("toggle", listener);
			return () => dialog.removeEventListener("toggle", listener);
		},
	},
);

/** Calls `show` or `hide` only when the dialog is not already where the view wants it: each call fires a toggle. */
function apply(dialog: Dialog, open: boolean): void {
	// Upstream types `dialog` as always there, but Fluent renders it when the element connects, which is after
	// Effect UI creates the mount: until then the dialog is closed.
	if ((dialog.dialog?.open ?? false) === open) return;
	if (open) dialog.show();
	else dialog.hide();
}
