// Fail closed before invoking Wrangler: deploy only a freshly sealed SSR build.
import {createHash} from 'node:crypto';
import {existsSync, lstatSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const marker = '.production-artifact.json';
function fail(message) { throw new Error(`Invalid SSR artifact: ${message}`); }
function hashTree(root) {
  const hash = createHash('sha256');
  function walk(dir) {
    for (const name of readdirSync(dir).sort()) {
      if (dir === root && name === marker) continue;
      const path = join(dir, name), stat = lstatSync(path);
      if (stat.isSymbolicLink()) fail('symlink in output');
      if (stat.isDirectory()) walk(path);
      else if (stat.isFile()) { hash.update(relative(root, path)); hash.update('\0'); hash.update(readFileSync(path)); hash.update('\0'); }
      else fail('unexpected output entry');
    }
  }
  walk(root); return hash.digest('hex');
}
export function validateArtifact(root = 'dist', {seal = false} = {}) {
  root = resolve(root);
  const configPath = join(root, 'server/wrangler.json');
  if (!existsSync(configPath)) fail('generated Wrangler config missing');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const allowedKeys = new Set(['configPath','userConfigPath','topLevelName','definedEnvironments','compatibility_date','compatibility_flags','jsx_factory','jsx_fragment','rules','name','main','triggers','assets','vars','durable_objects','workflows','migrations','exports','kv_namespaces','cloudchamber','send_email','queues','connect','r2_buckets','d1_databases','vectorize','ai_search_namespaces','ai_search','agent_memory','hyperdrive','services','analytics_engine_datasets','dispatch_namespaces','mtls_certificates','pipelines','k2','secrets_store_secrets','artifacts','unsafe_hello_world','flagship','worker_loaders','ratelimits','vpc_services','vpc_networks','logfwdr','upload_source_maps','cache','python_modules','previews','dev','no_bundle']);
  for (const key of Object.keys(config)) if (!allowedKeys.has(key)) fail(`unexpected config key ${key}`);
  if (config.name !== 'portofolio' || config.main !== 'entry.mjs' || config.compatibility_date !== '2026-10-28' || config.assets?.binding !== 'ASSETS' || config.assets?.directory !== '../client' || config.no_bundle !== true) fail('entry, worker name or client assets mismatch');
  if (config.cache?.enabled !== true || config.exports?.default?.cache?.enabled !== false || config.exports?.CachedPage?.type !== 'worker' || config.exports?.CachedPage?.cache?.enabled !== true) fail('cache exports mismatch');
  const emptyArrays = ['kv_namespaces','workflows','migrations','send_email','connect','r2_buckets','d1_databases','vectorize','ai_search_namespaces','agent_memory','hyperdrive','services','analytics_engine_datasets','dispatch_namespaces','mtls_certificates','pipelines','k2','secrets_store_secrets','artifacts','unsafe_hello_world','flagship','worker_loaders','ratelimits','vpc_services','vpc_networks'];
  for (const key of emptyArrays) if (!Array.isArray(config[key]) || config[key].length) fail(`unexpected ${key}`);
  for (const value of [config.durable_objects?.bindings, config.queues?.producers, config.queues?.consumers, config.logfwdr?.bindings]) if (!Array.isArray(value) || value.length) fail('unexpected bindings');
  if (Object.keys(config.vars || {}).length || config.images || config.browser || config.assets?.run_worker_first) fail('unexpected resource or settings');
  const entry = join(dirname(configPath), config.main), client = resolve(dirname(configPath), config.assets.directory);
  if (!existsSync(entry) || !existsSync(join(client, 'admin/index.html')) || !existsSync(join(client, '_astro')) || !existsSync(join(client, 'logos/python.svg'))) fail('server entry or public assets missing');
  const code = readFileSync(entry, 'utf8');
  if (!/export\s*\{[^}]*CachedPage[^}]*default\s*\}/s.test(code) || !code.includes('ctx.exports.CachedPage.fetch')) fail('custom worker exports missing');
  if (existsSync(join(client, 'server')) || existsSync(join(client, '.dev.vars'))) fail('server files exposed as assets');
  const digest = hashTree(root);
  if (seal) writeFileSync(join(root, marker), JSON.stringify({version:1, sha256:digest}) + '\n');
  else {
    if (!existsSync(join(root, marker))) fail('production build seal missing');
    const stored = JSON.parse(readFileSync(join(root, marker), 'utf8'));
    if (stored.version !== 1 || stored.sha256 !== digest) fail('production build seal mismatch');
  }
  return configPath;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(`Validated SSR artifact: ${validateArtifact(process.argv[2])}`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
