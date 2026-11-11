# portofolio-web

Static portfolio for Arvinanto Bahtiar. [Live site](https://portofolio.arvinantobahtiar.workers.dev)

## Technical specification

- **Frontend:** Astro 7.4.7 static HTML; Vue 3.5.45 islands for terminal and project slider.
- **Motion:** GSAP 3.15.1 + ScrollTrigger; Canvas 2D for one-bit artwork. No p5.js or Three.js.
- **Language:** TypeScript 6.0.3; ESM.
- **Toolchain:** Bun 1.4.4; Node.js ≥22.23.4; exact dependencies in `bun.lock`.
- **Testing:** Node test runner + Playwright Core 1.65.0 + Chromium.
- **Hosting:** Cloudflare Worker `portofolio`; Wrangler 4.158.0 serves `dist/` assets.
- **Fonts:** self-hosted JetBrains Mono Regular and Silkscreen Bold 700; OFL licenses included.
- **Backend:** none. Content is local data; terminal commands never execute a real shell.

## Repository map

```text
.
├── src/
│   ├── pages/
│   │   ├── index.astro              # Portfolio homepage
│   │   └── writing/
│   │       ├── index.astro          # Complete writing archive
│   │       └── [slug].astro         # Generated article pages
│   ├── components/
│   │   ├── EditorialSection.astro   # Section heading and artwork shell
│   │   ├── Terminal.vue            # Command input, output and keyboard handling
│   │   └── ProjectSlider.vue       # Manual project carousel
│   ├── content.ts                  # Writing, projects, roles and achievements
│   ├── shell.ts                    # Safe local command/path parser
│   ├── main.ts                     # Landing intro and navigation lifecycle
│   ├── mobile-nav.ts               # Compact modal navigation lifecycle
│   ├── motion.ts                   # GSAP section choreography
│   ├── section-art.ts              # Canvas drawing, loops and motion controls
│   ├── section-art.css             # Artwork and section compositions
│   ├── style.css                   # Base styles, fonts and design tokens
│   ├── writing-order.mjs           # Date ordering and three-entry preview selector
│   └── writing-order.d.mts         # Selector TypeScript declarations
├── public/fonts/                   # Font binaries and license files
├── tests/
│   ├── astro-migration.test.mjs     # Static rendering and island architecture
│   ├── continuation.test.mjs        # Content and section regression checks
│   ├── dither.test.mjs              # Artwork markup checks
│   ├── placeholder.test.mjs         # Semantic HTML without client rendering
│   ├── portfolio.test.mjs           # Browser layout, interactions and motion
│   ├── shell.test.mjs               # Command parser unit tests
│   ├── writing-revision.test.mjs    # Preview cap and archive generation fixtures
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
├── astro.config.mjs               # Static output and Vue integration
├── tsconfig.json                  # Type-check configuration
├── wrangler.jsonc                 # Worker target and asset directory
├── package.json                   # Scripts and dependency versions
├── bun.lock                       # Locked dependencies
└── .gitignore                     # Generated files and secret exclusions
```

Generated/local only: `dist/`, `.astro/`, `node_modules/`, `.screenshots/`, `.art-evidence/` (review captures; not part of the deployed app).

## Run and verify

Requires the toolchain above and installed Chromium/Chrome. Set `CHROMIUM_PATH` if it is not at a standard test-runner location. No application secrets are required locally.

```sh
bun install --frozen-lockfile
bun run dev            # Development server; open the printed local URL
bun run typecheck      # Astro, Vue and TypeScript diagnostics
bun run test           # Production build, unit tests and Chromium regressions
bun run build          # Generate dist/
bunx astro preview     # Serve the production build locally
bun run check:deploy   # Packaging dry run; does NOT publish
```

## Content and behavior

- Edit records in `src/content.ts`; rebuild to publish changes. No CMS or Medium feed integration.
- Writing fields: `title`, `slug`, `excerpt`, `cover`, `publishedAt`, `body`. Use unique URL-safe slugs; leave unpublished dates `null`.
- Routes: `/` → portfolio; `/writing/` → archive; `/writing/<slug>/` → article. Homepage shows at most three recent entries; dated entries sort newest first, undated drafts retain source order.
- Intro: four seconds on landing loads/reloads; skippable. Articles, return navigation and reduced-motion mode skip it.
- Compact headers use a modal navigation drawer when JavaScript is available; ordinary header links remain available without it.
- Artwork: visible loops capped at eight updates/second; ARVIN button pauses/resumes. Reduced motion is static; offscreen/hidden artwork suspends.
- Projects use manual controls, keyboard navigation and native touch scrolling. Sample writing and dummy project images remain explicitly labeled.

## Deployment

- `main` push or manual workflow dispatch → frozen install → typecheck → tests/build → dry run → deploy tested assets.
- Pull requests run checks only. CI requires repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
- Local development, build, preview and dry-run commands do not deploy. Never commit credentials.

## Maintenance

Before every user-approved push, reconcile this README with the actual files, scripts, stack and behavior. Replace stale details; keep explanations short. Put release history and review evidence elsewhere—not in an ever-growing README.
