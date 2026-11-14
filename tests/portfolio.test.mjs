import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';

test('compact header opens accessible drawer and restores focus on Escape', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  try {
    await page.goto(url);
    const trigger = page.getByRole('button', { name: 'Open menu' });
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('.site-header nav').isVisible(), false);
    await trigger.click();
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.getByRole('dialog').isVisible(), true);
    await page.keyboard.press('Escape');
    // Native dialog close events are queued; wait for the observable cleanup, not an arbitrary delay.
    await page.waitForFunction(() => document.querySelector('.menu-trigger').getAttribute('aria-expanded') === 'false');
    assert.equal(await page.getByRole('dialog').isVisible(), false);
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
  } finally { await page.close(); }
});

test('drawer closes by button, backdrop, resize and history restore without scroll lock', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  try {
    await page.goto(url); await page.evaluate(() => scrollTo(0, 400));
    const trigger = page.getByRole('button', { name: 'Open menu' });
    const open = async () => { await trigger.click(); assert.equal(await page.evaluate(() => document.documentElement.style.overflow), 'hidden'); };
    const closed = async () => { await page.waitForFunction(() => document.querySelector('.menu-trigger').getAttribute('aria-expanded') === 'false'); assert.equal(await page.evaluate(() => document.documentElement.style.overflow), ''); };
    await open(); await page.getByRole('button', { name: 'Close menu' }).click(); await closed();
    assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
    await open(); await page.mouse.click(5, 300); await closed();
    await open(); await page.setViewportSize({ width: 1280, height: 844 }); await closed();
    assert.equal(await page.locator('.site-header nav').isVisible(), true);
    await page.setViewportSize({ width: 390, height: 844 }); await open();
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))); await closed();
  } finally { await page.close(); }
});

test('browser Back while drawer is open closes it and restores scrolling', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  try {
    await page.goto(url);
    await page.evaluate(() => history.pushState(null, '', '#projects'));
    const trigger = page.getByRole('button', { name: 'Open menu' });
    await trigger.click();
    assert.equal(await page.evaluate(() => document.documentElement.style.overflow), 'hidden');
    await page.goBack();
    await page.waitForFunction(() => document.querySelector('.menu-trigger').getAttribute('aria-expanded') === 'false');
    assert.equal(await page.locator('dialog').isVisible(), false);
    assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '');
    assert.equal(await page.evaluate(() => location.hash), '');
  } finally { await page.close(); }
});

test('drawer confines keyboard focus and section link focuses heading', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  try {
    await page.goto(url); await page.getByRole('button', { name: 'Open menu' }).click();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement === document.body || document.querySelector('dialog').contains(document.activeElement)), true);
    }
    await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Projects' }).click();
    assert.equal(await page.evaluate(() => location.hash), '#projects');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'projects-title');
    assert.equal(await page.locator('dialog').isVisible(), false);
  } finally { await page.close(); }
});

