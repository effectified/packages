---
name: effectified-puppeteer-core
description: Write Effect code that uses puppeteer-core through @effectified/puppeteer-core. Use when an Effect program needs puppeteer-core, or code calling puppeteer-core moves onto Effect: what the facade offers, how its Effects, scopes and errors work, and tested examples.
---

# puppeteer-core through @effectified/puppeteer-core

16 handles, scoped browser and pages, generics kept through a call.

puppeteer-core in Effect: its async calls as Effects, its iterables as Streams, its resources scoped, its failures tagged. Generated from puppeteer-core's own types (this copy: 25.19.0+5, for puppeteer-core 25.19.0), so its types are upstream's and a call the facade does not change behaves as upstream documents.

## Install

```sh
pnpm add https://effectified.dev/puppeteer-core.tgz effect
```

## Rules

- Import from `@effectified/puppeteer-core`, not from `puppeteer-core`. puppeteer-core's types are `Upstream.<Type>` (`import { Upstream } from "@effectified/puppeteer-core"`).
- An async call returns an `Effect`, run with `yield*` inside `Effect.gen`; an async iterable is a `Stream`; a handle a call returns is a facade too. A synchronous call stays synchronous (a builder chain stays a chain).
- Scoped: acquiring a `Browser`, a `BrowserContext`, a `Page`, a `Target`, a `JSHandle`, a `ElementHandle`, a `ScreenRecorder`, a `ScreenRecording`, a `Tracing`, a `TouchHandle` needs a `Scope` (`Effect.scoped`, or a layer), and closing the scope calls its release (`Browser.close`, `BrowserContext.close`, `Page.close`, `Target.close`, `JSHandle.dispose`, `ElementHandle.dispose`, `ScreenRecorder.stop`, `ScreenRecording.stop`, `Tracing.stop`, `TouchHandle.end`). Never call the release yourself.
- Services: `PuppeteerBrowser` (a `Browser`). Provide one at the program's edge with `<Service>.layer(<acquiring Effect>)` and read it with `yield* <Service>`.
- Failures are tagged: `ConnectionClosedError`, `ProtocolError`, `TimeoutError`, `TouchError`, `UnsupportedOperation`, and `PuppeteerError` for any other failure. Handle one with `Effect.catchTag("<Tag>", ...)`; each carries `operation` (`"<Handle>.<method>"`), `message`, upstream's `code` when it has one, and `cause`.
- Events are Streams: `events.<Handle>.<event>(handle)` (`events.WebMCP`), listening for as long as the stream runs.
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

## API

Exports: `launch`.

Services: `PuppeteerBrowser` (a `Browser`, from `launch`).

| Error | From |
|---|---|
| `ConnectionClosedError` | `ConnectionClosedError` |
| `ProtocolError` | `ProtocolError` |
| `TimeoutError` | `TimeoutError` |
| `TouchError` | `TouchError` |
| `UnsupportedOperation` | `UnsupportedOperation` |
| `PuppeteerError` | any other failure, codes `ESCAPED_CHAR`, `EACCES`, `EPERM` |

