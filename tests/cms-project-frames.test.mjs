import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright-core';
import { baselineSeed } from './helpers/baseline-seed.mjs';
import { createSsrFixture } from './helpers/ssr-fixture.mjs';

test('CMS covers auto-fit inside the same frame as the project placeholder', {timeout:180000}, async () => {
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
        contentType:'image/svg+xml', body:`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#2680af"/></svg>`,
      }));
    }
    assert.equal((await page.goto(fixture.url)).status(), 200);
    const cards = page.locator('#projects .project-card');
    assert.equal(await cards.count(), 3);
    await cards.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({width, height:900});
      const geometry = await cards.evaluateAll(es => es.map(card => {
        const frame = card.querySelector('.project-image').getBoundingClientRect();
        const img = card.querySelector('img');
        const picture = img?.getBoundingClientRect();
        return {
          width:frame.width, height:frame.height,
          copyBelow:card.querySelector('h3').getBoundingClientRect().top >= frame.bottom,
          pictureFits:!picture || (Math.abs(picture.height-frame.height)<.1 && Math.abs(picture.width-frame.width)<.1 && Math.abs(picture.top-frame.top)<.1 && Math.abs(picture.left-frame.left)<.1),
          fit:img && getComputedStyle(img).objectFit,
        };
      }));
      const detail = JSON.stringify({width, geometry});
      assert.ok(geometry.every(frame => frame.height === 220 && Math.abs(frame.width-geometry[2].width)<.1 && frame.copyBelow), detail);
      assert.ok(geometry.every(frame => frame.pictureFits), `Image box must not spill out of the frame: ${detail}`);
      assert.deepEqual(geometry.map(frame => frame.fit), ['contain', 'contain', null]);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
  } finally {
    try { await browser?.close(); } finally { await fixture.dispose(); }
  }
});
