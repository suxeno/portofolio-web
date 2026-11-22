// Server-only projection: reject incomplete or unsafe published configuration.
import {safeLink, validEmail} from './schema.mjs';
import {image} from './writing-adapter.mjs';
const text = (value, name) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 4000) throw new Error(`Invalid ${name}`);
  return value;
};
const singleton = (records, type) => {
  const matches = records.filter(r => r._type === type);
  if (matches.length !== 1) throw new Error(`Expected one published ${type}`);
  return matches[0];
};
export function links(value, name) {
  if (!Array.isArray(value) || value.length > 20) throw new Error(`Invalid ${name}`);
  return value.map(link => {
    const label = text(link.label, name);
    if (safeLink(link.url) !== true) throw new Error(`Invalid ${name} URL`);
    if (link.url.startsWith('#') && !['#top','#writing','#projects','#tools','#experience','#achievements','#certificates','#contact'].includes(link.url)) throw new Error(`Invalid ${name} anchor`);
    return {label, url:link.url};
  });
}
const sectionDefaults = ['writing','projects','tools','experience','achievements','certificates','contact'];
export function adaptSections(input = []) {
  if (!Array.isArray(input)) throw new Error('Invalid sections');
  const byId = new Map();
  for (const section of input) {
    if (!section || !sectionDefaults.includes(section.id) || byId.has(section.id)) throw new Error('Unknown or duplicate section');
    if (section.order != null && !Number.isSafeInteger(section.order)) throw new Error('Invalid section order');
    if (section.visible != null && typeof section.visible !== 'boolean') throw new Error('Invalid section visibility');
    if (section.heading != null) text(section.heading, 'section heading');
    if (section.intro != null && section.intro !== '') text(section.intro, 'section intro'); // Reserved data, not rendered.
    byId.set(section.id, section);
  }
  const result = sectionDefaults.map((id, index) => ({id, visible:byId.get(id)?.visible !== false, heading:byId.get(id)?.heading, order:byId.get(id)?.order ?? index, index})).sort((a,b) => a.order-b.order || a.index-b.index);
  if (!result.some(section => section.visible)) throw new Error('All sections hidden');
  return result;
}
export function adaptSite(records, config = {}) {
  const s = singleton(records, 'siteSettings'), p = singleton(records, 'profile');
  const sections = adaptSections(s.sections);
  const visible = new Set(sections.filter(section => section.visible).map(section => `#${section.id}`));
  const filterHidden = list => list.filter(link => {
    let fragment = link.url.startsWith('/#') ? link.url.slice(1) : link.url;
    if (config.siteOrigin && /^https?:/i.test(link.url)) {
      const url = new URL(link.url);
      if (url.origin === config.siteOrigin && url.pathname === '/' && !url.search) fragment = url.hash;
    }
    return !fragment.startsWith('#') || fragment === '#top' || visible.has(fragment);
  });
  const writingUi = {};
  for (const key of ['archiveTitle','backToPortfolio','backToWritings','sampleDraft','dummyCover','readArticle','seeAllWritings','titleSuffix']) writingUi[key] = text(s.writingUi?.[key], `writingUi.${key}`);

  if (validEmail(p.email) !== true) throw new Error('Invalid profile email');
  const title = text(s.title,'site title'), description = text(s.description,'site description');
  if (title.length > 200 || description.length > 500) throw new Error('Invalid site SEO length');
  const socialImage = s.socialImage ? image(s.socialImage, config) : null;
  return {settings:{title,description,socialImage,wordmark:text(s.wordmark,'wordmark'),sections,navigation:filterHidden(links(s.navigation,'navigation')),footerNavigation:filterHidden(links(s.footerNavigation,'footer navigation')),footerBackToTop:text(s.footerBackToTop,'footer back to top'),contactQuestion:text(s.contactQuestion,'contact question'),contactAction:text(s.contactAction,'contact action'),terminalReadme:text(s.terminalReadme,'terminal README'),writingUi},profile:{displayName:text(p.displayName,'profile displayName'),expertiseLine:text(p.expertiseLine,'profile expertiseLine'),biography:text(p.biography,'profile biography'),email:p.email,links:filterHidden(links(p.links,'profile links'))}};
}
