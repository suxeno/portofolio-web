// Separate Worker. The webhook projection and activation requirements are in README.md.
const MAX_BYTES = 16384;
const FRESH_MS = 5 * 60 * 1000;
const COOLDOWN_MS = 15000;
const TYPES = new Set(['siteSettings','profile','writing','project','experience','achievement','tool','certificate']);
const text = new TextEncoder();
const response = (status, message) => new Response(message, {status, headers:{'cache-control':'no-store','content-type':'text/plain; charset=utf-8'}});

function configured(env) {
  return typeof env.SANITY_WEBHOOK_SECRET === 'string' && env.SANITY_WEBHOOK_SECRET.length > 0 &&
    typeof env.GITHUB_TOKEN === 'string' && env.GITHUB_TOKEN.length > 0 &&
    /^[A-Za-z0-9-]+$/.test(env.GITHUB_OWNER || '') && /^[A-Za-z0-9_.-]+$/.test(env.GITHUB_REPO || '') &&
    /^[A-Za-z0-9_.-]+\.ya?ml$/.test(env.GITHUB_WORKFLOW || '') && /^[A-Za-z0-9_./-]+$/.test(env.GITHUB_REF || '') &&
    /^[a-z0-9-]+$/.test(env.SANITY_PROJECT_ID || '') && /^[a-z0-9_-]+$/.test(env.SANITY_DATASET || '') && !!env.PUBLISH_GATE;
}
async function boundedBody(request) {
  const reader = request.body?.getReader(); if (!reader) return null;
  let length = 0; const chunks = [];
  while (true) { const {done,value} = await reader.read(); if (done) break; length += value.length; if (length > MAX_BYTES) { await reader.cancel(); return null; } chunks.push(value); }
  const result = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { result.set(chunk,offset); offset += chunk.length; } return result;
}
async function verify(bytes, header, secret) {
  const match = /^t=(\d{13}),v1=([A-Za-z0-9_-]{43})$/.exec(header || '');
  if (!match || Math.abs(Date.now() - Number(match[1])) > FRESH_MS) return false;
  const key = await crypto.subtle.importKey('raw',text.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const b64 = match[2].replace(/-/g,'+').replace(/_/g,'/') + '=';
  const sig = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const prefix = text.encode(`${match[1]}.`); const input = new Uint8Array(prefix.length + bytes.length); input.set(prefix); input.set(bytes,prefix.length);
  return crypto.subtle.verify('HMAC',key,sig,input);
}
function relevant(event, env) {
  if (!event || typeof event !== 'object' || event.projectId !== env.SANITY_PROJECT_ID || event.dataset !== env.SANITY_DATASET) return false;
  const before = event.before, after = event.after;
  if ((!before && !after) || (before != null && typeof before !== 'object') || (after != null && typeof after !== 'object')) return false;
  const doc = after || before;
  if (typeof doc._id !== 'string' || !/^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,127}$/.test(doc._id) || /^(drafts|versions)\./.test(doc._id) || !TYPES.has(doc._type) || typeof doc._rev !== 'string' || !doc._rev) return false;
  if (before && after && (before._id !== after._id || before._type !== after._type)) return false;
  return true;
}
export default {
  async fetch(request, env) {
    if (!configured(env)) return response(503,'Not configured');
    if (request.method !== 'POST') return response(405,'Method not allowed');
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') || '')) return response(415,'JSON required');
    const declared = request.headers.get('content-length'); if (declared && (!/^\d+$/.test(declared) || Number(declared)>MAX_BYTES)) return response(413,'Too large');
    const bytes = await boundedBody(request); if (!bytes) return response(413,'Too large');
    if (!await verify(bytes, request.headers.get('sanity-webhook-signature'), env.SANITY_WEBHOOK_SECRET)) return response(401,'Invalid signature');
    let event; try { event = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)); } catch { return response(400,'Invalid JSON'); }
    if (!relevant(event,env)) return response(200,'Ignored');
    const hash = await crypto.subtle.digest('SHA-256',bytes);
    const id = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2,'0')).join('');
    try { return await env.PUBLISH_GATE.get(env.PUBLISH_GATE.idFromName('publish')).fetch(new Request('https://internal.invalid/',{method:'POST',body:JSON.stringify({id})})); }
    catch { return response(503,'Gate unavailable'); }
  }
};

// One durable generation coalesces all accepted events; the alarm survives restarts.
export class PublishGate {
  constructor(state, env, send = fetch) { this.state=state; this.env=env; this.send=send; }
  async fetch(request) {
    return this.state.blockConcurrencyWhile(async () => {
      try {
        const {id} = await request.json(); if (!/^[0-9a-f]{64}$/.test(id)) return response(400,'Invalid event');
        const now = Date.now();
        return await this.state.storage.transaction(async tx => {
          const events = Object.fromEntries(Object.entries(await tx.get('events') || {}).filter(([,v]) => Number.isFinite(v) && now-v < 2*FRESH_MS));
          if (events[id]) return response(200,'Already accepted');
          if (Object.keys(events).length >= 1000) return response(503,'Receipt capacity reached');
          events[id]=now;
          await tx.put('events',events);
          await tx.put('pending',true);
          if (!await tx.getAlarm()) await tx.setAlarm(now + COOLDOWN_MS);
          return response(202,'Queued');
        });
      } catch { return response(503,'Gate unavailable'); }
    });
  }
  async alarm() {
    return this.state.blockConcurrencyWhile(async () => {
      if (!await this.state.storage.get('pending')) return;
      // Set the next alarm before outbound I/O: even an interrupted dispatch remains pending.
      const attempts = (await this.state.storage.get('attempts') || 0) + 1;
      await this.state.storage.transaction(async tx => {
        await tx.put('attempts',attempts);
        await tx.setAlarm(Date.now() + Math.min(3600000, 15000 * 2 ** Math.min(attempts,8)));
      });
      try {
        const {GITHUB_OWNER:o,GITHUB_REPO:r,GITHUB_WORKFLOW:w,GITHUB_REF:ref,GITHUB_TOKEN:token} = this.env;
        const send = this.send;
        const result = await send(`https://api.github.com/repos/${o}/${r}/actions/workflows/${w}/dispatches`,{method:'POST',headers:{'authorization':`Bearer ${token}`,'accept':'application/vnd.github+json','content-type':'application/json','user-agent':'cms-publish-worker','x-github-api-version':'2022-11-28'},body:JSON.stringify({ref,inputs:{'cms-publish':'true'}}),signal:AbortSignal.timeout(10000)});
        if (result.status !== 204) return;
        await this.state.storage.transaction(async tx => {
          await tx.put('pending',false); await tx.put('attempts',0); await tx.put('lastDispatch',Date.now()); await tx.deleteAlarm();
        });
      } catch (error) { console.error('Publish dispatch failed:', error?.name); /* Retry remains durable. */ }
    });
  }
}
