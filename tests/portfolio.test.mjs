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
  assert.equal(await page.locator('h1').textContent(), 'Arvin');
  assert.equal(await page.locator('#contact a[href*="linkedin.com"]').count(), 1);
  assert.equal(await page.locator('.boot').count(), 0);
  await page.close();
});
test('intro replays on every reload and lasts five seconds unless skipped', async () => {
  const context = await browser.newContext(); const page = await context.newPage();
  await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 60_000));
  await page.goto(url, { waitUntil: 'domcontentloaded' }); await page.locator('.boot').waitFor({ state: 'attached', timeout: 5000 });
  await page.getByRole('button', { name: 'Skip intro' }).focus(); await page.keyboard.press('Enter'); assert.equal(await page.locator('.boot').count(), 0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('.boot').count(), 1, 'reload replays even after Skip');
  await page.clock.runFor(2500); assert.equal(await page.locator('.boot').count(), 1, 'not dismissed at the old deadline');
  await page.clock.runFor(2400); assert.equal(await page.locator('.boot').count(), 1);
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
  await page.clock.runFor(2300);
  assert.notEqual(await page.locator('[data-boot-package="contact"] .boot-percent').textContent(), '100%', 'package animation is paced across the longer intro');
  assert.doesNotMatch(await page.locator('.boot-transaction').textContent(), /Complete!/);
  await page.clock.runFor(1000);
  assert.equal(await page.locator('[data-boot-package]').count(), 4, 'updates replace values, never duplicate log rows');
  for (const name of ['experience', 'projects', 'about', 'contact']) {
    assert.equal(await page.locator(`[data-boot-package="${name}"] .boot-percent`).textContent(), '100%');
    assert.match(await page.locator(`[data-boot-package="${name}"] .boot-size`).textContent(), /KiB/);
  }
  await page.clock.runFor(1100);
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

test('content remains visible without IntersectionObserver', async () => {
 const page=await browser.newPage(); await page.addInitScript(()=>{delete window.IntersectionObserver}); await page.goto(url); await page.keyboard.press('Escape');
 for (const id of ['writing','projects','experience','achievements','contact']) assert.equal(await page.locator(`#${id} h2`).isVisible(),true);
 await page.close();
});

test('scroll choreography differs between projects and experience', async () => {
 const page=await browser.newPage();
 await page.addInitScript(() => { const original=Element.prototype.animate; window.__motions=[]; Element.prototype.animate=function(frames, options){window.__motions.push({section:this.closest('section')?.id, frames}); return original.call(this,frames,options)} });
 await page.goto(url); await page.keyboard.press('Escape');
 await page.locator('#projects-title').scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
 await page.locator('#experience-title').scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
 const motions=await page.evaluate(()=>window.__motions);
 const project=motions.find(m=>m.section==='projects'); const experience=motions.find(m=>m.section==='experience');
 assert.ok(project && experience); assert.notDeepEqual(project.frames,experience.frames); assert.match(project.frames[0].transform, /translateX\(-(?:[4-9]\d|\d{3,})px\)/); await page.close();
});

test('project entries animate with staggered timing', async () => {
 const page=await browser.newPage(); await page.addInitScript(()=>{const original=Element.prototype.animate;window.__projectDelays=[];Element.prototype.animate=function(frames, options){if(this.matches('#projects .entry')) window.__projectDelays.push(options.delay || 0);return original.call(this,frames,options)}});
 await page.goto(url); await page.keyboard.press('Escape'); await page.locator('#projects').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>window.__projectDelays.length>=2); const delays=await page.evaluate(()=>window.__projectDelays);
 assert.ok(new Set(delays).size>1, `expected staggered delays, got ${delays}`); await page.close();
});

test('project motion keeps content inside the small viewport', async () => {
 const page=await browser.newPage({viewport:{width:320,height:640}}); await page.goto(url); await page.keyboard.press('Escape');
 await page.locator('#projects-title').scrollIntoViewIfNeeded();
 await page.waitForFunction(() => document.getAnimations().some(x=>x.effect?.target?.id==='projects-title'));
 const bounds=await page.evaluate(() => { const a=document.getAnimations().find(x=>x.effect?.target?.id==='projects-title'); if(!a) return null; a.pause(); a.currentTime=0; return a.effect.target.getBoundingClientRect().left; });
 assert.ok(bounds !== null && bounds >= 0, `motion clipped left edge: ${bounds}`); await page.close();
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

test('boot and landing use the same geometric lettering asset', async () => {
 const page = await browser.newPage(); await page.goto(url);
 const heroSrc=await page.locator('#hero-title img').getAttribute('src');
 assert.equal(await page.locator('.boot img.arvin-glyph').getAttribute('src', {timeout:2000}), heroSrc);
 await page.close();
});

test('page and editorial sections use dark backgrounds and light text', async () => {
 const page=await browser.newPage({reducedMotion:'reduce'}); await page.goto(url);
 const colors=await page.evaluate(() => ({bg:getComputedStyle(document.documentElement).backgroundColor, fg:getComputedStyle(document.body).color}));
 assert.equal(colors.bg, 'rgb(0, 0, 0)'); assert.equal(colors.fg, 'rgb(245, 245, 240)'); await page.close();
});

test('portfolio publishes source-backed sections in requested order', async () => {
 const page=await browser.newPage({javaScriptEnabled:false}); await page.goto(url);
 assert.deepEqual(await page.locator('main > section[id]').evaluateAll(nodes=>nodes.map(n=>n.id)), ['top','writing','projects','experience','achievements','contact']);
 assert.match(await page.locator('#writing').textContent(), /Redshift/);
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

test('injection-like command remains inert text in transcript and does not change cwd', async () => {
 const page=await browser.newPage({reducedMotion:'reduce'}); await page.goto(url); const input=page.getByRole('textbox',{name:'Command'});
 const payload='cd projects; <img src=x onerror=alert(1)>'; await input.fill(payload); await input.press('Enter');
 assert.equal(await page.locator('#transcript img').count(),0); assert.match(await page.locator('#transcript').textContent(), /<img/);
 await input.fill('pwd'); await input.press('Enter'); assert.equal(await page.locator('#terminal-output').textContent(),'/home/arvin'); await page.close();
});

test('terminal preserves a transcript and clear removes it', async () => {
 const page=await browser.newPage({reducedMotion:'reduce'}); await page.goto(url); const input=page.getByRole('textbox',{name:'Command'});
 for (const cmd of ['pwd','whoami']) { await input.fill(cmd); await input.press('Enter'); }
 assert.match(await page.locator('#transcript').textContent(), /pwd[\s\S]*\/home\/arvin[\s\S]*whoami[\s\S]*arvin/);
 await input.fill('clear'); await input.press('Enter'); assert.equal(await page.locator('#transcript').textContent(), ''); await page.close();
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
