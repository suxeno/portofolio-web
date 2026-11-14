// TEST ONLY: inspect a separate synthetic configured Astro output.
import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const root=process.argv[2];
if (!root?.includes('cms-test-build')) throw new Error('Expected isolated fixture output');
const server=spawn('python3',['-m','http.server','18767','--bind','127.0.0.1','--directory',root],{stdio:'ignore'});
let browser;
try {
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:18767/')).ok)break;}catch{} await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu']});
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:18767/');
 await page.locator('#projects .project-card').first().waitFor();
 assert.equal(await page.locator('#projects .project-card').count(),1);
 assert.match(await page.locator('#projects .project-card').innerText(),/TEST project description/);
 assert.equal(await page.locator('#projects .project-card a').getAttribute('href'),'https://example.com/project');
 assert.doesNotMatch(await page.locator('body').innerText(),/TEST hidden project|Drowsiness detection camera|SECRET DRAFT/);
 const career = await page.locator('#experience .entry').allInnerTexts();
 assert.equal(career.length,2);
 assert.match(career[0],/2025 — PRESENT.*TEST first role.*TEST first org/s);
 assert.match(career[1],/TEST second role.*TEST second org/s);
 const achievements = await page.locator('#achievements .entry').allInnerTexts();
 assert.deepEqual(achievements,['TEST first achievement','TEST second achievement']);
 assert.doesNotMatch(await page.locator('body').innerText(),/TEST hidden role|TEST hidden achievement|SECRET CAREER|SECRET ACHIEVEMENT/);
 const tools=page.locator('#tools .tools-accessible li');
 assert.deepEqual(await tools.allTextContents(),['TEST tool A','TEST tool B']);
 assert.equal(await tools.first().getAttribute('aria-label'),'TEST tool A accessible');
 assert.equal(await page.locator('#tools .tools-row').count(),3);
 assert.equal(await page.locator('#tools .tools-track').count(),1);
 const certs=page.locator('#certificates .document');
 assert.equal(await certs.count(),3);
 assert.match(await certs.nth(0).innerText(),/TEST certificate A/);
 assert.equal(await certs.nth(0).locator('img').getAttribute('alt'),'TEST certificate image');
 assert.match(await certs.nth(1).innerText(),/awaiting source file/);
 assert.equal(await certs.nth(2).locator('.image-slot a').getAttribute('href'),'https://cdn.sanity.io/files/synthetic/production/027401f31c3ac1e6d78c5d539ccd1beff72b9b11.pdf');
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('#tools .tools-visual').evaluate(e=>getComputedStyle(e).display),'none');
 await page.emulateMedia({reducedMotion:'no-preference'});
 assert.doesNotMatch(await page.locator('body').innerText(),/TEST hidden tool|TEST hidden certificate/);
 for(const width of [320,1440]) {
  await page.setViewportSize({width,height:900});
  const sizes=await page.locator('#certificates .image-slot').evaluateAll(els=>els.map(e=>[e.getBoundingClientRect().width,e.getBoundingClientRect().height]));
  assert.ok(sizes.every(s=>Math.abs(s[0]-sizes[0][0])<1 && Math.abs(s[1]-sizes[0][1])<1), JSON.stringify({width,sizes}));
 }
 console.log('Synthetic project, career, tools and certificate DOM: PASS (mock image IDs; no CDN proof)');
} finally {if(browser)await browser.close(); server.kill();}