test('compact and desktop geometry and no-JavaScript fallback', async () => {
  for (const width of [320, 390, 899, 900, 1280, 1366, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    try {
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
      assert.equal(await page.locator('.site-header nav').isVisible(), width >= 900);
      if (width < 900) {
        const box = await page.getByRole('button', { name: 'Open menu' }).boundingBox();
        assert.ok(box.width >= 44 && box.height >= 44);
        const brand = await page.locator('.site-header .wordmark').boundingBox();
        assert.ok(box.x >= brand.x + brand.width, `trigger must be right of brand at ${width}`);
        assert.ok(Math.abs((box.y + box.height / 2) - (brand.y + brand.height / 2)) <= 1, `brand and trigger must share a vertical center at ${width}`);
      }
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  }
  const page = await browser.newPage({ viewport: { width: 320, height: 844 }, javaScriptEnabled: false });
  try {
    await page.goto(url);
    assert.equal(await page.locator('.site-header nav a').count(), 4);
    assert.equal(await page.locator('.site-header nav a').first().isVisible(), true);
    assert.equal(await page.locator('.menu-trigger').isVisible(), false);
  } finally { await page.close(); }
});

async function trackMotion(page) {
  await page.addInitScript(() => {
    window.__motion = [];
    const observe = () => {
      const observer = new MutationObserver(records => {
        for (const record of records) {
          const element = record.target;
          if (!(element instanceof HTMLElement) || !element.style.transform) continue;
          const section = element.closest('section')?.id;
          if (section) window.__motion.push({ section, id: element.id, index: [...element.parentElement.children].indexOf(element), transform: element.style.transform, at: performance.now() });
        }
      });
      observer.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['style'] });
    };
    document.addEventListener('DOMContentLoaded', observe, { once: true });
  });
}
let server, browser;
let url;
before(async () => {
  const reservation = createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  url = `http://127.0.0.1:${port}`;
  server = spawn('./node_modules/.bin/astro', ['preview', '--host', '127.0.0.1', '--port', String(port), '--ignore-lock'], { stdio: 'ignore', detached: true });
  let ready = false;
  for (let i = 0; i < 100; i++) { try { if ((await fetch(url)).ok) { ready = true; break; } } catch {} await new Promise(r => setTimeout(r, 100)); }
  if (!ready) throw Error('Astro preview did not start');
  const executablePath = process.env.CHROMIUM_PATH || ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].find(existsSync);
  if (!executablePath) throw Error('Chromium/Chrome not found; set CHROMIUM_PATH');
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-gpu'] });
});
after(async () => {
  await browser?.close();
  if (server?.pid) {
    try { process.kill(-server.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
});
test('dither renders distinct binary studies after a cached-page restore', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await page.goto(url);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  const signatures = [];
  for (const id of ['writing', 'projects', 'experience', 'achievements', 'contact']) {
    const canvas = page.locator(`[data-dither="${id}"]`);
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const pixels = await canvas.evaluate(c => [...c.getContext('2d').getImageData(0,0,c.width,c.height).data]);
    const alpha = pixels.filter((_, i) => i % 4 === 3);
    assert.ok(alpha.some(a => a === 255), `${id} contains ink`);
    assert.ok(alpha.every(a => a === 0 || a === 255), `${id} is one-bit`);
    signatures.push(alpha.join(','));
  }
  assert.equal(new Set(signatures).size, 5);
  await page.close();
});
test('visible dither continues changing pixels beyond four seconds', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url); await page.keyboard.press('Escape');
    const canvas = page.locator('[data-dither="projects"]');
    await canvas.scrollIntoViewIfNeeded(); await page.waitForTimeout(4500);
    const frames = new Set();
    for (let i = 0; i < 8; i++) {
      frames.add(await canvas.evaluate(c => c.toDataURL()));
      await page.waitForTimeout(230);
    }
    assert.ok(frames.size > 1, `expected repeating motion, got ${frames.size} pixel frames`);
  } finally { await page.close(); }
});
test('art pause freezes pixels and resume restores motion', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url); await page.keyboard.press('Escape');
    const canvas = page.locator('[data-dither="projects"]');
    await canvas.scrollIntoViewIfNeeded();
    const toggle = page.getByRole('button', { name: 'Pause animations' });
    await toggle.click(); await canvas.scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
    const frozen = await canvas.evaluate(c => c.toDataURL());
    await page.waitForTimeout(900); assert.equal(await canvas.evaluate(c => c.toDataURL()), frozen);
    await page.getByRole('button', { name: 'Resume animations' }).click();
    await canvas.scrollIntoViewIfNeeded();
    const frames = new Set();
    for (let i = 0; i < 8; i++) { frames.add(await canvas.evaluate(c => c.toDataURL())); await page.waitForTimeout(230); }
    assert.ok(frames.size > 1);
  } finally { await page.close(); }
});
test('reduced motion renders the same static pixels when a previously animated section reenters', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url); await page.keyboard.press('Escape');
    const canvas = page.locator('[data-dither="projects"]');
    await page.emulateMedia({ reducedMotion: 'reduce' }); await canvas.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    const staticPixels = await canvas.evaluate(c => c.toDataURL());
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.waitForTimeout(650);
    await page.locator('#contact-title').scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    await page.emulateMedia({ reducedMotion: 'reduce' }); await canvas.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    assert.equal(await canvas.evaluate(c => c.toDataURL()), staticPixels);
  } finally { await page.close(); }
});
test('hidden document suspends artwork and resumes it when shown', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url); await page.keyboard.press('Escape');
    const canvas = page.locator('[data-dither="projects"]'); await canvas.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    const frozen = await canvas.evaluate(c => c.toDataURL()); await page.waitForTimeout(900);
    assert.equal(await canvas.evaluate(c => c.toDataURL()), frozen);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
    const frames = new Set(); for (let i = 0; i < 8; i++) { frames.add(await canvas.evaluate(c => c.toDataURL())); await page.waitForTimeout(230); }
    assert.ok(frames.size > 1);
  } finally { await page.close(); }
});
test('pagehide freezes pixels and persisted pageshow resumes without undoing pause', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url); await page.keyboard.press('Escape');
    const canvas = page.locator('[data-dither="projects"]'); await canvas.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    const frozen = await canvas.evaluate(c => c.toDataURL()); await page.waitForTimeout(700); assert.equal(await canvas.evaluate(c => c.toDataURL()), frozen);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    const frames = new Set(); for (let i = 0; i < 8; i++) { frames.add(await canvas.evaluate(c => c.toDataURL())); await page.waitForTimeout(230); } assert.ok(frames.size > 1);
    await page.getByRole('button', { name: 'Pause animations' }).click();
    await page.evaluate(() => { window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })); window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); });
    assert.equal(await page.getByRole('button', { name: 'Resume animations' }).getAttribute('aria-pressed'), 'true');
    await canvas.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    const paused = await canvas.evaluate(c => c.toDataURL()); await page.waitForTimeout(700); assert.equal(await canvas.evaluate(c => c.toDataURL()), paused);
  } finally { await page.close(); }
});
test('offscreen artwork stops changing while another section animates', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url); await page.keyboard.press('Escape');
    const first = page.locator('[data-dither="projects"]'); await first.scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
    const second = page.locator('[data-dither="contact"]'); await second.scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
    const frozen = await first.evaluate(c => c.toDataURL());
    const frames = new Set(); for (let i = 0; i < 8; i++) { frames.add(await second.evaluate(c => c.toDataURL())); await page.waitForTimeout(230); }
    assert.equal(await first.evaluate(c => c.toDataURL()), frozen); assert.ok(frames.size > 1);
  } finally { await page.close(); }
});
test('art pause survives an article round trip', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url); await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Pause animations' }).click();
    await page.locator('#writing a').first().click(); await page.locator('a[href="/#writing"]').click();
    assert.equal(await page.getByRole('button', { name: 'Resume animations' }).getAttribute('aria-pressed'), 'true');
    const canvas = page.locator('[data-dither="writing"]'); await canvas.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    const frozen = await canvas.evaluate(c => c.toDataURL()); await page.waitForTimeout(700); assert.equal(await canvas.evaluate(c => c.toDataURL()), frozen);
  } finally { await page.close(); }
});
test('art control reserves its footprint before JavaScript runs', async () => {
  const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url);
    const button = page.locator('.art-toggle');
    const metrics = await button.evaluate(el => ({width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height}));
    assert.ok(metrics.width > 0 && metrics.height > 0, 'hidden control must reserve its eventual footprint');
  } finally { await page.close(); }
});
test('preference changes do not override an explicit artwork pause', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url); await page.keyboard.press('Escape');
    const canvas = page.locator('[data-dither="projects"]'); await canvas.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Pause animations' }).click(); await canvas.scrollIntoViewIfNeeded(); await page.waitForTimeout(250);
    const frozen = await canvas.evaluate(c => c.toDataURL());
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.waitForTimeout(800);
    assert.equal(await canvas.evaluate(c => c.toDataURL()), frozen);
    assert.equal(await page.getByRole('button', { name: 'Resume animations' }).getAttribute('aria-pressed'), 'true');
  } finally { await page.close(); }
});
test('three sample writings lead to native article pages with a return link', async () => {
  const page = await browser.newPage({ javaScriptEnabled: false }); await page.goto(url);
  const links = page.locator('#writing .entry a[href^="/writing/"]');
  assert.equal(await links.count(), 3);
  assert.equal(await page.locator('#writing a[href*="medium.com"]').count(), 0);
  for (let i=0;i<3;i++) {
    const href = await links.nth(i).getAttribute('href');
    await page.goto(url + href); assert.match(await page.locator('main').innerText(), /sample draft/i);
    assert.equal(await page.locator('head link[rel="icon"][href="data:,"]').count(), 1, 'Article must use the same favicon policy as home, avoiding a missing favicon.ico request');
    assert.equal(await page.locator('a[href="/#writing"]').count(), 1);
    assert.match(await page.locator('main').innerText(), /DUMMY COVER IMAGE/);
    await page.goto(url);
  }
  await page.close();
});

test('2024 and 2025 experience titles identify internships', async () => {
 const page = await browser.newPage({javaScriptEnabled:false}); await page.goto(url);
 const entries = page.locator('#experience .entry');
 assert.equal(await entries.filter({hasText:'Eratani'}).locator('h3').innerText(), 'Data Engineer Intern');
 assert.equal(await entries.filter({hasText:'SEP — DEC 2024'}).locator('h3').innerText(), 'Business Intelligence Intern');
 assert.equal(await entries.filter({hasText:'JUL 2026 — PRESENT'}).locator('h3').innerText(), 'Data Engineer');
 await page.close();
});

