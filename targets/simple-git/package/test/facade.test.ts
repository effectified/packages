// What the facade does with the real simple-git and git: a repository built step by step in a temporary directory,
// and a failing git command as the tagged GitError.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { GitError, simpleGit } from "../src/index.ts";

const repository = () => {
	const directory = mkdtempSync(join(tmpdir(), "effectified-simple-git-"));
	writeFileSync(join(directory, "README.md"), "# hello\n");
	return directory;
};

describe("@effectified/simple-git", () => {
	it.effect("runs git commands as Effects", () =>
		Effect.gen(function* () {
			const directory = repository();
			// #region example: Commit and read the log
			const git = yield* simpleGit(directory);
			yield* git.init();
			yield* git.addConfig("user.email", "test@example.com");
			yield* git.addConfig("user.name", "Test");
			yield* git.add("README.md");
			const commit = yield* git.commit("first commit");
			// log keeps its type parameter: log<T = DefaultLogFields>().
			const log = yield* git.log();
			// #endregion
			expect(commit.summary.changes).toBe(1);
			expect(log.latest?.message).toBe("first commit");
			const status = yield* git.status();
			expect(status.isClean()).toBe(true);
		}),
	);

	it.effect("fails with GitError for a git command that fails", () =>
		Effect.gen(function* () {
			const git = yield* simpleGit(repository());
			yield* git.init();
			// #region example: Handle a failing command by its tag
			const result = yield* git.checkout("no-such-branch").pipe(
				Effect.as("checked out"),
				Effect.catchTag("GitError", (error) => Effect.succeed(`${error.operation} failed`)),
			);
			// #endregion
			expect(result).toBe("SimpleGit.checkout failed");
			const error = yield* Effect.flip(git.checkout("no-such-branch"));
			expect(error).toBeInstanceOf(GitError);
			expect(error._tag).toBe("GitError");
			expect(error.operation).toBe("SimpleGit.checkout");
			expect(error.message).toContain("no-such-branch");
		}),
	);
});
