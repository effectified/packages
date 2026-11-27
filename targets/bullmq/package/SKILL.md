---
name: effectified-bullmq
description: Write Effect code that uses bullmq through @effectified/bullmq. Use when an Effect program needs bullmq, or code calling bullmq moves onto Effect: what the facade offers, how its Effects, scopes and errors work, and tested examples.
---

# bullmq through @effectified/bullmq

Generic constructors, typed event payloads as Streams.

bullmq in Effect: its async calls as traced Effects, absent values as Options, its iterables as Streams, its resources scoped, its failures tagged. Generated from bullmq's own types (this copy: 6.7.5, for bullmq 6.7.10), so its types are upstream's and a call the facade does not change behaves as upstream documents.

## Install

```sh
pnpm add @effectified/bullmq effect
```

## Rules

- Import from `@effectified/bullmq`, not from `bullmq`. bullmq's types are re-exported by their own names (`import type { ... } from "@effectified/bullmq"`), and all of it is `Upstream`.
- An async call returns an `Effect`, traced as `<Handle>.<method>` (a span and a stack frame per call, as `Effect.fn`): run it with `yield*` inside `Effect.gen` or your own `Effect.fn`. An async iterable is a `Stream`; a handle a call returns is a facade too. A synchronous call stays synchronous (a builder chain stays a chain).
- A value upstream may not have (`T | null`, `T | undefined`) is an `Option`, of the facade when it is a handle: `Queue.getDebounceJobId`, `Queue.getDeduplicationJobId`, `Queue.getGlobalConcurrency`, `Queue.getGlobalRateLimit`, `Queue.getJob`, `Queue.getJobScheduler`, `Queue.getVersion`. Take it apart with `Option.match` or `Effect.flatMap(Option.match({ ... }))`, never a null check.
- Scoped: acquiring a `QueueEvents`, a `FlowProducer`, a `Queue`, a `Worker` needs a `Scope` (`Effect.scoped`, or a layer), and closing the scope calls its release (`QueueEvents.close`, `FlowProducer.close`, `Queue.close`, `Worker.close`), even when you called that release yourself. Call a release yourself only when you need its result or its failure: the scope's release is then a second call, and when it fails (the handle is closed already) it is logged as a warning, `<Handle>.<release> failed while its scope closed`, and the scope still closes. A synchronous call that makes one hands you its facade, release methods and all: release it yourself. A handle bullmq already holds (the receiver a chained call returns, a property's) is borrowed: its facade has no release method, which is its owner's.
- Services: `BullmqQueueEvents` (a `QueueEvents`), `BullmqFlowProducer` (a `FlowProducer`), `BullmqQueue` (a `Queue`), `BullmqWorker` (a `Worker`). Provide one at the program's edge with `<Service>.layer(<acquiring Effect>)` and read it with `yield* <Service>`.
- Failures are branded `Schema.TaggedError`s: `ConnectionClosedError`, `DelayedError`, `RateLimitError`, `RelayError`, `SchemaMigrationRequiredError`, `SchemaVersionMismatchError`, `UnrecoverableError`, `UnsupportedPostgresVersionError`, `WaitingChildrenError`, `WaitingError`, and `BullmqError` for any other failure. Handle one with `Effect.catchTag("<Tag>", ...)`; each carries `operation` (`"<Handle>.<method>"`), `message`, upstream's `code` when it has one, the fields upstream's error declares, and upstream's failure as `cause`, `Redacted` (`Redacted.value(error.cause)`), printed nowhere. `Failure` is the Schema of every one: `Failure.match(error, { <Tag>: ... })`, `Failure.guards.<Tag>(value)`.
- `BullmqError` carries `reason`, upstream's code as a tagged union (`EVALSHA`, `ECONNREFUSED`, `EVAL`...): pick one with `Effect.catchReason("BullmqError", "EVALSHA", (reason, error) => ...)`.
- Ids and keys are branded strings, so ids of different things cannot mix: `JobId` (`Job.id`, `Queue.addJobLog(0)`, `Queue.getJob(0)`, `Queue.getJobLogs(0)`, `Queue.getJobState(0)`, `Queue.remove(0)`, `Queue.updateJobProgress(0)`, `Worker.cancelJob(0)`); `WorkerId` (`Worker.id`). A call returns them branded; make one from a string with `JobId.make(value)`, or decode one with the Schema `JobId`.
- Events are Streams: `events.<Handle>.<event>(handle)` (`events.FlowProducer`, `events.Queue`, `events.Worker`), listening for as long as the stream runs. An emitter cannot be paused: pass `{ bufferSize: n }` to keep only the newest `n` for a slow consumer.
- Two facades of one upstream object are `Equal` and hash alike: use them as keys of a `HashMap` or `HashSet`.
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
// An emitter cannot be paused: bound the buffer when a consumer may fall behind (the newest are kept).
const completed = events.Worker.completed(worker, { bufferSize: 16 }).pipe(Stream.take(1), Stream.runCollect);
const [job, emitted] = yield* Effect.all([queue.add("double", { n: 21 }), completed], { concurrency: 2 });
// Typed by bullmq's own WorkerListener: `completed` is called with the Job and its result.
const [finished, result] = emitted[0] ?? [];
```

From `test/facade.test.ts`.

### Job ids are branded, and a lookup that may find nothing is an Option

```ts
import { JobId } from "@effectified/bullmq";

