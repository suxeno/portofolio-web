import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSsrFixture} from './helpers/ssr-fixture.mjs';

test('social highlight and experience scale respond to hover without layout shift', {timeout:180000}, async () => {
 const fixture=await createSsrFixture(); let browser;
 try {
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu']});
  const page=await browser.newPage({viewport:{width:1280,height:900}}); await page.goto(fixture.url);
  const skip=page.getByRole('button',{name:'Skip intro'}); if(await skip.isVisible()) await skip.click();
  const dir=join(tmpdir(),'achievement-candidate'); mkdirSync(dir,{recursive:true});
  const directory=page.locator('.terminal-list a').first();
  await directory.hover(); await page.waitForTimeout(400);
  assert.equal(await directory.evaluate(e=>getComputedStyle(e).backgroundSize),'100% 1px');
  await directory.screenshot({path:`${dir}/underline-desktop.png`});
  for (const selector of ['.writing-more a', '#certificates .document-copy a', 'footer > a']) {
   const existing=page.locator(selector).first();
   assert.equal(await existing.evaluate(e=>getComputedStyle(e).textDecorationLine),'underline',selector);
   await existing.hover(); await page.waitForTimeout(400);
   assert.equal(await existing.evaluate(e=>getComputedStyle(e,'::after').transform),'matrix(1, 0, 0, 1, 0, 0)',selector);
  }
  const social=page.getByRole('link',{name:'LinkedIn'}); await social.scrollIntoViewIfNeeded();
  assert.equal(await social.evaluate(e=>getComputedStyle(e).getPropertyValue('--link-sweep').trim()),'0%');
  await social.hover(); await page.waitForTimeout(400);
  assert.equal(await social.evaluate(e=>getComputedStyle(e).getPropertyValue('--link-sweep').trim()),'100%');
  assert.equal(await social.evaluate(e=>getComputedStyle(e).textDecorationLine),'none');
  await page.locator('#contact').screenshot({path:`${dir}/social-desktop.png`});
  await page.mouse.move(0,0); await page.waitForTimeout(400);
  assert.equal(await social.evaluate(e=>getComputedStyle(e).getPropertyValue('--link-sweep').trim()),'0%');
  const row=page.locator('#experience .entry').first(); await row.hover(); await page.waitForTimeout(400);
  assert.equal(await row.evaluate(e=>getComputedStyle(e).scale),'1.02',JSON.stringify(await row.evaluate(e=>({hover:e.matches(':hover'),body:document.body.className, media:matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches, transform:getComputedStyle(e).transform, inline:e.getAttribute('style')}))));
  await page.locator('#experience').screenshot({path:`${dir}/experience-desktop.png`});
  await page.emulateMedia({reducedMotion:'reduce'}); await page.waitForTimeout(50);
  assert.equal(await row.evaluate(e=>getComputedStyle(e).scale),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.getByRole('button',{name:'Pause animations'}).click();
  await row.hover(); await page.waitForTimeout(350);
  assert.equal(await row.evaluate(e=>getComputedStyle(e).scale),'none');
  await social.hover();
  assert.equal(await social.evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
 } finally {if(browser) await browser.close(); await fixture.dispose();}
});


test('homepage revision uses faint link baselines and motion-aware writing rows', {timeout:180000}, async () => {
 const fixture=await createSsrFixture(); let browser;
 try {
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu']});
  const page=await browser.newPage({viewport:{width:1280,height:900}}); await page.goto(fixture.url);
  const skip=page.getByRole('button',{name:'Skip intro'}); if(await skip.isVisible()) await skip.click();
  for(const selector of ['#projects .project-card a','footer nav a']) {
   const link=page.locator(selector).first(); await link.scrollIntoViewIfNeeded();
   assert.match(await link.evaluate(e=>getComputedStyle(e).textDecorationColor), /(?:0\.25|0\.250)/, selector);
   if(selector==='footer nav a') assert.notEqual(await link.evaluate(e=>getComputedStyle(e).backgroundPositionY),'100%', 'footer sweep must follow text rather than the bottom of the 44px touch target');
   await link.hover(); await page.waitForTimeout(400);
   assert.equal(await link.evaluate(e=>getComputedStyle(e).backgroundSize),'100% 1px');
   await page.mouse.move(0,0); await page.waitForTimeout(350);
  }
  const row=page.locator('#writing .entry').first(); await row.hover(); await page.waitForTimeout(400);
  assert.equal(await row.evaluate(e=>getComputedStyle(e).scale),'1.02');
  assert.equal(await row.locator('strong').evaluate(e=>getComputedStyle(e).textDecorationLine),'none');
  await page.emulateMedia({reducedMotion:'reduce'}); assert.equal(await row.evaluate(e=>getComputedStyle(e).scale),'none');
 } finally {if(browser) await browser.close(); await fixture.dispose();}
});
