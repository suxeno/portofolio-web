import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';

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
 const toggle=page.getByRole('button',{name:'Pause title animation'}); assert.equal(await toggle.textContent(), 'Arvin');
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
