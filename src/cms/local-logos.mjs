// Trusted code-managed SVGs only; never interpolate an unvalidated path.
export const localLogoIds = Object.freeze(['python','apacheairflow','googlebigquery','clickhouse','mysql','docker','linux','googlecloud','grafana','prometheus','metabase','javascript','tensorflow','scikitlearn','flask','r','cplusplus','kotlin']);
export function validToolLogo(record) {
 const local = record?.localLogo;
 const uploaded = record?.logo;
 if (Boolean(local) === Boolean(uploaded)) return 'Choose exactly one curated logo or uploaded image';
 if (local && !localLogoIds.includes(local)) return 'Choose a supported curated logo';
 return true;
}
