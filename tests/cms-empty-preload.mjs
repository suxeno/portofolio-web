// TEST ONLY: an isolated synthetic published snapshot with no visible writings.
import {baselineSeed} from './helpers/baseline-seed.mjs';
const docs = baselineSeed().map(doc => doc._type === 'writing' ? {...doc, visible: false} : doc);
docs.push({_id:'drafts.test-hidden', _type:'writing', title:'TEST DRAFT MUST NOT APPEAR'});
globalThis.fetch = async url => {
  if (!String(url).startsWith('https://synthetic.api.sanity.io/')) throw new Error(`Unexpected test network request: ${url}`);
  return new Response(JSON.stringify({result:docs}), {status:200, headers:{'content-type':'application/json'}});
};
