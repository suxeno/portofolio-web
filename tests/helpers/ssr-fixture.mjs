import {mkdtempSync, readdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Miniflare, convertV4MiniflareOptions} from 'miniflare';

const root = fileURLToPath(new URL('../../', import.meta.url));

// Each test process owns its output and runtime; never touches dist or the preview.
export async function createSsrFixture({root: projectRoot = root, cms, outbound} = {}) {
  if (cms && (cms.projectId !== 'synthetic' || cms.dataset !== 'test' || typeof outbound !== 'function')) throw new Error('Only synthetic/test CMS with an explicit mocked transport is allowed');
  if (!cms && outbound) throw new Error('Outbound transport requires synthetic CMS');
  const dir = mkdtempSync(join(tmpdir(), 'portfolio-ssr-test-'));
  let runtime;
  try {
    // Astro/Cloudflare prerender uses a fixed inspector port and shared intermediate
    // state, so serialize builds across parallel node:test worker processes.
    const build = spawnSync('flock', [join(tmpdir(), 'portfolio-ssr-build.lock'), resolve(projectRoot, 'node_modules/.bin/astro'), 'build', '--outDir', dir], {
      cwd: projectRoot, encoding: 'utf8', timeout: 150000,
      env: {...process.env, SANITY_PROJECT_ID: cms?.projectId || '', SANITY_DATASET: cms?.dataset || ''},
    });
    if (build.status !== 0) throw new Error(`SSR fixture build failed: ${build.error || ''}\n${build.stdout}\n${build.stderr}`);
    const server = join(dir, 'server');
    const paths = ['entry.mjs', 'virtual_astro_middleware.mjs', ...readdirSync(join(server, 'chunks')).filter(x => x.endsWith('.mjs')).map(x => `chunks/${x}`)];
    const options = convertV4MiniflareOptions({
      modules: paths.map(path => ({type: 'ESModule', path: join(server, path)})),
      modulesRoot: server, compatibilityDate: '2026-10-28',
      assets: {directory: join(dir, 'client'), binding: 'ASSETS'},
      outboundService: async request => {
        const url = new URL(request.url);
        if (!cms || url.origin !== 'https://synthetic.apicdn.sanity.io' || url.pathname !== '/v2025-02-19/data/query/test') throw new Error(`Unexpected fixture outbound request: ${url.origin}${url.pathname}`);
        return outbound(request);
      },
    });
    options.workers[0].config.assets.hasUserWorker = true;
    options.workers[0].config.assets.runWorkerFirst = true;
    runtime = new Miniflare(options);
    const url = (await runtime.ready).origin;
    return {
      url,
      fetch: (path, init) => runtime.dispatchFetch(new URL(path, 'http://localhost').href, init),
      async html(path) {
        const response = await runtime.dispatchFetch(new URL(path, 'http://localhost').href);
        if (response.status !== 200) throw new Error(`${path} returned ${response.status}: ${await response.text()}`);
        return response.text();
      },
      async dispose() { try { await runtime.dispose(); } finally { rmSync(dir, {recursive: true, force: true}); } },
    };
  } catch (error) {
    try { if (runtime) await runtime.dispose(); } finally { rmSync(dir, {recursive: true, force: true}); }
    throw error;
  }
}
