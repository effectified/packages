---
name: effectified-fluentui-web-components
description: Use @fluentui/web-components in Effect UI apps through @effectified/fluentui-web-components. Use when an Effect UI view renders @fluentui/web-components: what the facade offers, how its bindings and mounts work, and tested examples.
---

# @fluentui/web-components through @effectified/fluentui-web-components

Elements defined through its exports map, a form and a dialog.

@fluentui/web-components for Effect UI: typed bindings and mounts, its events as messages, its instances scoped to their elements. Generated from @fluentui/web-components's own types (this copy: 3.2.6, for @fluentui/web-components 3.2.5), so its types are upstream's and a call the facade does not change behaves as upstream documents.

## Install

```sh
pnpm add @effectified/fluentui-web-components effect https://pkg.pr.new/Effect-TS/ui/@effect/ui@2fd1a57
```

## Rules

- Import from `@effectified/fluentui-web-components`. It runs in [Effect UI](https://ui.effect.website) views (`Html.component`), installed from its snapshot build.
- Elements are bindings: `Accordion(h)` renders `<fluent-accordion>`; set its properties as methods (`Accordion(h).expandmode(...)`) and turn its custom events into messages with `.on("<event>", (detail) => Message.X(...))`. Importing a binding defines its element.
- Form controls report their state through their changes mount, not native `input`/`change` (Effect UI types those `never` on custom elements): `Checkbox(h).onMount(CheckboxChanges({}).pipe(Mount.map((state) => Message.X(state))))`, with `value`, `checked`, `indeterminate`.
- Set the Model from the event that says a change is done (an element that animates closed fires a request event, then a completion event): setting it on the request asks again.
- Mounts: `DialogOpenMount`. A mount keeps one @fluentui/web-components instance on the element it renders into: `h.<tag>.onMount(<Name>Mount({ ...args }).pipe(Mount.map(...)))`. New args update the live instance; leaving the view releases it.
- Never reach into the element or instance to change what the Model owns: render the Model, and let messages change it.

## Examples

Each is code from a test that passes in CI.

### A form and a dialog

```ts
import { webLightTheme } from "@fluentui/tokens";
import { setTheme } from "@fluentui/web-components";
import { Mount, UiSchema } from "@effect/ui";
import { BrowserHost, Html } from "@effect/ui/html";
import { Effect, Layer, Schema } from "effect";
import { Button, Checkbox, CheckboxChanges, Dialog, DialogBody, DialogOpen, Switch, SwitchChanges, TextInput, TextInputChanges } from "@effectified/fluentui-web-components";

// Fluent's elements read their colours and sizes from its design tokens: an app sets a theme once.
setTheme(webLightTheme);

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
```

From `test/fixtures/form.ts`.

## API

| Error | From | Reasons |
|---|---|---|
| `WebComponentsError` | any other failure | – |

| Element | Binding | Properties | Events |
|---|---|---|---|
| `<fluent-accordion>` | `Accordion` | `expandmode` | – |
| `<fluent-accordion-item>` | `AccordionItem` | `disabled`, `expanded`, `headinglevel` | – |
| `<fluent-anchor-button>` | `AnchorButton` | `download`, `href`, `hreflang`, `ping`, `referrerpolicy`, `rel`, `role`, `target`, `type` | – |
| `<fluent-avatar>` | `Avatar` | `color`, `colorId`, `initials`, `name`, `role`, `size` | – |
| `<fluent-badge>` | `Badge` | – | – |
| `<fluent-button>` | `Button` | `disabled`, `disabledFocusable`, `formAction`, `formAttribute`, `formEnctype`, `formMethod`, `formNoValidate`, `formTarget`, `name`, `role`, `type`, `value` | – |
| `<fluent-checkbox>` | `Checkbox`, `CheckboxChanges` | `checked`, `disabled`, `disabledAttribute`, `formAttribute`, `indeterminate`, `initialChecked`, `initialValue`, `name`, `required`, `role`, `value` | – |
| `<fluent-compound-button>` | `CompoundButton` | `disabled`, `disabledFocusable`, `formAction`, `formAttribute`, `formEnctype`, `formMethod`, `formNoValidate`, `formTarget`, `name`, `role`, `type`, `value` | – |
| `<fluent-counter-badge>` | `CounterBadge` | `appearance`, `color`, `count`, `dot`, `overflowCount`, `shape`, `showZero`, `size` | – |
| `<fluent-dialog>` | `Dialog` | `ariaDescribedby`, `ariaLabel`, `ariaLabelledby`, `type` | – |
| `<fluent-dialog-body>` | `DialogBody` | – | – |
| `<fluent-divider>` | `Divider` | `orientation`, `role` | – |
| `<fluent-drawer>` | `Drawer` | `ariaDescribedby`, `ariaLabelledby`, `role`, `type` | – |
| `<fluent-drawer-body>` | `DrawerBody` | – | – |
| `<fluent-dropdown>` | `Dropdown`, `DropdownChanges` | `ariaLabelledBy`, `disabled`, `id`, `initialValue`, `multiple`, `name`, `open`, `placeholder`, `required`, `role`, `type`, `value` | – |
| `<fluent-field>` | `Field` | `role` | – |
| `<fluent-image>` | `Image` | – | – |
| `<fluent-label>` | `Label` | `required` | – |
| `<fluent-link>` | `Link` | `download`, `href`, `hreflang`, `ping`, `referrerpolicy`, `rel`, `role`, `target`, `type` | – |
| `<fluent-listbox>` | `Listbox` | `multiple`, `role` | – |
| `<fluent-menu>` | `Menu` | `closeOnScroll`, `openOnContext`, `openOnHover`, `persistOnItemClick` | – |
| `<fluent-menu-button>` | `MenuButton` | `disabled`, `disabledFocusable`, `formAction`, `formAttribute`, `formEnctype`, `formMethod`, `formNoValidate`, `formTarget`, `name`, `role`, `type`, `value` | – |
| `<fluent-menu-item>` | `MenuItem`, `MenuItemChanges` | `checked`, `disabled`, `hidden`, `role` | – |
| `<fluent-menu-list>` | `MenuList` | `role` | – |
| `<fluent-message-bar>` | `MessageBar` | `role` | `dismiss` |
| `<fluent-progress-bar>` | `ProgressBar` | `max`, `min`, `role`, `value` | – |
| `<fluent-radio>` | `Radio`, `RadioChanges` | `checked`, `disabled`, `disabledAttribute`, `formAttribute`, `initialChecked`, `initialValue`, `name`, `required`, `role`, `value` | `disabled` |
| `<fluent-radio-group>` | `RadioGroup`, `RadioGroupChanges` | `ariaOrientation`, `disabled`, `initialValue`, `name`, `orientation`, `required`, `role`, `value` | – |
| `<fluent-rating-display>` | `RatingDisplay` | `count`, `iconViewBox`, `max`, `role`, `value` | – |
| `<fluent-slider>` | `Slider`, `SliderChanges` | `ariaOrientation`, `disabled`, `initialValue`, `max`, `min`, `mode`, `orientation`, `role`, `step`, `value`, `valueAsNumber` | – |
| `<fluent-spinner>` | `Spinner` | `role` | – |
| `<fluent-switch>` | `Switch`, `SwitchChanges` | `checked`, `disabled`, `disabledAttribute`, `formAttribute`, `initialChecked`, `initialValue`, `name`, `required`, `role`, `value` | – |
| `<fluent-tab>` | `Tab` | `disabled`, `role` | – |
| `<fluent-tablist>` | `Tablist` | `activeid`, `ariaOrientation`, `disabled`, `orientation`, `role` | – |
| `<fluent-text>` | `Text` | – | – |
| `<fluent-text-input>` | `TextInput`, `TextInputChanges` | `autocomplete`, `currentValue`, `dirname`, `disabled`, `formAttribute`, `initialValue`, `list`, `maxlength`, `minlength`, `multiple`, `name`, `pattern`, `placeholder`, `readOnly`, `required`, `size`, `spellcheck`, `type`, `value` | – |
| `<fluent-toggle-button>` | `ToggleButton` | `disabled`, `disabledFocusable`, `formAction`, `formAttribute`, `formEnctype`, `formMethod`, `formNoValidate`, `formTarget`, `mixed`, `name`, `pressed`, `role`, `type`, `value` | – |
| `<fluent-tooltip>` | `Tooltip` | `anchor`, `delay`, `id`, `positioning`, `role` | – |
| `<fluent-tree>` | `Tree` | `appearance`, `role`, `size` | – |
| `<fluent-tree-item>` | `TreeItem`, `TreeItemChanges` | `appearance`, `empty`, `expanded`, `role`, `selected`, `size` | – |

Mounts: `DialogOpenMount`.

More: https://effectified.dev/fluentui-web-components
