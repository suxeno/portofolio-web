import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import worker, { PublishGate } from '../workers/cms-publish/index.mjs';

const secret = 'test-only-secret';
const event = {projectId:'testproject',dataset:'production',before:null,after:{_id:'project.one',_type:'project',_rev:'one'}};
function harness() {
  const data = new Map(); let lock = Promise.resolve(); let calls = 0; let failure = false;
  const storage = {get: async k => data.get(k), put: async (k,v) => {data.set(k,v)}, getAlarm:async()=>data.get('alarm'), setAlarm:async v=>data.set('alarm',v), deleteAlarm:async()=>data.delete('alarm'), transaction:async fn=>fn(storage)};
  const state = { storage, blockConcurrencyWhile(fn) { const p = lock.then(fn); lock = p.catch(()=>{}); return p; } };
  const env = {SANITY_WEBHOOK_SECRET:secret,GITHUB_TOKEN:'test-token',GITHUB_OWNER:'owner',GITHUB_REPO:'repo',GITHUB_WORKFLOW:'deploy.yml',GITHUB_REF:'main',SANITY_PROJECT_ID:'testproject',SANITY_DATASET:'production'};
  const gate = new PublishGate(state, env, async (url,options) => { calls++; assert.equal(url,'https://api.github.com/repos/owner/repo/actions/workflows/deploy.yml/dispatches'); assert.deepEqual(JSON.parse(options.body),{ref:'main',inputs:{'cms-publish':'true'}}); return new Response(null,{status:failure ? 503 : 204}); });
  env.PUBLISH_GATE = {idFromName:()=> 'singleton',get:()=>({fetch: req => gate.fetch(req)})};
  return {env, calls:()=>calls, fail:v=>failure=v, alarm:()=>gate.alarm(), data, state, send:gate.send};
}
function req(payload=event, {timestamp=Date.now(), signature, method='POST', contentType='application/json'}={}) {
 const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
 const mac = createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('base64url');
 return new Request('https://example.test/',{method,headers:{'content-type':contentType,'sanity-webhook-signature':signature ?? `t=${timestamp},v1=${mac}`}, ...(method==='POST'?{body}: {})});
}
test('concurrent distinct events are durably queued before acknowledgment', async()=>{
 const h=harness(); const other={...event,after:{...event.after,_rev:'two'}};
 const results=await Promise.all([worker.fetch(req(),h.env),worker.fetch(req(other),h.env)]);
 assert.deepEqual(results.map(r=>r.status).sort(),[202,202]); assert.equal(h.calls(),0); assert.equal(h.data.get('pending'),true); await h.alarm(); assert.equal(h.calls(),1); assert.equal(h.data.get('pending'),false);
});
test('rejects invalid, tampered, stale and future signatures', async()=>{
 const h=harness(); const good=req(); const signature=good.headers.get('sanity-webhook-signature');
 for (const request of [req(event,{signature:'invalid'}),req({...event,dataset:'evil'},{signature}),req(event,{timestamp:Date.now()-301000}),req(event,{timestamp:Date.now()+301000})]) assert.equal((await worker.fetch(request,h.env)).status,401);
 assert.equal(h.calls(),0);
});
test('fails closed on missing configuration, unsupported requests and malformed body', async()=>{
 const h=harness(); assert.equal((await worker.fetch(req(),{...h.env,GITHUB_TOKEN:''})).status,503);
 assert.equal((await worker.fetch(req(event,{method:'GET'}),h.env)).status,405);
 assert.equal((await worker.fetch(req(event,{contentType:'text/plain'}),h.env)).status,415);
 assert.equal((await worker.fetch(req('x'.repeat(16385)),h.env)).status,413);
 assert.equal((await worker.fetch(req('{'),h.env)).status,400); assert.equal(h.calls(),0);
});
test('ignores drafts, versions, foreign dataset and unknown types', async()=>{
 const h=harness(); for (const value of [{...event,after:{...event.after,_id:'drafts.project.one'}},{...event,after:{...event.after,_id:'versions.release.project.one'}},{...event,dataset:'other'},{...event,after:{...event.after,_type:'unknown'}}]) assert.equal((await worker.fetch(req(value),h.env)).status,200); assert.equal(h.calls(),0);
});
test('delete of published document dispatches and independent bursts are retryable', async()=>{
 const h=harness(); const deleted={...event,before:event.after,after:null}; assert.equal((await worker.fetch(req(deleted),h.env)).status,202); assert.equal((await worker.fetch(req(),h.env)).status,202); await h.alarm(); assert.equal(h.calls(),1);
});
test('downstream failure is retryable and is not recorded as success', async()=>{
 const h=harness(); h.fail(true); assert.equal((await worker.fetch(req(),h.env)).status,202); await h.alarm(); assert.equal(h.data.get('pending'),true); assert.ok(h.data.get('alarm')); h.fail(false); await h.alarm(); assert.equal(h.calls(),2); assert.equal(h.data.get('pending'),false);
});

test('replay and recreated object retain pending work', async()=>{
 const h=harness(); assert.equal((await worker.fetch(req(),h.env)).status,202);
 assert.equal((await worker.fetch(req(),h.env)).status,200);
 const recreated=new PublishGate(h.state,h.env,h.send); await recreated.alarm();
 assert.equal(h.calls(),1); assert.equal(h.data.get('pending'),false);
});
test('event arriving during dispatch leaves subsequent pending work', async()=>{
 const h=harness(); let release, started; const begun=new Promise(r=>started=r); const held=new Promise(r=>release=r);
 const gate=new PublishGate(h.state,h.env,async()=>{started(); await held; return new Response(null,{status:204});});
 h.env.PUBLISH_GATE.get=()=>({fetch:req=>gate.fetch(req)});
 assert.equal((await worker.fetch(req(),h.env)).status,202);
 const dispatch=gate.alarm(); await begun;
 const next=worker.fetch(req({...event,after:{...event.after,_rev:'later'}}),h.env);
 release(); await dispatch; assert.equal((await next).status,202); assert.equal(h.data.get('pending'),true); assert.ok(h.data.get('alarm'));
});

test('accepts official Sanity toolkit published signature vector', async()=>{
 // https://github.com/sanity-io/webhook-toolkit/blob/main/test/signature.test.ts
 const h=harness(); h.env.SANITY_WEBHOOK_SECRET='test'; const previous=Date.now; Date.now=()=>1633519811129;
 try {
   const request=new Request('https://example.test/',{method:'POST',headers:{'content-type':'application/json','sanity-webhook-signature':'t=1633519811129,v1=tLa470fx7qkLLEcMOcEUFuBbRSkGujyskxrNXcoh0N0'},body:'{"_id":"resume"}'});
   const result=await worker.fetch(request,h.env); assert.equal(result.status,200); assert.equal(await result.text(),'Ignored');
 } finally {Date.now=previous;}
});
