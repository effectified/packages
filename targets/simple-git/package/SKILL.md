---
name: effectified-simple-git
description: Write Effect code that uses simple-git through @effectified/simple-git. Use when an Effect program needs simple-git, or code calling simple-git moves onto Effect: what the facade offers, how its Effects, scopes and errors work, and tested examples.
---

# simple-git through @effectified/simple-git

Chainable thenables, generics kept.

simple-git in Effect: its async calls as Effects, its iterables as Streams, its resources scoped, its failures tagged. Generated from simple-git's own types (this copy: 4.1.0+5, for simple-git 4.1.0), so its types are upstream's and a call the facade does not change behaves as upstream documents.

## Install

```sh
pnpm add https://effectified.dev/simple-git.tgz effect
```

## Rules

- Import from `@effectified/simple-git`, not from `simple-git`. simple-git's types are `Upstream.<Type>` (`import { Upstream } from "@effectified/simple-git"`).
- An async call returns an `Effect`, run with `yield*` inside `Effect.gen`; an async iterable is a `Stream`; a handle a call returns is a facade too. A synchronous call stays synchronous (a builder chain stays a chain).
- Failures are tagged: `GitConstructError`, `GitPluginError`, `GitResponseError`, `TaskConfigurationError`, `GitError`, and `SimpleGitError` for any other failure. Handle one with `Effect.catchTag("<Tag>", ...)`; each carries `operation` (`"<Handle>.<method>"`), `message`, upstream's `code` when it has one, and `cause`.
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

| Error | From |
|---|---|
| `GitConstructError` | `GitConstructError` |
| `GitPluginError` | `GitPluginError` |
| `GitResponseError` | `GitResponseError` |
| `TaskConfigurationError` | `TaskConfigurationError` |
| `GitError` | `GitError` |
| `SimpleGitError` | any other failure, codes `EPIPE`, `ERROR` |

| Handle | Effects | Streams | Events | Released by |
|---|---|---|---|---|
| `TemplateValue` | – | – | – | – |
| `GitGrepQuery` | – | – | – | – |
| `SimpleGit` | `add`, `addAnnotatedTag`, `addConfig`, `addRemote`, `addTag`, `applyPatch`, `binaryCatFile`, `branch`, `branchLocal`, `catFile`, `checkIgnore`, `checkIsRepo`, `checkout`, `checkoutBranch`, `checkoutLatestTag`, `checkoutLocalBranch`, `clean`, `clone`, `cmd`, `commit`, `countObjects`, `cwd`, `deleteLocalBranch`, `deleteLocalBranches`, `diff`, `diffSummary`, `exec`, `fetch`, `firstCommit`, `getConfig`, `getRemotes`, `grep`, `hashObject`, `init`, `interpretTrailers`, `listConfig`, `listRemote`, `log`, `merge`, `mergeFromTo`, `mirror`, `mv`, `pull`, `push`, `pushTags`, `raw`, `rebase`, `remote`, `removeRemote`, `reset`, `revert`, `revparse`, `rm`, `rmKeepLocal`, `show`, `showBuffer`, `stash`, `stashList`, `status`, `subModule`, `submoduleAdd`, `submoduleInit`, `submoduleUpdate`, `tag`, `tags`, `updateServerInfo`, `version` | – | – | – |
| `StatusResult` | – | – | – | – |

More: https://effectified.dev/simple-git
