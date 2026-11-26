// An xterm.js terminal as an Effect UI mount on a <div>: opened on the div when it is committed, its options applied
// in place and the view's output log written as it grows, what the user types and its resizes sent as messages,
// disposed with the div. Written for the engine's recipe (ui.mounts), not generated.
import { type ITerminalOptions, Terminal } from "@xterm/xterm";
// xterm's DOM renderer lays out its rows, viewport and the hidden textarea that takes keystrokes with this stylesheet;
// without it the textarea shows and the rows overlap. Upstream documents loading it next to the library, so the
// mount imports it and an app's bundler ships it wherever the mount is used.
import "@xterm/xterm/css/xterm.css";
import { instanceMount, typed } from "../internal/ui.ts";

/** What the terminal reports: text the user typed or pasted (`onData`), or its new size in cells (`onResize`). */
export type TerminalEvent =
	| { readonly _tag: "Data"; readonly data: string }
	| { readonly _tag: "Resize"; readonly cols: number; readonly rows: number };

/**
 * `h.div.onMount(TerminalMount({ options, output }).pipe(Mount.map((event) => ...)))`
 *
 * `options` are applied in place through `terminal.options` (an option left out keeps its current value).
 * `output` is an append-only log of the chunks written so far: on each update the mount writes only the chunks past
 * those it already wrote; when the log is shorter than what it wrote, it resets the terminal and writes the whole log.
 */
export const TerminalMount = instanceMount(
	"Terminal",
	{ args: { options: typed<ITerminalOptions>(), output: typed<ReadonlyArray<string>>() } },
	{
		create: (node: HTMLElement, { options, output }) => {
			const terminal = new Terminal(options);
			terminal.open(node);
			for (const chunk of output) terminal.write(chunk);
			return { terminal, written: output.length };
		},
		update: (live, { options, output }, previous) => {
			// xterm skips an option whose value is unchanged, but compares by identity: a view that rebuilds `theme` each
			// render repaints the terminal each time, so an app keeps its options object in the Model to avoid it.
			if (options !== previous.options) live.terminal.options = options;
			if (output.length < live.written) {
				live.terminal.reset();
				live.written = 0;
			}
			for (const chunk of output.slice(live.written)) live.terminal.write(chunk);
			live.written = output.length;
		},
		release: ({ terminal }) => terminal.dispose(),
		events: ({ terminal }, emit: (event: TerminalEvent) => void) => {
			const data = terminal.onData((data) => emit({ _tag: "Data", data }));
			const resize = terminal.onResize(({ cols, rows }) => emit({ _tag: "Resize", cols, rows }));
			return () => {
				data.dispose();
				resize.dispose();
			};
		},
	},
);
