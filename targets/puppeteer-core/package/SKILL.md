---
name: effectified-puppeteer-core
description: Write Effect code that uses puppeteer-core through @effectified/puppeteer-core. Use when an Effect program needs puppeteer-core, or code calling puppeteer-core moves onto Effect: what the facade offers, how its Effects, scopes and errors work, and tested examples.
---

# puppeteer-core through @effectified/puppeteer-core

16 handles, scoped browser and pages, generics kept through a call.

puppeteer-core in Effect: its async calls as traced Effects, absent values as Options, its iterables as Streams, its resources scoped, its failures tagged. Generated from puppeteer-core's own types (this copy: 25.19.6, for puppeteer-core 25.19.0), so its types are upstream's and a call the facade does not change behaves as upstream documents.

## Install

```sh
pnpm add @effectified/puppeteer-core effect
```

## Rules

- Import from `@effectified/puppeteer-core`, not from `puppeteer-core`. puppeteer-core's types are re-exported by their own names (`import type { ... } from "@effectified/puppeteer-core"`), and all of it is `Upstream`.
- An async call returns an `Effect`, traced as `<Handle>.<method>` (a span and a stack frame per call, as `Effect.fn`): run it with `yield*` inside `Effect.gen` or your own `Effect.fn`. An async iterable is a `Stream`; a handle a call returns is a facade too. A synchronous call stays synchronous (a builder chain stays a chain).
- A value upstream may not have (`T | null`, `T | undefined`) is an `Option`, of the facade when it is a handle: `Page.$`, `Page.goBack`, `Page.goForward`, `Page.goto`, `Page.reload`, `Page.tabInfo`, `Page.waitForNavigation`, `Page.waitForSelector` and 15 more (see the API). Take it apart with `Option.match` or `Effect.flatMap(Option.match({ ... }))`, never a null check.
- Scoped: acquiring a `Browser`, a `BrowserContext`, a `Page`, a `Target`, a `CDPSession`, a `JSHandle`, a `ElementHandle`, a `ScreenRecorder`, a `ScreenRecording`, a `TouchHandle` needs a `Scope` (`Effect.scoped`, or a layer), and closing the scope calls its release (`Browser.close`, `BrowserContext.close`, `Page.close`, `Target.close`, `CDPSession.detach`, `JSHandle.dispose`, `ElementHandle.dispose`, `ScreenRecorder.stop`, `ScreenRecording.stop`, `TouchHandle.end`), even when you called that release yourself. Call a release yourself only when you need its result or its failure: the scope's release is then a second call, and when it fails (the handle is closed already) it is logged as a warning, `<Handle>.<release> failed while its scope closed`, and the scope still closes. A lookup (`Browser.pages`, `Browser.waitForTarget`, `BrowserContext.pages`, `BrowserContext.waitForTarget`, `Page.openDevTools`, `Target.asPage`, `Target.page`, `ElementHandle.toElement`) returns one puppeteer-core already holds: it needs no `Scope`, and the facade never releases it. A synchronous call that makes one hands you its facade, release methods and all: release it yourself. A handle puppeteer-core already holds (a lookup's, the receiver a chained call returns, a property's) is borrowed: its facade has no release method, which is its owner's.
- Services: `PuppeteerBrowser` (a `Browser`). Provide one at the program's edge with `<Service>.layer(<acquiring Effect>)` and read it with `yield* <Service>`.
- Failures are branded `Schema.TaggedError`s: `ConnectionClosedError`, `ProtocolError`, `TimeoutError`, `TouchError`, `UnsupportedOperation`, and `PuppeteerError` for any other failure. Handle one with `Effect.catchTag("<Tag>", ...)`; each carries `operation` (`"<Handle>.<method>"`), `message`, upstream's `code` when it has one, the fields upstream's error declares, and upstream's failure as `cause`, `Redacted` (`Redacted.value(error.cause)`), printed nowhere. `Failure` is the Schema of every one: `Failure.match(error, { <Tag>: ... })`, `Failure.guards.<Tag>(value)`.
- `PuppeteerError` carries `reason`, upstream's code as a tagged union (`ESCAPED_CHAR`, `EACCES`, `EPERM`...): pick one with `Effect.catchReason("PuppeteerError", "ESCAPED_CHAR", (reason, error) => ...)`.
- Events are Streams: `events.<Handle>.<event>(handle)` (`events.WebMCP`), listening for as long as the stream runs. An emitter cannot be paused: pass `{ bufferSize: n }` to keep only the newest `n` for a slow consumer.
- Two facades of one upstream object are `Equal` and hash alike: use them as keys of a `HashMap` or `HashSet`.
- What the facade does not wrap stays reachable: `.upstream` on every facade, `Upstream` for the package. Use them rather than importing `puppeteer-core` again.

