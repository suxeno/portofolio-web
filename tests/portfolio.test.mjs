import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';

let server, browser;
let url;
before(async () => {
  const reservation = createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  url = `http://127.0.0.1:${port}`;
  server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore', detached: true });
  let ready = false;
  for (let i = 0; i < 100; i++) { try { if ((await fetch(url)).ok) { ready = true; break; } } catch {} await new Promise(r => setTimeout(r, 100)); }
  if (!ready) throw Error('Vite did not start');
  const executablePath = process.env.CHROMIUM_PATH || ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].find(existsSync);
  if (!executablePath) throw Error('Chromium/Chrome not found; set CHROMIUM_PATH');
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
});
after(async () => {
  await browser?.close();
  if (server?.pid) {
    try { process.kill(-server.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
});
test('career content and contact work without JavaScript', async () => {
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.goto(url);
  assert.equal(await page.locator('h1').textContent(), 'Arvinanto Bahtiar');
  assert.equal(await page.locator('#contact a[href*="linkedin.com"]').count(), 1);
  assert.equal(await page.locator('.boot').count(), 0);
  await page.close();
});
test('first-session intro is skippable, bounded and does not repeat', async () => {
  const context = await browser.newContext(); const page = await context.newPage();
  await page.clock.install(); await page.clock.pauseAt(new Date());
  await page.goto(url, { waitUntil: 'domcontentloaded' }); await page.locator('.boot').waitFor({ state: 'attached', timeout: 5000 }); assert.equal(await page.locator('.boot').count(), 1);
  await page.getByRole('button', { name: 'Skip intro' }).focus(); await page.keyboard.press('Enter'); assert.equal(await page.locator('.boot').count(), 0);
  await page.reload(); assert.equal(await page.locator('.boot').count(), 0);
  await page.evaluate(() => sessionStorage.clear()); await page.reload();
  assert.equal(await page.locator('.boot').count(), 1); await page.clock.fastForward(2500); assert.equal(await page.locator('.boot').count(), 0);
  await context.close();
});
test('package intro updates terminal rows in place then completes its transaction', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.clock.install(); await page.clock.pauseAt(new Date());
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.locator('.boot').waitFor({ state: 'attached' });
  assert.equal(await page.locator('[data-boot-package]').count(), 4);
  await page.clock.runFor(180);
  const partial = await page.locator('[data-boot-package="experience"] .boot-percent').textContent();
  assert.notEqual(partial, '100%');
  assert.match(await page.locator('.boot-summary').textContent(), /KiB/);
  await page.clock.runFor(1300);
  assert.equal(await page.locator('[data-boot-package]').count(), 4, 'updates replace values, never duplicate log rows');
  for (const name of ['experience', 'projects', 'about', 'contact']) {
    assert.equal(await page.locator(`[data-boot-package="${name}"] .boot-percent`).textContent(), '100%');
    assert.match(await page.locator(`[data-boot-package="${name}"] .boot-size`).textContent(), /KiB/);
  }
  await page.clock.runFor(650);
  assert.match(await page.locator('.boot-transaction').textContent(), /Complete!/);
  await page.setViewportSize({ width: 320, height: 640 });
  assert.equal(await page.evaluate(() => {
    const transaction = document.querySelector('.boot-transaction').getBoundingClientRect();
    const body = document.querySelector('.boot-body').getBoundingClientRect();
    return transaction.bottom <= body.bottom && transaction.left >= 0;
  }), true, 'completed transaction stays visible on a small phone');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.clock.runFor(400);
  assert.equal(await page.locator('.boot').count(), 0);
  await page.close();
});

test('reduced motion, deep links, denied storage and escape bypass or dismiss intro', async () => {
  const reduced = await browser.newPage({ reducedMotion: 'reduce' }); await reduced.goto(url); assert.equal(await reduced.locator('.boot').count(), 0); await reduced.close();
  const deep = await browser.newPage(); await deep.goto(url + '/#contact'); assert.equal(await deep.locator('.boot').count(), 0); await deep.close();
  const denied = await browser.newPage(); await denied.addInitScript(() => { Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('denied'); } }); }); await denied.goto(url); assert.equal(await denied.locator('.boot').count(), 0); await denied.close();
  const page = await browser.newPage(); await page.goto(url); await page.keyboard.press('Escape'); assert.equal(await page.locator('.boot').count(), 0); await page.close();
});
test('terminal commands, error handling, focus and browser history', async () => {
  const page = await browser.newPage({ reducedMotion: 'reduce' }); await page.goto(url);
  const input = page.getByRole('textbox', { name: 'Command' }); const output = page.locator('#terminal-output');
  async function run(value) { await input.fill(value); await input.press('Enter'); }
  await run(' HELP '); assert.match(await output.textContent(), /experience, projects, about, contact, help, clear/);
  await run('<img src=x onerror=alert(1)>'); assert.match(await output.textContent(), /not recognized/); assert.equal(await output.locator('img').count(), 0);
  await run(''); assert.match(await output.textContent(), /Enter a command/);
  await run('clear'); assert.equal(await output.textContent(), '');
  for (const name of ['experience', 'projects', 'about', 'contact']) { await run(name.toUpperCase()); assert.equal(new URL(page.url()).hash, '#' + name); assert.equal(await page.evaluate(() => document.activeElement?.id), name + '-title'); }
  await page.goBack(); assert.equal(new URL(page.url()).hash, '#about');
  await page.getByRole('button', { name: 'projects', exact: true }).click(); assert.equal(new URL(page.url()).hash, '#projects');
  await page.close();
});
test('scroll motion enhances visible sections and respects preference changes', async () => {
  const page = await browser.newPage({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    window.__sectionMotion = [];
    Element.prototype.animate = function (...args) {
      window.__sectionMotion.push(this.id || this.className);
      return original.apply(this, args);
    };
  });
  await page.goto(url + '/#experience');
  await page.waitForFunction(() => window.__sectionMotion.includes('experience-title'));
  assert.equal(await page.locator('#experience-title').isVisible(), true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const before = await page.evaluate(() => window.__sectionMotion.length);
  await page.locator('#contact-title').scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.__sectionMotion.length), before);
  await page.close();
});

test('mobile layout, keyboard focus and console', async () => {
  for (const width of [320, 390, 900, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 800 }, reducedMotion: 'reduce' }); const errors = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url); await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Skip to content');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}`);
    assert.deepEqual(errors, []); await page.close();
  }
});
