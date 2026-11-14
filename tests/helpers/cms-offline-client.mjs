// Strict test double: no real client is constructed, so no fallback network path exists.
export function offlineValidationClient() {
  const reject = () => { throw new Error('Unexpected offline client operation'); };
  const blocked = new Proxy(reject, {get: () => blocked});
  const client = new Proxy({}, {get(_target, key) {
    if (key === 'withConfig') return () => client;
    if (key === 'config') return () => ({projectId:'testonly', dataset:'test', apiVersion:'2025-02-19', useCdn:false});
    if (key === 'fetch') return async (_query, _params, options) => {
      if (options?.tag === 'validation.slug-is-unique') return true;
      if (options?.tag === 'validation.asset-accept') return null;
      throw new Error('Unexpected offline client operation');
    };
    return blocked;
  }});
  return client;
}
