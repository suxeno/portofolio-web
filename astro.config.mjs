import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import vue from '@astrojs/vue';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sanity from '@sanity/astro';
import { cmsConfig } from './src/cms/config.mjs';

const cms = cmsConfig({...loadEnv(process.env.NODE_ENV || 'development', process.cwd(), ''), ...process.env});
const setupRoute = {name: 'cms-setup-route', hooks: {'astro:config:setup': ({injectRoute}) => injectRoute({pattern: '/admin', entrypoint: './src/cms/setup.astro', prerender: true})}};
export default defineConfig({
  output: 'server',
  // No sessions or runtime image transformation are used by this site.
  session: false,
  adapter: cloudflare({imageService: 'passthrough'}),
  integrations: [vue(), ...(cms ? [react(), sanity({...cms, useCdn: false, studioBasePath: '/admin', studioRouterHistory: 'hash'})] : [setupRoute])],
  vite: {define: {'__SANITY_PROJECT_ID__': JSON.stringify(cms?.projectId || ''), '__SANITY_DATASET__': JSON.stringify(cms?.dataset || '')}},
});
