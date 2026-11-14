// TEST ONLY: render a colored transparent local PNG through the real built tool styles.
import {chromium} from 'playwright-core';
import {spawn, spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.argv[2], evidence=process.argv[3];
if (!root?.includes('cms-test-build') || !evidence) throw Error('Provide isolated build and evidence directory');
mkdirSync(evidence,{recursive:true});
const server=spawn('python3',['-m','http.server','18769','--bind','127.0.0.1','--directory',root],{stdio:'ignore'});
let browser;
try {
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:18769/')).ok)break;}catch{} await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu']});
 const page=await browser.newPage({viewport:{width:320,height:900}});
 await page.goto('http://127.0.0.1:18769/');
 if (await page.locator('.boot button').count()) await page.locator('.boot button').click();
 await page.addStyleTag({content:'#tools .tools-track { animation: none !important; transform: none !important; }'});
 await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=22;const x=c.getContext('2d');x.fillStyle='#ef2308';x.fillRect(5,5,12,12);const png=c.toDataURL('image/png');for(const img of [document.querySelector('#tools .tools-accessible img'),document.querySelector('#tools .tools-visual img')]) img.src=png;});
 for(const width of [320,1440]) {
  await page.setViewportSize({width,height:900});
  for(const mode of ['accessible','visual']) {
   await page.emulateMedia({reducedMotion:mode==='accessible'?'reduce':'no-preference'});
   const image=page.locator(`#tools .tools-${mode} img`).first();
   await image.scrollIntoViewIfNeeded();
   await image.evaluate(e=>{e.parentElement.style.background='rgb(20,30,40)';});
   await image.screenshot({path:`${evidence}/${mode}-${width}.png`,animations:'disabled'});
   const check=spawnSync('python3',['-c',`from PIL import Image\nimport sys\nim=Image.open(sys.argv[1]).convert('RGB')\nprint(im.getpixel((11,11)), im.getpixel((1,1)))\nassert min(im.getpixel((11,11))) >= 245, 'colored logo was not white'\nassert im.getpixel((1,1)) == (20,30,40), 'transparent background changed'`,`${evidence}/${mode}-${width}.png`],{encoding:'utf8'});
   assert.equal(check.status,0,check.stdout+check.stderr);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#tools').scrollIntoViewIfNeeded();
  await page.screenshot({path:`${evidence}/section-${width}.png`});
 }
 const curated=page.locator('#tools .tools-accessible img').nth(1);
 assert.equal(await curated.evaluate(e=>getComputedStyle(e).filter),'invert(1)');
 await curated.screenshot({path:`${evidence}/curated.png`});
 console.log('PASS: colored transparent TEST PNG white on both tracks, transparency intact, curated filter unchanged, 320/1440');
} finally {if(browser) await browser.close();server.kill();}
