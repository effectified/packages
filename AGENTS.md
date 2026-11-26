# Rules for agents in effectified/packages

- Start with `skills/effectify/SKILL.md`; when you orchestrate in T3 Code, `skills/effectify-t3/SKILL.md`. Engine changes belong in effectified/engine (`skills/effectify-engine` there), never here.
- Run the engine with `pnpm effectify <step>` (the version pinned in `package.json`). To try an unreleased engine from a sibling checkout: `node ../engine/src/bin.ts <step>`.
- Never edit generated code: `targets/*/package/src/` (except `src/mounts/`), `targets/*/package/package.json`, `tsconfig*.json`, `README.md` there. Change `recipe.json` or the engine, then `pnpm effectify reconcile <name>`.
- Tests in `targets/*/package/test/` run the real library and local services (Docker, a temp directory, `CHROME_BIN`), never mocks of the library and never paid or remote APIs.
- Effect 4 only, and only APIs you have read in `node_modules/effect/dist/*.d.ts`.
- Install with `pnpm install --ignore-scripts`; dependencies are exact versions; nothing newer than the machine's release-age policy.
- Before you report, for every target you touched: `pnpm effectify reconcile <name>`, `pnpm effectify test <name>` with its services up, and its release build (`tsc -p tsconfig.build.json` in its `package/`).
- Never commit unless asked; stage explicit paths.