test('career section keeps four approved roles and contact includes email', async () => {
 const page=await browser.newPage({javaScriptEnabled:false}); await page.goto(url);
 const career=page.locator('#experience');
 assert.equal(await career.locator('.entry').count(),4);
 assert.doesNotMatch(await career.innerText(), /Academic Office Student Staff|id\/x partners/i);
 assert.equal(await page.locator('#contact a[href="mailto:arvinantobahtiar@gmail.com"]').count(),1);
 await page.close();
});

test('headings, terminal divider and achievement art separation', async () => {
 for (const width of [1440,1366,1280,390,320]) {
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}); await page.goto(url);
  for (const [id,title] of [['writing','Writings'],['projects','Projects'],['experience','Experience'],['achievements','Achievements'],['contact','Building something with Data or AI?']]) assert.equal((await page.locator(`#${id}-title`).innerText()).trim(),title);
  const edges=await page.evaluate(()=>({right:document.querySelector('#top').getBoundingClientRect().right,terminal:document.querySelector('.command-line').getBoundingClientRect().right,art:document.querySelector('#achievements canvas').getBoundingClientRect().toJSON(),awards:[...document.querySelectorAll('#achievements .entry')].map(e=>e.getBoundingClientRect().toJSON())}));
  assert.equal(edges.terminal,edges.right,`terminal ${width}`); assert.equal(edges.awards.length,4);
  for(const r of edges.awards) assert.ok(r.right <= edges.art.left || r.top >= edges.art.bottom || r.bottom <= edges.art.top, `achievement collision ${width}: ${JSON.stringify({r,art:edges.art})}`);
  await page.close();
 }
});

test('mobile writing and achievement artwork leads its heading in normal flow', async () => {
 for (const width of [320,390]) {
  const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});
  try {
   await page.goto(url);
   for (const id of ['writing','achievements']) {
    const box=await page.locator(`#${id}`).evaluate(section=>({art:section.querySelector('canvas').getBoundingClientRect().toJSON(),heading:section.querySelector('h2').getBoundingClientRect().toJSON(),section:section.getBoundingClientRect().toJSON(),float:getComputedStyle(section.querySelector('.art-column')).float}));
    assert.equal(box.float,'none',`${id} ${width} must not float`);
    assert.ok(box.art.bottom<=box.heading.top,`${id} ${width} artwork must precede heading: ${JSON.stringify(box)}`);
    assert.ok(Math.abs(box.art.left-box.heading.left)<1 && Math.abs(box.art.left-box.section.left)<1,`${id} ${width} left alignment: ${JSON.stringify(box)}`);
   }
  } finally { await page.close(); }
 }
});

test('project descriptions use the full card width', async () => {
 for (const width of [390, 1440]) {
  const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}); await page.goto(url);
  const sizes = await page.locator('.project-card').first().evaluate(card => ({card:card.getBoundingClientRect().width, text:card.querySelector('p').getBoundingClientRect().width}));
  assert.ok(Math.abs(sizes.card - sizes.text) < 1, JSON.stringify({width,...sizes}));
  assert.ok(['left', 'start'].includes(await page.locator('.project-card p').first().evaluate(el => getComputedStyle(el).textAlign)));
  assert.ok(await page.locator('.project-slider').evaluate(el => parseFloat(getComputedStyle(el).columnGap)) > 24);
  await page.close();
 }
});

test('project slider moves manually with buttons and keyboard', async () => {
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}); await page.goto(url);
 const slider=page.locator('.project-slider'); const next=page.getByRole('button',{name:'Next project'}); const previous=page.getByRole('button',{name:'Previous project'});
 assert.equal(await slider.locator('.entry').count(),3); await next.click();
 const moved=await slider.evaluate(el=>el.scrollLeft); assert.ok(moved>0);
 await previous.click(); assert.equal(await slider.evaluate(el=>el.scrollLeft),0);
 await slider.focus(); await page.keyboard.press('ArrowRight'); assert.ok(await slider.evaluate(el=>el.scrollLeft)>0);
 await page.close();
});

test('project slider supports touch scrolling without autoplay', async () => {
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}); const page=await context.newPage(); await page.goto(url);
 const slider=page.locator('.project-slider'); await slider.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
 assert.equal(await slider.evaluate(el=>el.scrollLeft),0);
 const box=await slider.boundingBox(); const cdp=await context.newCDPSession(page); const y=box.y+Math.min(100,box.height/2);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width-20,y}]});
 for(let x=box.x+box.width-40;x>box.x+40;x-=25) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await page.waitForTimeout(500);
 assert.ok(await slider.evaluate(el=>el.scrollLeft)>0); await context.close();
});

test('terminal begins with an empty output and a persistent help hint', async () => {
 const page=await browser.newPage({reducedMotion:'reduce'}); await page.goto(url);
 assert.equal(await page.locator('#terminal-output').textContent(),'');
 assert.match(await page.locator('.terminal').innerText(),/Type help for commands\./);
 await page.close();
});

test('terminal output precedes and never obscures the command input', async () => {
 const page=await browser.newPage({viewport:{width:320,height:640},reducedMotion:'reduce'}); await page.goto(url);
 const input=page.locator('#command'); await input.fill('help'); await input.press('Enter');
 const positions=await page.evaluate(()=>({output:document.querySelector('#terminal-output').getBoundingClientRect().bottom, input:document.querySelector('.command-line').getBoundingClientRect().top}));
 assert.ok(positions.output <= positions.input);
 await page.close();
});

test('pixel title stays on one line on the smallest phone', async () => {
 const page=await browser.newPage({viewport:{width:320,height:640},reducedMotion:'reduce'}); await page.goto(url);
 const metrics=await page.locator('#hero-title').evaluate(el=>({height:el.getBoundingClientRect().height,line:parseFloat(getComputedStyle(el).lineHeight)}));
 assert.ok(metrics.height <= metrics.line + 1, JSON.stringify(metrics)); await page.close();
});

test('portfolio navigation keeps five directory links without a dangling README', async () => {
 const page=await browser.newPage({javaScriptEnabled:false}); await page.goto(url);
 assert.equal(await page.locator('.terminal-list a').count(),5);
 assert.equal(await page.locator('a[href="#readme"], #readme').count(),0);
 assert.equal((await page.locator('.site-header nav').innerText()).replace(/\s+/g,' ').trim(),'Writings Projects Experience Contact ↗');
 await page.close();
});

test('hero is borderless and exposes a single command prompt', async () => {
 const page=await browser.newPage({reducedMotion:'reduce'}); await page.goto(url);
 assert.equal(await page.locator('#top').evaluate(el => (el.innerText.match(/arvin@portfolio:~\$/g)||[]).length),1);
 assert.equal(await page.locator('.hero .terminal').evaluate(el => getComputedStyle(el).borderTopWidth),'0px');
 assert.match(await page.locator('.terminal-list').innerText(),/Writings ↗/);
 await page.close();
});

