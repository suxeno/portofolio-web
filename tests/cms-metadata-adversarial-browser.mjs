// TEST ONLY: inspect an isolated mocked-transport build.
import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const [root, mode] = process.argv.slice(2);
if (!root?.includes('cms-test-build') || !['hostile','empty'].includes(mode)) throw new Error('Expected isolated fixture build and mode');
const server=spawn('python3',['-m','http.server','18769','--bind','127.0.0.1','--directory',root],{stdio:'ignore'});
let browser;
try {
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:18769/')).ok)break;}catch{} await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu']});
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:18769/writing/test-only-article/');
 if(mode==='hostile') {
  const text='TEST " ><script id="injected">alert(1)</script> &';
  assert.equal(await page.title(),text);
  assert.equal(await page.locator('meta[name="description"]').getAttribute('content'),text);
  assert.equal(await page.locator('#injected').count(),0);
  assert.equal(await page.locator('meta[name="description"]').evaluate(el=>el.attributes.length),2);
 } else {
  assert.match(await page.title(),/TEST ONLY article/);
  assert.equal(await page.locator('meta[name="description"]').getAttribute('content'),'Fixture only');
 }
 console.log(`Synthetic ${mode} metadata DOM: PASS`);
} finally { if(browser) await browser.close(); server.kill(); }
