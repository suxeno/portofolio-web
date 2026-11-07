# portofolio-web

Infrastructure scaffold for Arvinanto Bahtiar's portfolio. The page is an intentionally small placeholder, **not** the designed frontend. See [the next-stage brief](docs/BRIEF.md). Vite and TypeScript provide a lightweight static foundation; Cloudflare Workers Static Assets serves the output without a framework or server-side Worker code.

## Local checks

Use Node 22.23 or later on the Node 22 line (see `engines` for the supported lines) and npm:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run check:deploy
```

`npm run dev` starts Vite for local development. TypeScript checks configuration; the test checks that the placeholder remains readable without JavaScript. There is no separate lint tool yet: there is no application TypeScript to lint. The build uses Cloudflare's Vite plugin to generate `.cloudflare/output/v0`, and the credential-free dry run checks the same prebuilt output. `cf` and its Vite plugin are beta releases, pinned in the lockfile; monitor updates carefully. In contrast to the general Static Assets documentation's Wrangler examples, `cloudflare.config.ts` does not accept `assets.directory`: the Vite plugin provides the built assets. `cf build` does not run package scripts, so typecheck and tests are explicit CI steps. See [cf projects](https://developers.cloudflare.com/cf/projects/) and [cf CI](https://developers.cloudflare.com/cf/ci/).

## CI and deployment — pending setup

The private repository `suxeno/portofolio-web` still needs these files published and its GitHub Actions run independently verified. The workflow tests pull requests without Cloudflare secrets and deploys the already-tested build only on a `main` push or a manually dispatched run on `main`. It needs GitHub Actions enabled and repository Actions secrets named `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. An authorized account owner should create a narrowly scoped Cloudflare API token for the selected account with Workers deployment permissions (Workers Scripts edit; add only additional permissions actually required by the first deployment), then enter both values directly in GitHub repository Settings → Secrets and variables → Actions. Never commit or paste token values into chat. Account prerequisites such as Workers onboarding or enabling a workers.dev subdomain may need owner action; diagnose any first-run permission errors before broadening token scope. No domain, DNS, or paid upgrade is configured.

After publishing and adding secrets, trigger or push `main`, inspect all GitHub Actions steps and confirm the resulting workers.dev URL over HTTP. A successful local dry run is **not** a real deploy. Do not deploy through a separate manual path: deployment is intended through GitHub Actions only. The GitHub repository can remain private, but the deployed website is public; never place private source, credentials, or unapproved personal information in client assets.
