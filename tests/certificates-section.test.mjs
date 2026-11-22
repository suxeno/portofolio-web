import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { baselineSeed } from './helpers/baseline-seed.mjs';
import { createSsrFixture } from './helpers/ssr-fixture.mjs';

test('certificate folio supports authentic original images while leaving missing sources explicit', () => {
  const source = readFileSync('src/components/CertificatesSection.astro', 'utf8');
  assert.match(source, /item\.image\s*\?/);
  assert.match(source, /href=\{item\.file \?\? item\.image\.src\}/);
  assert.match(source, /View original certificate \(PDF\)/);
  assert.match(source, /alt=\{item\.image\.alt\}/);
  assert.match(source, /width=\{item\.image\.width\}/);
  assert.match(source, /height=\{item\.image\.height\}/);
  assert.match(source, /object-fit:\s*contain/);
  assert.match(source, /Certificate image awaiting source file/);
  assert.match(source, /<a href=\{item\.href\}>View evidence ↗<\/a>/);
  assert.doesNotMatch(source, /View recipient badge/);
});

test('certificate card presentation with varied CMS content', {timeout:180000}, async t => {
  const docs=baselineSeed();
  const cards=docs.filter(doc=>doc._type==='certificate').sort((a,b)=>a.order-b.order);
  assert.equal(cards.length,3);
  cards[0].title='Short title';
  cards[0].image={alt:'Synthetic colored certificate',asset:{_ref:'image-abcdef-400x300-png'}};
  cards[2].title='An intentionally long certificate title with enough realistic words to wrap across multiple lines on a phone';
  cards[2].displayDate='Issued September 2024 · Expires September 2028 · Renewal status tracked by the original issuer';
  const fixture=await createSsrFixture({cms:{projectId:'synthetic',dataset:'test'},outbound:async()=>Response.json({result:docs})});
  let browser;
  try {
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu']});
    const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
    const imageUrl='https://cdn.sanity.io/images/synthetic/test/abcdef-400x300.png';
    await page.route(imageUrl,route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#2959c9"/><rect x="130" y="80" width="140" height="140" fill="#eea832"/></svg>'}));
    assert.equal((await page.goto(fixture.url)).status(),200);
    await page.evaluate(()=>document.fonts.ready.then(()=>true));
    const documents=page.locator('#certificates .document');
    assert.equal(await documents.count(),3);
    await t.test('cards match in size at every width without clipping the longer caption',async()=>{
      for(const width of [1280,390,320]) {
        await page.setViewportSize({width,height:900});
        const geometry=await documents.evaluateAll(es=>es.map(e=>{
          const card=e.getBoundingClientRect(), picture=e.querySelector('.image-slot').getBoundingClientRect();
          const caption=e.querySelector('.document-copy > p:last-of-type');
          const link=e.querySelector('.document-copy a').getBoundingClientRect();
          const range=document.createRange(); range.selectNodeContents(caption);
          return {width:card.width,height:card.height,picture:picture.height,linkInset:card.bottom-link.bottom,captionFits:[...range.getClientRects()].every(r=>r.right<=card.right&&r.bottom<=link.top)};
        }));
        const first=geometry[0];
        assert.ok(geometry.every(g=>Math.abs(g.height-first.height)<.1&&Math.abs(g.width-first.width)<.1&&Math.abs(g.picture-first.picture)<.1),JSON.stringify({width,geometry}));
        assert.ok(geometry.every(g=>g.captionFits&&g.linkInset>0&&Math.abs(g.linkInset-first.linkInset)<.1),JSON.stringify({width,geometry}));
      }
    });
    await t.test('badge pixels stay unchanged while the surrounding card reverses',async()=>{
      await page.setViewportSize({width:1280,height:900});
      const card=documents.first();
      await card.scrollIntoViewIfNeeded();
      const badge=card.getByRole('img',{name:'Synthetic colored certificate'});
      await badge.evaluate(img=>img.decode());
      await page.mouse.move(0,0);
      const bounds=await card.boundingBox(), img=await badge.boundingBox();
      const sample=(x,y)=>page.screenshot({clip:{x:Math.round(x),y:Math.round(y),width:12,height:12}});
      const badgeSample=()=>sample(img.x+img.width/2-6,img.y+img.height/2-6);
      const topSample=()=>sample(bounds.x+8,bounds.y+8);
      const caption=await card.locator('.document-copy').boundingBox();
      const captionSample=()=>sample(caption.x+8,caption.y+8);
      const rest=await badgeSample(), top=await topSample(), bottom=await captionSample();
      const link=card.getByRole('link',{name:'View original certificate: Short title'});
      assert.equal(await link.getAttribute('href'),imageUrl);
      await link.hover();
      assert.notDeepEqual(await topSample(),top,'badge panel background reverses');
      assert.notDeepEqual(await captionSample(),bottom,'caption panel background reverses');
      assert.equal((await badgeSample()).equals(rest),true,'visible badge pixels are unchanged during hover');
      await page.mouse.move(0,0);
      await link.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
      assert.equal(await link.evaluate(el=>el.matches(':focus-visible')),true);
      assert.notDeepEqual(await topSample(),top,'keyboard focus reverses the frame');
      assert.equal((await badgeSample()).equals(rest),true,'visible badge pixels are unchanged during keyboard focus');
    });
  } finally { await browser?.close(); await fixture.dispose(); }
});
