// A baseline is a one-time snapshot: identity drift requires an explicit reviewed mapping change.
export function checkFrozenIds(documents, frozen) {
 const ids = documents.map(doc => doc._id).sort();
 if (!Array.isArray(frozen) || JSON.stringify(ids) !== JSON.stringify([...frozen].sort())) throw new Error('Baseline identity changed; review the frozen ID mapping before generating seed');
}
