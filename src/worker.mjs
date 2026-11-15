import {WorkerEntrypoint} from 'cloudflare:workers';
import {handle} from '@astrojs/cloudflare/handler';
import {cacheEligible} from './cms/cache-policy.mjs';

// Only the inner entrypoint is cached. The gateway must run before every lookup
// so cookies, authorization and noncanonical URLs can never hit shared cache.
export class CachedPage extends WorkerEntrypoint {
  async fetch(request) {
    const response = await handle(request, this.env, this.ctx);
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store');
    if (response.status === 200 && !headers.has('set-cookie') && (headers.get('content-type') || '').startsWith('text/html')) {
      headers.set('Cache-Control', 'public, max-age=0');
      headers.set('CDN-Cache-Control', 'public, max-age=60');
      // Public, non-secret identity of this inner render, for cache verification.
      headers.set('X-Portfolio-Render', crypto.randomUUID());
    } else headers.delete('CDN-Cache-Control');
    return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
  }
}

export default {
  async fetch(request, env, ctx) {
    if (cacheEligible(request)) return ctx.exports.CachedPage.fetch(request);
    const response = await handle(request, env, ctx);
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store');
    headers.delete('CDN-Cache-Control');
    return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
  },
};
