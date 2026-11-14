# Sanity CMS implementation and operational plan

## Current status and boundaries

The user approved publication of the current implementation. Explicit unconfigured builds use original local content; configured builds fetch one published, uncached snapshot and validate it before rendering. The configured `/admin/` is a static hash-routed Sanity Studio; without both public configuration values it displays setup required. Sanity enforces editor permissions, not static hosting. Vue remains on visitor pages; React/Studio is restricted to admin. The manager verified authenticated CLI access, imported the approved 37 records and verified anonymous published reads after an approved ID correction; a real read-only configured build succeeded. Real API draft edit/upload/publish and asset rendering passed; disposable test documents/assets were removed and all 48 original raw records verified unchanged. Studio GUI actions and the live automatic-publishing bridge remain unverified.

Existing local tests cover compiled Studio validation, snapshot/adapters, Portable Text, section/navigation, metadata, baseline round-trip, mocked webhook handler and local workerd. Further independent review of all rendered-field validation parity, screenshots and bundle isolation remains required; syntactic asset validation cannot verify remote asset existence or live slug collisions. Preserve baseline `83e2c7aba1e3f0555d84c87936f239ff7657a45a` and unrelated dirty files. No commit, push, deployment, import or service activation is authorized by this document.

## Architecture and trade-offs

Astro 7.4.7/Vue 3.5.45 static site uses `@sanity/astro` 3.6.2, Sanity 6.23.0, React 19.2.2 and `@astrojs/react` 7.1.9, with Node 22.23.4/Bun 1.4.4. Registry peer compatibility and actual local builds were checked; a React renderer is necessary for Studio. Hash routing avoids a global SPA fallback changing article 404s. Local synthetic Studio loaded with a fictional ID but cannot establish real authorization or deployed refresh behavior. Cloudflare serves `dist` as static assets; the signed publish Worker is a separate subproject, never a static endpoint. Studio's native Portable Text editor provides headings, paragraphs, links, lists, quotes, code and image blocks with alt/caption; it is not a Medium clone. Article rendering escapes content and validates URLs and asset references; synthetic references do not prove actual delivery.

## Source inventory and mapping

Counts are programmatically checked by `tests/cms-inventory.test.mjs` and baseline generation. All records below preserve exact existing facts, slugs, ordering and precision; three sample writings have null editorial dates but are **published baseline documents**, not Sanity draft IDs. True drafts are excluded from the public snapshot.

| Source | Baseline | Schema/render mapping |
| --- | --- | --- |
| `src/content.ts` | 3 writings, 3 projects, 4 roles, 4 achievements | `writing` -> homepage/archive/article; `project` -> existing slider; `experience` and `achievement` -> existing layouts. Optional descriptions/links that lack existing UI remain data-only. |
| `src/components/ToolsSection.astro` | 18 tools, 3 rows | `tool` name, label, row, order, visibility and exactly one curated code-managed logo or uploaded image. Speeds/directions remain presentation code. |
| `src/components/CertificatesSection.astro` | 3 certificates with Credly links and missing imagery | `certificate` title, issuer, display date, verification URL and optional real image/PDF. Missing images remain honest slots. |
| `src/pages/index.astro` | hero, navigation, headings, contact, footer | `profile` and `siteSettings` drive existing name, expertise, biography, email, social links, navigation, sections, contact, footer labels and metadata. Section heading/order/visibility are constrained to existing layouts. |
| writing pages | existing labels, metadata, body, returns | `siteSettings.writingUi`, `writing.seo` and Portable Text; image covers and inline images remain separate. Article SEO falls back to title/excerpt/site metadata. |
| `src/shell.ts`, `src/components/Terminal.vue` | virtual README and directories | `siteSettings.terminalReadme` and visible sections feed the terminal; parser aliases, paths, limits and control messages are protected technical strings. |
| `src/main.ts`, styles and `public/` | loader, fonts, art, controls | Loader wording, timing, animation, command logic, fonts/licenses, decorative canvases and control text are protected code-managed technical presentation, not CMS fields. No new optional visible blocks. |

`profile.contactCta`, `siteSettings.footerCopy`, `siteSettings.seo`, section intro, project SEO and structured career details are data-only; existing contact action uses `siteSettings.contactAction`. Some controls and missing-image labels remain code-managed. Reconcile these with the user before claiming every visible string editable. Local fonts and 18 trusted SVG logos remain code-managed; only genuine content assets should be uploaded. There are no fabricated certificate images.

