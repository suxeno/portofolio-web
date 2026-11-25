# portofolio-web

Arvinanto Bahtiar’s portfolio. [Live site](https://portofolio.arvinantobahtiar.workers.dev)

## Stack

Astro SSR on Cloudflare Workers, Vue islands, TypeScript, GSAP, Canvas and Sanity.

## Local development

Requires Node.js ≥22.23.4, Bun 1.4.4 and Chromium for browser tests. Set `CHROMIUM_PATH` if needed.

```sh
bun install --frozen-lockfile
bun run dev          # Local development
bun run typecheck     # Astro, Vue and TypeScript checks
bun run test          # Build, unit tests and browser regressions
bun run build         # Generate dist/ for a local Worker preview
bunx wrangler dev --local --config dist/server/wrangler.json
```

Optional local code-only Graphify outputs are written to `graphify-out/` (gitignored).

## Repository

```text
src/pages/             # Portfolio, writing archive/articles and Studio
src/components/        # Projects, terminal and other portfolio sections
src/cms/               # Sanity schemas, validation and content adapters
src/worker.mjs          # SSR and edge caching
public/                # Artwork, logos and licensed fonts
scripts/               # Build, validation and maintenance
tests/                 # Unit, browser and Worker regression tests
```

## Content

- `/` is the portfolio; `/writing/` is the archive; `/writing/<slug>/` is an article.
- On `/`, activating the `ARVIN` wordmark replays a brief stepped fragment animation, clicking the landing background emits an outline square pulse, and the corner pixels toggle global animation pause.
- `/admin/` is Sanity Studio. Set both public build variables, `SANITY_PROJECT_ID` and `SANITY_DATASET`, to enable it. With neither set, the site uses local content.
- Published edits appear without a rebuild, subject to the Worker’s 60-second cache and Sanity CDN propagation. See [CMS setup](docs/CMS-IMPLEMENTATION.md).
- Project covers fill a 16:9 frame with a centered crop. The browser dithers them in black and white on hover-capable devices; hover or keyboard focus reveals the original colors. Touch devices show the original. Upload a normal color image with alt text.

## Deployment

The [CI workflow](.github/workflows/ci-deploy.yml) runs checks on pull requests. Pushes to `main` build, validate and deploy the tested SSR artifact. GitHub Actions needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as secrets; never commit them. `bun run check:deploy` validates an already sealed build and runs a dry run only.
