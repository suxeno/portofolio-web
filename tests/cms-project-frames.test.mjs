import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright-core';
import { baselineSeed } from './helpers/baseline-seed.mjs';
import { createSsrFixture } from './helpers/ssr-fixture.mjs';

test('CMS covers fill the 16:9 frame without spilling over the project copy', {timeout:180000}, async () => {
  const wide = [2880, 1498], tall = [900, 2400];
  const records = baselineSeed().filter(doc => doc._type !== 'project');
  for (const [order, size] of [wide, tall, null].entries()) {
    records.push({
      _id: `project-fixture-${order}`, _type: 'project', order,
      title: `Test project ${order}`, description: 'Project description under the frame.',
      repository: `https://example.com/project/${order}`,
      ...(size && {cover: {asset: {_ref: `image-abcdef-${size.join('x')}-png`}, alt: `Test cover ${order}`}}),
    });
  }
  const fixture = await createSsrFixture({cms: {projectId:'synthetic', dataset:'test'}, outbound: async () => Response.json({result:records})});
  let browser;
  try {
    browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox','--disable-gpu']});
    const page = await browser.newPage({reducedMotion:'reduce'});
    for (const [w, h] of [wide, tall]) {
      await page.route(`https://cdn.sanity.io/images/synthetic/test/abcdef-${w}x${h}.png`, route => route.fulfill({
        contentType:'image/svg+xml', headers:{'access-control-allow-origin':'*'}, body:`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#2680af"/></svg>`,
      }));
    }
    assert.equal((await page.goto(fixture.url)).status(), 200);
    const cards = page.locator('#projects .project-card');
    assert.equal(await cards.count(), 3);
    await page.locator('.boot').waitFor({state:'hidden', timeout:15000});
    await cards.first().scrollIntoViewIfNeeded({timeout:10000});
    await page.waitForFunction(() => [...document.querySelectorAll('#projects .project-image > img')].every(i => i.complete && i.naturalWidth), null, {timeout:15000});
    const canvas = cards.first().locator('canvas');
    await cards.first().scrollIntoViewIfNeeded();
    await canvas.waitFor({state:'attached', timeout:15000});
    await page.waitForFunction(() => document.querySelector('.project-image canvas')?.dataset.ready === 'true', null, {timeout:15000});
    assert.equal(await page.getByRole('img', {name:'Test cover 0'}).count(), 1, 'resting cover retains one accessible name');
    const pixels = await canvas.evaluate(el => [...el.getContext('2d').getImageData(0, 0, el.width, el.height).data]);
    const colors = new Set();
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i+3]) { assert.equal(pixels[i], pixels[i+1]); assert.equal(pixels[i], pixels[i+2]); assert.ok(pixels[i] === 0 || pixels[i] === 255); colors.add(pixels[i]); }
    assert.deepEqual([...colors].sort(), [0,255]);
    const title = cards.first().locator('a');
    await page.mouse.move(0,0);
    assert.equal(await title.evaluate(el => getComputedStyle(el).textDecorationLine), 'none');
    const resting = await cards.first().evaluate(el => getComputedStyle(el).backgroundColor);
    await cards.first().locator('.project-image').hover();
    assert.equal(await canvas.evaluate(el => getComputedStyle(el).visibility), 'hidden');
    assert.notEqual(await cards.first().evaluate(el => getComputedStyle(el).backgroundColor), resting);
    assert.equal(await title.locator('.project-title').evaluate(el => getComputedStyle(el).backgroundSize), '0px 1px');
    await title.focus();
    assert.equal(await canvas.evaluate(el => getComputedStyle(el).visibility), 'hidden');
    assert.equal(await title.locator('.project-title').evaluate(el => getComputedStyle(el).backgroundSize), '100% 1px');
    assert.equal(await cards.first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    await title.evaluate(el => el.blur());
    await page.mouse.move(0,0);
    assert.equal(await canvas.evaluate(el => getComputedStyle(el).visibility), 'visible');
    const placeholder = cards.nth(2);
    assert.equal(await placeholder.locator('canvas').count(), 0);
    const placeholderRest = await placeholder.evaluate(el => getComputedStyle(el).backgroundColor);
    const placeholderFrameRest = await placeholder.locator('.project-image').evaluate(el => getComputedStyle(el).backgroundColor);
    await placeholder.hover();
    assert.notEqual(await placeholder.locator('.project-image').evaluate(el => getComputedStyle(el).backgroundColor), placeholderFrameRest);
    assert.notEqual(await placeholder.evaluate(el => getComputedStyle(el).backgroundColor), placeholderRest);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({width, height:900});
      if (width < 600) {
        await page.waitForFunction(() => {
          const frame = document.querySelector('.project-image');
          const canvas = frame?.querySelector('canvas');
          const img = frame?.querySelector('img');
          if (!canvas || !img) return false;
          const r = frame.getBoundingClientRect();
          const expected = Math.round(img.naturalWidth * Math.min(1, Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight) * Math.min(devicePixelRatio || 1, 2), 960 / Math.max(img.naturalWidth, img.naturalHeight)));
          return canvas.width === expected;
        }, null, {timeout:10000});
        const values = await canvas.evaluate(el => { const d = el.getContext('2d').getImageData(0,0,el.width,el.height).data; return [...new Set(Array.from(d).filter((_,i) => i % 4 === 0))].sort((a,b)=>a-b); });
        assert.deepEqual(values, [0,255], `phone canvas stays two-value after resizing to ${width}`);
      }
      const geometry = await cards.evaluateAll(es => es.map(card => {
        const frame = card.querySelector('.project-image').getBoundingClientRect();
        const img = card.querySelector('img');
        const overlay = card.querySelector('canvas');
        const picture = img?.getBoundingClientRect();
        return {
          width:frame.width, height:frame.height,
          copyBelow:card.querySelector('h3').getBoundingClientRect().top >= frame.bottom,
          pictureFits:!picture || (Math.abs(picture.height-frame.height)<.1 && Math.abs(picture.width-frame.width)<.1 && Math.abs(picture.top-frame.top)<.1 && Math.abs(picture.left-frame.left)<.1),
          imageFit:img && getComputedStyle(img).objectFit,
          ditherFit:overlay && getComputedStyle(overlay).objectFit,
        };
      }));
      const detail = JSON.stringify({width, geometry});
      assert.ok(geometry.every(frame => Math.abs(frame.width / frame.height - 16 / 9) < .01 && Math.abs(frame.width-geometry[2].width)<.1 && frame.copyBelow), detail);
      assert.ok(geometry.every(frame => frame.pictureFits), `Image box must not spill out of the frame: ${detail}`);
      assert.deepEqual(geometry.map(frame => [frame.imageFit, frame.ditherFit]), [['cover', 'cover'], ['cover', 'cover'], [null, null]], 'Original and dither must both cover the frame');
      const gap = await page.locator('#projects').evaluate(section => section.querySelector('.project-image').getBoundingClientRect().top - section.querySelector('h2').getBoundingClientRect().bottom);
      assert.ok(gap >= 16 && gap <= 28, `heading gap at ${width}: ${gap}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    // Fresh contexts exercise the cold loader, CORS retry, terminal failure and no-JS path.
    const target = '**/abcdef-2880x1498.png';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="2880" height="1498"><rect width="100%" height="100%" fill="#2680af"/></svg>';
    for (const mode of ['slow', 'cors', 'error', 'nojs']) {
      const context = await browser.newContext({javaScriptEnabled:mode !== 'nojs', reducedMotion:'reduce'});
      const probe = await context.newPage();
      let requests = 0, release;
      const gate = new Promise(resolve => { release = resolve; });
      await probe.route(target, async route => {
        requests++;
        if (mode === 'slow') await gate;
        if (mode === 'error' || (mode === 'cors' && requests === 1)) return route.abort('failed');
        const headers = mode === 'cors' ? {} : {'access-control-allow-origin':'*'};
        return route.fulfill({contentType:'image/svg+xml', headers, body:svg});
      });
      await probe.route('**/abcdef-900x2400.png', route => route.fulfill({contentType:'image/svg+xml', headers:{'access-control-allow-origin':'*'}, body:svg}));
      await probe.goto(fixture.url, {waitUntil:'domcontentloaded', timeout:15000});
      const cover = probe.locator('#projects .project-image').first();
      await cover.scrollIntoViewIfNeeded({timeout:10000});
      if (mode === 'slow') {
        await probe.waitForFunction(() => document.querySelector('.project-image > img'), null, {timeout:10000});
        assert.equal(await cover.locator('img').first().evaluate(e => getComputedStyle(e).visibility), 'hidden');
        assert.equal(await cover.locator('canvas').evaluate(e => getComputedStyle(e).visibility), 'hidden');
        release();
        await probe.waitForFunction(() => document.querySelector('.project-image')?.dataset.coverState === 'ready', null, {timeout:15000});
        assert.equal(requests, 1, 'one cold CORS request including noscript');
      } else if (mode === 'cors') {
        await probe.waitForFunction(() => document.querySelector('.project-image')?.dataset.coverState === 'fallback', null, {timeout:15000});
        assert.equal(await cover.locator('img').first().evaluate(e => getComputedStyle(e).visibility), 'visible');
        assert.equal(requests, 2, 'CORS denial retries without CORS');
      } else if (mode === 'error') {
        await probe.waitForFunction(() => document.querySelector('.project-image')?.dataset.coverState === 'error', null, {timeout:15000});
        assert.equal(await cover.locator('.cover-error').isVisible(), true);
        assert.equal(await cover.locator('img').first().evaluate(e => getComputedStyle(e).visibility), 'hidden');
      } else {
        await probe.waitForFunction(() => document.querySelector('.project-image noscript img')?.naturalWidth > 0, null, {timeout:15000});
        assert.equal(requests, 2, 'no-JS browser requests CORS image and noscript fallback');
        assert.equal(await cover.locator('noscript img').isVisible(), true);
      }
      assert.equal(await probe.getByRole('img', {name:'Test cover 0'}).count(), 1);
      await context.close();
    }
  } finally {
    try { await browser?.close(); } finally { await fixture.dispose(); }
  }
});
