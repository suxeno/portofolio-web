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
    await cards.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    const canvas = cards.first().locator('canvas');
    await cards.first().scrollIntoViewIfNeeded();
    await canvas.waitFor({state:'attached', timeout:15000});
    await page.waitForFunction(() => document.querySelector('.project-image canvas')?.dataset.ready === 'true');
    const pixels = await canvas.evaluate(el => [...el.getContext('2d').getImageData(0, 0, el.width, el.height).data]);
    const colors = new Set();
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i+3]) { assert.equal(pixels[i], pixels[i+1]); assert.equal(pixels[i], pixels[i+2]); assert.ok(pixels[i] === 0 || pixels[i] === 255); colors.add(pixels[i]); }
    assert.deepEqual([...colors].sort(), [0,255]);
    const title = cards.first().locator('a');
    await page.mouse.move(0,0);
    assert.equal(await title.evaluate(el => getComputedStyle(el).textDecorationLine), 'none');
    const resting = await cards.first().evaluate(el => getComputedStyle(el).backgroundColor);
    await cards.first().locator('.project-image').hover();
    assert.equal(await canvas.evaluate(el => getComputedStyle(el).opacity), '0');
    assert.notEqual(await cards.first().evaluate(el => getComputedStyle(el).backgroundColor), resting);
    assert.equal(await title.locator('.project-title').evaluate(el => getComputedStyle(el).backgroundSize), '0px 1px');
    await title.focus();
    assert.equal(await canvas.evaluate(el => getComputedStyle(el).opacity), '0');
    assert.equal(await title.locator('.project-title').evaluate(el => getComputedStyle(el).backgroundSize), '100% 1px');
    assert.equal(await cards.first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    await title.evaluate(el => el.blur());
    await page.mouse.move(0,0);
    assert.equal(await canvas.evaluate(el => getComputedStyle(el).opacity), '1');
    const placeholder = cards.nth(2);
    assert.equal(await placeholder.locator('canvas').count(), 0);
    const placeholderRest = await placeholder.evaluate(el => getComputedStyle(el).backgroundColor);
    const placeholderFrameRest = await placeholder.locator('.project-image').evaluate(el => getComputedStyle(el).backgroundColor);
    await placeholder.hover();
    assert.notEqual(await placeholder.locator('.project-image').evaluate(el => getComputedStyle(el).backgroundColor), placeholderFrameRest);
    assert.notEqual(await placeholder.evaluate(el => getComputedStyle(el).backgroundColor), placeholderRest);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({width, height:900});
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
  } finally {
    try { await browser?.close(); } finally { await fixture.dispose(); }
  }
});