test('writing index presents draft rows with clear article links', async () => {
 const page=await browser.newPage({javaScriptEnabled:false}); await page.goto(url);
 const rows=page.locator('#writing .entry'); assert.equal(await rows.count(),3);
 for(let i=0;i<3;i++){const row=rows.nth(i); assert.match(await row.innerText(),/SAMPLE DRAFT/); assert.match(await row.innerText(),/Read article ↗/); assert.equal(await row.locator('a[href^="/writing/"]').count(),1);}
 await page.close();
});

test('contact email is the primary contact action at desktop', async () => {
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}); await page.goto(url);
 const email=page.locator('#contact a[href^="mailto:"]');
 assert.equal(await email.getAttribute('href'), 'mailto:arvinantobahtiar@gmail.com');
 assert.match(await email.textContent(), /Contact me/);
 assert.ok(await email.evaluate(el=>el.getBoundingClientRect().height)>=44);
 await page.close();
});

test('archive and shell README remain accessible without footer README', async () => {
 const page=await browser.newPage({reducedMotion:'reduce'}); await page.goto(url);
 assert.equal(await page.locator('#contact h2').innerText(),'Building something with Data or AI?');
 assert.equal(await page.locator('footer').getByText('README.md').count(),0);
 await page.locator('#writing a[href="/writing/"]').click();
 assert.equal(await page.locator('.boot').count(),0);
 assert.equal(await page.locator('.writing-archive a[href^="/writing/"]').count(),3);
 for (const link of await page.locator('.writing-archive a').all()) assert.ok((await page.request.get(new URL(await link.getAttribute('href'),url).href)).ok());
 await page.goto(url); await page.locator('#command').fill('ls'); await page.locator('#command').press('Enter');
 const readme=page.getByRole('button',{name:'README.md'}); await readme.focus(); await page.keyboard.press('Enter');
 assert.match(await page.locator('#terminal-output').innerText(),/Arvin — Data Engineering and ML\/AI Engineering/);
 assert.ok(!page.url().includes('#readme')); await page.close();
});

test('achievement text fits on one line at desktop', async () => {
 for (const width of [1280,1366,1440]) {
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}); await page.goto(url); await page.evaluate(()=>document.fonts.ready);
  for (const p of await page.locator('#achievements .entry p').all()) { const m=await p.evaluate(e=>({height:e.getBoundingClientRect().height,line:parseFloat(getComputedStyle(e).lineHeight),size:parseFloat(getComputedStyle(e).fontSize),scroll:e.scrollWidth,client:e.clientWidth})); assert.ok(m.height<=m.line+1 && m.size>=14 && m.scroll<=m.client,JSON.stringify({width,...m})); }
  await page.close();
 }
});

test('experience uses separate date, role and organization columns on desktop', async () => {
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}); await page.goto(url);
 const row=page.locator('#experience .entry').first();
 const positions=await row.evaluate(el=>[el.querySelector('.entry-date'),el.querySelector('h3'),el.querySelector('p')].map(node=>node.getBoundingClientRect().left));
 assert.ok(positions[0]<positions[1] && positions[1]<positions[2],JSON.stringify(positions)); await page.close();
});

test('native writing navigation and article reload never show the intro', async () => {
 const page=await browser.newPage(); await page.clock.install(); await page.clock.pauseAt(new Date(Date.now()+60000));
 await page.goto(url, {waitUntil:'domcontentloaded'}); await page.keyboard.press('Escape');
 await page.locator('#writing a').first().click();
 assert.match(page.url(), /\/writing\/reliable-pipelines\//);
 assert.equal(await page.locator('.boot').count(),0);
 await page.reload({waitUntil:'domcontentloaded'}); assert.equal(await page.locator('.boot').count(),0); await page.close();
});

test('returning from an article skips the intro, but a landing reload shows it', async () => {
 const page = await browser.newPage();
 await page.goto(url); await page.keyboard.press('Escape');
 await page.locator('#writing a').first().click();
 await page.locator('a[href="/#writing"]').click();
 assert.equal(await page.locator('.boot').count(), 0, 'return link should not replay intro');
 await page.reload(); assert.equal(await page.locator('.boot').count(), 1, 'intentional reload should replay intro');
 await page.keyboard.press('Escape'); await page.locator('#writing a').first().click();
 await page.goBack(); assert.equal(await page.locator('.boot').count(), 0, 'browser back should not replay intro');
 await page.close();
});

test('career content and contact work without JavaScript', async () => {
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.goto(url);
  assert.equal(await page.locator('h1').textContent(), 'Arvin');
  assert.equal(await page.locator('#contact a[href*="linkedin.com"]').count(), 1);
  assert.equal(await page.locator('.boot').count(), 0);
  await page.close();
});
test('intro replays on every landing reload and lasts four seconds unless skipped', async () => {
  const context = await browser.newContext(); const page = await context.newPage();
  await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 60_000));
  await page.goto(url, { waitUntil: 'domcontentloaded' }); await page.locator('.boot').waitFor({ state: 'attached', timeout: 5000 });
  await page.getByRole('button', { name: 'Skip intro' }).focus(); await page.keyboard.press('Enter'); assert.equal(await page.locator('.boot').count(), 0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('.boot').count(), 1, 'reload replays even after Skip');
  await page.clock.runFor(2500); assert.equal(await page.locator('.boot').count(), 1, 'not dismissed at the old deadline');
  await page.clock.runFor(1400); assert.equal(await page.locator('.boot').count(), 1);
  await page.clock.runFor(200); assert.equal(await page.locator('.boot').count(), 0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('.boot').count(), 1, 'reload replays after natural completion too');
  await page.keyboard.press('Escape'); assert.equal(await page.locator('.boot').count(), 0);
  await context.close();
});
test('package intro updates terminal rows in place then completes its transaction', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 60_000));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.locator('.boot').waitFor({ state: 'attached' });
  assert.equal(await page.locator('[data-boot-package]').count(), 4);
  await page.clock.runFor(180);
  const partial = await page.locator('[data-boot-package="experience"] .boot-percent').textContent();
  assert.notEqual(partial, '100%');
  assert.match(await page.locator('.boot-summary').textContent(), /KiB/);
  await page.clock.runFor(1700);
  assert.notEqual(await page.locator('[data-boot-package="contact"] .boot-percent').textContent(), '100%', 'package animation is paced across the longer intro');
  assert.doesNotMatch(await page.locator('.boot-transaction').textContent(), /Complete!/);
  await page.clock.runFor(700);
  assert.equal(await page.locator('[data-boot-package]').count(), 4, 'updates replace values, never duplicate log rows');
  for (const name of ['experience', 'projects', 'about', 'contact']) {
    assert.equal(await page.locator(`[data-boot-package="${name}"] .boot-percent`).textContent(), '100%');
    assert.match(await page.locator(`[data-boot-package="${name}"] .boot-size`).textContent(), /KiB/);
  }
  await page.clock.runFor(900);
  assert.match(await page.locator('.boot-transaction').textContent(), /Complete!/);
  await page.setViewportSize({ width: 320, height: 640 });
  assert.equal(await page.evaluate(() => {
    const transaction = document.querySelector('.boot-transaction').getBoundingClientRect();
    const body = document.querySelector('.boot-body').getBoundingClientRect();
    return transaction.bottom <= body.bottom && transaction.left >= 0;
  }), true, 'completed transaction stays visible on a small phone');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.clock.runFor(600);
  assert.equal(await page.locator('.boot').count(), 0);
  await page.close();
});

