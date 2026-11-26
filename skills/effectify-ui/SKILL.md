---
name: effectify-ui
description: Make a frontend library native to Effect UI (targets made with `make --ui`): bindings for web components, mounts for imperative libraries (charts, editors, maps, terminals), and their tests in Chrome. Use when a plan unit says "test <library>'s elements", when a frontend target needs a mount, or when a binding misbehaves in a real app.
---

# Effectify a frontend library

`pnpm effectify make <target> --ui` makes a frontend facade: a package for [Effect UI](https://ui.effect.website) (`@effect/ui`, public preview, installed from its snapshot build). There are two kinds of library, and most of the work differs between them.

| Kind | Examples | What the engine generates | What you write |
| --- | --- | --- | --- |
| Web components with a Custom Elements Manifest | Web Awesome, Material Web, media-chrome, Fluent UI | One `Html.customElement` binding per element (`src/elements/<Name>.ts`), properties and events typed by upstream's `HTMLElementTagNameMap` and `GlobalEventHandlersEventMap`; a `<Name>Changes` mount per form control; a smoke test rendering every element | Behaviour tests per group of elements |
| Imperative | Chart.js, CodeMirror, MapLibre GL, xterm.js | The runtime (`src/internal/ui.ts`), the index and the harness; no elements | One mount per instance kind (`src/mounts/<Name>.ts`), and its test |

Everything under `src/` is generated except `src/mounts/`. Tests and fixtures are yours and survive regeneration.

## Mounts (imperative libraries)

A mount keeps one upstream instance on the element it renders into. Build it with `instanceMount` from `../internal/ui.ts`; the reference is `targets/chart.js/package/src/mounts/Chart.ts`:

```ts
export const ChartMount = instanceMount(
	"Chart",
	{ args: { config: typed<ChartConfiguration>() } },
	{
		create: (canvas: HTMLCanvasElement, { config }) => new Chart(canvas, config),
		update: (chart, { config }) => {
			chart.data = config.data;
			chart.update();
		},
		release: (chart) => chart.destroy(),
		events: (chart, emit: (click: ChartClick) => void) => {
			chart.canvas.addEventListener("click", listener);
			return () => chart.canvas.removeEventListener("click", listener);
		},
	},
);
```

- **args** are typed with `typed<UpstreamType>()`: upstream's own type, never restated, never validated (the library checks its input).
- **create** gets the committed element and the first args. **release** is upstream's own teardown (`destroy`, `dispose`, `remove`); it runs when the element leaves the view.
- **update** applies new args to the live instance when upstream can (set data, dispatch a transaction, `setStyle`), so state the view does not own (scroll, selection, camera, animation) survives. Leave it out only when upstream has no way to update in place: the instance is then released and created again on every change.
- **events** subscribes to upstream's callbacks or listeners, `emit`s plain data (indices, values, never upstream objects that hold the instance), and returns the unsubscribe. A view maps it to its messages with `Mount.map`.
- `create` is called with the first args, and `update` only with args that differ from the ones the instance holds.
- Packages the mount imports besides upstream go in `recipe.ui.dependencies`, at upstream's own range (CodeMirror's `@codemirror/state`: a second copy would reject the editor's extensions), with a decision.
- A mount may import its library's stylesheet (`import "@xterm/xterm/css/xterm.css"`) when the library lays itself out with it; say so in a comment. A library that loads a worker from beside its own module (MapLibre) needs the app to set the worker's URL under a bundler: the fixture does it and the README says so.
- Register it: add the mount's name to `recipe.ui.mounts`, with a decision (`by: "agent"`) saying what the instance is bound to and how it updates. `reconcile` adds it to the index.
- Register upstream's plug-ins in the mount's module when a config can name any of them (`Chart.register(...registerables)`), and say so in a comment: it costs bundle size, and an app that wants less writes its own mount.

## Bindings (web components)

Bindings are generated; judgment goes into the recipe and the tests.

- An element, property or event the binding should not offer goes in `recipe.methods` as `"<tag>": "exclude"`, `"<tag>.<property>": "exclude"` or `"<tag>@<event>": "exclude"` (a manifest that recorded a variable's name as an event), with a decision. The engine reads members and events through each element's superclasses and mixins in the manifest, and names each definition module through the package's `exports`.
- A tag missing from upstream's `HTMLElementTagNameMap` is typed `Record<string, unknown>` and listed in `recipe.derived`: report it, since upstream should declare it.
- Native `input` and `change` on a custom element are typed `never` by Effect UI: its payload reads only `value`. Use the generated `<Name>Changes` mount, which reports the element's own state (`value`, `checked`, ...) typed by upstream: `Input(h).onMount(InputChanges({}).pipe(Mount.map(({ value }) => Message.ChangedName({ name: String(value ?? "") }))))`.
- **Controlled state syncs on the event that says it is done.** An element that animates open or closed fires a request event first (`wa-hide`) and a completion event after (`wa-after-hide`). Set the Model from the completion event: setting `open` to false while the element is still closing is a second request to close, and the request event fires again.

## Tests in Chrome

Each test opens a fixture: `test/fixtures/<name>.html` plus `<name>.ts`, an Effect UI component that uses the facade the way an app would. `test/support/browser.ts` (generated) serves the fixtures with Vite and opens one in Chrome through `@effectified/puppeteer-core`. References: `targets/awesome.me__webawesome/package/test/form.test.ts` and `targets/chart.js/package/test/chart.test.ts`.

- The fixture prints its Model into `<output id="state">`, and exposes upstream on `window` when the test must read an instance (`window.Chart = Chart`, declared with `declare global`).
- The fixture page carries `<link rel="icon" href="data:," />`: the test asserts the page logged no errors, and a missing favicon is one.
- Drive the page as a user: `page.click`, `page.keyboard.type`, `page.keyboard.press`, `page.mouse.click` at coordinates read from the library itself (a bar's position from the chart, not a guess).
- Wait for state with `page.waitForFunction`, never a sleep: `it.effect` runs on the TestClock, where `Effect.sleep` never ends.
- Assert, in this order: the Model after each interaction; that an update kept the same instance (a mount with `update`); that removing the element released the instance (upstream's registry is empty, its listeners gone); and `expect(errors).toStrictEqual([])`.
- Page results cross the browser boundary as data: return JSON strings or numbers from `page.evaluate` and parse them in the test.

## When the binding is wrong

Do not edit generated files, and do not work around a binding in a fixture. If a binding cannot express what the element needs (a property typed wrongly, an event Effect UI cannot carry), record it in the recipe when an override fixes it; otherwise it is an engine gap (`effectify-engine` (in effectified/engine)): report it with the fixture that shows it.

## Examples and the live demo

Every fixture page (`test/fixtures/<name>.html` with its `.ts`) is also the facade's demo: `npm run demo -- <directory>` builds them with Vite, the release attaches the build, and the facade's page on effectified.dev runs it beside the example. Mark the fixture's component and its mount line with `// #region example: <title>` ... `// #endregion` (leave test hooks such as `window.Chart = Chart` outside): that code is shown next to the demo it runs. A fixture is read by people now, so its controls say what they do.

## Done

`pnpm effectify reconcile <target>` (which type checks fixtures and tests) and `pnpm effectify test <target>` pass with Chrome (`CHROME_BIN`, or the default macOS install).
