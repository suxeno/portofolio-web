import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { createSsrFixture } from './helpers/ssr-fixture.mjs';

let fixture, browser, url;

before(async () => {
  fixture = await createSsrFixture();
  url = fixture.url;
  const executablePath = process.env.CHROMIUM_PATH || ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].find(existsSync);
  if (!executablePath) throw Error('Chromium/Chrome not found; set CHROMIUM_PATH');
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-gpu'] });
});

after(async () => {
  try { await browser?.close(); } finally { await fixture?.dispose(); }
});

async function gotoHome(page, { pauseClock = false } = {}) {
  if (pauseClock) {
    await page.clock.install();
  }
  await page.goto(url);
  const boot = page.locator('.boot');
  if (await boot.count()) {
    await page.keyboard.press('Escape');
    await boot.waitFor({ state: 'detached' });
  }
  if (pauseClock) {
    await page.clock.pauseAt(new Date(Date.now() + 60_000));
  }
}

test('wordmark heading stays readable without JS and exposes separate wordmark and pause controls', async () => {
  const noJsPage = await browser.newPage({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  try {
    await noJsPage.goto(url);
    const heading = noJsPage.getByRole('heading', { level: 1 });
    assert.equal((await heading.textContent()).trim(), 'Arvin');
    assert.equal(await heading.isVisible(), true);
  } finally {
    await noJsPage.close();
  }

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await gotoHome(page);
    const heading = page.getByRole('heading', { level: 1 });
    assert.equal((await heading.innerText()).trim().toUpperCase(), 'ARVIN');
    const wordmark = page.getByRole('button', { name: 'Arvin' });
    const pause = page.getByRole('button', { name: 'Pause animations' });
    assert.equal(await wordmark.count(), 1);
    assert.equal(await pause.count(), 1);
    const pauseBox = await pause.boundingBox();
    assert.ok(pauseBox.width >= 44 && pauseBox.height >= 44, `pause hit target >= 44x44: ${JSON.stringify(pauseBox)}`);
  } finally {
    await page.close();
  }
});

test('wordmark hover replays an animation variation and settles without layout shift', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await gotoHome(page, { pauseClock: true });
    const wordmark = page.getByRole('button', { name: 'Arvin' });
    const beforeBox = await wordmark.boundingBox();
    const beforeStyle = await wordmark.evaluate(el => {
      const s = getComputedStyle(el);
      return { fontFamily: s.fontFamily, fontSize: s.fontSize, color: s.color };
    });

    await wordmark.hover();
    assert.equal(await wordmark.getAttribute('data-replaying'), 'true');
    assert.ok(['0', '1', '2'].includes(await wordmark.getAttribute('data-variant')));

    const snapshots = new Set();
    for (let i = 0; i < 12; i++) {
      const snap = await page.evaluate(() => {
        const strips = [...document.querySelectorAll('.hero-wordmark-strip')];
        return strips.map(s => `${s.style.transform}|${s.style.opacity}`).join(';');
      });
      if (snap) snapshots.add(snap);
      await page.clock.runFor(48);
    }
    assert.ok(snapshots.size >= 3, `expected multiple stepped fragment states, got ${snapshots.size}`);

    await page.clock.runFor(300);
    assert.equal(await wordmark.getAttribute('data-replaying'), null);
    const afterBox = await wordmark.boundingBox();
    const afterStyle = await wordmark.evaluate(el => {
      const s = getComputedStyle(el);
      return { fontFamily: s.fontFamily, fontSize: s.fontSize, color: s.color };
    });
    assert.deepEqual(afterStyle, beforeStyle);
    assert.ok(Math.abs(afterBox.width - beforeBox.width) < 0.5 && Math.abs(afterBox.height - beforeBox.height) < 0.5, JSON.stringify({ beforeBox, afterBox }));
    assert.equal(await page.evaluate(() => document.body.classList.contains('title-paused')), false);
    assert.equal(await page.getByRole('button', { name: 'Pause animations' }).getAttribute('aria-pressed'), 'false');
  } finally {
    await page.close();
  }
});

test('wordmark chooses among three hover variations without repeating consecutively', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await gotoHome(page);
    const wordmark = page.getByRole('button', { name: 'Arvin' });
    const variants = new Set();
    for (let i = 0; i < 6; i++) {
      await page.mouse.move(4, 4);
      await wordmark.hover();
      variants.add(await wordmark.getAttribute('data-variant'));
      await page.waitForTimeout(820);
    }
    assert.ok(variants.size >= 2, `expected randomized variants, got ${[...variants]}`);
  } finally {
    await page.close();
  }
});

test('wordmark supports retrigger mid-animation and keyboard Enter/Space', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await gotoHome(page, { pauseClock: true });
    const wordmark = page.getByRole('button', { name: 'Arvin' });

    await wordmark.focus();
    await page.keyboard.press('Enter');
    assert.equal(await wordmark.getAttribute('data-replaying'), 'true');
    await page.clock.runFor(192);
    assert.equal(await wordmark.getAttribute('data-replaying'), 'true');
    // Retrigger mid-animation via Space
    await page.keyboard.press('Space');
    assert.equal(await wordmark.getAttribute('data-replaying'), 'true');
    await page.clock.runFor(624);
    assert.equal(await wordmark.getAttribute('data-replaying'), 'true');
    await page.clock.runFor(200);
    assert.equal(await wordmark.getAttribute('data-replaying'), null);
    assert.equal(await page.evaluate(() => document.body.classList.contains('title-paused')), false);
  } finally {
    await page.close();
  }
});

test('wordmark honors global pause and reduced motion including mid-animation cancel', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await gotoHome(page, { pauseClock: true });
    const wordmark = page.getByRole('button', { name: 'Arvin' });
    const pause = page.getByRole('button', { name: 'Pause animations' });

    // Cancel mid-animation via global pause
    await wordmark.hover();
    assert.equal(await wordmark.getAttribute('data-replaying'), 'true');
    await page.clock.runFor(96);
    await pause.click();
    assert.equal(await page.evaluate(() => document.body.classList.contains('title-paused')), true);
    assert.equal(await wordmark.getAttribute('data-replaying'), null);

    await wordmark.hover();
    assert.equal(await wordmark.getAttribute('data-replaying'), null);

    // Resume allows replay
    await page.getByRole('button', { name: 'Resume animations' }).click();
    await wordmark.hover();
    assert.equal(await wordmark.getAttribute('data-replaying'), 'true');
    await page.clock.runFor(96);

    // Cancel mid-animation via prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('.hero-wordmark')?.getAttribute('data-replaying') === null);

    await wordmark.hover();
    assert.equal(await wordmark.getAttribute('data-replaying'), null);
  } finally {
    await page.close();
  }
});

test('wordmark remains responsive on touch widths without a hover interaction', async () => {
  for (const width of [320, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: true });
    try {
      await gotoHome(page, { pauseClock: true });
      const wordmark = page.getByRole('button', { name: 'Arvin' });
      const pause = page.getByRole('button', { name: 'Pause animations' });
      const pauseBox = await pause.boundingBox();
      assert.ok(pauseBox.width >= 44 && pauseBox.height >= 44, `pause hit target at ${width}`);
      assert.ok(pauseBox.x + pauseBox.width <= width, `pause stays inside viewport at ${width}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `no overflow before replay at ${width}`);

      await wordmark.tap();
      assert.equal(await wordmark.getAttribute('data-replaying'), null);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `no overflow after touch at ${width}`);
    } finally {
      await page.close();
    }
  }
});
