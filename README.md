# portofolio-web

Arvinanto Bahtiar's static portfolio. Astro generates the semantic, readable HTML; Vue hydrates only the simulated terminal, whose commands are local and never execute a shell or make requests. GSAP/ScrollTrigger adds optional scroll motion, respecting reduced-motion preferences. The introduction's transfer values are explicitly fictional; it plays on each load and can be skipped.

## Development

Install the Bun version pinned by `packageManager` in `package.json`, Node.js 22.23.4 or newer, and Chromium/Chrome. Bun manages dependencies and runs scripts; Node remains necessary for Astro, Wrangler and the Node-based browser test runner. Set `CHROMIUM_PATH` if the browser is not in a standard Linux location. `bun.lock` is authoritative for exact dependency versions.

```sh
bun install --frozen-lockfile
bun run dev
bun run typecheck
bun run test          # builds, then tests the built site in Chromium
bun run build
bun run check:deploy  # credential-free dry run, not a deployment
```

- `src/pages/` is the Astro page; `src/components/` contains the shared section and Vue terminal.
- `src/content.ts` holds editable writing, project, experience and achievement records. Verify changes against `docs/content-sources.md`; drafts are explicitly labeled and external writing links stay on Medium.
- `src/shell.ts` is the DOM-independent simulated command parser; `src/motion.ts` owns scroll motion; `src/style.css` contains design tokens and styles. JetBrains Mono and Silkscreen Bold 700 are self-hosted under `public/fonts/` with their licenses; the former SVG title is retired.

## Deployment

Astro produces static `dist/` assets. Wrangler packages these directly for the existing `portofolio` Worker; no SSR adapter is needed. CI installs the pinned Bun with a frozen lockfile, checks types, builds and tests the resulting site, then runs a dry run. Pull requests do not deploy; a push or manual dispatch on `main` deploys the tested build with the existing repository secrets. Local dry runs never publish.

Update this README whenever the active stack changes. **Deferred effects:** Three.js and/or p5.js are future options for deliberately designed 3D/2D work; neither is installed or implemented.
