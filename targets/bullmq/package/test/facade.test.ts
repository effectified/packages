// What the facade does with the real bullmq and a Redis: queues and workers are scoped (closed with their scope),
// queue calls are Effects, job ids are branded, a lookup that may find nothing is an Option, and a worker's events are
// a Stream. Needs REDIS_URL (redis://host:port); skipped without.
// BullMQ in ESM takes a constructed ioredis client, which each test opens and closes in its own scope.
import { describe, expect, it } from "@effect/vitest";
import { Effect, Option, Stream } from "effect";
import { Redis } from "ioredis";
import { BullmqQueue, events, JobId, makeQueue, makeWorker, Upstream } from "../src/index.ts";

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
				// An emitter cannot be paused: bound the buffer when a consumer may fall behind (the newest are kept).
				const completed = events.Worker.completed(worker, { bufferSize: 16 }).pipe(Stream.take(1), Stream.runCollect);
				const [job, emitted] = yield* Effect.all([queue.add("double", { n: 21 }), completed], { concurrency: 2 });
				// Typed by bullmq's own WorkerListener: `completed` is called with the Job and its result.
				const [finished, result] = emitted[0] ?? [];
				// #endregion
				expect(finished?.id).toBe(job.id);
				expect(result).toBe(42);
				expect(yield* queue.getCompletedCount()).toBe(1);
				// #region example: Job ids are branded, and a lookup that may find nothing is an Option
				// `job.id` is a `JobId`: no other string is taken where a job id is, unless it is made one.
				const found = yield* queue.getJob(job.id ?? JobId.make("unknown"));
				const missing = yield* queue.getJob(JobId.make("no-such-job"));
				// #endregion
				expect(Option.map(found, (stored) => stored.returnvalue)).toStrictEqual(Option.some(42));
				expect(Option.isNone(missing)).toBe(true);
				// The jobs a lookup or a list gives are Job facades, as their types say: bullmq types them `JobBase<T>`, which is a `Job`.
				expect(Option.map(found, (stored) => stored.upstream instanceof Upstream.Job)).toStrictEqual(Option.some(true));
				const done = yield* queue.getCompleted();
				expect(done.map((stored) => [stored.upstream instanceof Upstream.Job, stored.returnvalue])).toStrictEqual([[true, 42]]);
				yield* queue.obliterate({ force: true });
			}),
		),
	);

	it.effect("closes a queue after `disconnect`, as its scope closes and through `close`", () =>
		Effect.scoped(
			Effect.gen(function* () {
				// `disconnect` ends the Redis client the queue was given: each queue here has one of its own, which `quit`
				// could no longer close.
				const ended = Effect.acquireRelease(
					Effect.sync(() => new Redis(url ?? "", { maxRetriesPerRequest: null })),
					(client) => Effect.sync(() => client.disconnect()),
				);
				// bullmq types `closed` protected: read here to see that its `close` ran.
				const closed = (queue: Upstream.Queue) => (queue as unknown as { readonly closed: boolean }).closed;
				// `disconnect` is no `close`: the queue's release is still `close`, which the scope runs.
				const leftToScope = yield* Effect.scoped(
					Effect.gen(function* () {
						const queue = yield* makeQueue(`effectified-disconnect-${Date.now()}`, { connection: yield* ended });
						yield* queue.disconnect();
						return queue.upstream;
					}),
				);
				expect(closed(leftToScope)).toBe(true);
				// `close` after `disconnect` closes the queue then and there.
				const queue = yield* makeQueue(`effectified-disconnect-close-${Date.now()}`, { connection: yield* ended });
				yield* queue.disconnect();
				yield* queue.close();
				expect(closed(queue.upstream)).toBe(true);
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
