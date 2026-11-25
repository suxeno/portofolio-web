import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { createSsrFixture } from './helpers/ssr-fixture.mjs';

let fixture, browser;

before(async () => {
  fixture = await createSsrFixture();
  const executablePath = process.env.CHROMIUM_PATH || ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].find(existsSync);
  if (!executablePath) throw new Error('Chromium/Chrome not found; set CHROMIUM_PATH');
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-gpu'] });
});

after(async () => {
  try { await browser?.close(); } finally { await fixture?.dispose(); }
});

async function sampleRegion(page, left, top, width, height) {
  return page.locator('.pointer-trail').evaluate((c, { left, top, width, height }) => {
    const ctx = c.getContext('2d');
    const w = Math.min(width, Math.max(0, c.width - left));
    const h = Math.min(height, Math.max(0, c.height - top));
    if (w <= 0 || h <= 0) return { pixels: 0, alpha: 0, cells: [], colorsOk: true, outlineOnly: true };
    const { data } = ctx.getImageData(left, top, w, h);
    const cellSet = new Set();
    let pixels = 0, alpha = 0, colorsOk = true;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const a = data[i + 3];
        if (a > 0) {
          pixels++;
          alpha += a;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          if (Math.abs(r - 245) > 5 || Math.abs(g - 245) > 5 || Math.abs(b - 240) > 5) colorsOk = false;
          cellSet.add(`${Math.floor((x + left) / 32)}:${Math.floor((y + top) / 32)}`);
        }
      }
    }
    // Check that every painted cell has transparent interior (4..28 in local 32px coords).
    let outlineOnly = true;
    for (const key of cellSet) {
      const [cx, cy] = key.split(':').map(Number);
      const x0 = cx * 32 - left, y0 = cy * 32 - top;
      for (let ly = 5; ly < 27; ly++) {
        for (let lx = 5; lx < 27; lx++) {
          const px = x0 + lx, py = y0 + ly;
          if (px >= 0 && px < w && py >= 0 && py < h) {
            if (data[(py * w + px) * 4 + 3] !== 0) outlineOnly = false;
          }
        }
      }
    }
    return { pixels, alpha, cells: [...cellSet], colorsOk, outlineOnly };
  }, { left, top, width, height });
}

async function totalCanvasPixels(page) {
  return page.locator('.pointer-trail').evaluate(c => {
    const { data } = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    let count = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) count++;
    return count;
  });
}

async function clickWithoutTrail(page, x, y) {
  await page.mouse.move(x, y);
  await page.clock.runFor(600);
  await page.mouse.down();
  await page.mouse.up();
}

test('background click blooms two-beat grid-aligned outlined squares with transparent centers and settles', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(fixture.url);
    await page.locator('.boot').waitFor({ state: 'detached' });
    const clockStart = Date.parse('2026-01-01T00:00:00Z');
    await page.clock.install({ time: clockStart });
    await page.clock.pauseAt(clockStart + 1000);

    // Click in left background gutter at (48, 400) -> cell (1, 12)
    await clickWithoutTrail(page, 48, 400);
    await page.clock.runFor(24);
    const beat1Start = await sampleRegion(page, 0, 320, 160, 160);
    assert.ok(beat1Start.pixels > 0, 'click must paint pixels on canvas');
    assert.ok(beat1Start.cells.includes('1:12'), `center cell 1:12 must be painted: ${JSON.stringify(beat1Start.cells)}`);
    assert.equal(beat1Start.colorsOk, true, 'painted pixels must be #f5f5f0');
    assert.equal(beat1Start.outlineOnly, true, 'squares must have transparent centers');

    // Advance so primary wave expands to ring 1+
    await page.clock.runFor(90);
    const expanded = await sampleRegion(page, 0, 256, 256, 288);
    assert.ok(expanded.cells.length >= 5, `pulse must expand to neighboring grid cells: ${JSON.stringify(expanded.cells)}`);
    assert.equal(expanded.outlineOnly, true, 'expanded squares must keep transparent centers');

    // Advance into second beat (echo wave) and verify bounded spread
    await page.clock.runFor(140);
    const beat2 = await sampleRegion(page, 0, 224, 320, 352);
    assert.ok(beat2.pixels > 0, 'two-beat echo should still be visible');
    assert.equal(beat2.outlineOnly, true);
    // Far outside bounded radius should remain unpainted
    const far = await sampleRegion(page, 640, 400, 128, 128);
    assert.equal(far.pixels, 0, 'pulse spread must be bounded');

    // Advance past full lifetime and verify complete settle
    await page.clock.runFor(1000);
    assert.equal(await totalCanvasPixels(page), 0, 'pulse must fade out and clear canvas completely');
  } finally {
    await page.close();
  }
});

