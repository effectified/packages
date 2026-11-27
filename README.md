# effectified packages

Popular libraries in [Effect](https://effect.website): every async call an `Effect`, every async iterable a `Stream`, every resource scoped, every failure a tagged error; frontend libraries as bindings and mounts for [Effect UI](https://ui.effect.website). Each facade is generated from its library's own types by the [effectified engine](https://github.com/effectified/engine), tested against the real library, and kept in step with upstream every day. Recipes, tests and decisions come from the community and its agents.

## Facades

| Library | Facade | Kind | Tested against |
|---|---|---|---|
| [sharp](https://sharp.pixelplumbing.com) | [`@effectified/sharp`](https://effectified.dev/sharp) | runtime | libvips, images in memory |
| [nodemailer](https://nodemailer.com) | [`@effectified/nodemailer`](https://effectified.dev/nodemailer) | runtime | a JSON transport, a refused SMTP port |
| [motion](https://motion.dev) | [`@effectified/motion`](https://effectified.dev/motion) | Effect UI | Chrome |
| [puppeteer-core](https://pptr.dev) | [`@effectified/puppeteer-core`](https://effectified.dev/puppeteer-core) | runtime | Chrome |
| [@codemirror/view](https://codemirror.net) | [`@effectified/codemirror-view`](https://effectified.dev/codemirror-view) | Effect UI | Chrome |
| [chart.js](https://www.chartjs.org) | [`@effectified/chart.js`](https://effectified.dev/chart.js) | Effect UI | Chrome |
| [simple-git](https://github.com/steveukx/git-js) | [`@effectified/simple-git`](https://effectified.dev/simple-git) | runtime | git in a temp repository |
| [bullmq](https://bullmq.io) | [`@effectified/bullmq`](https://effectified.dev/bullmq) | runtime | Redis |
| [maplibre-gl](https://maplibre.org) | [`@effectified/maplibre-gl`](https://effectified.dev/maplibre-gl) | Effect UI | Chrome |
| [@xterm/xterm](https://xtermjs.org) | [`@effectified/xterm`](https://effectified.dev/xterm) | Effect UI | Chrome |
| [media-chrome](https://www.media-chrome.org) | [`@effectified/media-chrome`](https://effectified.dev/media-chrome) | Effect UI | Chrome |
| [emoji-picker-element](https://github.com/nolanlawson/emoji-picker-element) | [`@effectified/emoji-picker-element`](https://effectified.dev/emoji-picker-element) | Effect UI | Chrome |
| [@awesome.me/webawesome](https://webawesome.com) | [`@effectified/webawesome`](https://effectified.dev/webawesome) | Effect UI | Chrome |
| [@material/web](https://material-web.dev) | [`@effectified/material-web`](https://effectified.dev/material-web) | Effect UI | Chrome |
| [@fluentui/web-components](https://github.com/microsoft/fluentui) | [`@effectified/fluentui-web-components`](https://effectified.dev/fluentui-web-components) | Effect UI | Chrome |

Each facade has a page on effectified.dev with its examples (live demos for the frontend ones), its API and its agent skill, all generated from this repository. Each lives in `targets/<library>/`: `surface.json` (what upstream's types expose), `scan.json` (what its JavaScript throws and emits), `recipe.json` (every decision the types cannot make, with its reason and who made it), and `package/`, the generated facade with its hand-written tests.

## Install

From npm:

```sh
pnpm add @effectified/sharp effect
npm install @effectified/sharp effect
bun add @effectified/sharp effect
```

A frontend facade also takes Effect UI's snapshot build, which its page and README name (npm 12 installs it with `--allow-remote=root`). A facade's version is its library's major.minor, then how many releases of the facade came before for it (as DefinitelyTyped numbers `@types` packages): `@effectified/sharp@0.35.5` is the sixth release for sharp 0.35, and depends on the exact sharp it was made for. Releases are never replaced; each has a GitHub release `<name>-v<version>` here with its notes (and a frontend facade's demo). Each package carries `SKILL.md`, the skill an agent follows to use it.

## Add a library

```sh
pnpm install --ignore-scripts
pnpm effectify make <github url or npm name>    # add --ui for a frontend library
pnpm effectify plan <name>                      # the judgment work: review the recipe, write the tests, the docs
```

Then follow [`skills/effectify`](skills/effectify/SKILL.md), alone or with T3 Code orchestrating ([`skills/effectify-t3`](skills/effectify-t3/SKILL.md)), and open a pull request. [CONTRIBUTING.md](CONTRIBUTING.md) says what a pull request needs.

| Skill | For |
|---|---|
| [`effectify`](skills/effectify/SKILL.md) | The entry point: a GitHub URL or npm name to a tested facade |
| [`effectify-t3`](skills/effectify-t3/SKILL.md) | Orchestrating it in T3 Code: the plan's units as delegates in worktrees, merged in order |
| [`effectify-recipe`](skills/effectify-recipe/SKILL.md) | Reviewing and deciding a recipe |
| [`effectify-tests`](skills/effectify-tests/SKILL.md) | Behaviour tests against the real library and local services |
| [`effectify-ui`](skills/effectify-ui/SKILL.md) | Frontend libraries on Effect UI: bindings, mounts, and tests in Chrome |
| [`effectify-sync`](skills/effectify-sync/SKILL.md) | Following upstream releases |
| [`effectify-migrate`](skills/effectify-migrate/SKILL.md) | Moving an application onto a facade |

## How it runs

- **CI** (`ci.yml`): for every target a pull request touches (every target when the engine's version or a workflow changes), the facade is regenerated with the pinned engine and must match what is committed, type checked with TypeScript 7, tested against the real library (Redis, Chrome, git, a temp directory), and built.
- **Release** (`release.yml`): after CI passes on `main`, every facade whose version npm does not have is published on npm and gets its GitHub release. CI publishes through the workflow's identity (npm's trusted publishing): no token is stored, and each tarball has a provenance attestation that names its commit. The facades are packed in one job (which runs upstream's code) and published by another, the only one npm trusts. A facade npm has never seen is left out with a warning until a person signed in to npm runs `pnpm effectify bootstrap` once.
- **Sync** (`sync.yml`): every day, each runtime facade whose library released a newer version is studied, redrafted (keeping people's and agents' decisions), regenerated and tested, and one pull request is opened with its `DRIFT.md`.
- **The engine** is a pinned dev dependency (`@effectified/engine` in `package.json`, a release of effectified/engine). Moving to a newer engine is one pull request that changes the pin and commits the facades it regenerates.

Not an official Effect project. MIT.
