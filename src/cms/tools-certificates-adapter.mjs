// Build-only projections; output contains only public validated display data.
import {image} from './writing-adapter.mjs';
import {safeLink, validYearMonth} from './schema.mjs';
import {validToolLogo} from './local-logos.mjs';
const text=(v,n,max=400)=>{if(typeof v!=='string'||!v.trim()||v.length>max) throw new Error(`Invalid ${n}`); return v;};
const media=(v,config)=>{const {url,alt,width,height}=image(v,config); return {src:url,alt,width,height};};
export const pdfAssetId = value => /^file-([a-zA-Z0-9_]{24,40})-pdf$/.exec(value?.asset?._ref || '')?.[1];
export function adaptCollections(records,config) {
 const selected=type=>records.filter(r=>r._type===type && typeof r._id==='string' && !r._id.startsWith('drafts.') && r.visible!==false).map(r=>{
  if(r.order!=null && !Number.isSafeInteger(r.order)) throw new Error('Invalid collection order');
  return r;
 }).sort((a,b)=>(a.order??0)-(b.order??0)||a._id.localeCompare(b._id));
 const rows=[[],[],[]];
 for(const r of selected('tool')) {
  if(!Number.isInteger(r.row)||r.row<1||r.row>3) throw new Error('Invalid tool row');
  if(validToolLogo(r)!==true) throw new Error('Invalid tool logo source');
  const logo=r.localLogo ? {src:`/logos/${r.localLogo}.svg`,alt:'',width:22,height:22} : media(r.logo,config);
  rows[r.row-1].push({name:text(r.name,'tool name'),label:text(r.accessibleLabel,'tool label'),...logo});
 }
 const credentials=selected('certificate').map(r=>{
  if(validYearMonth(r.date)!==true||validYearMonth(r.expiry)!==true) throw new Error('Invalid certificate date');
  if(safeLink(r.verificationUrl)!==true) throw new Error('Invalid certificate URL');
  let file;
  if(r.originalFile) {
   const id=pdfAssetId(r.originalFile);
   if(!id) throw new Error('Invalid certificate PDF asset');
   file=`https://cdn.sanity.io/files/${config.projectId}/${config.dataset}/${id}.pdf`;
  }
  return {title:text(r.title,'certificate title'),issuer:text(r.issuer,'certificate issuer'),date:text(r.displayDate,'certificate display date'),href:r.verificationUrl,image:r.image?media(r.image,config):undefined,file};
 });
 return {rows,credentials};
}