| Handle | Effects | Streams | Events | Released by |
|---|---|---|---|---|
| `Browser` | `addScreen`, `close`, `cookies`, `createBrowserContext`, `deleteCookie`, `deleteMatchingCookies`, `disconnect`, `extensions`, `getPWAState`, `getWindowBounds`, `installExtension`, `installPWA`, `launchPWA`, `newPage`, `pages`, `removeScreen`, `restrictNetwork`, `screens`, `setCookie`, `setPermission`, `setWindowBounds`, `uninstallExtension`, `uninstallPWA`, `userAgent`, `version`, `waitForTarget` | – | – | `close` |
| `BrowserContext` | `clearPermissionOverrides`, `close`, `cookies`, `deleteCookie`, `deleteMatchingCookies`, `newPage`, `overridePermissions`, `pages`, `setCookie`, `setPermission`, `waitForTarget` | – | – | `close` |
| `Page` | `$`, `$$`, `$$eval`, `$eval`, `addScriptTag`, `addStyleTag`, `authenticate`, `bringToFront`, `captureHeapSnapshot`, `click`, `close`, `content`, `cookies`, `createCDPSession`, `createPDFStream`, `deleteCookie`, `emulate`, `emulateCPUThrottling`, `emulateFocusedPage`, `emulateIdleState`, `emulateLocale`, `emulateMediaFeatures`, `emulateMediaType`, `emulateNetworkConditions`, `emulateTimezone`, `emulateVisionDeficiency`, `evaluate`, `evaluateHandle`, `evaluateOnNewDocument`, `exposeFunction`, `focus`, `goBack`, `goForward`, `goto`, `hasDevTools`, `hover`, `metrics`, `openDevTools`, `pdf`, `queryObjects`, `record`, `reload`, `removeExposedFunction`, `removeScriptToEvaluateOnNewDocument`, `resize`, `screencast`, `screenshot`, `select`, `setBypassCSP`, `setBypassServiceWorker`, `setCacheEnabled`, `setContent`, `setCookie`, `setDragInterception`, `setExtraHTTPHeaders`, `setGeolocation`, `setJavaScriptEnabled`, `setOfflineMode`, `setRequestInterception`, `setUserAgent`, `setViewport`, `tabInfo`, `tap`, `title`, `triggerExtensionAction`, `type`, `waitForDevicePrompt`, `waitForFileChooser`, `waitForFrame`, `waitForFunction`, `waitForNavigation`, `waitForNetworkIdle`, `waitForRequest`, `waitForResponse`, `waitForSelector`, `windowId` | – | – | `close` |
| `Target` | `asPage`, `close`, `createCDPSession`, `page`, `worker` | – | – | `close` |
| `FileChooser` | `accept`, `cancel` | – | – | – |
| `Frame` | `$`, `$$`, `$$eval`, `$eval`, `addScriptTag`, `addStyleTag`, `click`, `content`, `evaluate`, `evaluateHandle`, `focus`, `frameElement`, `goto`, `hover`, `select`, `setContent`, `tap`, `title`, `type`, `waitForFunction`, `waitForNavigation`, `waitForSelector` | – | – | – |
| `CDPSession` | `detach`, `send` | – | – | – |
| `Locator` | `click`, `fill`, `hover`, `scroll`, `wait`, `waitHandle` | – | – | – |
| `JSHandle` | `dispose`, `evaluate`, `evaluateHandle`, `getProperties`, `getProperty`, `jsonValue` | – | – | `dispose` |
| `ElementHandle` | `$`, `$$`, `$$eval`, `$eval`, `autofill`, `backendNodeId`, `boundingBox`, `boxModel`, `click`, `clickablePoint`, `contentFrame`, `dispose`, `drag`, `dragAndDrop`, `dragEnter`, `dragOver`, `drop`, `evaluate`, `evaluateHandle`, `focus`, `getProperties`, `getProperty`, `hover`, `isHidden`, `isIntersectingViewport`, `isVisible`, `jsonValue`, `press`, `screenshot`, `scrollIntoView`, `select`, `tap`, `touchEnd`, `touchMove`, `touchStart`, `type`, `uploadFile`, `waitForSelector` | – | – | `dispose` |
| `HTTPRequest` | `abort`, `asFetchRequest`, `content`, `continue`, `fetchPostData`, `finalizeInterceptions`, `respond` | – | – | – |
| `HTTPResponse` | `asFetchResponse`, `buffer`, `content`, `json`, `stream`, `text` | – | – | – |
| `ScreenRecorder` | `stop` | – | – | `stop` |
| `ScreenRecording` | `pipe`, `stop` | – | – | `stop` |
| `DeviceRequestPrompt` | `cancel`, `select`, `waitForDevice` | – | – | – |
| `Keyboard` | `down`, `press`, `sendCharacter`, `type`, `up` | – | – | – |
| `Touchscreen` | `tap`, `touchEnd`, `touchMove`, `touchStart` | – | – | – |
| `Coverage` | `startCSSCoverage`, `startJSCoverage`, `stopCSSCoverage`, `stopJSCoverage` | – | – | – |
| `Tracing` | `start`, `stop` | – | – | `stop` |
| `WebMCP` | – | – | `toolinvoked`, `toolresponded`, `toolsadded`, `toolsremoved` | – |
| `Accessibility` | `snapshot` | – | – | – |
| `Mouse` | `click`, `down`, `drag`, `dragAndDrop`, `dragEnter`, `dragOver`, `drop`, `move`, `reset`, `up`, `wheel` | – | – | – |
| `BluetoothEmulation` | `disableEmulation`, `emulateAdapter`, `simulatePreconnectedPeripheral` | – | – | – |
| `TouchHandle` | `end`, `move` | – | – | `end` |

More: https://effectified.dev/puppeteer-core