## Examples

Each is code from a test that passes in CI.

### Drive a page in a scoped browser

```ts
import { launch } from "@effectified/puppeteer-core";

// The browser and its pages close when the scope does.
const browser = yield* launch(options);
const page = yield* browser.newPage();
yield* page.setContent("<title>effectified</title><h1>Hello</h1><input id=name>");
// page.keyboard is a facade too: a handle held in a property.
yield* page.focus("#name");
yield* page.keyboard.type("Ada");
// `$eval` keeps its type parameters: the selector types the element, the function's result the value.
const name: string = yield* page.$eval("input#name", (input) => input.value);
```

From `test/facade.test.ts`.

### A timeout is a TimeoutError

```ts
import { Effect } from "effect";
import { TimeoutError } from "@effectified/puppeteer-core";

const found = yield* page.waitForSelector("#never", { timeout: 100 }).pipe(
	Effect.as(true),
	Effect.catchTag("TimeoutError", () => Effect.succeed(false)),
);
```

From `test/facade.test.ts`.

### A query that may find nothing is an Option

```ts
import { Effect, Option } from "effect";

// `page.$` resolves to `ElementHandle | null` upstream: an Option of the element's facade here.
const missing = yield* page.$("#missing");
const label = yield* page.$("#go").pipe(
	Effect.flatMap(Option.match({ onNone: () => Effect.succeed("none"), onSome: (button) => button.evaluate((node) => node.textContent ?? "") })),
);
// missing: Option.none(), label: "Go"
```

From `test/facade.test.ts`.

## API

Exports: `launch`.

Services: `PuppeteerBrowser` (a `Browser`, from `launch`).

| Error | From | Reasons |
|---|---|---|
| `ConnectionClosedError` | `ConnectionClosedError` | – |
| `ProtocolError` | `ProtocolError` | – |
| `TimeoutError` | `TimeoutError` | – |
| `TouchError` | `TouchError` | – |
| `UnsupportedOperation` | `UnsupportedOperation` | – |
| `PuppeteerError` | any other failure | `ESCAPED_CHAR`, `EACCES`, `EPERM` |

