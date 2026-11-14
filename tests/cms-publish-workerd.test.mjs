import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

test('workerd queues through durable binding and alarm calls mocked GitHub', {timeout:40000}, async () => {
 let calls=0;
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:'workers/cms-publish/index.mjs',compatibilityDate:'2026-10-28',durableObjects:{PUBLISH_GATE:{className:'PublishGate',useSQLite:true}},outboundService:async request=>{ calls++; assert.equal(request.url,'https://api.github.com/repos/owner/repo/actions/workflows/deploy.yml/dispatches'); return new Response(null,{status:204}); },bindings:{SANITY_WEBHOOK_SECRET:'test-only-secret',GITHUB_TOKEN:'test-token',GITHUB_OWNER:'owner',GITHUB_REPO:'repo',GITHUB_WORKFLOW:'deploy.yml',GITHUB_REF:'main',SANITY_PROJECT_ID:'testproject',SANITY_DATASET:'production'}}));
 try {
  const body=JSON.stringify({projectId:'testproject',dataset:'production',before:null,after:{_id:'project.one',_type:'project',_rev:'one'}});
  const timestamp=Date.now(); const mac=createHmac('sha256','test-only-secret').update(`${timestamp}.${body}`).digest('base64url');
  const result=await mf.dispatchFetch('https://test.invalid/',{method:'POST',headers:{'content-type':'application/json','sanity-webhook-signature':`t=${timestamp},v1=${mac}`},body});
  assert.equal(result.status,202,await result.text());
  await new Promise(r=>setTimeout(r,18000));
  assert.equal(calls,1);
 } finally {await mf.dispose();}
});
