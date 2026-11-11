/** Dated records newest first; undated records retain their source order. */
export function orderedWriting(records) {
  const time = value => { const n = value ? Date.parse(value) : NaN; return Number.isFinite(n) ? n : -Infinity; };
  return records.map((item, index) => ({ item, index, date: time(item.publishedAt) }))
    .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : a.index - b.index))
    .map(({ item }) => item);
}
export function latestWriting(records) { return orderedWriting(records).slice(0, 3); }
