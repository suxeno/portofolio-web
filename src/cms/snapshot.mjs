// Server-only published snapshot transport; validation is still incomplete.
// Never accept a token here: only public published data is supported.
import {safeLink, validYearMonth, validDateRange} from './schema.mjs';

function validateFields(value) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { value.forEach(validateFields); return; }
  if (value._type === 'image' && (!value.asset?._ref || typeof value.alt !== 'string' || !value.alt.trim())) throw new Error('Image requires asset reference and alt text');
  for (const [key, child] of Object.entries(value)) {
    if (['href', 'url', 'repository', 'verificationUrl'].includes(key) && child != null && child !== '' && safeLink(child) !== true) throw new Error(`Unsafe ${key}`);
    if (['startDate', 'endDate', 'date', 'expiry'].includes(key) && child != null && child !== '' && validYearMonth(child) !== true) throw new Error(`Invalid ${key}`);
    validateFields(child);
  }
}

const types = ['siteSettings', 'profile', 'writing', 'project', 'experience', 'achievement', 'tool', 'certificate'];
const query = `*[_type in ${JSON.stringify(types)} && !(_id in path("drafts.**"))]`;

export async function loadPublishedSnapshot(config, transport = fetch) {
  if (!config || !/^[a-z0-9-]+$/.test(config.projectId) || !/^[a-z0-9_-]+$/.test(config.dataset)) throw new Error('Invalid Sanity configuration');
  const url = new URL(`https://${config.projectId}.api.sanity.io/v2025-02-19/data/query/${config.dataset}`);
  url.searchParams.set('query', query);
  url.searchParams.set('perspective', 'published');
  const response = await transport(url.toString(), {headers: {accept: 'application/json'}});
  if (!response.ok) throw new Error(`Sanity snapshot request failed (${response.status})`);
  const payload = await response.json();
  if (!Array.isArray(payload.result)) throw new Error('Invalid Sanity snapshot response');
  const records = payload.result.filter(record => typeof record?._id === 'string' && !record._id.startsWith('drafts.'));
  if (records.length !== payload.result.filter(record => !record?._id?.startsWith?.('drafts.')).length) throw new Error('Invalid document ID');
  const ids = new Set();
  const slugs = new Set();
  for (const record of records) {
    if (!record._id || !types.includes(record._type) || ids.has(record._id)) throw new Error('Invalid or duplicate document');
    ids.add(record._id);
    validateFields(record);
    if (record._type === 'experience' && validDateRange(record) !== true) throw new Error('Invalid date range');
    if (record._type === 'tool' && (!Number.isInteger(record.row) || record.row < 1 || record.row > 3)) throw new Error('Invalid tool row');
    if (record._type === 'writing') {
      const slug = record.slug?.current;
      if (typeof record.title !== 'string' || !record.title.trim() || typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slugs.has(slug)) throw new Error('Invalid or duplicate writing slug/title');
      slugs.add(slug);
    }
  }
  return records;
}
