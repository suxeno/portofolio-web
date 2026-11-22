// Offline dry-run only. Reads the repository's current local presentation sources.
import {readFileSync, mkdirSync, writeFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {writing, projects, experience, achievements} from '../src/content';
import {localLogoIds} from '../src/cms/local-logos.mjs';
import {checkFrozenIds} from '../src/cms/baseline-ids.mjs';

const output = process.argv[2];
if (!output) throw new Error('Usage: bun scripts/cms-baseline.ts OUTPUT_DIRECTORY');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path:string) => readFileSync(resolve(root,path),'utf8');
const index = read('src/pages/index.astro');
const archive = read('src/pages/writing/index.astro');
const article = read('src/pages/writing/[slug].astro');
const tools = read('src/components/ToolsSection.astro');
const certs = read('src/components/CertificatesSection.astro');
const shell = read('src/shell.ts');
function one(source:string, pattern:RegExp, label:string):string {
 const match = source.match(pattern);
 if (!match) throw new Error(`Source changed: cannot extract ${label}`);
 return match[1];
}
// Only evaluate bracketed literal arrays from trusted, local repository sources, never CMS/network data.
function literal(source:string, pattern:RegExp, label:string):any {
 return runInNewContext(`(${one(source,pattern,label)})`,Object.create(null),{timeout:100});
}
const fallback = (source:string, expression:string) => one(source,new RegExp(expression + String.raw`\s*\?\?\s*'([^']*)'`),expression);
const toolRows:string[][][] = literal(tools,/const localRows = (\[[\s\S]*?\n\]);/,'tools rows');
const credentials:{title:string;issuer:string;date:string;href:string}[] = literal(certs,/Astro\.props\.credentials \?\? (\[[\s\S]*?\n\]);/,'credentials');
const nav = literal(index,/const nav = settings\?\.navigation \?\? (\[[^;]+\]);/,'navigation');
const footer = literal(index,/const footerNav = settings\?\.footerNavigation \?\? (\[[^;]+\]);/,'footer navigation');
const links = [...index.matchAll(/<a class="social-highlight" href="(https:\/\/[^\"]+)">(LinkedIn|GitHub|Medium) <span/g)].map(m=>({label:m[2],url:m[1]}));
if (links.length !== 3 || toolRows.length !== 3 || toolRows.flat().length !== localLogoIds.length || toolRows.flat().some((row,i)=>row[1]!==localLogoIds[i])) throw new Error('Baseline link or curated logo inventory changed');
const sectionIds = ['writing','projects','tools','experience','achievements','certificates','contact'];
const sections = sectionIds.map((id,order)=> {
 if (id === 'contact') return {_type:'section',_key:id,id,order,visible:true}; // Contact heading is the editable contactQuestion field.
 const heading = id === 'tools' ? one(tools,/heading \?\? "([^"]+)"/,'tools heading') : id === 'certificates' ? one(certs,/heading \?\? "([^"]+)"/,'certificates heading') : one(index,new RegExp(`id="${id}" lead="" emphasis=\\{section\\.heading \\?\\? "([^"]+)"`),`${id} heading`);
 return {_type:'section',_key:id,id,order,visible:true,heading};
});
const settings = {_id:'siteSettings',_type:'siteSettings',title:fallback(index,'settings\\?\\.title'),description:fallback(index,'settings\\?\\.description'),wordmark:fallback(index,'settings\\?\\.wordmark'), navigation:nav.map((x:any,i:number)=>({...x,_type:'link',_key:`nav-${i}`})),footerNavigation:footer.map((x:any,i:number)=>({...x,_type:'link',_key:`footer-${i}`})),footerBackToTop:fallback(index,'settings\\?\\.footerBackToTop'),sections,contactQuestion:fallback(index,'settings\\?\\.contactQuestion'),contactAction:fallback(index,'settings\\?\\.contactAction'),terminalReadme:one(shell,/readme = '([^']+)'/,'terminal README'),writingUi:{archiveTitle:fallback(archive,'ui\\?\\.archiveTitle'),backToPortfolio:fallback(archive,'ui\\?\\.backToPortfolio'),backToWritings:fallback(article,'ui\\?\\.backToWritings'),sampleDraft:fallback(article,'ui\\?\\.sampleDraft'),dummyCover:fallback(article,'ui\\?\\.dummyCover'),readArticle:fallback(index,'settings\\?\\.writingUi\\.readArticle'),seeAllWritings:fallback(index,'settings\\?\\.writingUi\\.seeAllWritings'),titleSuffix:fallback(article,'ui\\?\\.titleSuffix')}};
const profile = {_id:'profile',_type:'profile',displayName:fallback(index,'profile\\?\\.displayName'),expertiseLine:fallback(index,'profile\\?\\.expertiseLine'),biography:fallback(index,'profile\\?\\.biography'),email:fallback(index,'profile\\?\\.email'),links:links.map((x,i)=>({...x,_type:'link',_key:`social-${i}`}))};
const stableId = (type:string, identity:string) => `${type}--${createHash('sha256').update(identity).digest('hex').slice(0,20)}`;
const docs:any[] = [settings,profile,
 ...writing.map((x,i)=>({_id:`writing--${x.slug}`,_type:'writing',title:x.title,slug:{_type:'slug',current:x.slug},excerpt:x.excerpt,publishedAt:x.publishedAt,body:x.body.map((text,j)=>({_type:'block',_key:`block-${j}`,style:'normal',markDefs:[],children:[{_type:'span',_key:`span-${j}`,text,marks:[]}]})),order:i,visible:true})),
 ...projects.map((x,i)=>({_id:stableId('project',x.href),_type:'project',title:x.title,description:x.detail,repository:x.href,order:i,visible:true})),
 ...experience.map((x,i)=>({_id:stableId('experience',`${x.organization}\n${x.title}\n${x.date}`),_type:'experience',role:x.title,organization:x.organization,displayDate:x.date,order:i,visible:true})),
 ...achievements.map((title,i)=>({_id:stableId('achievement',title),_type:'achievement',title,order:i,visible:true})),
 ...toolRows.flatMap((row,r)=>row.map(([name,localLogo],i)=>({_id:`tool--${localLogo}`,_type:'tool',name,localLogo,accessibleLabel:name,row:r+1,order:i,visible:true}))),
 ...credentials.map((x,i)=>({_id:stableId('certificate',x.href),_type:'certificate',title:x.title,issuer:x.issuer,displayDate:x.date,verificationUrl:x.href,order:i,visible:true}))];