test('reduced motion bypasses intro; deep-link reloads and denied storage still show it', async () => {
  const reduced = await browser.newPage({ reducedMotion: 'reduce' }); await reduced.goto(url); assert.equal(await reduced.locator('.boot').count(), 0); await reduced.close();
  const deep = await browser.newPage();
  await deep.clock.install(); await deep.clock.pauseAt(new Date(Date.now() + 60_000));
  await deep.goto(url + '/#contact'); await deep.clock.runFor(200);
  assert.equal(await deep.locator('.boot').count(), 1, 'deep links show the intro too');
  await deep.keyboard.press('Escape');
  await deep.reload(); await deep.clock.runFor(200);
  assert.equal(await deep.locator('.boot').count(), 1, 'restoring the scroll position must not dismiss it');
  await deep.close();
  const denied = await browser.newPage(); await denied.addInitScript(() => { Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('denied'); } }); }); await denied.goto(url); assert.equal(await denied.locator('.boot').count(), 1); await denied.keyboard.press('Escape'); assert.equal(await denied.locator('.boot').count(), 0); await denied.close();
});
test('terminal commands, error handling, focus and browser history', async () => {
  const page = await browser.newPage({ reducedMotion: 'reduce' }); await page.goto(url);
  const input = page.getByRole('textbox', { name: 'Command' }); const output = page.locator('#terminal-output');
  async function run(value) { await input.fill(value); await input.press('Enter'); }
  await run(' HELP '); assert.match(await output.textContent(), /writing, projects, experience, achievements, contact, help, clear/);
  await run('<img src=x onerror=alert(1)>'); assert.match(await output.textContent(), /not recognized/); assert.equal(await output.locator('img').count(), 0);
  await run(''); assert.match(await output.textContent(), /Enter a command/);
  await run('clear'); assert.equal(await output.textContent(), '');
  for (const name of ['writing', 'projects', 'experience', 'achievements', 'contact']) { await run(name.toUpperCase()); assert.equal(new URL(page.url()).hash, '#' + name); assert.equal(await page.evaluate(() => document.activeElement?.id), name + '-title'); }
  await page.goBack(); assert.equal(new URL(page.url()).hash, '#achievements');
  await page.locator('.terminal-list a[href="#projects"]').click(); assert.equal(new URL(page.url()).hash, '#projects');
  await page.close();
});
test('scroll motion enhances visible sections and respects preference changes', async () => {
  const page = await browser.newPage({ reducedMotion: 'no-preference' });
  await trackMotion(page);
  await page.goto(url); await page.keyboard.press('Escape');
  await page.locator('#experience-title').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.__motion.some(entry => entry.id === 'experience-title'));
  assert.equal(await page.locator('#experience-title').isVisible(), true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(200);
  await page.evaluate(() => { window.__motion = []; });
  await page.locator('#contact-title').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__motion.filter(entry => entry.id === 'contact-title').length), 0);
  await page.close();
});

test('pagehide reverts GSAP inline motion', async () => {
  const page = await browser.newPage(); await trackMotion(page);
  await page.goto(url); await page.keyboard.press('Escape');
  await page.locator('#projects-title').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.__motion.some(m => m.id === 'projects-title'));
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  assert.equal(await page.locator('#projects-title').evaluate(el => el.style.transform), '');
  await page.close();
});

test('content remains visible without IntersectionObserver', async () => {
 const page=await browser.newPage(); await page.addInitScript(()=>{delete window.IntersectionObserver}); await page.goto(url); await page.keyboard.press('Escape');
 for (const id of ['writing','projects','experience','achievements','contact']) assert.equal(await page.locator(`#${id} h2`).isVisible(),true);
 await page.close();
});