test('background click preserves normal pointer move-trail behavior', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(fixture.url);
    await page.locator('.boot').waitFor({ state: 'detached' });
    const clockStart = Date.parse('2026-01-01T00:00:00Z');
    await page.clock.install({ time: clockStart });
    await page.clock.pauseAt(clockStart + 1000);

    // Trigger a click pulse first, then move pointer
    await page.mouse.click(48, 400);
    await page.clock.runFor(32);
    await page.mouse.move(280, 200);
    await page.mouse.move(520, 280, { steps: 12 });
    await page.clock.runFor(32);

    const trailSample = await sampleRegion(page, 240, 150, 320, 190);
    assert.ok(trailSample.cells.length >= 10, `move trail must still paint broad cells: ${trailSample.cells.length}`);
    assert.equal(trailSample.outlineOnly, true);
    await page.clock.runFor(1200);
    assert.equal(await totalCanvasPixels(page), 0, 'both trail and pulse settle to zero');
  } finally {
    await page.close();
  }
});

test('blocked targets and drags do not pulse while layout whitespace does without swallowing focus', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(fixture.url);
    // While boot loader is visible, click must not pulse
    const bootVisible = await page.locator('.boot').isVisible();
    if (bootVisible) {
      await page.mouse.click(24, 400);
      await page.waitForTimeout(40);
      assert.equal(await totalCanvasPixels(page), 0, 'click during boot loader must not pulse');
    }
    await page.locator('.boot').waitFor({ state: 'detached' });

    const clockStart = Date.parse('2026-01-01T00:00:00Z');
    await page.clock.install({ time: clockStart });
    await page.clock.pauseAt(clockStart + 1000);

    const clickAndCheckZero = async (locator, label) => {
      const box = await locator.boundingBox();
      assert.ok(box, `${label} must have a bounding box`);
      await clickWithoutTrail(page, Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2));
      await page.clock.runFor(32);
      assert.equal(await totalCanvasPixels(page), 0, `${label} must not trigger click pulse`);
    };

    // Hero section
    await clickAndCheckZero(page.locator('.hero .role'), 'hero content');
    // Form input (also verifies focus works)
    const input = page.locator('#command');
    await clickAndCheckZero(input, 'terminal input');
    assert.equal(await input.evaluate(el => el === document.activeElement), true, 'input focus must not be swallowed');

    // Content heading & interactive card
    const writingHeading = page.locator('#writing-title');
    await writingHeading.scrollIntoViewIfNeeded();
    await clickAndCheckZero(writingHeading, 'section heading content');

    const projectCard = page.locator('.project-card').first();
    await projectCard.scrollIntoViewIfNeeded();
    await clickAndCheckZero(projectCard, 'interactive project card');

    // Drag on background gutter must not pulse (sample after 480ms trail expiry, before 686ms pulse expiry)
    await page.mouse.move(24, 400);
    await page.clock.runFor(600);
    await page.mouse.down();
    await page.mouse.move(24, 460, { steps: 6 });
    await page.mouse.up();
    await page.clock.runFor(520);
    assert.equal(await totalCanvasPixels(page), 0, 'drag on background must not pulse');

    // Return-to-origin drag on background gutter must not pulse either
    await page.mouse.move(24, 400);
    await page.clock.runFor(600);
    await page.mouse.down();
    await page.mouse.move(24, 480, { steps: 6 });
    await page.mouse.move(24, 400, { steps: 6 });
    await page.mouse.up();
    await page.clock.runFor(520);
    assert.equal(await totalCanvasPixels(page), 0, 'return-to-origin drag must not pulse');

    // Whitespace inside layout surface (#writing top padding) SHOULD pulse
    const ws = await page.locator('#writing').evaluate(el => {
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + 20), y: Math.round(r.top + 20) };
    });
    await clickWithoutTrail(page, ws.x, ws.y);
    await page.clock.runFor(32);
    assert.ok((await totalCanvasPixels(page)) > 0, 'whitespace inside layout surface must trigger click pulse');
  } finally {
    await page.close();
  }
});

