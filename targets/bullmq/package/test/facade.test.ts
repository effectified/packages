// What the facade does with the real bullmq and a Redis: queues and workers are scoped (closed with their scope),
// queue calls are Effects, and a worker's events are a Stream. Needs REDIS_URL (redis://host:port); skipped without.
// BullMQ in ESM takes a constructed ioredis client, which each test opens and closes in its own scope.
import { describe, expect, it } from "@effect/vitest";
import { Effect, Stream } from "effect";
import { Redis } from "ioredis";
import { BullmqQueue, events, makeQueue, makeWorker } from "../src/index.ts";

const url = process.env["REDIS_URL"];

/** A Redis client for BullMQ (it requires `maxRetriesPerRequest: null`), closed when the scope closes. */
const redis = Effect.acquireRelease(
	Effect.sync(() => new Redis(url ?? "", { maxRetriesPerRequest: null })),
	(client) => Effect.promise(() => client.quit()),
);

describe.skipIf(url === undefined)("@effectified/bullmq", () => {
	it.effect("adds a job, processes it, and streams the worker's completed event", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const name = `effectified-${Date.now()}`;
				// #region example: A queue, a worker, and its events as a Stream
				// Queue and worker close with the scope.
				const queue = yield* makeQueue(name, { connection: yield* redis });
				const worker = yield* makeWorker(name, async (job) => (job.data as { n: number }).n * 2, { connection: yield* redis });
				const completed = events.Worker.completed(worker).pipe(Stream.take(1), Stream.runCollect);
				const [job, emitted] = yield* Effect.all([queue.add("double", { n: 21 }), completed], { concurrency: 2 });
				// Typed by bullmq's own WorkerListener: `completed` is called with the Job and its result.
				const [finished, result] = emitted[0] ?? [];
				// #endregion
				expect(finished?.id).toBe(job.id);
				expect(result).toBe(42);
				expect(yield* queue.getCompletedCount()).toBe(1);
				yield* queue.obliterate({ force: true });
			}),
		),
	);

	it.effect("provides a queue as a service, closed with its layer", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const connection = yield* redis;
				const name = `effectified-service-${Date.now()}`;
				yield* Effect.gen(function* () {
					const queue = yield* BullmqQueue;
					const job = yield* queue.add("hello", { greeting: "hi" });
					expect(job.name).toBe("hello");
					yield* queue.obliterate({ force: true });
				}).pipe(Effect.provide(BullmqQueue.layer(makeQueue(name, { connection }))));
			}),
		),
	);
});