// `job.id` is a `JobId`: no other string is taken where a job id is, unless it is made one.
const found = yield* queue.getJob(job.id ?? JobId.make("unknown"));
const missing = yield* queue.getJob(JobId.make("no-such-job"));
```

From `test/facade.test.ts`.

## API

Exports: `QueueEvents`, `FlowProducer`, `Queue`, `Worker`.

Services: `BullmqQueueEvents` (a `QueueEvents`, from `QueueEvents`), `BullmqFlowProducer` (a `FlowProducer`, from `FlowProducer`), `BullmqQueue` (a `Queue`, from `Queue`), `BullmqWorker` (a `Worker`, from `Worker`).

Brands: `JobId` (`Job.id`, `Queue.addJobLog(0)`, `Queue.getJob(0)`, `Queue.getJobLogs(0)`, `Queue.getJobState(0)`, `Queue.remove(0)`, `Queue.updateJobProgress(0)`, `Worker.cancelJob(0)`); `WorkerId` (`Worker.id`).

| Error | From | Reasons |
|---|---|---|
| `ConnectionClosedError` | `ConnectionClosedError` | – |
| `DelayedError` | `DelayedError` | – |
| `RateLimitError` | `RateLimitError` | – |
| `RelayError` | `RelayError` | – |
| `SchemaMigrationRequiredError` | `SchemaMigrationRequiredError` | – |
| `SchemaVersionMismatchError` | `SchemaVersionMismatchError` | – |
| `UnrecoverableError` | `UnrecoverableError` | – |
| `UnsupportedPostgresVersionError` | `UnsupportedPostgresVersionError` | – |
| `WaitingChildrenError` | `WaitingChildrenError` | – |
| `WaitingError` | `WaitingError` | – |
| `BullmqError` | any other failure | `EVALSHA`, `ECONNREFUSED`, `EVAL`, `EXEC`, `EXISTS` |

| Handle | Effects | Of an `Option` | Streams | Events | Released by |
|---|---|---|---|---|---|
| `QueueEvents` | `close`, `disconnect`, `run`, `trace`, `waitUntilReady` | – | – | – | `close` |
| `FlowProducer` | `add`, `addBulk`, `close`, `disconnect`, `getFlow`, `waitUntilReady` | – | – | `error`, `ioredis:close` | `close` |
| `Queue` | `add`, `addBulk`, `addJobLog`, `clean`, `close`, `count`, `disconnect`, `drain`, `exportPrometheusMetrics`, `getActive`, `getActiveCount`, `getCompleted`, `getCompletedCount`, `getCountsPerPriority`, `getDebounceJobId`, `getDeduplicationJobId`, `getDelayed`, `getDelayedCount`, `getDependencies`, `getFailed`, `getFailedCount`, `getGlobalConcurrency`, `getGlobalRateLimit`, `getJob`, `getJobCountByTypes`, `getJobCounts`, `getJobLogs`, `getJobScheduler`, `getJobSchedulers`, `getJobSchedulersCount`, `getJobState`, `getJobs`, `getMeta`, `getMetrics`, `getPrioritized`, `getPrioritizedCount`, `getQueueEvents`, `getRanges`, `getRateLimitTtl`, `getVersion`, `getWaiting`, `getWaitingChildren`, `getWaitingChildrenCount`, `getWaitingCount`, `getWorkers`, `getWorkersCount`, `isMaxed`, `isPaused`, `obliterate`, `pause`, `promoteJobs`, `rateLimit`, `recordJobCountsMetric`, `remove`, `removeDebounceKey`, `removeDeduplicationKey`, `removeDeprecatedPriorityKey`, `removeGlobalConcurrency`, `removeGlobalRateLimit`, `removeJobScheduler`, `removeOrphanedJobs`, `removeRateLimitKey`, `resume`, `retryJobs`, `setGlobalConcurrency`, `setGlobalRateLimit`, `trace`, `trimEvents`, `updateJobProgress`, `upsertJobScheduler`, `waitUntilReady` | `getDebounceJobId`, `getDeduplicationJobId`, `getGlobalConcurrency`, `getGlobalRateLimit`, `getJob`, `getJobScheduler`, `getVersion` | – | `cleaned`, `error`, `ioredis:close`, `paused`, `progress`, `removed`, `resumed`, `waiting` | `close` |
| `Worker` | `close`, `delay`, `disconnect`, `extendJobLocks`, `getNextJob`, `pause`, `processJob`, `rateLimit`, `resume`, `run`, `startStalledCheckTimer`, `trace`, `waitUntilReady` | – | – | `active`, `closed`, `closing`, `completed`, `drained`, `error`, `failed`, `ioredis:close`, `lockRenewalFailed`, `locksRenewed`, `paused`, `progress`, `ready`, `resumed`, `stalled` | `close` |
| `Job` | `addJob`, `changeDelay`, `changePriority`, `clearLogs`, `extendLock`, `getChildrenValues`, `getDependencies`, `getDependenciesCount`, `getFailedChildrenValues`, `getIgnoredChildrenFailures`, `getState`, `isActive`, `isCompleted`, `isDelayed`, `isFailed`, `isWaiting`, `isWaitingChildren`, `log`, `moveToCompleted`, `moveToDelayed`, `moveToFailed`, `moveToWait`, `moveToWaitingChildren`, `promote`, `remove`, `removeChildDependency`, `removeDeduplicationKey`, `removeUnprocessedChildren`, `retry`, `updateData`, `updateProgress`, `waitUntilFinished` | – | – | – | – |

More: https://effectified.dev/bullmq
