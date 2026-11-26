---
name: effectified-bullmq
description: Write Effect code that uses bullmq through @effectified/bullmq. Use when an Effect program needs bullmq, or code calling bullmq moves onto Effect: what the facade offers, how its Effects, scopes and errors work, and tested examples.
---

# bullmq through @effectified/bullmq

Generic constructors, typed event payloads as Streams.

bullmq in Effect: its async calls as Effects, its iterables as Streams, its resources scoped, its failures tagged. Generated from bullmq's own types (this copy: 6.7.10+4, for bullmq 6.7.10), so its types are upstream's and a call the facade does not change behaves as upstream documents.

## Install

```sh
pnpm add https://effectified.dev/bullmq.tgz effect
```

## Rules

- Import from `@effectified/bullmq`, not from `bullmq`. bullmq's types are `Upstream.<Type>` (`import { Upstream } from "@effectified/bullmq"`).
- An async call returns an `Effect`, run with `yield*` inside `Effect.gen`; an async iterable is a `Stream`; a handle a call returns is a facade too. A synchronous call stays synchronous (a builder chain stays a chain).
- Scoped: acquiring a `QueueEvents`, a `FlowProducer`, a `Queue`, a `Worker` needs a `Scope` (`Effect.scoped`, or a layer), and closing the scope calls its release (`QueueEvents.close`, `FlowProducer.close`, `Queue.close`, `Worker.close`). Never call the release yourself.
- Services: `BullmqQueueEvents` (a `QueueEvents`), `BullmqFlowProducer` (a `FlowProducer`), `BullmqQueue` (a `Queue`), `BullmqWorker` (a `Worker`). Provide one at the program's edge with `<Service>.layer(<acquiring Effect>)` and read it with `yield* <Service>`.
- Failures are tagged: `ConnectionClosedError`, `DelayedError`, `RateLimitError`, `RelayError`, `SchemaMigrationRequiredError`, `SchemaVersionMismatchError`, `UnrecoverableError`, `UnsupportedPostgresVersionError`, `WaitingChildrenError`, `WaitingError`, and `BullmqError` for any other failure. Handle one with `Effect.catchTag("<Tag>", ...)`; each carries `operation` (`"<Handle>.<method>"`), `message`, upstream's `code` when it has one, and `cause`.
- Events are Streams: `events.<Handle>.<event>(handle)` (`events.FlowProducer`, `events.Queue`, `events.Worker`), listening for as long as the stream runs.
- What the facade does not wrap stays reachable: `.upstream` on every facade, `Upstream` for the package. Use them rather than importing `bullmq` again.

## Examples

Each is code from a test that passes in CI.

### A queue, a worker, and its events as a Stream

```ts
import { Effect, Stream } from "effect";
import { events, makeQueue, makeWorker } from "@effectified/bullmq";

// Queue and worker close with the scope.
const queue = yield* makeQueue(name, { connection: yield* redis });
const worker = yield* makeWorker(name, async (job) => (job.data as { n: number }).n * 2, { connection: yield* redis });
const completed = events.Worker.completed(worker).pipe(Stream.take(1), Stream.runCollect);
const [job, emitted] = yield* Effect.all([queue.add("double", { n: 21 }), completed], { concurrency: 2 });
// Typed by bullmq's own WorkerListener: `completed` is called with the Job and its result.
const [finished, result] = emitted[0] ?? [];
```

From `test/facade.test.ts`.

## API

Exports: `QueueEvents`, `FlowProducer`, `Queue`, `Worker`.

Services: `BullmqQueueEvents` (a `QueueEvents`, from `QueueEvents`), `BullmqFlowProducer` (a `FlowProducer`, from `FlowProducer`), `BullmqQueue` (a `Queue`, from `Queue`), `BullmqWorker` (a `Worker`, from `Worker`).

