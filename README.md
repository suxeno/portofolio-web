# portofolio-web

Portfolio for Arvinanto Bahtiar. [Live site](https://portofolio.arvinantobahtiar.workers.dev)

## Technical specification

- **Frontend:** Astro 7.4.7 server-rendered HTML; Vue 3.5.45 islands for terminal and project slider.
- **Motion:** GSAP 3.15.1 + ScrollTrigger; Canvas 2D for one-bit artwork. No p5.js or Three.js.
- **Language:** TypeScript 6.0.3; ESM.
- **Toolchain:** Bun 1.4.4; Node.js ≥22.23.4; exact dependencies in `bun.lock`.
- **Testing:** Node test runner + Playwright Core 1.65.0 + Chromium; the normal test command caps parallel workers at two to bound fixture-build contention.
- **Hosting:** Cloudflare Worker `portofolio`; the lockfile resolves Wrangler 4.162.0 for the generated Worker and client assets.
- **Fonts:** self-hosted JetBrains Mono Regular and Silkscreen Bold 700; OFL licenses included.
- **Content:** Explicit unconfigured mode uses local records. The deployed SSR Worker reads and validates published public Sanity data, with a 60-second shared edge cache for eligible responses. Sanity CDN may add propagation delay. Terminal commands never execute a real shell.

## Repository map

```text
.
├── src/
│   ├── pages/
│   │   ├── index.astro              # Portfolio homepage
│   │   └── writing/
│   │       ├── index.astro          # Complete writing archive
│   │       └── [slug].astro         # Runtime article pages
│   ├── components/
│   │   ├── EditorialSection.astro   # Section heading and artwork shell
│   │   ├── ToolsSection.astro       # Three-row marquee and static logo list
│   │   ├── CertificatesSection.astro # Uniform certificate frames and source links
│   │   ├── Terminal.vue            # Command input, output and keyboard handling
│   │   └── ProjectSlider.vue       # Manual project carousel
│   ├── cms/                        # Sanity schemas, validation and runtime adapters
│   ├── worker.mjs                  # SSR gateway and shared-cache entrypoint
│   ├── content.ts                  # Local fallback writing, projects and career records
│   ├── shell.ts                    # Safe local command/path parser
│   ├── main.ts                     # Landing intro and navigation lifecycle
│   ├── mobile-nav.ts               # Compact modal navigation lifecycle
│   ├── motion.ts                   # GSAP section choreography
│   ├── section-art.ts              # Canvas drawing, loops and motion controls
│   ├── section-art.css             # Artwork and section compositions
│   ├── style.css                   # Base styles, fonts and design tokens
│   ├── link-interactions.css       # Link sweeps and motion-aware entry hover
│   ├── writing-order.mjs           # Date ordering and three-entry preview selector
│   └── writing-order.d.mts         # Selector TypeScript declarations
├── public/fonts/                   # Font binaries and license files
├── public/logos/                   # Self-hosted monochrome tool logos
├── tests/
│   ├── astro-migration.test.mjs     # Static rendering and island architecture
│   ├── continuation.test.mjs        # Content and section regression checks
│   ├── dither.test.mjs              # Artwork markup checks
│   ├── placeholder.test.mjs         # Semantic HTML without client rendering
│   ├── portfolio.test.mjs           # Browser layout, interactions and motion
│   ├── shell.test.mjs               # Command parser unit tests
│   ├── tools-section.test.mjs       # Tool markup and motion fallback checks
│   ├── certificates-section.test.mjs # Credential records and image-ready markup
│   ├── writing-revision.test.mjs    # Preview cap and archive runtime fixtures
│   └── capture.mjs                 # Local preview screenshot utility
├── docs/
│   ├── content-sources.md          # Factual content provenance
│   ├── BRIEF.md                    # Original project brief
│   └── HANDOFF-redesign.md         # Historical redesign handoff
├── .github/workflows/ci-deploy.yml  # CI checks and main-branch deployment
├── .impeccable/design.json         # Machine-readable design context
├── README.md                      # Technical quick reference
├── PRODUCT.md                     # Product scope and constraints
├── DESIGN.md                      # Current visual system and behavior
├── TOOLS-PROVENANCE.md             # Logo sources, licensing and tool provenance
├── CREDENTIALS-PROVENANCE.md        # Credential sources and missing-image status
├── astro.config.mjs               # Cloudflare SSR and Vue integration
├── tsconfig.json                  # Type-check configuration
├── wrangler.jsonc                 # Astro build input for Worker configuration
├── package.json                   # Scripts and dependency versions
├── bun.lock                       # Locked dependencies
└── .gitignore                     # Generated files and secret exclusions
```

Generated/local only: `dist/`, `.astro/`, `node_modules/`, `.screenshots/`, `.art-evidence/`, `.review-evidence/` (review captures; not part of the deployed app).

## Run and verify

Requires the toolchain above and installed Chromium/Chrome. Set `CHROMIUM_PATH` if it is not at a standard test-runner location. No application secrets are required locally.

```sh
bun install --frozen-lockfile
bun run dev            # Development server; open the printed local URL
bun run typecheck      # Astro, Vue and TypeScript diagnostics
bun run test           # Production build, unit tests and Chromium regressions
bun run build          # Generate dist/
bunx wrangler dev --config dist/server/wrangler.json  # Local Worker preview
CMS_PUBLISH=true bun scripts/ci-production-build.mjs # configured build and artifact seal
bun run check:deploy   # Validate sealed artifact and dry run; does NOT publish
```

## Content and behavior

- Unconfigured mode uses local records. Configured SSR requests fetch one validated published snapshot for writing, profile, site settings, projects, experience, achievements, tools and certificates; invalid data or API failure fails the request without fallback. Section order, headings and visibility are supported within existing layouts. Optional fields without existing UI remain data-only.
- `/admin/` reports setup required unless both public `SANITY_PROJECT_ID` and `SANITY_DATASET` are configured at build time. Configured builds serve Sanity Studio using hash routing. Studio uses the public project/dataset configuration and requires an authorized account and approved CORS. Published edits do not require a rebuild, subject to edge and Sanity CDN propagation. Production Studio editing, image uploads and GUI publishing have been verified with a hidden disposable writing. See `docs/CMS-IMPLEMENTATION.md`; never put tokens in public variables.
- Studio dependencies are pinned in `package.json`: `@sanity/astro`, `sanity`, React, React DOM and `@astrojs/react`. Vue remains in use for public islands.
- Writing fields: `title`, `slug`, `excerpt`, `cover`, `publishedAt`, `body`. Use unique URL-safe slugs; leave unpublished dates `null`.
- Routes: `/` → portfolio; `/writing/` → archive; `/writing/<slug>/` → article. Homepage shows at most three recent entries; dated entries sort newest first, undated drafts retain source order.
- Intro: four seconds on landing loads/reloads; skippable. Articles, return navigation and reduced-motion mode skip it.
- Compact headers use a modal navigation drawer when JavaScript is available; ordinary header links remain available without it.
- Artwork: visible loops capped at eight updates/second; ARVIN button pauses/resumes. Reduced motion is static; offscreen/hidden artwork suspends.
- Projects use manual controls, keyboard navigation and native touch scrolling. Studio edits Title, Description, Destination URL and Cover with alt text; Order and Visible are under Display settings. Existing legacy links remain supported; unused stored fields are preserved, not deleted. Sample writing and dummy project images remain explicitly labeled.
- Achievement titles link to the first safe CMS Links URL when supplied; otherwise they remain plain text. Uploaded evidence files do not automatically become link destinations. Achievement and Contact social links use a white sweep; footer navigation and project titles use faint resting underlines with full-color hover/focus sweeps. Homepage Writing and Experience entries scale subtly on hover, respecting pause and reduced motion.
- Tools use three alternating CSS marquee rows; reduced motion and no JavaScript show a static icon-and-label list. Clicking toggles pause for that row only; hovering does not pause. The ARVIN control pauses all motion.
- Local fallback tool and credential records live in their section components. Baseline certificates have honest missing-image slots; authentic Sanity assets can be supplied with appropriate alt text. Certificate links use the generic “View evidence” label without changing their configured destinations.

## Deployment

- CI runs baseline tests with Sanity variables explicitly empty, then makes a separate sealed production SSR build with the public `wmzxcxbs` / `production` identifiers pinned in the workflow, validates the generated `dist/server/wrangler.json` and deploys that same output on main push/manual dispatch. The seal detects changes to output; it is not a signature. Further push or deploy requires separate approval. Partial configuration fails; CMS dispatch requires both. With neither variable ordinary builds use local content.
- Pull requests run checks only. Deployment requires repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The legacy signed rebuild-webhook Worker and its secrets are inactive and not needed for SSR; see `workers/cms-publish/README.md`.
- Local development, build, preview and dry-run commands do not deploy. Never commit credentials.
- Platform cache is tested separately from the local suite: `python3 scripts/cms-live-cache-probe.py EXPECTED_ACTIVE_VERSION_ID` checks the active production version and takes at least 65 seconds. It uses the existing `/writing/data-systems/` article and fails if that article is removed; update the probe to an existing canonical article if needed. `X-Portfolio-Render` is a public random identifier per inner render, not a secret or visitor identifier.

## Maintenance

Before every user-approved push, reconcile this README with the actual files, scripts, stack and behavior. Replace stale details; keep explanations short. Put release history and review evidence elsewhere—not in an ever-growing README.