test('scroll choreography differs between projects and experience', async () => {
 const page=await browser.newPage(); await trackMotion(page);
 await page.goto(url); await page.keyboard.press('Escape');
 await page.locator('#projects-title').scrollIntoViewIfNeeded(); await page.waitForFunction(()=>window.__motion.some(m=>m.id==='projects-title'));
 await page.locator('#experience-title').scrollIntoViewIfNeeded(); await page.waitForFunction(()=>window.__motion.some(m=>m.id==='experience-title'));
 const motions=await page.evaluate(()=>window.__motion);
 const project=motions.find(m=>m.id==='projects-title'); const experience=motions.find(m=>m.id==='experience-title');
 assert.ok(project && experience); assert.match(project.transform, /translate\(-/); assert.match(experience.transform, /translate\([0-9]/); await page.close();
});

test('project entries animate with staggered timing', async () => {
 const page=await browser.newPage({ viewport:{width:1440,height:1200} }); await trackMotion(page);
 await page.goto(url); await page.keyboard.press('Escape'); await page.locator('#projects').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>new Set(window.__motion.filter(m=>m.section==='projects' && !m.id).map(m=>m.index)).size>=2);
 const starts=await page.evaluate(()=>{const rows=window.__motion.filter(m=>m.section==='projects' && !m.id);const first=new Map();for(const m of rows)if(!first.has(m.index))first.set(m.index,m.at);return [...first.values()];});
 assert.ok(Math.max(...starts)-Math.min(...starts)>=40, `expected staggered starts, got ${starts}`); await page.close();
});

test('project motion keeps content inside the small viewport', async () => {
 const page=await browser.newPage({viewport:{width:320,height:640}}); await trackMotion(page); await page.goto(url); await page.keyboard.press('Escape');
 await page.locator('#projects-title').scrollIntoViewIfNeeded();
 await page.waitForFunction(() => window.__motion.some(m=>m.id==='projects-title'));
 const bounds=await page.locator('#projects-title').evaluate(el=>el.getBoundingClientRect().left);
 assert.ok(bounds >= 0, `motion clipped left edge: ${bounds}`); await page.close();
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

test('simulated filesystem keeps cd and pwd coherent', async () => {
  const page = await browser.newPage({ reducedMotion: 'reduce' }); await page.goto(url);
  const input = page.getByRole('textbox', { name: 'Command' });
  async function run(command) { await input.fill(command); await input.press('Enter'); }
  await run('cd projects');
  assert.equal(new URL(page.url()).hash, '#projects', 'cd navigates to the portfolio section');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'projects-title');
  await run('pwd');
  assert.match(await page.locator('#terminal-output').textContent(), /\/home\/arvin\/projects/);
  await page.close();
});

test('filesystem resolves absolute, home, parent and invalid paths', async () => {
  const page = await browser.newPage({ reducedMotion: 'reduce' }); await page.goto(url);
  const input = page.getByRole('textbox', { name: 'Command' });
  async function run(command) { await input.fill(command); await input.press('Enter'); return page.locator('#terminal-output').textContent(); }
  for (const path of ['/projects', '~/projects']) { await run(`cd ${path}`); assert.equal(await run('pwd'), '/home/arvin/projects'); }
  await run('cd ..'); assert.equal(await run('pwd'), '/home/arvin');
  await run('cd projects'); await run('cd ~'); assert.equal(await run('pwd'), '/home/arvin');
  assert.match(await run('cd /nonexistent'), /no such/i); assert.equal(await run('pwd'), '/home/arvin');
  await page.close();
});

test('filesystem rejects nonexistent intermediate directories', async () => {
  const page = await browser.newPage({ reducedMotion: 'reduce' }); await page.goto(url);
  const input = page.getByRole('textbox', { name: 'Command' });
  await input.fill('cd nonexistent/../projects'); await input.press('Enter');
  assert.match(await page.locator('#terminal-output').textContent(), /no such/i);
  await input.fill('pwd'); await input.press('Enter');
  assert.equal(await page.locator('#terminal-output').textContent(), '/home/arvin');
  await page.close();
});

test('ls -a reveals dot entries and ls -l includes directory details', async () => {
 const page=await browser.newPage({reducedMotion:'reduce'}); await page.goto(url); const input=page.getByRole('textbox',{name:'Command'});
 async function run(value){await input.fill(value);await input.press('Enter');return page.locator('#terminal-output').textContent()}
 assert.match(await run('ls -a'), /\.\/\s+\.\.\//); assert.match(await run('ls -l'), /dr-x/); await page.close();
});

test('ls output includes clickable directory entries', async () => {
 const page=await browser.newPage({reducedMotion:'reduce'}); await page.goto(url); const input=page.getByRole('textbox',{name:'Command'});
 await input.fill('ls'); await input.press('Enter');
 assert.equal(await page.locator('#terminal-output a[href="#projects"]').count(), 1);
 await page.locator('#terminal-output a[href="#projects"]').click(); assert.equal(new URL(page.url()).hash,'#projects'); await page.close();
});

test('ls lists the current simulated directory with supported flags', async () => {
 const page = await browser.newPage({reducedMotion:'reduce'}); await page.goto(url); const input = page.getByRole('textbox',{name:'Command'});
 async function run(cmd) { await input.fill(cmd); await input.press('Enter'); return page.locator('#terminal-output').textContent(); }
 assert.match(await run('ls -la'), /writing\/.*projects\/.*experience\/.*achievements\/.*contact\/.*README\.md/s);
 await run('cd projects'); assert.match(await run('ls'), /README\.md/); assert.doesNotMatch(await run('ls'), /writing\//);
 assert.match(await run('ls --unsafe'), /unsupported/i); await page.close();
});

test('hero is one terminal containing identity and navigation without JavaScript', async () => {
 const page = await browser.newPage({javaScriptEnabled:false}); await page.goto(url); const hero=page.locator('#top');
 assert.equal(await hero.locator('.terminal h1').textContent(), 'Arvin');
 assert.match(await hero.locator('.terminal').textContent(), /Data Engineering/);
 assert.match(await hero.locator('.terminal').textContent(), /ML\/AI Engineering/);
 for (const section of ['writing','projects','experience','achievements','contact']) assert.ok(await hero.locator(`.terminal a[href="#${section}"]`).count());
 await page.close();
});

test('landing and command output omit obsolete terminal and academic labels', async () => {
 const page = await browser.newPage({reducedMotion: 'reduce'}); await page.goto(url);
 assert.doesNotMatch(await page.locator('#top').innerText(), /simulated terminal|Data Science · Telkom University/i);
 const input = page.getByRole('textbox', {name: 'Command'});
 await input.fill('cat README.md'); await input.press('Enter');
 assert.doesNotMatch(await page.locator('#terminal-output').innerText(), /Data Science · Telkom University/i);
 await page.close();
});

test('role stays on one line at 390px and never overflows at 320px', async () => {
 for (const width of [320,390,1440]) {
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}); await page.goto(url);
  const result=await page.locator('.role').evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);return {lines:range.getClientRects().length,overflow:document.documentElement.scrollWidth>innerWidth}});
  if(width>=390) assert.equal(result.lines,1,`role wraps at ${width}`);
  assert.equal(result.overflow,false); await page.close();
 }
});

test('title dominates role and fits the viewport', async () => {
 for (const width of [320, 390, 1440]) {
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}); await page.goto(url);
  const metrics=await page.evaluate(() => ({title:parseFloat(getComputedStyle(document.querySelector('#hero-title')).fontSize), role:parseFloat(getComputedStyle(document.querySelector('.role')).fontSize), right:document.querySelector('#hero-title').getBoundingClientRect().right}));
  assert.ok(metrics.title >= 64 && metrics.title >= metrics.role * 3, JSON.stringify(metrics));
  assert.ok(metrics.right <= width, JSON.stringify(metrics)); await page.close();
 }
});

test('role line contains a literal separator', async () => {
 const page = await browser.newPage({ javaScriptEnabled: false }); await page.goto(url);
 assert.equal((await page.locator('.role').textContent()).trim(), 'Data Engineering | ML/AI Engineering');
 await page.close();
});

test('visitor-facing introduction avoids simulated and demo wording', async () => {
 const page=await browser.newPage(); await page.goto(url); await page.locator('.boot').waitFor();
 const visible=await page.locator('body').innerText();
 const labels=await page.locator('[aria-label]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')).join(' '));
 assert.doesNotMatch(`${visible} ${labels}`, /simulat(?:ed|ion)|\bdemo\b/i);
 await page.close();
});

test('intro has no obsolete personal profile footer', async () => {
 const page = await browser.newPage(); await page.goto(url);
 assert.equal(await page.locator('.boot-footer').count(), 0);
 await page.close();
});

test('wordmark pixels animate and can be paused', async () => {
 const page=await browser.newPage(); await page.goto(url); await page.keyboard.press('Escape');
 const title=page.locator('#hero-title');
 assert.notEqual(await title.evaluate(el=>getComputedStyle(el,'::after').animationName), 'none');
 const toggle=page.getByRole('button',{name:'Pause animations'}); assert.equal(await toggle.textContent(), 'Arvin');
 await toggle.focus(); await page.keyboard.press('Enter');
 assert.equal(await title.evaluate(el=>getComputedStyle(el,'::after').animationPlayState), 'paused');
 await page.keyboard.press('Space');
 assert.equal(await title.evaluate(el=>getComputedStyle(el,'::after').animationPlayState), 'running');
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await title.evaluate(el=>getComputedStyle(el,'::after').animationName), 'none'); await page.close();
});

