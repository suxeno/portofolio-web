// Build-only conversion. Sanity asset references are identifiers, never arbitrary URLs.
import {renderPortableText} from './portable-text.mjs';

export function image(value, config) {
  const match = /^image-([a-f0-9]+)-(\d{1,5})x(\d{1,5})-(jpg|jpeg|png|webp|gif|avif)$/.exec(value?.asset?._ref || '');
  if (!match || typeof value.alt !== 'string' || !value.alt.trim()) throw new Error('Invalid writing image asset or alt');
  const [,id,w,h,ext] = match;
  const width=Number(w), height=Number(h);
  if (!width || !height) throw new Error('Invalid image dimensions');
  return {...value, url:`https://cdn.sanity.io/images/${config.projectId}/${config.dataset}/${id}-${w}x${h}.${ext}`,width,height};
}
export function adaptWriting(records, config) {
  return records.filter(item => item._type === 'writing' && !item._id.startsWith('drafts.') && item.visible !== false)
    .map(item => {
      if (!Array.isArray(item.body)) throw new Error('Writing body must be an array');
      const body = item.body.map(block => block._type === 'bodyImage' ? image(block, config) : block);
      renderPortableText(body); // Fail build for malformed or unsupported content before emitting pages.
      if (item.publishedAt != null && (typeof item.publishedAt !== 'string' || !Number.isFinite(Date.parse(item.publishedAt)))) throw new Error('Invalid writing date');
      const seo = item.seo || {};
      for (const [key, max] of [['title',200],['description',500]]) if (seo[key] != null && (typeof seo[key] !== 'string' || seo[key].length > max)) throw new Error(`Invalid writing SEO ${key}`);
      return {title:item.title,slug:item.slug.current,excerpt:item.excerpt || '',publishedAt:item.publishedAt || null,cover:item.cover ? image(item.cover, config) : null,body, order:item.order ?? 0, seo:{title:seo.title?.trim() ? seo.title : undefined,description:seo.description?.trim() ? seo.description : undefined,socialImage:seo.socialImage ? image(seo.socialImage,config) : null}};
    }).sort((a,b) => a.order-b.order);
}
