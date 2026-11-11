---
name: Arvin Profile
description: Monochrome editorial terminal portfolio
colors:
  base: "#171717"
  text: "#f5f5f0"
  secondary: "#c5c5c0"
  rule: "#555555"
  timeline-rule: "#767676"
  placeholder: "#292929"
typography:
  body:
    fontFamily: "JetBrainsMono, monospace"
    fontWeight: 400
  display:
    fontFamily: "Silkscreen, monospace"
    fontSize: "clamp(64px, 10vw, 144px)"
    fontWeight: 700
    lineHeight: 1.1
spacing:
  project-gap: "32px"
---

# Design System: Arvin Profile

## Overview

**Creative North Star: "The Editorial Terminal"**

An intentionally restrained, text-led portfolio draws on computer interfaces without requiring a visitor to use one. Rules, monospace text and measured empty space support a career-first reading order. The title uses pixel type; the rest remains readable and native.

**Key Characteristics:**
- Monochrome palette and flat surfaces.
- Normal page navigation alongside an optional working terminal.
- Responsive editorial lists and explicit sample labels.

## Colors

The charcoal ground supports near-white primary text and softer secondary information. Rules define structure without introducing separate colored surfaces; image placeholders use a slightly lifted neutral.

## Typography

Silkscreen Bold is reserved for the ARVIN display and boot glyph. JetBrains Mono is the primary text face. Section headings scale fluidly, while dates and labels are deliberately smaller; no canvas should contain essential text.

## Layout

The landing content is capped at 1312px with 64px desktop gutters; at widths up to 899px it uses 20px gutters. On compact screens, Writing and Achievements place their artwork in a left-aligned row above the heading and list; desktop compositions remain distinct. Editorial sections begin with rules. Experience uses a connected chronological path, with date, role and organization in columns on wide screens and stacked on narrow screens; achievement row rules end at the list column, clear of the illustration. Project cards use a manually controlled horizontal slider with a 32px gap; descriptions are left aligned.

## Elevation & Depth

Surfaces are predominantly flat. Borders, hierarchy and spacing provide structure rather than decorative drop shadows.

## Shapes

Rectilinear lines and square-edged controls echo the terminal. Pixel forms belong to the established title identity, while controls remain legible and keyboard accessible.

## Components

- **Terminal:** optional command input with bounded output, alongside native links. Keep the command prompt and result readable and preserve keyboard interaction.
- **Editorial content:** the homepage shows at most three most recent writings; a native archive lists all source records. Undated drafts retain source order. Experience is a connected timeline; recognition uses list-column ruled rows.
- **Dither artwork:** original decorative one-bit canvas studies depict a hand and page, modules, milestones, two hands gripping and lifting a trophy with paper confetti, and an envelope. Projects and Experience have small marks immediately left of their headings. Writing and trophy use 192 × 192 buffers; the others use 96 × 72. Visible artwork repeats at a capped eight updates per second; reduced motion is static, offscreen and hidden artwork suspends, and the ARVIN title control pauses and resumes animation.
- **Contact:** the collaboration question is the section heading; one direct email action leads secondary social links. The footer omits the former README block; the terminal can still display its README text.
- **Project slider:** native overflow with previous/next buttons; project descriptions remain visible, left aligned and full width.
- **Navigation:** labeled links, visible focus treatment and a skip link.
- **Loader:** protected existing visual and behavior; do not change its styling or timing during visual refinements.

## Do's and Don'ts

### Do:
- **Do** maintain a readable, semantic HTML experience without JavaScript.
- **Do** keep the approved monochrome identity and the full-width terminal divider; achievement rules stop before the art gutter.
- **Do** provide reduced-motion and keyboard equivalents for meaningful interaction.

### Don't:
- **Don't** fabricate project evidence or remove sample labels.
- **Don't** make the terminal the only way to navigate.
- **Don't** modify the protected loader or ARVIN title font as a side effect of other work.
