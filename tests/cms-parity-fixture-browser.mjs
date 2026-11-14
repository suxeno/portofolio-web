// TEST ONLY: configured synthetic snapshot; logos served locally, CDN assets mocked.
import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const root=process.argv[2];
if (!root?.includes('cms-test-build')) throw new Error('Expected isolated fixture output');
const server=spawn('python3',['-m','http.server','18768','--bind','127.0.0.1','--directory',root],{stdio:'ignore'});
let browser;
try {
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:18768/')).ok)break;}catch{} await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu']});
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 await page.goto('http://127.0.0.1:18768/');
 const expected=[['Python','Apache Airflow','Google BigQuery','ClickHouse','MySQL','Docker'],['Linux','Google Cloud','Grafana','Prometheus','Metabase','JavaScript'],['TensorFlow','scikit-learn','Flask','R','C++','Kotlin']];
 const ids=['python','apacheairflow','googlebigquery','clickhouse','mysql','docker','linux','googlecloud','grafana','prometheus','metabase','javascript','tensorflow','scikitlearn','flask','r','cplusplus','kotlin'];
 assert.deepEqual(await page.locator('#tools .tools-accessible li').allTextContents(),expected.flat());
 assert.deepEqual(await page.locator('#tools .tools-accessible img').evaluateAll(es=>es.map(e=>e.getAttribute('src'))),ids.map(id=>`/logos/${id}.svg`));
 assert.ok((await page.locator('#tools .tools-accessible img').evaluateAll(es=>es.map(e=>e.complete&&e.naturalWidth>0))).every(Boolean));
 const rows=page.locator('#tools .tools-row');
 assert.equal(await rows.count(),3);
 for(let i=0;i<3;i++) assert.deepEqual((await rows.nth(i).locator('.tools-copy').first().locator('.tool').allTextContents()).slice(0,6),expected[i]);
 await page.locator('#tools').scrollIntoViewIfNeeded();
 await page.mouse.move(0,0);
 await page.waitForFunction(()=>document.querySelector('#tools')?.classList.contains('tools-running'));
 const tracks=page.locator('#tools .tools-track');
 assert.deepEqual(await tracks.evaluateAll(es=>es.map(e=>[getComputedStyle(e).animationDuration,getComputedStyle(e).animationDirection,getComputedStyle(e).animationPlayState])),[['75s','normal','running'],['85s','reverse','running'],['75s','normal','running']]);
 await page.locator('#tools').hover();
 assert.deepEqual(await tracks.evaluateAll(es=>es.map(e=>getComputedStyle(e).animationPlayState)),['paused','paused','paused']);
 await page.mouse.move(0,0);
 assert.deepEqual(await tracks.evaluateAll(es=>es.map(e=>getComputedStyle(e).animationPlayState)),['running','running','running']);
 await page.getByRole('button',{name:'Pause animations'}).click();
 await page.locator('#tools').scrollIntoViewIfNeeded(); await page.mouse.move(0,0);
 assert.deepEqual(await tracks.evaluateAll(es=>es.map(e=>getComputedStyle(e).animationPlayState)),['paused','paused','paused']);
 await page.getByRole('button',{name:'Resume animations'}).click();
 await page.locator('#tools').scrollIntoViewIfNeeded(); await page.mouse.move(0,0);
 await page.waitForFunction(()=>document.querySelector('#tools')?.classList.contains('tools-running'));
 assert.deepEqual(await tracks.evaluateAll(es=>es.map(e=>getComputedStyle(e).animationPlayState)),['running','running','running']);
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('#tools .tools-visual').evaluate(e=>getComputedStyle(e).display),'none');
 assert.notEqual(await page.locator('#tools .tools-accessible').evaluate(e=>getComputedStyle(e).position),'absolute');
 for(const width of [320,1440]) {
  await page.setViewportSize({width,height:900});
  const sizes=await page.locator('#certificates .image-slot').evaluateAll(es=>es.map(e=>[e.getBoundingClientRect().width,e.getBoundingClientRect().height]));
  assert.equal(sizes.length,3);
  assert.ok(sizes.every(s=>Math.abs(s[0]-sizes[0][0])<1&&Math.abs(s[1]-sizes[0][1])<1),JSON.stringify({width,sizes}));
 }
 console.log('Configured synthetic 18-logo rows, animation, reduced motion and certificate frames: PASS; no real Sanity/CDN proof');
} finally {if(browser) await browser.close();server.kill();}