test('reduced motion and pause suppress click pulse and clear active pulses', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(fixture.url);
    await page.locator('.boot').waitFor({ state: 'detached' });
    const clockStart = Date.parse('2026-01-01T00:00:00Z');
    await page.clock.install({ time: clockStart });
    await page.clock.pauseAt(clockStart + 1000);

    await clickWithoutTrail(page, 48, 400);
    await page.clock.runFor(32);
    assert.ok((await totalCanvasPixels(page)) > 0);

    // Pause clears active pulse and suppresses new ones
    await page.getByRole('button', { name: 'Pause animations' }).click();
    await page.clock.runFor(32);
    assert.equal(await totalCanvasPixels(page), 0, 'pause clears active pulse');
    await clickWithoutTrail(page, 48, 400);
    await page.clock.runFor(32);
    assert.equal(await totalCanvasPixels(page), 0, 'pause suppresses new pulse');

    // Resume restores click pulse
    await page.getByRole('button', { name: 'Resume animations' }).click();
    await clickWithoutTrail(page, 48, 400);
    await page.clock.runFor(32);
    assert.ok((await totalCanvasPixels(page)) > 0, 'resume restores click pulse');

    // Reduced motion clears active pulse and suppresses new ones
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.runFor(32);
    assert.equal(await totalCanvasPixels(page), 0, 'reduced motion clears active pulse');
    await clickWithoutTrail(page, 48, 400);
    await page.clock.runFor(32);
    assert.equal(await totalCanvasPixels(page), 0, 'reduced motion suppresses new pulse');

    // Pagehide clears and pageshow restores
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await clickWithoutTrail(page, 48, 400);
    await page.clock.runFor(32);
    assert.ok((await totalCanvasPixels(page)) > 0);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    await page.clock.runFor(32);
    assert.equal(await totalCanvasPixels(page), 0, 'pagehide clears active pulse');
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await clickWithoutTrail(page, 48, 400);
    await page.clock.runFor(32);
    assert.ok((await totalCanvasPixels(page)) > 0, 'pageshow restores click pulse');

    // Rapid clicks are bounded and settle cleanly
    for (let i = 0; i < 12; i++) {
      await page.mouse.down();
      await page.mouse.up();
      await page.clock.runFor(16);
    }
    await page.clock.runFor(1000);
    assert.equal(await totalCanvasPixels(page), 0, 'rapid clicks settle cleanly without indefinite RAF');
  } finally {
    await page.close();
  }
});

test('mobile touch tap triggers click pulse without enabling move trail', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  try {
    await page.goto(fixture.url);
    await page.locator('.boot').waitFor({ state: 'detached' });
    const clockStart = Date.parse('2026-01-01T00:00:00Z');
    await page.clock.install({ time: clockStart });
    await page.clock.pauseAt(clockStart + 1000);

    // Tap layout whitespace in #writing
    const ws = await page.locator('#writing').evaluate(el => {
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + 12), y: Math.round(r.top + 16) };
    });
    await page.touchscreen.tap(ws.x, ws.y);
    await page.clock.runFor(32);
    const tapped = await sampleRegion(page, Math.max(0, ws.x - 64), Math.max(0, ws.y - 64), 128, 128);
    assert.ok(tapped.pixels > 0, 'mobile tap on background whitespace must paint pulse');
    assert.equal(tapped.outlineOnly, true);

    await page.clock.runFor(1000);
    assert.equal(await totalCanvasPixels(page), 0);

    // Touch pointermove must NOT enable move trail
    await page.evaluate(() => {
      window.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'touch', clientX: 20, clientY: 300, bubbles: true }));
      window.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'touch', clientX: 80, clientY: 360, bubbles: true }));
    });
    await page.clock.runFor(32);
    assert.equal(await totalCanvasPixels(page), 0, 'touch move must not enable move trail');
  } finally {
    await context.close();
  }
});

