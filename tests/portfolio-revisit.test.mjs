import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createSsrFixture} from './helpers/ssr-fixture.mjs';
import {schemaTypes} from '../src/cms/schema.mjs';

let fixture, browser;
before(async () => {
  fixture = await createSsrFixture();
  browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--disable-gpu']});
});
after(async () => { await browser?.close(); await fixture?.dispose(); });

test('desktop header, artwork and pointer trail respect motion preferences', async () => {
  const page = await browser.newPage({viewport:{width:1280,height:900}});
  try {
    const artRequests = [];
    page.on('request', req => { if (req.url().includes('walking-dots')) artRequests.push(req.url()); });
    await page.goto(fixture.url);
    await page.locator('.boot').waitFor({state:'detached'});
    const nav = page.locator('.site-header nav a').first(); await nav.hover();
    assert.equal(await nav.locator('.nav-prefix').count(), 1);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.site-header nav a:hover .nav-label')).backgroundSize === '100% 1px');
    await page.waitForSelector('.motion-panel canvas');
    assert.equal(await page.locator('.hero-dots').count(), 0, 'legacy .hero-dots should be removed');
    assert.deepEqual(artRequests, [], 'homepage should not request walking-dots assets');
    const layout=await page.locator('.hero').evaluate(e=>{
      const rect=selector=>e.querySelector(selector).getBoundingClientRect();
      const copy=rect('.hero-copy'), panel=rect('.motion-panel'), shell=rect('.terminal-shell'), canvas=rect('.motion-panel canvas');
      return {artGap:panel.left-copy.right,
        heightDiff:Math.abs(panel.height-copy.height),
        shellGap:shell.top-panel.bottom,
        canvasWidth:canvas.width, canvasHeight:canvas.height,
        dividerGap:e.getBoundingClientRect().right-rect('.command-line').right};
    });
    assert.ok(layout.artGap>0,`art sits to the right of the copy: ${JSON.stringify(layout)}`);
    assert.ok(layout.heightDiff<=2,`motion panel fills full right grid cell height: ${JSON.stringify(layout)}`);
    assert.ok(layout.shellGap>=-1,`terminal shell sits below motion panel: ${JSON.stringify(layout)}`);
    assert.ok(layout.canvasWidth>200 && layout.canvasHeight>200,`canvas renders with non-zero dimensions: ${JSON.stringify(layout)}`);
    assert.ok(Math.abs(layout.dividerGap)<0.1,`terminal divider stays full-width: ${JSON.stringify(layout)}`);
    // Freeze browser time so slow canvas readbacks cannot consume the 480 ms wake.
    const clockStart = Date.parse('2026-01-01T00:00:00Z');
    await page.clock.install({time:clockStart});
    await page.clock.pauseAt(clockStart + 1000);
    await page.mouse.move(280,200); await page.mouse.move(520,280,{steps:12});
    await page.clock.runFor(32); // render a frame after the pointer events
    const trail = page.locator('.pointer-trail');
    const sample = () => trail.evaluate(c => {
      const left=240, top=150;
      const {data,width,height} = c.getContext('2d').getImageData(left,top,320,190);
      const cells=new Set();
      let pixels=0, minY=height, maxY=-1, alpha=0;
      for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
        const a=data[(y*width+x)*4+3];
        if(a) { pixels++; alpha+=a; minY=Math.min(minY,y); maxY=Math.max(maxY,y); cells.add(`${Math.floor((x+left)/32)}:${Math.floor((y+top)/32)}`); }
      }
      const at=(x,y)=>data[((y-top)*width+x-left)*4+3];
      // The last pointer lies in the square starting at (512, 256).
      const edges=[at(514,272),at(542,272),at(528,258),at(528,286)];
      let interior=0;
      for(let y=260;y<284;y++) for(let x=516;x<540;x++) interior+=at(x,y);
      return {pixels, height:maxY-minY, alpha, cells:cells.size, edges, interior};
    });
    const painted = await sample();
    assert.ok(painted.cells>=10 && painted.height>120, `trail paints broad neighboring cells: ${JSON.stringify(painted)}`);
    assert.ok(painted.edges.every(Boolean) && painted.interior===0, `trail squares have four painted edges and no fill: ${JSON.stringify(painted)}`);
    await page.clock.runFor(250);
    const fading = await sample();
    assert.ok(fading.alpha>0 && fading.alpha<painted.alpha, `trail visibly fades: ${JSON.stringify({painted,fading})}`);
    await page.clock.runFor(300); assert.equal((await sample()).pixels,0,'wake eventually clears');
    const hasPixels = async () => (await sample()).pixels>0;
    await page.getByRole('button',{name:'Pause animations'}).click();
    await page.mouse.move(400,250); await page.clock.runFor(32);
    assert.equal(await hasPixels(),false,'pause suppresses the trail');
    await page.waitForFunction(() => document.querySelector('.motion-panel')?.classList.contains('is-paused'));
    await page.getByRole('button',{name:'Resume animations'}).click();
    await page.waitForFunction(() => !document.querySelector('.motion-panel')?.classList.contains('is-paused'));
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForFunction(() => document.querySelector('.motion-panel')?.classList.contains('is-paused'));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => !document.querySelector('.motion-panel')?.classList.contains('is-paused'));
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForFunction(() => document.querySelector('.motion-panel')?.classList.contains('is-paused'));
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForFunction(() => !document.querySelector('.motion-panel')?.classList.contains('is-paused'));
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(() => document.querySelector('.motion-panel')?.classList.contains('is-paused'));
    await page.mouse.move(350,250); await page.clock.runFor(32);
    assert.equal(await hasPixels(),false,'reduced motion suppresses the trail');
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'Open menu'}).click();
    assert.equal(await page.locator('#mobile-menu .nav-prefix').count(),4);
  } finally { await page.close(); }
});

