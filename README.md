# portofolio-web

Career-first portfolio prototype for Arvinanto Bahtiar. The semantic document and contact links work without JavaScript; the optional terminal is a navigation helper, not a shell. Commands: `experience`, `projects`, `about`, `contact`, `help`, and `clear`. On a first tab session, a simulated (not network) introduction dismisses within 2.4 seconds or on Skip, Escape, scroll, or link activation; it is skipped for deep links, reduced motion, unavailable session storage, and repeat visits in that session.

Project details are intentionally placeholders pending approved material. The role, education, tools and focus areas are supplied by the owner/manager; the linked public LinkedIn page previously required login for full inspection. Do not add unverified career claims, private employer details, or outcome metrics.

The opening sequence now uses in-place package-manager-style percentages, transfer rates, sizes, and transaction output. These are explicitly labeled demo values for four fictional section packages, not measured downloads; the 2.4-second limit and all bypass paths remain unchanged.

## Local checks

Node 22.23+ on the Node 22 line (see `engines`) and a local Chromium or Chrome are required. Tests look in common Linux paths, or set `CHROMIUM_PATH` to the browser executable. `playwright-core` controls that browser; it does not download one. On GitHub's Ubuntu runner, the preinstalled Google Chrome is used.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run check:deploy
```

The automated suite uses real Chromium for no-JS content, intro behavior (the deadline uses Playwright's controlled clock), terminal, focus, history, responsive overflow and console errors. A separate small HTML source test checks basic markup. Browser tests are not a substitute for a full accessibility audit or physical-device testing. `npm run dev` serves Vite; optionally run `node tests/capture.mjs` while Vite is listening on port 4180 to capture desktop/mobile screenshots.

The build uses Cloudflare's Vite plugin and `cf` beta releases pinned in the lockfile. The dry run checks prebuilt output without deploying. TypeScript includes app code and config.

## CI and deployment

The private repository is `suxeno/portofolio-web`; the public Worker is named `portofolio`. The existing GitHub Actions workflow tests pull requests without Cloudflare secrets and deploys the tested build on a `main` push or manual dispatch on `main`. Deployment uses the existing repository secrets, managed by the authorized owner. A local dry run is not a deployment. Do not use a separate manual deployment path or include secrets and private information in client assets. The manager handles publication and live verification.
