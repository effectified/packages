---
name: effectified-simple-git
description: Write Effect code that uses simple-git through @effectified/simple-git. Use when an Effect program needs simple-git, or code calling simple-git moves onto Effect: what the facade offers, how its Effects, scopes and errors work, and tested examples.
---

# simple-git through @effectified/simple-git

Chainable thenables, generics kept.

simple-git in Effect: its async calls as traced Effects, absent values as Options, its iterables as Streams, its resources scoped, its failures tagged. Generated from simple-git's own types (this copy: 4.1.0+6, for simple-git 4.1.0), so its types are upstream's and a call the facade does not change behaves as upstream documents.

## Install

```sh
pnpm add https://effectified.dev/simple-git.tgz effect
```

## Rules

- Import from `@effectified/simple-git`, not from `simple-git`. simple-git's types are re-exported by their own names (`import type { ... } from "@effectified/simple-git"`), and all of it is `Upstream`.
- An async call returns an `Effect`, traced as `<Handle>.<method>` (a span and a stack frame per call, as `Effect.fn`): run it with `yield*` inside `Effect.gen` or your own `Effect.fn`. An async iterable is a `Stream`; a handle a call returns is a facade too. A synchronous call stays synchronous (a builder chain stays a chain).
- Services: `SimpleGitService` (a `SimpleGit`). Provide one at the program's edge with `<Service>.layer(<acquiring Effect>)` and read it with `yield* <Service>`.
- Failures are branded `Schema.TaggedError`s: `GitConstructError`, `GitPluginError`, `GitResponseError`, `TaskConfigurationError`, `GitError`, and `SimpleGitError` for any other failure. Handle one with `Effect.catchTag("<Tag>", ...)`; each carries `operation` (`"<Handle>.<method>"`), `message`, upstream's `code` when it has one, the fields upstream's error declares, and upstream's failure as `cause`, `Redacted` (`Redacted.value(error.cause)`), printed nowhere. `Failure` is the Schema of every one: `Failure.match(error, { <Tag>: ... })`, `Failure.guards.<Tag>(value)`.
- `SimpleGitError` carries `reason`, upstream's code as a tagged union (`EPIPE`, `ERROR`...): pick one with `Effect.catchReason("SimpleGitError", "EPIPE", (reason, error) => ...)`.
- Two facades of one upstream object are `Equal` and hash alike: use them as keys of a `HashMap` or `HashSet`.
- What the facade does not wrap stays reachable: `.upstream` on every facade, `Upstream` for the package. Use them rather than importing `simple-git` again.

## Examples

Each is code from a test that passes in CI.

### Commit and read the log

```ts
import { simpleGit } from "@effectified/simple-git";

const git = yield* simpleGit(directory);
yield* git.init();
yield* git.addConfig("user.email", "test@example.com");
yield* git.addConfig("user.name", "Test");
yield* git.add("README.md");
const commit = yield* git.commit("first commit");
// log keeps its type parameter: log<T = DefaultLogFields>().
const log = yield* git.log();
```

From `test/facade.test.ts`.

### The client as a service

```ts
import { Effect } from "effect";
import { SimpleGitService, simpleGit } from "@effectified/simple-git";

const initialized = Effect.gen(function* () {
	const git = yield* SimpleGitService;
	yield* git.init();
	return yield* git.checkIsRepo();
});
// One client bound to the working directory, provided at the program's edge.
const program = initialized.pipe(Effect.provide(SimpleGitService.layer(simpleGit(directory))));
```

From `test/facade.test.ts`.

### Handle a failing command by its tag

```ts
import { Effect } from "effect";
import { GitError } from "@effectified/simple-git";

const result = yield* git.checkout("no-such-branch").pipe(
	Effect.as("checked out"),
	Effect.catchTag("GitError", (error) => Effect.succeed(`${error.operation} failed`)),
);
```

From `test/facade.test.ts`.

## API

Exports: `refName`, `remoteUrl`, `grepQueryBuilder`, `simpleGit`.

Services: `SimpleGitService` (a `SimpleGit`, from `simpleGit`).

| Error | From | Reasons |
|---|---|---|
| `GitConstructError` | `GitConstructError` | – |
| `GitPluginError` | `GitPluginError` | – |
| `GitResponseError` | `GitResponseError` | – |
| `TaskConfigurationError` | `TaskConfigurationError` | – |
| `GitError` | `GitError` | – |
| `SimpleGitError` | any other failure | `EPIPE`, `ERROR` |

| Handle | Effects | Of an `Option` | Streams | Events | Released by |
|---|---|---|---|---|---|
| `TemplateValue` | – | – | – | – | – |
| `GitGrepQuery` | – | – | – | – | – |
| `SimpleGit` | `add`, `addAnnotatedTag`, `addConfig`, `addRemote`, `addTag`, `applyPatch`, `binaryCatFile`, `branch`, `branchLocal`, `catFile`, `checkIgnore`, `checkIsRepo`, `checkout`, `checkoutBranch`, `checkoutLatestTag`, `checkoutLocalBranch`, `clean`, `clone`, `cmd`, `commit`, `countObjects`, `cwd`, `deleteLocalBranch`, `deleteLocalBranches`, `diff`, `diffSummary`, `exec`, `fetch`, `firstCommit`, `getConfig`, `getRemotes`, `grep`, `hashObject`, `init`, `interpretTrailers`, `listConfig`, `listRemote`, `log`, `merge`, `mergeFromTo`, `mirror`, `mv`, `pull`, `push`, `pushTags`, `raw`, `rebase`, `remote`, `removeRemote`, `reset`, `revert`, `revparse`, `rm`, `rmKeepLocal`, `show`, `showBuffer`, `stash`, `stashList`, `status`, `subModule`, `submoduleAdd`, `submoduleInit`, `submoduleUpdate`, `tag`, `tags`, `updateServerInfo`, `version` | – | – | – | – |
| `StatusResult` | – | – | – | – | – |

More: https://effectified.dev/simple-git
