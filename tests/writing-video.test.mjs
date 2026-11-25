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

async function gotoHome(page) {
  await page.goto(url);
  const boot = page.locator('.boot');
  if (await boot.count()) {
    await page.keyboard.press('Escape');
    await boot.waitFor({ state: 'detached' });
  }
}

test('writing video defers playback when near-but-offscreen, wraps naturally in view, and pauses in margin', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const webmRequests = [];
  page.on('request', req => { if (req.url().includes('writing-loop.webm')) webmRequests.push(req.url()); });
  try {
    await gotoHome(page);
    await page.waitForTimeout(300);

    // At scrollY=0 on 390x844, #writing is beyond the 120px margin: source must be deferred.
    const farOffscreen = await page.locator('#writing .writing-art-frame').evaluate(frame => {
      const video = frame.querySelector('.writing-video');
      const rect = frame.getBoundingClientRect();
      return {
        top: rect.top,
        innerHeight: window.innerHeight,
        src: video.getAttribute('src'),
        paused: video.paused,
        currentTime: video.currentTime,
        ready: frame.dataset.ready ?? null,
      };
    });
    assert.ok(farOffscreen.top >= farOffscreen.innerHeight + 120, `expected #writing beyond 120px margin at scrollY=0, got top=${farOffscreen.top}`);
    assert.equal(farOffscreen.src, null, 'far-offscreen video must defer src');
    assert.equal(webmRequests.length, 0, 'far-offscreen should not request webm');

    // Scroll into the 120px near-viewport margin (wholly below fold, top ~904): src loads, playback stays paused.
    await page.evaluate(() => {
      const rect = document.querySelector('#writing .writing-art-frame').getBoundingClientRect();
      window.scrollBy(0, rect.top - window.innerHeight - 60);
    });
    await page.waitForFunction(() => document.querySelector('#writing .writing-video')?.getAttribute('src') === '/art/writing-loop.webm');
    await page.waitForTimeout(400);

    const nearOffscreen = await page.locator('#writing .writing-art-frame').evaluate(frame => {
      const video = frame.querySelector('.writing-video');
      const rect = frame.getBoundingClientRect();
      return {
        top: rect.top,
        innerHeight: window.innerHeight,
        src: video.getAttribute('src'),
        paused: video.paused,
        currentTime: video.currentTime,
        ready: frame.dataset.ready ?? null,
      };
    });
    assert.ok(nearOffscreen.top >= nearOffscreen.innerHeight, `expected #writing below fold, got top=${nearOffscreen.top}`);
    assert.ok(nearOffscreen.top < nearOffscreen.innerHeight + 120, `expected #writing within 120px margin, got top=${nearOffscreen.top}`);
    assert.equal(nearOffscreen.src, '/art/writing-loop.webm', 'near-viewport should preload video src');
    assert.equal(nearOffscreen.paused, true, 'near-but-offscreen video must remain paused');
    assert.equal(nearOffscreen.currentTime, 0, 'near-but-offscreen video must not advance currentTime');
    assert.notEqual(nearOffscreen.ready, 'true', 'near-but-offscreen video must keep static poster');
    assert.ok(webmRequests.length >= 1, 'expected near-viewport webm request');

    await page.waitForTimeout(500);
    const stillPaused = await page.locator('#writing .writing-video').evaluate(v => ({ paused: v.paused, currentTime: v.currentTime }));
    assert.equal(stillPaused.paused, true);
    assert.equal(stillPaused.currentTime, 0);

    // Scroll into true viewport: playback starts and naturally wraps across the 7.042s loop boundary.
    await page.locator('#writing .writing-art-frame').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const f = document.querySelector('#writing .writing-art-frame');
      const v = f?.querySelector('.writing-video');
      return f?.dataset.ready === 'true' && v && !v.paused && v.currentTime > 0.1;
    });

    let peakTime = 0;
    let wrapped = false;
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const state = await page.locator('#writing .writing-video').evaluate(v => ({ t: v.currentTime, d: v.duration, paused: v.paused }));
      assert.equal(state.paused, false, 'video should stay playing while visible');
      if (state.t > peakTime) peakTime = state.t;
      if (peakTime > 6.0 && state.t < peakTime - 1.0 && state.t < 2.0) {
        wrapped = true;
        break;
      }
      await page.waitForTimeout(150);
    }
    assert.ok(wrapped, `expected natural loop wrap (peakTime=${peakTime})`);

    // Scroll back so #writing re-enters the 120px margin below viewport: playback must pause.
    await page.evaluate(() => {
      const rect = document.querySelector('#writing .writing-art-frame').getBoundingClientRect();
      window.scrollBy(0, rect.top - window.innerHeight - 60);
    });
    await page.waitForFunction(() => {
      const v = document.querySelector('#writing .writing-video');
      return v && v.paused;
    });
    const marginRect = await page.locator('#writing .writing-art-frame').evaluate(f => f.getBoundingClientRect().toJSON());
    assert.ok(marginRect.top >= 844 && marginRect.top < 844 + 120);
    const pausedAt = await page.locator('#writing .writing-video').evaluate(v => v.currentTime);
    await page.waitForTimeout(500);
    const afterMarginWait = await page.locator('#writing .writing-video').evaluate(v => ({ paused: v.paused, currentTime: v.currentTime }));
    assert.equal(afterMarginWait.paused, true);
    assert.equal(afterMarginWait.currentTime, pausedAt);
  } finally {
    await page.close();
  }
});