## Offline baseline and migration gate

Run `~/.bun/bin/bun scripts/cms-baseline.ts .cms-baseline-output` without credentials. It writes review-only `baseline.ndjson` and `manifest.json`: siteSettings 1, profile 1, writing 3, project 3, experience 4, achievement 4, tool 18, certificate 3. Source identity mapping is frozen in `src/cms/baseline-ids.json`; a changed source identity fails generation until explicitly reviewed. This guard is not an automatic rename migration.

The manager imported the approved 37 records using create-if-absent, after backing up the existing dataset. Sanity treats dotted document IDs as private even in public datasets; the manager subsequently performed the separately approved atomic correction of 35 unchanged seed records to root-level IDs, with revision guards and full readback. The two singleton IDs and 11 pre-existing system records remained unchanged. Evidence is stored outside the repository under `/home/pi/.hermes/artifacts/portfolio-cms/wmzxcxbs-production/20261114T164919Z/`. Current seed generation and import validation require dot-free IDs; the approved mapping changed IDs only, not content or slugs. Never repeat import or correction automatically; any future changes need separate review and approval.

All 37 generated records were checked against compiled Studio-mode validation with a network-guarded synthetic client, snapshot and adapters. Fake transport tests created 37 once, skipped 37 on retry, and preserved a simulated editorial edit. A synthetic seed build and unconfigured build matched normalized browser text, ordered links and local logos across home, archive and three articles; this is not pixel parity or real asset delivery. Existing test helpers generate their own temporary seed. Never import automatically: review NDJSON, IDs, real asset availability and existing dataset first. Any approved future import must use create-if-absent semantics, not overwrite edits or delete records. Export and securely back up the actual dataset before an approved import; verify export and rehearse restoration into a separate approved dataset, never destructive reset. To roll back publication, disable the webhook, retain or restore the previously approved Cloudflare deployment and separately reconcile data from backup; deployment rollback does not restore CMS data.

## CI and publishing

The local workflow runs baseline regression with public Sanity variables explicitly empty. Only after tests pass, `scripts/ci-production-build.mjs` removes baseline `dist`, validates the public `SANITY_PROJECT_ID` and `SANITY_DATASET` identifiers pinned to `wmzxcxbs` / `production` in the workflow, then creates the final build. Partial configuration fails; ordinary builds with neither use local mode. `workflow_dispatch` input `cms-publish` requires both values, and the separate Worker fixes it to true, so CMS dispatch cannot silently deploy fallback. Dry-run and main-branch deployment consume that exact output without rebuilding. Publication is approved; require exact-head CI and deployment verification after each push. GitHub workflow success or failure must be monitored after dispatch.

`workers/cms-publish/README.md` contains the exact webhook filter/projection, secret names, fixed target, declared Durable Object binding, replay/coalescing/retry semantics, setup and disable order. Provisioning requires separate approval. The worker verifies Sanity's signature on raw bytes, rejects stale/invalid requests, accepts published types only, persists pending work before acknowledgement and retries dispatch with bounded backoff. Failed delivery before acceptance can still be lost; GitHub acknowledgement and durable storage are not atomic, so duplicate dispatch is possible. Verify quotas and costs before activation; no unlimited/free-plan claim. Never expose a GitHub PAT or Sanity write token in the public app or logs.

## Acceptance and phases

- [x] Local schemas, unconfigured fallback, configured snapshot/adapters, Portable Text fixture, seed dry run and local Worker implementation exist.
- [x] Focused local tests exercise signature vectors, replay and alarm with fake outbound; no real dispatch.
- [ ] Independent review of validation coverage, public bundle isolation, all protected behavior and before/after visual acceptance; full current regression run.
- [x] Public project/dataset, CLI authentication, approved baseline import and anonymous published read verified; real read-only build succeeded. Studio edit/write/publish, asset delivery and CORS remain unverified.
- [x] Initial backup and approved seed imported and verified; further imports require separate review and approval.
- [ ] Obtain separate approval to configure webhook/Worker secrets and bindings, GitHub repository variables and deploy; test actual CI, routing and rollback. Last live deployment remains in place on build failure.

References: https://www.sanity.io/docs/studio/deployment ; https://www.sanity.io/docs/content-lake/webhooks ; https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/ ; https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event .
