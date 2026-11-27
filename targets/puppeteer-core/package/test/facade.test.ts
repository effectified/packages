// What the facade does with the real puppeteer-core and a local Chrome: the browser and its pages are scoped
// (closed when the scope closes), page calls are Effects, a query that may find nothing is an Option, and a timeout is
// the tagged TimeoutError.
// Chrome: CHROME_BIN, else the default macOS install; the suite is skipped when neither exists.
import type { ChildProcess } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { describe, expect, it } from "@effect/vitest";
import { Effect, Equal, Exit, HashSet, Option } from "effect";
import { Failure, launch, PuppeteerBrowser, TimeoutError, type Upstream } from "../src/index.ts";

const executablePath = process.env["CHROME_BIN"] ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const options: Upstream.LaunchOptions = { executablePath, headless: true, args: ["--no-sandbox"] };

/** Whether Chrome's process has exited, waiting up to five seconds for it to. */
const exited = (chrome: ChildProcess | null) =>
	chrome === null || chrome.exitCode !== null || chrome.signalCode !== null
		? Effect.succeed(chrome !== null)
		: Effect.promise(() => once(chrome, "exit")).pipe(Effect.timeoutOption("5 seconds"), Effect.map(Option.isSome));

// A cold Chrome start on a CI runner takes seconds; vitest's 5s default is too short for it.
describe.skipIf(!existsSync(executablePath))("@effectified/puppeteer-core", { timeout: 30_000 }, () => {
	it.effect("drives a page in a scoped browser, closed with its scope", () =>
		Effect.gen(function* () {
			const upstream = yield* Effect.scoped(
				Effect.gen(function* () {
					// #region example: Drive a page in a scoped browser
					// The browser and its pages close when the scope does.
					const browser = yield* launch(options);
					const page = yield* browser.newPage();
					yield* page.setContent("<title>effectified</title><h1>Hello</h1><input id=name>");
					// page.keyboard is a facade too: a handle held in a property.
					yield* page.focus("#name");
					yield* page.keyboard.type("Ada");
					// `$eval` keeps its type parameters: the selector types the element, the function's result the value.
					const name: string = yield* page.$eval("input#name", (input) => input.value);
					// #endregion
					expect(name).toBe("Ada");
					expect(yield* page.title()).toBe("effectified");
					const heading: string | null = yield* page.$eval("h1", (element) => element.textContent);
					expect(heading).toBe("Hello");
					return browser.upstream;
				}),
			);
			expect(upstream.connected).toBe(false);
		}),
	);

	it.effect("fails with TimeoutError when a selector never appears", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const browser = yield* launch(options);
				const page = yield* browser.newPage();
				// #region example: A timeout is a TimeoutError
				const found = yield* page.waitForSelector("#never", { timeout: 100 }).pipe(
					Effect.as(true),
					Effect.catchTag("TimeoutError", () => Effect.succeed(false)),
				);
				// #endregion
				expect(found).toBe(false);
				const error = yield* Effect.flip(page.waitForSelector("#never", { timeout: 100 }));
				expect(error).toBeInstanceOf(TimeoutError);
				expect(Failure.guards.TimeoutError(error)).toBe(true);
				expect(error._tag).toBe("TimeoutError");
				expect(error.operation).toBe("Page.waitForSelector");
			}),
		),
	);

	it.effect("resolves a query that may find nothing to an Option of the element's facade", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const browser = yield* launch(options);
				const page = yield* browser.newPage();
				yield* page.setContent("<button id=go>Go</button>");
				// #region example: A query that may find nothing is an Option
				// `page.$` resolves to `ElementHandle | null` upstream: an Option of the element's facade here.
				const missing = yield* page.$("#missing");
				const label = yield* page.$("#go").pipe(
					Effect.flatMap(Option.match({ onNone: () => Effect.succeed("none"), onSome: (button) => button.evaluate((node) => node.textContent ?? "") })),
				);
				// missing: Option.none(), label: "Go"
				// #endregion
				expect(Option.isNone(missing)).toBe(true);
				expect(label).toBe("Go");
				// Two facades of one upstream frame are Equal and hash alike: a facade is a key by its upstream's identity.
				expect(Equal.equals(page.mainFrame(), page.mainFrame())).toBe(true);
				expect(HashSet.size(HashSet.make(page.mainFrame(), page.mainFrame()))).toBe(1);
			}),
		),
	);

	it.effect("finds a target's page without taking it over: the page stays its owner's", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const browser = yield* launch(options);
				const page = yield* browser.newPage();
				// `Target.page()` returns the page puppeteer holds for its target: a lookup, which needs no Scope and
				// never closes the page. Leaving this inner scope leaves the page open.
				const found = yield* Effect.scoped(page.target().page());
				expect(Option.map(found, (same) => Equal.equals(same, page))).toStrictEqual(Option.some(true));
				// A borrowed page has no `close`, in its type or at run time: closing is its owner's, `page`'s scope.
				const borrowed = Option.getOrThrow(found);
				expect("close" in borrowed).toBe(false);
				expect(yield* borrowed.evaluate(() => 2 + 2)).toBe(4);
				// The same for a page reached synchronously: a frame's page is one the frame's owner holds.
				expect("close" in page.mainFrame().page()).toBe(false);
				expect(page.isClosed()).toBe(false);
				expect(yield* page.evaluate(() => 1 + 1)).toBe(2);
			}),
		),
	);

	it.effect("lists the browser's pages and a page's frames as borrowed facades: closing stays the owners'", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const browser = yield* launch(options);
				const page = yield* browser.newPage();
				// `browser.pages()` hands out the pages the browser holds, this scoped one among them: facades without `close`,
				// so a caller of `pages()` cannot close a page whose owner's scope will. It needs no Scope of its own.
				const pages = yield* Effect.scoped(browser.pages());
				expect(pages.some((listed) => Equal.equals(listed, page))).toBe(true);
				expect(pages.map((listed) => "close" in listed)).toStrictEqual(pages.map(() => false));
				expect(page.isClosed()).toBe(false);
				// A page's frames, a synchronous list, are borrowed facades as well.
				expect(page.frames().map((frame) => Equal.equals(frame, page.mainFrame()))).toStrictEqual([true]);
			}),
		),
	);

	it.effect("acquires the elements `$$` finds in the caller's scope, each disposed when the scope closes", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const browser = yield* launch(options);
				const page = yield* browser.newPage();
				yield* page.setContent("<p>one</p><p>two</p>");
				// `$$` makes a handle per element, as `$` makes one: each is acquired in the scope around the call, its facade
				// keeping `dispose`.
				const paragraphs = yield* Effect.scoped(
					Effect.gen(function* () {
						const found = yield* page.$$("p");
						expect(yield* Effect.forEach(found, (paragraph) => paragraph.evaluate((node) => node.textContent ?? ""))).toStrictEqual(["one", "two"]);
						expect(found.map((paragraph) => "dispose" in paragraph)).toStrictEqual([true, true]);
						return found;
					}),
				);
				// Each handle was disposed as the scope closed: using one now fails.
				const exits = yield* Effect.forEach(paragraphs, (paragraph) => Effect.exit(paragraph.evaluate((node) => node.textContent)));
				expect(exits.map(Exit.isFailure)).toStrictEqual([true, true]);
				expect(page.isClosed()).toBe(false);
			}),
		),
	);

	it.effect("disposes each handle `$$` made once as its scope closes, one the caller disposed through its facade too", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const browser = yield* launch(options);
				const page = yield* browser.newPage();
				yield* page.setContent("<p>one</p><p>two</p>");
				// Counts the calls of puppeteer's own `dispose` on each element handle, whoever makes them.
				const calls = new Map<unknown, number>();
				const probe = Option.getOrThrow(yield* page.$("p"));
				const prototype: { dispose: (this: unknown) => Promise<void> } = Object.getPrototypeOf(probe.upstream);
				const dispose = prototype.dispose;
				yield* Effect.acquireRelease(
					Effect.sync(() => {
						prototype.dispose = function (this: unknown) {
							calls.set(this, (calls.get(this) ?? 0) + 1);
							return dispose.call(this);
						};
					}),
					() => Effect.sync(() => (prototype.dispose = dispose)),
				);
				const made = yield* Effect.scoped(
					Effect.gen(function* () {
						const found = yield* page.$$("p");
						// Disposed through its facade while the scope is open: the scope still disposes it as it closes, as
						// Effect's `acquireRelease` does, and puppeteer's second `dispose` returns at once.
						yield* found[0]!.dispose();
						return found.map((paragraph) => paragraph.upstream);
					}),
				);
				// The first by the caller and by the scope, the second by the scope.
				expect(made.map((handle) => calls.get(handle))).toStrictEqual([2, 1]);
			}),
		),
	);

	it.effect("acquires the handle `evaluateHandle`, `waitForFunction` and `Locator.waitHandle` make: the facade of the element or value it is", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const browser = yield* launch(options);
				const page = yield* browser.newPage();
				yield* page.setContent("<p id=one>one</p>");
				const made = yield* Effect.scoped(
					Effect.gen(function* () {
						// A DOM node is the facade of an ElementHandle, any other value of a JSHandle: each the caller's, with `dispose`.
						const body = yield* page.evaluateHandle(() => document.body);
						// An object, which the page holds: a primitive's handle answers from its copy even once disposed.
						const two = yield* page.mainFrame().evaluateHandle(() => ({ answer: 2 }));
						const ready = yield* page.waitForFunction(() => document.querySelector("#one"));
						const located = yield* page.locator("#one").waitHandle();
						const handles = [body, two, ready, located];
						expect(handles.map((handle) => handle.upstream !== undefined && "dispose" in handle)).toStrictEqual([true, true, true, true]);
						expect(handles.map((handle) => "click" in handle)).toStrictEqual([true, false, true, true]);
						expect(yield* two.jsonValue()).toStrictEqual({ answer: 2 });
						return handles.map((handle) => handle.upstream);
					}),
				);
				// Each was disposed as the scope that made it closed: using one now fails.
				const used = yield* Effect.forEach(made, (handle) => Effect.exit(Effect.promise(() => handle.jsonValue())));
				expect(used.map(Exit.isFailure)).toStrictEqual([true, true, true, true]);
			}),
		),
	);

	it.effect("borrows the handle `asElement` and `toElement` give back, the receiver: the scope that made it disposes it", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const browser = yield* launch(options);
				const page = yield* browser.newPage();
				yield* page.setContent("<a id=link href=#top>link</a>");
				const made = yield* Effect.scoped(
					Effect.gen(function* () {
						const link = Option.getOrThrow(yield* page.$("#link"));
						const value = yield* page.evaluateHandle(() => document.querySelector("#link"));
						// `page.$` types the element as the facade of either handle it may be: `toElement` is an element's.
						const anchor = "toElement" in link ? yield* link.toElement("a") : null;
						const viewed = [link.asElement(), anchor, value.asElement()];
						// Each is a facade of the handle it was called on, without `dispose`: releasing it stays with its maker.
						expect(viewed.map((handle) => handle?.upstream)).toStrictEqual([link.upstream, link.upstream, value.upstream]);
						expect(viewed.map((handle) => handle !== null && "dispose" in handle)).toStrictEqual([false, false, false]);
						// The facade of the element it is: an ElementHandle's, whatever the receiver's facade was.
						expect(viewed.map((handle) => handle !== null && "click" in handle)).toStrictEqual([true, true, true]);
						return [link.upstream, value.upstream];
					}),
				);
				// Disposed once each, by the scope that made it: using one now fails.
				const used = yield* Effect.forEach(made, (handle) => Effect.exit(Effect.promise(() => handle.jsonValue())));
				expect(used.map(Exit.isFailure)).toStrictEqual([true, true]);
			}),
		),
	);

	// Live: the wait for Chrome's exit is a real deadline, which the TestClock of `it.effect` would never reach.
	it.live("closes Chrome after `disconnect`, as its scope closes and through `close`", () =>
		Effect.scoped(
			Effect.gen(function* () {
				// Each Chrome this test starts is killed as it ends, whatever the facade did: a regression leaks no process.
				const started: Array<ChildProcess> = [];
				yield* Effect.addFinalizer(() => Effect.sync(() => started.forEach((chrome) => chrome.kill("SIGKILL"))));
				const chromeOf = (browser: Upstream.Browser) => {
					const chrome = browser.process();
					if (chrome !== null) started.push(chrome);
					return chrome;
				};
				// `disconnect` lets go of Chrome without closing it: the browser's release is still `close`, which the scope runs.
				const leftToScope = yield* Effect.scoped(
					Effect.gen(function* () {
						const browser = yield* launch(options);
						const chrome = chromeOf(browser.upstream);
						yield* browser.disconnect();
						return chrome;
					}),
				);
				expect(yield* exited(leftToScope)).toBe(true);
				// `close` after `disconnect` closes Chrome then and there.
				const browser = yield* launch(options);
				const chrome = chromeOf(browser.upstream);
				yield* browser.disconnect();
				yield* browser.close();
				expect(yield* exited(chrome)).toBe(true);
			}),
		),
	);

	it.effect("provides the browser as a service", () =>
		Effect.gen(function* () {
			const browser = yield* PuppeteerBrowser;
			expect((yield* browser.version()).length).toBeGreaterThan(0);
		}).pipe(Effect.provide(PuppeteerBrowser.layer(launch(options)))),
	);
});
