// Gate cache before lookup, not merely when generating a response.
export function cacheEligible(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.search || !/^\/(?:writing\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)?)?$/.test(url.pathname)) return false;
  return !['cookie', 'authorization', 'cache-control', 'pragma', 'range', 'if-none-match', 'if-modified-since'].some(header => request.headers.has(header));
}
