// Transport must implement an atomic create-if-absent operation, never upsert.
// This module does not create a real client or load credentials.
export async function createMissing(documents, transport) {
  if (!Array.isArray(documents) || typeof transport?.createIfNotExists !== 'function') throw new Error('Invalid seed or transport');
  const ids = new Set();
  for (const doc of documents) {
    if (typeof doc?._id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(doc._id) || doc._id.startsWith('drafts.') || ids.has(doc._id)) throw new Error('Invalid or duplicate seed ID');
    ids.add(doc._id);
  }
  for (const doc of documents) await transport.createIfNotExists(doc);
}