test('writing video respects motion controls, visibility, error fallback, no-JS, and geometry', async () => {
  for (const width of [320, 390, 1280, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    try {
      await gotoHome(page);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
      const box = await page.locator('#writing .writing-art-frame').evaluate(f => f.getBoundingClientRect().toJSON());
      const heading = await page.locator('#writing h2').boundingBox();
      if (width < 900) {
        assert.ok(Math.abs(box.width - heading.width) < 1);
        assert.ok(Math.abs(box.width / box.height - 1206 / 682) < .05);
        assert.ok(box.y + box.height <= heading.y);
      } else {
        const more = await page.locator('#writing .writing-more a').boundingBox();
        assert.ok(Math.abs(box.y - heading.y) < 1);
        assert.ok(Math.abs(box.y + box.height - more.y - more.height) < 1);
      }
    } finally {
      await page.close();
    }
  }

  const page = await browser.newPage({ viewport: { width: 1280, height: 844 } });
  try {
    await gotoHome(page);
    await page.locator('#writing .writing-art-frame').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const v = document.querySelector('#writing .writing-video');
      return v && !v.paused && v.currentTime > 0.1;
    });

    // Global animation pause/resume toggle
    await page.getByRole('button', { name: 'Pause animations' }).click();
    assert.equal(await page.locator('#writing .writing-video').evaluate(v => v.paused), true);
    await page.getByRole('button', { name: 'Resume animations' }).click();
    await page.locator('#writing .writing-art-frame').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.querySelector('#writing .writing-video').paused);

    // Reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('#writing .writing-art-frame').dataset.reduced === 'true');
    assert.equal(await page.locator('#writing .writing-video').evaluate(v => v.paused), true);
    assert.equal(await page.locator('#writing .writing-poster').isVisible(), true);
    assert.equal(await page.locator('#writing .writing-video').isVisible(), false);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => !document.querySelector('#writing .writing-video').paused);

    // Document hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await page.locator('#writing .writing-video').evaluate(v => v.paused), true);

    // Error fallback
    await page.evaluate(() => {
      document.querySelector('#writing .writing-video').dispatchEvent(new Event('error'));
    });
    assert.equal(await page.locator('#writing .writing-art-frame').getAttribute('data-error'), 'true');
    assert.equal(await page.locator('#writing .writing-poster').isVisible(), true);
    assert.equal(await page.locator('#writing .writing-video').isVisible(), false);
  } finally {
    await page.close();
  }

  const noJsPage = await browser.newPage({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const noJsWebm = [];
  noJsPage.on('request', req => { if (req.url().includes('writing-loop.webm')) noJsWebm.push(req.url()); });
  try {
    await noJsPage.goto(url);
    assert.equal(await noJsPage.locator('#writing .writing-poster').isVisible(), true);
    assert.equal(await noJsPage.locator('#writing .writing-video').isVisible(), false);
    assert.equal(noJsWebm.length, 0);
  } finally {
    await noJsPage.close();
  }
});
