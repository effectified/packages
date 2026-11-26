---
name: effectified-emoji-picker-element
description: Use emoji-picker-element in Effect UI apps through @effectified/emoji-picker-element. Use when an Effect UI view renders emoji-picker-element: what the facade offers, how its bindings and mounts work, and tested examples.
---

# emoji-picker-element through @effectified/emoji-picker-element

A web component bound from its manifest.

emoji-picker-element for Effect UI: typed bindings and mounts, its events as messages, its instances scoped to their elements. Generated from emoji-picker-element's own types (this copy: 1.29.1+3, for emoji-picker-element 1.29.1), so its types are upstream's and a call the facade does not change behaves as upstream documents.

## Install

```sh
pnpm add https://effectified.dev/emoji-picker-element.tgz effect https://pkg.pr.new/Effect-TS/ui/@effect/ui@2fd1a57
```

## Rules

- Import from `@effectified/emoji-picker-element`. It runs in [Effect UI](https://ui.effect.website) views (`Html.component`), installed from its snapshot build.
- Elements are bindings: `EmojiPicker(h)` renders `<emoji-picker>`; set its properties as methods (`EmojiPicker(h).customEmoji(...)`) and turn its custom events into messages with `.on("<event>", (detail) => Message.X(...))`. Importing a binding defines its element.
- Never reach into the element or instance to change what the Model owns: render the Model, and let messages change it.

## API

| Error | From |
|---|---|
| `EmojiPickerElementError` | any other failure |

| Handle | Effects | Streams | Events | Released by |
|---|---|---|---|---|
| `default` | – | – | – | – |

| Element | Binding | Properties | Events |
|---|---|---|---|
| `<emoji-picker>` | `EmojiPicker` | `customEmoji`, `dataSource`, `i18n`, `locale`, `skinToneEmoji` | `emoji-click`, `emoji-click-sync`, `skin-tone-change` |

More: https://effectified.dev/emoji-picker-element
