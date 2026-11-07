# Editing portfolio content

Edit the semantic section markup in `content/sections.html`, then run `node scripts/sync-content.mjs` from the repository root. This updates the marked section region in `index.html`, so the delivered page remains readable without JavaScript. The test suite checks that both copies match. Hero content lives directly in `index.html`; factual sources and verification notes are in `docs/content-sources.md`.