test('trail expiry clears previous during active click wave and non-primary pen buttons do not pulse', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(fixture.url);
    await page.locator('.boot').waitFor({ state: 'detached' });
    const clockStart = Date.parse('2026-01-01T00:00:00Z');
    await page.clock.install({ time: clockStart });
    await page.clock.pauseAt(clockStart + 1000);

    // Start a click pulse at (48, 400), move briefly at (80, 400), then wait past 480ms trail fade while pulse is still active (< 686ms)
    await clickWithoutTrail(page, 48, 400);
    await page.mouse.move(80, 400);
    await page.clock.runFor(520);
    const activePulse = await sampleRegion(page, 0, 224, 224, 352);
    assert.ok(activePulse.pixels > 0, 'click wave must still be active at 520ms');

    // Next move across screen must NOT interpolate from the expired trail
    await page.mouse.move(640, 400);
    await page.clock.runFor(24);
    const bridge = await sampleRegion(page, 288, 352, 192, 96);
    assert.equal(bridge.pixels, 0, 'expired trail must not connect to new move while click wave is active');

    await page.clock.runFor(1000);
    assert.equal(await totalCanvasPixels(page), 0);

    // Non-primary pen buttons (barrel=2, eraser=5) must not pulse; primary pen (button=0) must pulse
    for (const button of [2, 5]) {
      await page.evaluate((btn) => {
        const target = document.elementFromPoint(48, 400) || document.body;
        const init = { pointerId: 10 + btn, pointerType: 'pen', isPrimary: true, button: btn, clientX: 48, clientY: 400, bubbles: true };
        target.dispatchEvent(new PointerEvent('pointerdown', init));
        target.dispatchEvent(new PointerEvent('pointerup', init));
      }, button);
      await page.clock.runFor(32);
      assert.equal(await totalCanvasPixels(page), 0, `pen button ${button} must not pulse`);
    }

    await page.evaluate(() => {
      const target = document.elementFromPoint(48, 400) || document.body;
      const init = { pointerId: 20, pointerType: 'pen', isPrimary: true, button: 0, clientX: 48, clientY: 400, bubbles: true };
      target.dispatchEvent(new PointerEvent('pointerdown', init));
      target.dispatchEvent(new PointerEvent('pointerup', init));
    });
    await page.clock.runFor(32);
    assert.ok((await totalCanvasPixels(page)) > 0, 'primary pen contact (button 0) must pulse');
    await page.clock.runFor(1000);
    assert.equal(await totalCanvasPixels(page), 0);
  } finally {
    await page.close();
  }
});

