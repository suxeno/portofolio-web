export function cmsConfig(env) {
  const projectId = env.SANITY_PROJECT_ID?.trim();
  const dataset = env.SANITY_DATASET?.trim();
  if (!projectId && !dataset) return null;
  if (!projectId || !dataset) throw new Error('Both SANITY_PROJECT_ID and SANITY_DATASET are required');
  if (!/^[a-z0-9-]+$/.test(projectId) || !/^[a-z0-9_-]+$/.test(dataset)) throw new Error('Invalid Sanity project ID or dataset');
  return {projectId, dataset};
}
