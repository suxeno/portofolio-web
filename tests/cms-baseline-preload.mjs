import {baselineSeed} from './helpers/baseline-seed.mjs';
// TEST ONLY: strictly mocked public snapshot, never connects to a Sanity project.
import {readFileSync} from 'node:fs';
const docs=baselineSeed();
globalThis.fetch=async url=>{
 if (!String(url).startsWith('https://synthetic.api.sanity.io/')) throw new Error(`Unexpected test network request: ${url}`);
 return new Response(JSON.stringify({result:docs}),{status:200,headers:{'content-type':'application/json'}});
};