test('blank hero gutters, gaps, and decorative hero-dots pulse on desktop and mobile while hero controls and content do not', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(fixture.url);
    await page.locator('.boot').waitFor({ state: 'detached' });
    const clockStart = Date.parse('2026-01-01T00:00:00Z');
    await page.clock.install({ time: clockStart });
    await page.clock.pauseAt(clockStart + 1000);

    const desktopCoords = await page.evaluate(() => {
      const hero = document.querySelector('.hero').getBoundingClientRect();
      const copy = document.querySelector('.hero-copy').getBoundingClientRect();
      const dots = document.querySelector('.hero-dots').getBoundingClientRect();
      return {
        topPad: { x: Math.round(hero.left + 120), y: Math.round(hero.top + 20) },
        colGap: { x: Math.round((copy.right + dots.left) / 2), y: Math.round((dots.top + dots.bottom) / 2) },
        aboveDots: { x: Math.round(dots.left + dots.width / 2), y: Math.round(dots.top - 20) },
        dotsCenter: { x: Math.round(dots.left + dots.width / 2), y: Math.round(dots.top + dots.height / 2) },
        bottomPad: { x: Math.round(hero.left + 120), y: Math.round(hero.bottom - 30) },
      };
    });

    for (const [label, pt] of Object.entries(desktopCoords)) {
      await clickWithoutTrail(page, pt.x, pt.y);
      await page.clock.runFor(32);
      const sample = await sampleRegion(page, Math.max(0, pt.x - 48), Math.max(0, pt.y - 48), 96, 96);
      assert.ok(sample.pixels > 0, `desktop hero ${label} at (${pt.x}, ${pt.y}) must pulse`);
      assert.equal(sample.outlineOnly, true, `desktop hero ${label} pulse must be outline-only`);
      await page.clock.runFor(1000);
      assert.equal(await totalCanvasPixels(page), 0);
    }

    // Blocked hero controls & content must still not pulse
    const heroBlocked = [
      ['wordmark replay', page.locator('.hero-wordmark')],
      ['hero role', page.locator('.hero .role')],
      ['hero intro', page.locator('.hero .intro')],
      ['hero directory nav', page.locator('.hero .terminal-list')],
      ['terminal run button', page.locator('#command-form button[type="submit"]')],
      ['terminal hint', page.locator('.command-hint')],
      ['motion toggle', page.locator('.motion-toggle')],
    ];
    for (const [label, loc] of heroBlocked) {
      const box = await loc.boundingBox();
      assert.ok(box, `${label} must have a bounding box`);
      await clickWithoutTrail(page, Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2));
      await page.clock.runFor(32);
      assert.equal(await totalCanvasPixels(page), 0, `desktop ${label} must not pulse`);
    }
    // Resume animations after clicking motion toggle above
    await page.getByRole('button', { name: 'Resume animations' }).click();
  } finally {
    await page.close();
  }

  // Mobile tap in blank hero areas
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const mobilePage = await context.newPage();
  try {
    await mobilePage.goto(fixture.url);
    await mobilePage.locator('.boot').waitFor({ state: 'detached' });
    const clockStart = Date.parse('2026-01-01T00:00:00Z');
    await mobilePage.clock.install({ time: clockStart });
    await mobilePage.clock.pauseAt(clockStart + 1000);

    const mobileCoords = await mobilePage.evaluate(() => {
      const hero = document.querySelector('.hero').getBoundingClientRect();
      const dots = document.querySelector('.hero-dots').getBoundingClientRect();
      return {
        topPad: { x: Math.round(hero.left + 80), y: Math.round(hero.top + 20) },
        aboveDotsGap: { x: Math.round(dots.left + dots.width / 2), y: Math.round(dots.top - 15) },
        dotsCenter: { x: Math.round(dots.left + dots.width / 2), y: Math.round(dots.top + dots.height / 2) },
      };
    });

    for (const [label, pt] of Object.entries(mobileCoords)) {
      await mobilePage.touchscreen.tap(pt.x, pt.y);
      await mobilePage.clock.runFor(32);
      const sample = await sampleRegion(mobilePage, Math.max(0, pt.x - 48), Math.max(0, pt.y - 48), 96, 96);
      assert.ok(sample.pixels > 0, `mobile hero ${label} at (${pt.x}, ${pt.y}) must pulse`);
      assert.equal(sample.outlineOnly, true);
      await mobilePage.clock.runFor(1000);
      assert.equal(await totalCanvasPixels(mobilePage), 0);
    }

    // Blocked mobile hero targets must not pulse
    for (const [label, loc] of [
      ['wordmark replay', mobilePage.locator('.hero-wordmark')],
      ['hero role', mobilePage.locator('.hero .role')],
      ['terminal input', mobilePage.locator('#command')],
      ['terminal hint', mobilePage.locator('.command-hint')],
    ]) {
      const box = await loc.boundingBox();
      assert.ok(box);
      await mobilePage.touchscreen.tap(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2));
      await mobilePage.clock.runFor(32);
      assert.equal(await totalCanvasPixels(mobilePage), 0, `mobile ${label} must not pulse`);
    }
  } finally {
    await context.close();
  }
});