test('certificate reveal is motion-aware and scaled writing rows are not clipped', async () => {
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  try {
    await page.goto(fixture.url);
    const row=page.locator('#writing .entry').first(); await row.hover();
    assert.equal(await row.evaluate(e=>getComputedStyle(e.parentElement).overflowX),'visible');
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('#writing .entry:hover')).scale==='1.02');
    const cert=page.locator('#certificates .document').first();
    const transform=()=>cert.evaluate(e=>getComputedStyle(e,'::before').transform);
    const resting=await transform();
    await cert.hover(); await page.waitForTimeout(800);
    const settled=await transform();
    assert.notEqual(settled,resting,'whole-card wipe changes state');
    await page.waitForTimeout(600); assert.equal(await transform(),settled,'reversal persists while hovered');
    await page.mouse.move(0,0); await page.waitForTimeout(800); assert.equal(await transform(),resting,'wipe reverses on exit');
    await page.emulateMedia({reducedMotion:'reduce'});
    await cert.getByRole('link',{name:'View evidence'}).focus();
    assert.equal(await cert.evaluate(e=>getComputedStyle(e,'::before').transitionDuration),'0s');
    assert.notEqual(await transform(),resting,'keyboard focus reverses the card');
    assert.equal(await cert.getByRole('link',{name:'View evidence'}).count(),1);
    const evidence=cert.getByRole('link',{name:'View evidence'});
    const href=await evidence.getAttribute('href');
    await page.route(href, route=>route.fulfill({status:200,contentType:'text/html',body:'Evidence destination'}));
    await Promise.all([page.waitForURL(href), evidence.click()]);
    assert.equal(await page.locator('body').innerText(),'Evidence destination');
  } finally { await page.close(); }
});

test('mobile artwork fills the available column without overflow', async () => {
  for (const width of [320,390]) {
    const page=await browser.newPage({viewport:{width,height:844}});
    try {
      await page.goto(fixture.url); await page.locator('.boot').waitFor({state:'detached'});
      const metrics=await page.locator('.motion-panel').evaluate(e=>({width:e.getBoundingClientRect().width, height:e.getBoundingClientRect().height, parent:e.parentElement.getBoundingClientRect().width, top:e.getBoundingClientRect().top, shellBottom:document.querySelector('.terminal-shell').getBoundingClientRect().bottom, scroll:document.documentElement.scrollWidth, viewport:innerWidth}));
      assert.ok(metrics.width / metrics.parent >= .85, JSON.stringify(metrics));
      assert.ok(Math.abs(metrics.width / metrics.height - 1.25) < 0.05, `aspect ratio 5:4: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.top >= metrics.shellBottom, `mobile panel sits below terminal shell: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.scroll <= metrics.viewport, JSON.stringify(metrics));
    } finally { await page.close(); }
  }
});

test('hero ASCII Three.js panel renders cleanly and respects no-JS and reduced-motion modes', async () => {
  for (const width of [1280, 1440]) {
    const page = await browser.newPage({viewport:{width, height:900}});
    try {
      await page.goto(fixture.url);
      await page.locator('.boot').waitFor({state:'detached'});
      await page.waitForSelector('.motion-panel canvas');
      const box = await page.locator('.motion-panel canvas').boundingBox();
      assert.ok(box && box.width > 200 && box.height > 200, `ASCII canvas renders at ${width}: ${JSON.stringify(box)}`);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      assert.equal(await page.locator('.motion-panel .ascii-profile-lens.is-visible').count(), 1, 'hover reveals blood-red lens');
    } finally { await page.close(); }
  }
  const noJsCtx = await browser.newContext({javaScriptEnabled: false, viewport:{width:1280, height:900}});
  try {
    const noJsPage = await noJsCtx.newPage();
    await noJsPage.goto(fixture.url);
    assert.equal(await noJsPage.locator('.motion-panel canvas').count(), 0, 'no Three.js canvas without JS');
    await noJsPage.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await noJsPage.locator('.motion-panel .ascii-profile-lens.is-visible').count(), 0);
  } finally { await noJsCtx.close(); }
});

test('Studio offers native publication date and contact controls, not unused metadata', () => {
  const fields=type=>Object.fromEntries(schemaTypes.find(x=>x.name===type).fields.map(x=>[x.name,x]));
  assert.equal(fields('writing').publishedAt.type,'date');
  assert.equal(fields('profile').email.type,'email');
  assert.equal(fields('certificate').verificationUrl.type,'url');
  for (const [type,names] of Object.entries({siteSettings:['footerCopy','seo'],profile:['photo','resume','contactCta'],writing:['featured'],experience:['location','links','startDate','description'],achievement:['evidence','date','placement','event','description'],certificate:['date','expiry','credentialId']})) {
    for (const name of names) assert.equal(fields(type)[name]?.hidden,true,`${type}.${name}`);
  }
});
