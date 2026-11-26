# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Inferred from the portfolio and brief: people assessing Arvinanto Bahtiar's data engineering and applied ML/AI work, including potential collaborators or employers. Specific audience priorities remain unconfirmed.

## Product Purpose

Present career history, selected projects, tools, achievements, credentials, sample writing and ways to contact Arvinanto Bahtiar. Visitors can browse conventionally or explore using an optional terminal. Credential images remain awaiting source files in the current review draft.

## Operating Context

The site is a responsive web portfolio with native article pages, a writing archive and ordinary navigation. The landing page previews at most three recent writings, while the archive exposes all source records. The terminal is an optional route through the content, not the only way to reach it. The project uses Astro, Vue, GSAP, Bun and Cloudflare.

## Capabilities and Constraints

Preserve the bounded terminal, command history and completion, manual project slider, native article routes and back navigation. The landing intro runs for four seconds, can be skipped and respects reduced motion; article pages do not display it, returning from an article skips it, and an intentional landing reload replays it. Essential content remains usable without JavaScript. Existing job titles, dates, achievements, links and email are factual content and must not be invented or changed without authorization.

## Brand Commitments

Retain the approved monochrome terminal/computer-science identity, use Pixelta for the ARVIN display and boot glyph, and preserve the existing loader's behavior. Section visuals should be distinct, representative monochrome one-bit dither art with restrained motion and hover/focus response.

## Evidence on Hand

The source of current content is `src/content.ts`; sample writings are explicitly labeled drafts, not published proof. Project images are placeholders. Do not invent metrics, projects, roles, testimonials or additional articles.

## Product Principles

- Make career information readable and navigable without requiring terminal knowledge.
- Treat the terminal as a working alternative, not a barrier.
- Distinguish sample material from published work.
- Preserve the content and motion alternatives when scripting is unavailable or reduced motion is requested.

## Accessibility & Inclusion

Support keyboard navigation, clear focus, readable contrast, ordinary scrolling, responsive layouts, reduced motion and non-JavaScript access to essential content.
