import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';

test('hover keeps rows moving and clicking toggles only that row', async () => {
  let browser;
  try {
    browser = await chromium.launch({executablePath:'/usr/bin/chromium', args:['--no-sandbox']});
    const page = await browser.newPage({reducedMotion:'no-preference'});
    await page.goto(process.env.TOOLS_TEST_URL || 'http://127.0.0.1:4321/');
    if (await page.locator('.boot button').count()) await page.locator('.boot button').click();
    const rows = page.locator('#tools .tools-row');
    const states = () => rows.locator('.tools-track').evaluateAll(els => els.map(e => getComputedStyle(e).animationPlayState));
    await rows.first().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('#tools')?.classList.contains('tools-running'));
    await rows.first().hover();
    assert.deepEqual(await states(), ['running','running','running']);
    await rows.first().click();
    assert.deepEqual(await states(), ['paused','running','running']);
    await rows.nth(1).click();
    assert.deepEqual(await states(), ['paused','paused','running']);
    await rows.first().click();
    assert.deepEqual(await states(), ['running','paused','running']);
  } finally {
    await browser?.close();
  }
});
