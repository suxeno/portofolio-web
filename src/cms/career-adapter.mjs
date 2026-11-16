// Server-only projection to the existing career and achievement layouts.
import {safeLink, validDateRange, validYearMonth} from './schema.mjs';

function text(value, name, max = 400) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Invalid ${name}`);
  return value;
}
function order(record) {
  if (record.order != null && !Number.isSafeInteger(record.order)) throw new Error('Invalid career order');
  return record.order ?? 0;
}
export function adaptCareer(records) {
  const select = type => records.filter(record => record._type === type && typeof record._id === 'string' && !record._id.startsWith('drafts.') && record.visible !== false)
    .map(record => ({record, order:order(record)}))
    .sort((a,b) => a.order-b.order || a.record._id.localeCompare(b.record._id));
  const experience = select('experience').map(({record}) => {
    if (validYearMonth(record.startDate) !== true || validYearMonth(record.endDate) !== true || validDateRange(record) !== true) throw new Error('Invalid experience date range');
    return {title:text(record.role, 'experience role'), organization:text(record.organization, 'experience organization'), date:text(record.displayDate, 'experience display date')};
  });
  const achievements = select('achievement').map(({record}) => {
    if (validYearMonth(record.date) !== true) throw new Error('Invalid achievement date');
    const title = text(record.title, 'achievement statement', 1000);
    const href = Array.isArray(record.links) ? record.links[0]?.url : undefined;
    return safeLink(href) === true ? {title, href} : title;
  });
  return {experience, achievements};
}