| Error | From |
|---|---|
| `ConnectionClosedError` | `ConnectionClosedError` |
| `DelayedError` | `DelayedError` |
| `RateLimitError` | `RateLimitError` |
| `RelayError` | `RelayError` |
| `SchemaMigrationRequiredError` | `SchemaMigrationRequiredError` |
| `SchemaVersionMismatchError` | `SchemaVersionMismatchError` |
| `UnrecoverableError` | `UnrecoverableError` |
| `UnsupportedPostgresVersionError` | `UnsupportedPostgresVersionError` |
| `WaitingChildrenError` | `WaitingChildrenError` |
| `WaitingError` | `WaitingError` |
| `BullmqError` | any other failure, codes `EVALSHA`, `ECONNREFUSED`, `EVAL`, `EXEC`, `EXISTS` |

| Handle | Effects | Streams | Events | Released by |
|---|---|---|---|---|
| `QueueEvents` | `close`, `disconnect`, `run`, `trace`, `waitUntilReady` | – | – | `close` |
| `FlowProducer` | `add`, `addBulk`, `close`, `disconnect`, `getFlow`, `waitUntilReady` | – | `error`, `ioredis:close` | `close` |
| `Queue` | `add`, `addBulk`, `addJobLog`, `clean`, `close`, `count`, `disconnect`, `drain`, `exportPrometheusMetrics`, `getActive`, `getActiveCount`, `getCompleted`, `getCompletedCount`, `getCountsPerPriority`, `getDebounceJobId`, `getDeduplicationJobId`, `getDelayed`, `getDelayedCount`, `getDependencies`, `getFailed`, `getFailedCount`, `getGlobalConcurrency`, `getGlobalRateLimit`, `getJob`, `getJobCountByTypes`, `getJobCounts`, `getJobLogs`, `getJobScheduler`, `getJobSchedulers`, `getJobSchedulersCount`, `getJobState`, `getJobs`, `getMeta`, `getMetrics`, `getPrioritized`, `getPrioritizedCount`, `getQueueEvents`, `getRanges`, `getRateLimitTtl`, `getVersion`, `getWaiting`, `getWaitingChildren`, `getWaitingChildrenCount`, `getWaitingCount`, `getWorkers`, `getWorkersCount`, `isMaxed`, `isPaused`, `obliterate`, `pause`, `promoteJobs`, `rateLimit`, `recordJobCountsMetric`, `remove`, `removeDebounceKey`, `removeDeduplicationKey`, `removeDeprecatedPriorityKey`, `removeGlobalConcurrency`, `removeGlobalRateLimit`, `removeJobScheduler`, `removeOrphanedJobs`, `removeRateLimitKey`, `resume`, `retryJobs`, `setGlobalConcurrency`, `setGlobalRateLimit`, `trace`, `trimEvents`, `updateJobProgress`, `upsertJobScheduler`, `waitUntilReady` | – | `cleaned`, `error`, `ioredis:close`, `paused`, `progress`, `removed`, `resumed`, `waiting` | `close` |
| `Worker` | `close`, `delay`, `disconnect`, `extendJobLocks`, `getNextJob`, `pause`, `processJob`, `rateLimit`, `resume`, `run`, `startStalledCheckTimer`, `trace`, `waitUntilReady` | – | `active`, `closed`, `closing`, `completed`, `drained`, `error`, `failed`, `ioredis:close`, `lockRenewalFailed`, `locksRenewed`, `paused`, `progress`, `ready`, `resumed`, `stalled` | `close` |
| `Job` | `addJob`, `changeDelay`, `changePriority`, `clearLogs`, `extendLock`, `getChildrenValues`, `getDependencies`, `getDependenciesCount`, `getFailedChildrenValues`, `getIgnoredChildrenFailures`, `getState`, `isActive`, `isCompleted`, `isDelayed`, `isFailed`, `isWaiting`, `isWaitingChildren`, `log`, `moveToCompleted`, `moveToDelayed`, `moveToFailed`, `moveToWait`, `moveToWaitingChildren`, `promote`, `remove`, `removeChildDependency`, `removeDeduplicationKey`, `removeUnprocessedChildren`, `retry`, `updateData`, `updateProgress`, `waitUntilFinished` | – | – | – |

More: https://effectified.dev/bullmq
