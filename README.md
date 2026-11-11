# portofolio-web

Arvinanto Bahtiar's static portfolio. Astro generates semantic, readable HTML; Vue hydrates the local terminal and manual project slider. Terminal commands never execute a shell or make requests. GSAP/ScrollTrigger adds optional scroll motion, respecting reduced-motion preferences. The introduction's transfer values are fictional; it plays on landing-page loads and can be skipped.

## Development

Install the Bun version pinned by `packageManager` in `package.json`, Node.js 22.23.4 or newer, and Chromium/Chrome. Bun manages dependencies and runs scripts; Node remains necessary for Astro, Wrangler and the Node-based browser test runner. Set `CHROMIUM_PATH` if the browser is not in a standard Linux location. `bun.lock` is authoritative for exact dependency versions.

### Preview locally before committing

From a terminal on the computer containing this working tree:

```sh
cd /home/pi/projects/portofolio-web  # or cd to your local clone
bun install --frozen-lockfile          # only needed initially or after dependencies change
bun run dev
```

Open the **Local** URL printed by Astro (usually `http://localhost:4321/`) in a browser on the same computer. The development server uses the current working-tree files, including uncommitted changes, and updates as you edit. If port 4321 is busy, use the URL Astro prints instead. Press `Ctrl+C` in the terminal to stop it. This does not commit, push, or deploy anything.

To review the changes, reload the landing page and check that its intro ends after four seconds; open a writing and return to the landing page using both the return link and browser Back, checking that neither shows the intro; then check that project descriptions use the full card width with left-aligned text and that cards have some space between them. Reduced-motion settings skip the intro.

To check the production build locally instead, run `bun run build` followed by `bunx astro preview`, then open the local URL it prints. Stop it with `Ctrl+C`. Neither command deploys the site.

### Checks

```sh
bun install --frozen-lockfile
bun run dev
bun run typecheck
bun run test          # builds, then tests the built site in Chromium
bun run build
bun run check:deploy  # credential-free dry run, not a deployment
```

- `src/pages/` contains the home page and generated writing detail routes; `src/components/` contains the shared section and Vue islands.
- `src/content.ts` holds editable writing, project, experience and achievement records. The three sample drafts use typed `title`, `slug`, `excerpt`, `cover`, `publishedAt` and `body` fields; editing a record and rebuilding generates its `/writing/<slug>/` page. Use a unique URL-safe slug; leave dates null until genuinely published. Draft labels are currently rendered unconditionally. Medium remains a separate contact link, not a content source or integration. Verify career records against `docs/content-sources.md`.
- `src/shell.ts` is the DOM-independent simulated command parser; `src/motion.ts` owns scroll motion; `src/style.css` contains design tokens and styles. JetBrains Mono and Silkscreen Bold 700 are self-hosted under `public/fonts/` with their licenses; the former SVG title is retired.

## Deployment

Astro produces static `dist/` assets. Wrangler packages these directly for the existing `portofolio` Worker; no SSR adapter is needed. CI installs the pinned Bun with a frozen lockfile, checks types, builds and tests the resulting site, then runs a dry run. Pull requests do not deploy; a push or manual dispatch on `main` deploys the tested build with the existing repository secrets. Local dry runs never publish.

Update this README whenever the active stack changes. **Deferred effects:** Three.js and/or p5.js are future options for deliberately designed 3D/2D work; neither is installed or implemented.
