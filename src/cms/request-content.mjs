// Server-only, request-scoped projection. Call once per request; do not retain the
// result in a module singleton. This module does not implement response caching.
import {loadPublishedSnapshot} from './snapshot.mjs';
import {adaptWriting} from './writing-adapter.mjs';
import {adaptSite} from './site-adapter.mjs';
import {adaptProjects} from './projects-adapter.mjs';
import {adaptCareer} from './career-adapter.mjs';
import {adaptCollections} from './tools-certificates-adapter.mjs';

const siteOrigin = 'https://portofolio.arvinantobahtiar.workers.dev';

export async function loadRequestContent(config, {transport = fetch, timeoutMs = 5000} = {}) {
  const records = await loadPublishedSnapshot(config, (url, options) => {
    const cdn = new URL(url);
    cdn.hostname = `${config.projectId}.apicdn.sanity.io`;
    return transport(cdn.toString(), {...options, signal: AbortSignal.timeout(timeoutMs)});
  });
  return {
    writing: adaptWriting(records, config),
    site: adaptSite(records, {...config, siteOrigin}),
    projects: adaptProjects(records, config),
    career: adaptCareer(records),
    collections: adaptCollections(records, config),
  };
}
