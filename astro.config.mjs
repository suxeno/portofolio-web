import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import vue from '@astrojs/vue';
import react from '@astrojs/react';
import sanity from '@sanity/astro';
import { cmsConfig } from './src/cms/config.mjs';
import { loadPublishedSnapshot } from './src/cms/snapshot.mjs';
import { adaptWriting } from './src/cms/writing-adapter.mjs';
import { adaptSite } from './src/cms/site-adapter.mjs';
import { adaptProjects } from './src/cms/projects-adapter.mjs';
import { adaptCareer } from './src/cms/career-adapter.mjs';
import { adaptCollections } from './src/cms/tools-certificates-adapter.mjs';

const cms = cmsConfig({...loadEnv(process.env.NODE_ENV || 'development', process.cwd(), ''), ...process.env});
// Canonical public origin; never infer trust from an editor-provided link.
const siteOrigin = 'https://portofolio.arvinantobahtiar.workers.dev';
let writingSnapshot;
const writingPlugin = {
  name: 'cms-writing-snapshot',
  resolveId(id) { if (['virtual:cms-writing','virtual:cms-site','virtual:cms-projects','virtual:cms-career','virtual:cms-collections'].includes(id)) return '\0' + id; },
  async load(id) {
    if (!['\0virtual:cms-writing', '\0virtual:cms-site', '\0virtual:cms-projects', '\0virtual:cms-career', '\0virtual:cms-collections'].includes(id)) return;
    if (!cms) return 'export default null';
    writingSnapshot ??= loadPublishedSnapshot(cms).then(records => {
      const items = adaptWriting(records, cms);
      return {writing: items, site: adaptSite(records, {...cms, siteOrigin}), projects: adaptProjects(records, cms), career: adaptCareer(records), collections: adaptCollections(records, cms)};
    });
    const snapshot = await writingSnapshot;
    return `export default ${JSON.stringify(id === '\0virtual:cms-writing' ? snapshot.writing : id === '\0virtual:cms-site' ? snapshot.site : id === '\0virtual:cms-career' ? snapshot.career : id === '\0virtual:cms-collections' ? snapshot.collections : snapshot.projects)}`;
  },
};
const setupRoute = {name: 'cms-setup-route', hooks: {'astro:config:setup': ({injectRoute}) => injectRoute({pattern: '/admin', entrypoint: './src/cms/setup.astro', prerender: true})}};
export default defineConfig({
  output: 'static',
  integrations: [vue(), ...(cms ? [react(), sanity({...cms, useCdn: false, studioBasePath: '/admin', studioRouterHistory: 'hash'})] : [setupRoute])],
  vite: {plugins: [writingPlugin], define: {'__SANITY_PROJECT_ID__': JSON.stringify(cms?.projectId || ''), '__SANITY_DATASET__': JSON.stringify(cms?.dataset || '')}},
});