test('command input presents a steady bar at the insertion point', async () => {
 const page = await browser.newPage({reducedMotion:'reduce'}); await page.goto(url);
 const input=page.locator('#command'); await input.fill('abcd'); await input.focus();
 await input.evaluate(el => el.setSelectionRange(2,2));
 await page.evaluate(() => document.dispatchEvent(new Event('selectionchange')));
 const caret=page.locator('.command-caret');
 assert.equal(await caret.isVisible(), true);
 assert.ok((await caret.boundingBox()).width >= 3);
 const start=(await caret.boundingBox()).x;
 await input.press('ArrowLeft');
 assert.ok((await caret.boundingBox()).x < start);
 await input.press('Shift+ArrowLeft');
 assert.equal(await caret.isVisible(), false);
 await page.close();
});

test('terminal does not intercept IME composition keys', async () => {
 const page=await browser.newPage({reducedMotion:'reduce'}); await page.goto(url);
 const result=await page.locator('#command').evaluate(el=>{el.focus(); const event=new KeyboardEvent('keydown',{key:'ArrowUp',isComposing:true,bubbles:true,cancelable:true}); el.dispatchEvent(event); return event.defaultPrevented});
 assert.equal(result,false); await page.close();
});

test('command caret keeps native editing and composition usable', async () => {
 const page=await browser.newPage({viewport:{width:320,height:640},reducedMotion:'reduce'}); await page.goto(url);
 const input=page.locator('#command'); await input.click();
 assert.equal(await input.evaluate(el=>getComputedStyle(el).outlineStyle),'none');
 assert.notEqual(await page.locator('.command-line').evaluate(el=>getComputedStyle(el).borderBottomColor),'rgba(0, 0, 0, 0)');
 await input.fill('x'.repeat(75)); await input.press('End');
 assert.ok(await input.evaluate(el=>el.scrollLeft)>0);
 const box=await page.locator('.command-caret').boundingBox(), bounds=await input.boundingBox();
 assert.ok(box.x>=bounds.x && box.x<=bounds.x+bounds.width);
 await input.dispatchEvent('compositionstart');
 assert.equal(await page.locator('.command-caret').isVisible(),false);
 assert.notEqual(await input.evaluate(el=>getComputedStyle(el).caretColor),'rgba(0, 0, 0, 0)');
 assert.equal(await input.evaluate(el=>getComputedStyle(el).getPropertyValue('caret-animation')),'manual');
 await input.dispatchEvent('compositionend'); await page.close();
});

test('body and editorial copy use JetBrains Mono', async () => {
 const page = await browser.newPage({reducedMotion: 'reduce'}); await page.goto(url);
 for (const selector of ['body', '.editorial h2 em', '.editorial .entry p']) {
   assert.match(await page.locator(selector).first().evaluate(el => getComputedStyle(el).fontFamily), /JetBrainsMono/i);
 }
 await page.close();
});

test('boot and landing use Silkscreen lettering', async () => {
 const page = await browser.newPage(); await page.goto(url);
 await page.evaluate(() => document.fonts.ready);
 assert.match(await page.locator('#hero-title').evaluate(el => getComputedStyle(el).fontFamily), /Silkscreen/i);
 assert.match(await page.locator('.boot-glyph').evaluate(el => getComputedStyle(el).fontFamily), /Silkscreen/i);
 for (const selector of ['#hero-title', '.boot-glyph']) {
   assert.equal(await page.locator(selector).evaluate(el => getComputedStyle(el).fontWeight), '700');
 }
 assert.equal(await page.evaluate(() => [...document.fonts].some(f => f.family === 'Silkscreen' && f.weight === '700' && f.status === 'loaded')), true);
 await page.close();
});

test('page and editorial sections use dark backgrounds and light text', async () => {
 const page=await browser.newPage({reducedMotion:'reduce'}); await page.goto(url);
 const colors=await page.evaluate(() => ({bg:getComputedStyle(document.documentElement).backgroundColor, fg:getComputedStyle(document.body).color}));
 assert.equal(colors.bg, 'rgb(23, 23, 23)'); assert.equal(colors.fg, 'rgb(245, 245, 240)'); await page.close();
});

test('portfolio publishes source-backed sections in requested order', async () => {
 const page=await browser.newPage({javaScriptEnabled:false}); await page.goto(url);
 assert.deepEqual(await page.locator('main > section[id]').evaluateAll(nodes=>nodes.map(n=>n.id)), ['top','writing','projects','tools','experience','achievements','certificates','contact']);
 assert.match(await page.locator('#writing').textContent(), /On building reliable pipelines/);
 assert.equal(await page.locator('#projects a[href*="github.com"]').count(),3);
 assert.match(await page.locator('#experience').textContent(), /Eratani/);
 assert.match(await page.locator('#achievements').textContent(), /DINAMIKA/); await page.close();
});

test('terminal reports identity and README with cwd in prompt', async () => {
 const page=await browser.newPage({reducedMotion:'reduce'}); await page.goto(url); const input=page.getByRole('textbox',{name:'Command'});
 async function run(cmd){await input.fill(cmd);await input.press('Enter');return page.locator('#terminal-output').textContent()}
 assert.match(await run('whoami'), /arvin/i); assert.match(await run('cat README.md'), /Data Engineering/i);
 await run('cd projects'); assert.match(await page.locator('.command-prompt').textContent(), /~\/projects/); await page.close();
});

test('editorial copy has readable light foreground on dark page', async () => {
 const page=await browser.newPage({reducedMotion:'reduce'});await page.goto(url);
 const color=await page.locator('#projects .entry p').first().evaluate(el=>getComputedStyle(el).color);
 assert.notEqual(color,'rgb(65, 65, 65)');await page.close();
});

test('injection-like command remains inert text in output and does not change cwd', async () => {
 const page=await browser.newPage({reducedMotion:'reduce'}); await page.goto(url); const input=page.getByRole('textbox',{name:'Command'});
 const payload='cd projects; <img src=x onerror=alert(1)>'; await input.fill(payload); await input.press('Enter');
 assert.equal(await page.locator('#terminal-output img').count(),0); assert.match(await page.locator('#terminal-output').textContent(), /<img/);
 await input.fill('pwd'); await input.press('Enter'); assert.equal(await page.locator('#terminal-output').textContent(),'/home/arvin'); await page.close();
});

test('latest terminal response replaces previous commands without growing the page', async () => {
 const page=await browser.newPage({reducedMotion:'reduce'}); await page.goto(url); const input=page.getByRole('textbox',{name:'Command'});
 await input.fill('pwd'); await input.press('Enter');
 for (let i=0;i<20;i++) { await input.fill('ls'); await input.press('Enter'); }
 assert.doesNotMatch(await page.locator('#terminal-output').textContent(), /pwd/);
 assert.ok(await page.locator('#terminal-output').evaluate(el => el.getBoundingClientRect().height) <= 160);
 await page.close();
});

