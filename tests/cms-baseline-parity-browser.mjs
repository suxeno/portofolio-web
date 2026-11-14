// TEST ONLY: compare local baseline with a build using mocked seed transport.
import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const dirs=['.cms-test-build-local','.cms-test-build-seed'];
const servers=dirs.map((d,i)=>spawn('python3',['-m','http.server',String(18870+i),'--bind','127.0.0.1','--directory',d],{stdio:'ignore'}));
let browser;
try {
 for(let port=18870;port<=18871;port++) {let ready=false;for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${port}/`)).ok){ready=true;break;}}catch{} await new Promise(r=>setTimeout(r,100));}assert.ok(ready);}
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu']});
 const pages=await Promise.all([0,1].map(()=>browser.newPage({reducedMotion:'reduce'})));
 for(const path of ['/','/writing/','/writing/reliable-pipelines/','/writing/model-monitoring/','/writing/data-systems/']) {
  const results=[];
  for(let i=0;i<2;i++){await pages[i].goto(`http://127.0.0.1:${18870+i}${path}`,{waitUntil:'networkidle'});results.push(await pages[i].evaluate(()=>({text:document.body.innerText.replace(/\s+/g,' ').trim(),links:[...document.querySelectorAll('body a')].map(a=>[a.textContent.trim().replace(/\s+/g,' '),a.getAttribute('href')]),logos:[...document.querySelectorAll('main img[src^="/logos/"]')].map(x=>[x.getAttribute('src'),x.alt])})));}
  assert.deepEqual(results[1],results[0],`DOM parity: ${path}`);
 }
 console.log('PASS: seed/local public DOM text, links, order, logos across 5 routes');
} finally {if(browser) await browser.close();servers.forEach(s=>s.kill());}
