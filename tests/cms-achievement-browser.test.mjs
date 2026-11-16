import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSsrFixture} from './helpers/ssr-fixture.mjs';
import {baselineSeed} from './helpers/baseline-seed.mjs';

test('synthetic CMS achievement links wrap and support focus and reduced motion', {timeout:180000}, async () => {
 const docs=baselineSeed();
 const award=docs.find(x=>x._type==='achievement');
 award.title='Fixture achievement title with a long wrapped description for responsive screen testing';
 award.links=[{_key:'evidence',_type:'link',label:'Evidence',url:'https://example.org/evidence'}];
 const fixture=await createSsrFixture({cms:{projectId:'synthetic',dataset:'test'},outbound:async()=>new Response(JSON.stringify({result:docs}),{headers:{'content-type':'application/json'}})}); let browser;
 try {
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu']});
  const dir=join(tmpdir(),'achievement-candidate'); mkdirSync(dir,{recursive:true});
  for(const width of [320,390,1280]) {
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'no-preference'}); await page.goto(fixture.url);
   const skip=page.getByRole('button',{name:'Skip intro'}); if(await skip.isVisible()) await skip.click();
   const link=page.locator('.achievement-link'); assert.equal(await link.count(),1); assert.equal(await link.getAttribute('href'),'https://example.org/evidence');
   assert.equal(await page.locator('#achievements .entry').count(),4);
   assert.equal(await page.locator('#achievements .entry').nth(1).locator('a').count(),0);
   assert.equal(await page.locator('#contact .social-highlight').count(),docs.find(x=>x._type==='profile').links.length);
   await link.scrollIntoViewIfNeeded(); assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   // Freeze the browser animation timeline before hover; pausing only after
   // hover can miss the entire transition when the test runner is busy.
   const cdp=await page.context().newCDPSession(page);
   await cdp.send('Animation.enable');
   await cdp.send('Animation.setPlaybackRate',{playbackRate:0});
   await link.hover();
   await link.evaluate(e=>{
    const animation=e.getAnimations().find(a=>a.transitionProperty==='--link-sweep');
    if (!animation) throw new Error('Expected active highlight transition');
    animation.pause(); animation.currentTime=100;
   });
   const partial=parseFloat(await link.evaluate(e=>getComputedStyle(e).getPropertyValue('--link-sweep')));
   assert.ok(partial>0 && partial<100, `mid-transition: ${partial}`);
   const midStyle=await link.evaluate(e=>({background:getComputedStyle(e).backgroundImage, clip:getComputedStyle(e).backgroundClip, fill:getComputedStyle(e).webkitTextFillColor}));
   // Both gradients share the same stop: dark glyphs over the white fill,
   // and light glyphs over the unfilled background throughout the sweep.
   assert.match(midStyle.background, /rgb\(23, 23, 23\).*rgb\(245, 245, 240\).*rgb\(255, 255, 255\).*rgba\(0, 0, 0, 0\)/);
   assert.equal(midStyle.clip, 'text, padding-box');
   assert.equal(midStyle.fill, 'rgba(0, 0, 0, 0)');
   if(width===1280) await link.screenshot({path:`${dir}/achievement-1280-mid-sweep.png`});
   await link.evaluate(e=>e.getAnimations().forEach(animation=>animation.finish()));
   assert.equal(await link.evaluate(e=>getComputedStyle(e).getPropertyValue('--link-sweep').trim()),'100%');
   await page.locator('#achievements').screenshot({path:`${dir}/achievement-${width}-hover.png`});
   await page.mouse.move(0,0); await page.keyboard.press('Tab'); await link.focus();
   await page.emulateMedia({reducedMotion:'reduce'}); await page.evaluate(()=>document.documentElement.classList.add('keyboard-test'));
   await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
   assert.equal(await link.evaluate(e=>e.matches(':focus-visible')),true);
   assert.equal(await link.evaluate(e=>getComputedStyle(e).getPropertyValue('--link-sweep').trim()),'100%');
   assert.equal(await link.evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
   await page.locator('#achievements').screenshot({path:`${dir}/achievement-${width}-focus-reduced.png`});
   await page.close();
  }
 } finally {if(browser) await browser.close(); await fixture.dispose();}
});
