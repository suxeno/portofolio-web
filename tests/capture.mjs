import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
await mkdir('.screenshots', { recursive: true });
for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:4180', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `.screenshots/${name}.png`, fullPage: true });
  console.log(name, JSON.stringify({ title: await page.title(), width: await page.evaluate(() => document.documentElement.scrollWidth), errors }));
  await page.close();
}
await browser.close();