| Handle | Effects | Of an `Option` | Streams | Events | Released by |
|---|---|---|---|---|---|
| `Browser` | `addScreen`, `close`, `cookies`, `createBrowserContext`, `deleteCookie`, `deleteMatchingCookies`, `disconnect`, `extensions`, `getPWAState`, `getWindowBounds`, `installExtension`, `installPWA`, `launchPWA`, `newPage`, `pages`, `removeScreen`, `restrictNetwork`, `screens`, `setCookie`, `setPermission`, `setWindowBounds`, `uninstallExtension`, `uninstallPWA`, `userAgent`, `version`, `waitForTarget` | – | – | – | `close` |
| `BrowserContext` | `clearPermissionOverrides`, `close`, `cookies`, `deleteCookie`, `deleteMatchingCookies`, `newPage`, `overridePermissions`, `pages`, `setCookie`, `setPermission`, `waitForTarget` | – | – | – | `close` |
| `Page` | `$`, `$$`, `$$eval`, `$eval`, `addScriptTag`, `addStyleTag`, `authenticate`, `bringToFront`, `captureHeapSnapshot`, `click`, `close`, `content`, `cookies`, `createCDPSession`, `createPDFStream`, `deleteCookie`, `emulate`, `emulateCPUThrottling`, `emulateFocusedPage`, `emulateIdleState`, `emulateLocale`, `emulateMediaFeatures`, `emulateMediaType`, `emulateNetworkConditions`, `emulateTimezone`, `emulateVisionDeficiency`, `evaluate`, `evaluateHandle`, `evaluateOnNewDocument`, `exposeFunction`, `focus`, `goBack`, `goForward`, `goto`, `hasDevTools`, `hover`, `metrics`, `openDevTools`, `pdf`, `queryObjects`, `record`, `reload`, `removeExposedFunction`, `removeScriptToEvaluateOnNewDocument`, `resize`, `screencast`, `screenshot`, `select`, `setBypassCSP`, `setBypassServiceWorker`, `setCacheEnabled`, `setContent`, `setCookie`, `setDragInterception`, `setExtraHTTPHeaders`, `setGeolocation`, `setJavaScriptEnabled`, `setOfflineMode`, `setRequestInterception`, `setUserAgent`, `setViewport`, `tabInfo`, `tap`, `title`, `triggerExtensionAction`, `type`, `waitForDevicePrompt`, `waitForFileChooser`, `waitForFrame`, `waitForFunction`, `waitForNavigation`, `waitForNetworkIdle`, `waitForRequest`, `waitForResponse`, `waitForSelector`, `windowId` | `$`, `goBack`, `goForward`, `goto`, `reload`, `tabInfo`, `waitForNavigation`, `waitForSelector` | – | – | `close` |
| `Target` | `asPage`, `close`, `createCDPSession`, `page`, `worker` | `page`, `worker` | – | – | `close` |
| `FileChooser` | `accept`, `cancel` | – | – | – | – |
| `Frame` | `$`, `$$`, `$$eval`, `$eval`, `addScriptTag`, `addStyleTag`, `click`, `content`, `evaluate`, `evaluateHandle`, `focus`, `frameElement`, `goto`, `hover`, `select`, `setContent`, `tap`, `title`, `type`, `waitForFunction`, `waitForNavigation`, `waitForSelector` | `$`, `frameElement`, `goto`, `waitForNavigation`, `waitForSelector` | – | – | – |
| `CDPSession` | `detach`, `send` | – | – | – | `detach` |
| `Locator` | `click`, `fill`, `hover`, `scroll`, `wait`, `waitHandle` | – | – | – | – |
| `JSHandle` | `dispose`, `evaluate`, `evaluateHandle`, `getProperties`, `getProperty`, `jsonValue` | – | – | – | `dispose` |
| `ElementHandle` | `$`, `$$`, `$$eval`, `$eval`, `autofill`, `backendNodeId`, `boundingBox`, `boxModel`, `click`, `clickablePoint`, `contentFrame`, `dispose`, `drag`, `dragAndDrop`, `dragEnter`, `dragOver`, `drop`, `evaluate`, `evaluateHandle`, `focus`, `getProperties`, `getProperty`, `hover`, `isHidden`, `isIntersectingViewport`, `isVisible`, `jsonValue`, `press`, `screenshot`, `scrollIntoView`, `select`, `tap`, `toElement`, `touchEnd`, `touchMove`, `touchStart`, `type`, `uploadFile`, `waitForSelector` | `$`, `boundingBox`, `boxModel`, `waitForSelector` | – | – | `dispose` |
| `HTTPRequest` | `abort`, `asFetchRequest`, `content`, `continue`, `fetchPostData`, `finalizeInterceptions`, `respond` | `content`, `fetchPostData` | – | – | – |
| `HTTPResponse` | `asFetchResponse`, `buffer`, `content`, `json`, `stream`, `text` | – | – | – | – |
| `ScreenRecorder` | `stop` | – | – | – | `stop` |
| `ScreenRecording` | `pipe`, `stop` | – | – | – | `stop` |
| `DeviceRequestPrompt` | `cancel`, `select`, `waitForDevice` | – | – | – | – |
| `Keyboard` | `down`, `press`, `sendCharacter`, `type`, `up` | – | – | – | – |
| `Touchscreen` | `tap`, `touchEnd`, `touchMove`, `touchStart` | – | – | – | – |
| `Coverage` | `startCSSCoverage`, `startJSCoverage`, `stopCSSCoverage`, `stopJSCoverage` | – | – | – | – |
| `Tracing` | `start`, `stop` | `stop` | – | – | – |
| `WebMCP` | – | – | – | `toolinvoked`, `toolresponded`, `toolsadded`, `toolsremoved` | – |
| `Accessibility` | `snapshot` | `snapshot` | – | – | – |
| `Mouse` | `click`, `down`, `drag`, `dragAndDrop`, `dragEnter`, `dragOver`, `drop`, `move`, `reset`, `up`, `wheel` | – | – | – | – |
| `BluetoothEmulation` | `disableEmulation`, `emulateAdapter`, `simulatePreconnectedPeripheral` | – | – | – | – |
| `TouchHandle` | `end`, `move` | – | – | – | `end` |

More: https://effectified.dev/puppeteer-core
