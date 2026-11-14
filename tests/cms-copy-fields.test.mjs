import test from 'node:test';
import assert from 'node:assert/strict';
import {schemaTypes} from '../src/cms/schema.mjs';
test('site settings expose existing wordmark, footer and writing interface copy', () => {
  const site = schemaTypes.find(x => x.name === 'siteSettings');
  const fields = new Set(site.fields.map(x => x.name));
  for (const field of ['wordmark','footerNavigation','footerBackToTop','writingUi']) assert.ok(fields.has(field), field);
  const ui = site.fields.find(x => x.name === 'writingUi');
  const uiFields = new Set(ui.fields.map(x => x.name));
  for (const field of ['archiveTitle','backToPortfolio','backToWritings','sampleDraft','dummyCover','readArticle','seeAllWritings','titleSuffix']) assert.ok(uiFields.has(field), field);
});
