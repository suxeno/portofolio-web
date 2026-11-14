// TEST ONLY: compare synthetic configured output and local baseline without external network.
import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import {statSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const root=join(process.env.TMPDIR,'cms-final-evidence');
const servers=['local','seed'].map((d,i)=>spawn('python3',['-m','http.server',String(18980+i),'--bind','127.0.0.1','--directory',join(root,d)],{stdio:'ignore'}));
let browser;
try {
 for(let p=18980;p<=18981;p++){let ok=false;for(let n=0;n<100;n++){try{if((await fetch(`http://127.0.0.1:${p}/`)).ok){ok=true;break}}catch{} await new Promise(r=>setTimeout(r,100));}assert.ok(ok);}
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu']});
 const report={widths:{},requests:{}};
 for(const width of [1440,1366,1280,390,320]){
  let results=[];
  for(let i=0;i<2;i++){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});const requests=[];
   await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1')return route.abort();return route.continue();});
   page.on('request',r=>requests.push({url:r.url(),type:r.resourceType()}));
   await page.goto(`http://127.0.0.1:${18980+i}/`,{waitUntil:'networkidle'});
   await page.screenshot({path:join(root,`${i?'seed':'local'}-${width}.png`),fullPage:true});
   const result=await page.evaluate(()=>({text:document.body.innerText.replace(/\s+/g,' ').trim(),links:[...document.querySelectorAll('body a')].map(a=>a.getAttribute('href')),width:document.documentElement.scrollWidth,sections:[...document.querySelectorAll('main section[id]')].map(x=>({id:x.id,x:Math.round(x.getBoundingClientRect().x),width:Math.round(x.getBoundingClientRect().width),height:Math.round(x.getBoundingClientRect().height)}))}));
   assert.ok(result.width<=width,`overflow ${width}: ${result.width}`);results.push(result);
   if(width===1440 && i===1) report.requests.public=requests;
   await page.close();
  }
  assert.deepEqual(results[1],results[0],`seed/local geometry and content ${width}`);report.widths[width]=results[0].sections;
 }
 const page=await browser.newPage();const requests=[];
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());page.on('request',r=>requests.push({url:r.url(),type:r.resourceType()}));
 await page.goto('http://127.0.0.1:18981/admin/',{waitUntil:'networkidle',timeout:45000});
 report.requests.admin=requests;report.admin={robotsPolicy:'Cloudflare _headers',url:page.url(),title:await page.title()};
 const {readFileSync}=await import('node:fs');assert.match(readFileSync(join(root,'seed/_headers'),'utf8'),/\/admin\/\*[\s\S]*X-Robots-Tag:\s*noindex/i);
 await page.goto('http://127.0.0.1:18981/admin/#/desk',{waitUntil:'domcontentloaded'});await page.reload({waitUntil:'domcontentloaded'});assert.equal(new URL(page.url()).hash,'#/desk');
 assert.ok(!report.requests.public.some(r=>/sanity|studio|react/i.test(r.url)));
 for(const kind of ['public','admin']) {let scripts=report.requests[kind].filter(r=>r.type==='script');report[kind+'Scripts']=scripts.map(r=>{const path=new URL(r.url).pathname;try{return {path,bytes:statSync(join(root,'seed',path)).size}}catch{return {path,bytes:null}}});}
 writeFileSync(join(root,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({widths:Object.keys(report.widths),admin:report.admin,publicScripts:report.publicScripts,adminScripts:report.adminScripts},null,2));
} finally {await browser?.close();servers.forEach(s=>s.kill());}
