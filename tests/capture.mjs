import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
await mkdir('.screenshots', { recursive: true });
for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844], ['small', 320, 640]]) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:4180', { waitUntil: 'networkidle' });
  await page.locator('.boot').waitFor();
  await page.screenshot({ path: `.screenshots/${name}-loading.png` });
  await page.keyboard.press('Escape');
  await page.screenshot({ path: `.screenshots/${name}-hero.png` });
  await page.locator('#projects-title').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `.screenshots/${name}-projects.png` });
  const info = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
    return { width: document.documentElement.scrollWidth, viewport: innerWidth, duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index) };
  });
  console.log(name, JSON.stringify({ ...info, errors }));
  await page.close();
}
await browser.close();
