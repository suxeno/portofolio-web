// Server-only projection to the existing project slider. Never falls back to local records.
import {safeLink} from './schema.mjs';
import {image} from './writing-adapter.mjs';
export function adaptProjects(records, config) {
  return records.filter(item => item._type === 'project' && !item._id.startsWith('drafts.') && item.visible !== false)
    .map(item => {
      if (typeof item.title !== 'string' || !item.title.trim() || item.title.length > 400) throw new Error('Invalid project title');
      if (typeof item.description !== 'string' || !item.description.trim() || item.description.length > 4000) throw new Error('Invalid project description');
      const href = item.repository || item.links?.[0]?.url;
      if (safeLink(href) !== true) throw new Error('Invalid project link');
      if (item.order != null && !Number.isSafeInteger(item.order)) throw new Error('Invalid project order');
      const cover = item.cover ? image(item.cover, config) : null;
      return {title:item.title, detail:item.description, href, cover:cover ? {url:cover.url,alt:cover.alt,width:cover.width,height:cover.height} : null, order:item.order ?? 0, id:item._id};
    }).sort((a,b) => a.order-b.order || a.id.localeCompare(b.id));
}
