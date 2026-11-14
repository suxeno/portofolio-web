import {defineConfig} from 'sanity';
import {structureTool} from 'sanity/structure';
import {schemaTypes} from './src/cms/schema.mjs';

export default defineConfig({
  name: 'portfolio', title: 'Portfolio Studio',
  projectId: __SANITY_PROJECT_ID__, dataset: __SANITY_DATASET__,
  plugins: [structureTool()], schema: {types: schemaTypes},
});