checkFrozenIds(docs, JSON.parse(read('src/cms/baseline-ids.json')));
const ids = docs.map(x=>x._id);
if (new Set(ids).size !== ids.length || ids.some(x=>!/^[A-Za-z0-9_-]+$/.test(x))) throw new Error('Invalid or duplicate document ID');
const counts = Object.fromEntries(['siteSettings','profile','writing','project','experience','achievement','tool','certificate'].map(type=>[type,docs.filter(x=>x._type===type).length]));
const expected = [1,1,writing.length,projects.length,experience.length,achievements.length,toolRows.flat().length,credentials.length];
if (Object.values(counts).some((count,i)=>count!==expected[i])) throw new Error('Counts do not match source inventory');
const logos = toolRows.flat().map(([,id])=>`public/logos/${id}.svg`);
if (logos.some(path=>!existsSync(resolve(root,path)))) throw new Error('Missing curated logo');
const manifest = {purpose:'Offline baseline dry-run; no remote import or asset upload performed.',counts,sources:['src/content.ts','src/pages/index.astro','src/pages/writing/index.astro','src/pages/writing/[slug].astro','src/components/ToolsSection.astro','src/components/CertificatesSection.astro','src/shell.ts','src/cms/local-logos.mjs'],assets:{codeManagedLogos:logos,fontsAndDecorativeArt:'Remain code-managed; not uploaded.',certificateImages:'All three missing source files; no fabricated references.',writingCovers:'All baseline covers absent.'},notes:['Undated sample writings are published seed records, not Sanity draft IDs.','Structured dates omitted where only a display label exists; no precision invented.','Section headings come from local presentation sources; contact heading uses contactQuestion. Terminal directory labels remain protected code.']};
mkdirSync(resolve(output),{recursive:true});
writeFileSync(resolve(output,'baseline.ndjson'),docs.map(x=>JSON.stringify(x)).join('\n')+'\n');
writeFileSync(resolve(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({output:resolve(output),counts}));