test('terminal replaces previous output and clear removes it', async () => {
 const page=await browser.newPage({reducedMotion:'reduce'}); await page.goto(url); const input=page.getByRole('textbox',{name:'Command'});
 for (const cmd of ['pwd','whoami']) { await input.fill(cmd); await input.press('Enter'); }
 assert.equal(await page.locator('#terminal-output').textContent(), 'arvin');
 await input.fill('clear'); await input.press('Enter'); assert.equal(await page.locator('#terminal-output').textContent(), ''); await page.close();
});

test('Tab completes an unambiguous directory in the focused command input', async () => {
 const page=await browser.newPage({reducedMotion:'reduce'}); await page.goto(url); const input=page.getByRole('textbox',{name:'Command'});
 await input.fill('cd proj'); await input.press('Tab'); assert.equal(await input.inputValue(), 'cd projects/'); await page.close();
});

test('terminal command history stays local to focused input', async () => {
 const page=await browser.newPage({reducedMotion:'reduce'}); await page.goto(url);const input=page.getByRole('textbox',{name:'Command'});
 await input.fill('pwd');await input.press('Enter');await input.fill('whoami');await input.press('Enter');await input.press('ArrowUp');assert.equal(await input.inputValue(),'whoami');await input.press('ArrowUp');assert.equal(await input.inputValue(),'pwd');await input.press('ArrowDown');assert.equal(await input.inputValue(),'whoami');await page.close();
});

test('footer offers every section and the writing archive', async () => {
 const page=await browser.newPage({javaScriptEnabled:false});await page.goto(url);
 for(const id of ['writing','projects','experience','achievements','contact']) assert.ok(await page.locator(`footer a[href="#${id}"]`).count());
 assert.ok(await page.locator('#contact a[href*="medium.com"]').count());await page.close();
});


test('tools and certificates preserve accessible responsive content', async () => {
  for (const width of [320, 390, 1280, 1366, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    try {
      await page.goto(url);
      assert.equal(await page.locator('#tools .tools-accessible li').count(), 18);
      assert.equal(await page.locator('#tools .tools-accessible img:visible').count(), 18);
      assert.equal(await page.locator('#tools .tools-visual').isVisible(), false);
      assert.equal(await page.locator('#tools .tools-visual[aria-hidden="true"]').count(), 1);
      assert.equal(await page.locator('#tools .tools-visual a, #tools .tools-visual button, #tools .tools-visual [tabindex]').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow ${width}`);
      const slots = await page.locator('#certificates .image-slot').all();
      assert.equal(slots.length, 3);
      const boxes = await Promise.all(slots.map(slot => slot.boundingBox()));
      assert.ok(Math.max(...boxes.map(b => b.width)) - Math.min(...boxes.map(b => b.width)) < 1);
      if (width < 900) assert.ok(boxes[1].y > boxes[0].y + boxes[0].height);
      else assert.ok(Math.abs(boxes[1].y - boxes[0].y) < 1);
      assert.equal(await page.getByText('Certificate image awaiting source file').count(), 3);
      assert.equal(await page.locator('#certificates a[href^="https://www.credly.com/badges/"]').count(), 3);
      assert.match(await page.locator('#certificates').innerText(), /Issued February 2025 · Expires February 2028/);
    } finally { await page.close(); }
  }
  const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 320, height: 844 } });
  try { await page.goto(url); assert.equal(await page.locator('#tools .tools-accessible img:visible').count(), 18); }
  finally { await page.close(); }
});

test('tools tracks follow per-row click pause, global control, page lifecycle and two seamless cycles', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 844 }, reducedMotion: 'no-preference' });
  try {
    await page.goto(url);
    await page.locator('#tools').scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await page.waitForFunction(() => document.querySelector('#tools').classList.contains('tools-running'));
    const result = await page.locator('.tools-track').evaluateAll(tracks => tracks.map(track => {
      const animation = track.getAnimations()[0];
      animation.pause();
      const duration = animation.effect.getTiming().duration;
      const rects = [...track.children].map(el => el.getBoundingClientRect());
      const positions = [0, duration, duration * 2].map(t => { animation.currentTime = t; return getComputedStyle(track).transform; });
      const seam = [duration - 1, duration + 1, duration * 2 - 1, duration * 2 + 1].map(t => { animation.currentTime = t; return new DOMMatrix(getComputedStyle(track).transform).m41; });
      animation.play();
      return { duration, widths: rects.map(r => r.width), positions, seam, direction: getComputedStyle(track).animationDirection };
    }));
    assert.deepEqual(result.map(r => r.direction), ['normal', 'reverse', 'normal']);
    assert.deepEqual(result.map(r => r.duration), [75000, 85000, 75000]);
    for (const row of result) {
      assert.ok(Math.abs(row.widths[0] - row.widths[1]) < 0.1);
      assert.equal(row.positions[0], row.positions[1]); assert.equal(row.positions[1], row.positions[2]);
      for (const i of [0, 2]) assert.ok(Math.abs(Math.abs(row.seam[i] - row.seam[i + 1]) - row.widths[0]) < 1);
    }
    const rows = page.locator('#tools .tools-row');
    const states = () => rows.locator('.tools-track').evaluateAll(els => els.map(el => getComputedStyle(el).animationPlayState));
    await page.locator('#tools h2').hover();
    assert.deepEqual(await states(), ['running', 'running', 'running']);
    await rows.first().hover();
    assert.deepEqual(await states(), ['running', 'running', 'running']);
    await rows.first().click();
    assert.deepEqual(await states(), ['paused', 'running', 'running']);
    await rows.nth(1).click();
    assert.deepEqual(await states(), ['paused', 'paused', 'running']);
    await rows.first().click();
    assert.deepEqual(await states(), ['running', 'paused', 'running']);
    await rows.nth(1).click();
    assert.deepEqual(await states(), ['running', 'running', 'running']);
    await page.mouse.move(0, 0);
    await page.getByRole('button', { name: 'Pause animations' }).click();
    assert.equal(await page.getByRole('button', { name: 'Resume animations' }).getAttribute('aria-pressed'), 'true');
    await page.locator('#tools').scrollIntoViewIfNeeded(); await page.mouse.move(0, 0);
    assert.equal(await page.locator('.tools-track').first().evaluate(el => getComputedStyle(el).animationPlayState), 'paused');
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    assert.equal(await page.locator('#tools').evaluate(el => el.classList.contains('tools-running')), false);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await page.waitForFunction(() => document.querySelector('#tools').classList.contains('tools-running'));
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal(await page.locator('#tools').evaluate(el => el.classList.contains('tools-running')), false);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForFunction(() => document.querySelector('#tools').classList.contains('tools-running'));
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction(() => !document.querySelector('#tools').classList.contains('tools-running'));
    await page.getByRole('button', { name: 'Resume animations' }).click();
    await page.locator('#tools').scrollIntoViewIfNeeded(); await page.mouse.move(0, 0);
    await page.waitForFunction(() => document.querySelector('#tools').classList.contains('tools-running'));
    assert.equal(await page.locator('.tools-track').first().evaluate(el => getComputedStyle(el).animationPlayState), 'running');
  } finally { await page.close(); }
});
