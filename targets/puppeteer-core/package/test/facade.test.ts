// What the facade does with the real puppeteer-core and a local Chrome: the browser and its pages are scoped
// (closed when the scope closes), page calls are Effects, and a timeout is the tagged TimeoutError.
// Chrome: CHROME_BIN, else the default macOS install; the suite is skipped when neither exists.
import { existsSync } from "node:fs";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { launch, PuppeteerBrowser, TimeoutError, type Upstream } from "../src/index.ts";

const executablePath = process.env["CHROME_BIN"] ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const options: Upstream.LaunchOptions = { executablePath, headless: true, args: ["--no-sandbox"] };

describe.skipIf(!existsSync(executablePath))("@effectified/puppeteer-core", () => {
	it.effect("drives a page in a scoped browser, closed with its scope", () =>
		Effect.gen(function* () {
			const upstream = yield* Effect.scoped(
				Effect.gen(function* () {
					const browser = yield* launch(options);
					const page = yield* browser.newPage();
					yield* page.setContent("<title>effectified</title><h1>Hello</h1>");
					expect(yield* page.title()).toBe("effectified");
					expect(yield* page.$eval("h1", (element) => element.textContent)).toBe("Hello");
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
				const error = yield* Effect.flip(page.waitForSelector("#never", { timeout: 100 }));
				expect(error).toBeInstanceOf(TimeoutError);
				expect(error._tag).toBe("TimeoutError");
				expect(error.operation).toBe("Page.waitForSelector");
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
