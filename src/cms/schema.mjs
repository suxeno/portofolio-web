// Studio validation is complemented by independent build-time validation.
import {localLogoIds, validToolLogo} from './local-logos.mjs';
import {adaptSections, links as adaptLinks} from './site-adapter.mjs';
import {adaptWriting, image} from './writing-adapter.mjs';
import {pdfAssetId} from './tools-certificates-adapter.mjs';
const sectionIds = ['writing', 'projects', 'tools', 'experience', 'achievements', 'certificates', 'contact'];
export function safeLink(value) {
  if (typeof value !== 'string' || !value || /[\u0000-\u0020\u007f\\]/.test(value)) return 'Enter a safe URL without whitespace or backslashes';
  if ((value.startsWith('/') && !value.startsWith('//')) || /^#[a-zA-Z][\w-]*$/.test(value)) return true;
  try { return ['https:', 'http:', 'mailto:'].includes(new URL(value).protocol) || 'Use http, https, mailto or a local path'; }
  catch { return 'Enter a valid URL'; }
}
export function validEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Enter a valid email address';
}
export function sectionIdsValid(sections) {
  if (!sections) return true;
  const ids = sections.map(section => section?.id);
  return ids.every(id => sectionIds.includes(id)) && new Set(ids).size === ids.length || 'Choose unique supported section IDs';
}
export function validYearMonth(value) {
  return !value || /^\d{4}(?:-(?:0[1-9]|1[0-2]))?$/.test(value) || 'Use YYYY or YYYY-MM';
}
export function validDateRange(value) {
  if (value?.current && value?.endDate) return 'A current role cannot have an end date';
  if (!value?.startDate || !value?.endDate) return true;
  if (validYearMonth(value.startDate) !== true || validYearMonth(value.endDate) !== true) return 'Invalid date';
  // Compare bounds conservatively when a year has no month: do not invent a day.
  return value.endDate.slice(0, 4) >= value.startDate.slice(0, 4) && !(value.startDate.length === 7 && value.endDate.length === 7 && value.endDate < value.startDate) || 'End date precedes start date';
}
export function validProjectLink(value) {
  const href = value?.repository || value?.links?.[0]?.url;
  return safeLink(href) === true || 'Provide a safe repository URL or first project link';
}
const field = (name, type = 'string', extra = {}) => ({name, type, ...extra});
const required = Rule => Rule.required();
const requiredText = max => Rule => Rule.required().max(max).custom(value => !value || (typeof value === 'string' && !!value.trim()) || 'Must not be blank');
const safeUrl = Rule => Rule.uri({allowRelative:true,scheme:['https','http','mailto']}).custom(value => !value ? true : safeLink(value));
const reqUrl = Rule => safeUrl(Rule.required());
const hidden = item => ({...item,hidden:true});
const partialDate = name => hidden(field(name, 'string', {validation: Rule => Rule.custom(validYearMonth)}));
const link = {name:'link', type:'object', fields:[field('label','string',{validation:requiredText(4000)}), field('url','url',{validation:reqUrl})]};
const media = (name,caption=false) => field(name,'image',{validation:Rule=>Rule.custom(value=>{if (!value) return true; try { image(value,{projectId:'validation',dataset:'validation'}); return true; } catch { return 'Provide a supported image asset with dimensions and alt text'; }}),fields:[field('alt','string',{validation:required}),{...field('caption'),hidden:!caption}]});
const common = [field('order','number',{validation:Rule => Rule.integer().custom(value=>value == null || Number.isSafeInteger(value) || 'Order must be a safe integer')}), field('visible','boolean')];
const displayFieldset = {fieldsets:[{name:'display',title:'Display settings',options:{collapsible:true,collapsed:true}}]};
const displayFields = common.map(item=>({...item,fieldset:'display'}));
const seo = field('seo','object',{fields:[field('title','string',{validation:Rule=>Rule.max(200)}),field('description','text',{validation:Rule=>Rule.max(500)}),media('socialImage')]});
const links = field('links','array',{of:[link]});
const renderedLinks = Rule=>Rule.required().max(20).custom(value=>{try {adaptLinks(value,'links'); return true;} catch(e) {return e.message;}});
const doc = (name, fields, extra = {}) => ({name, type:'document', fields, ...extra});
const codeBlock = {name:'codeBlock',type:'object',fields:[field('language','string',{validation:Rule => Rule.regex(/^[a-zA-Z0-9_+.#-]*$/)}),field('code','text',{validation:required})]};
const block = {type:'block',styles:[{title:'Normal',value:'normal'},{title:'Heading 2',value:'h2'},{title:'Heading 3',value:'h3'},{title:'Quote',value:'blockquote'}],lists:[{title:'Bullet',value:'bullet'},{title:'Number',value:'number'}],marks:{decorators:[{title:'Strong',value:'strong'},{title:'Emphasis',value:'em'},{title:'Code',value:'code'}],annotations:[{name:'link',type:'object',fields:[field('href','string',{validation:reqUrl})]}]}};
const bodyImage = media('bodyImage',true);
const section = {name:'section',type:'object',fields:[field('id','string',{options:{list:sectionIds},validation:required}),field('heading'),hidden(field('intro','text')),...common]};
const urlField = name => field(name,'url',{validation:safeUrl});
const writingUi = field('writingUi','object',{title:'Writings labels',options:{collapsible:true,collapsed:true},validation:required,fields:['archiveTitle','backToPortfolio','backToWritings','sampleDraft','dummyCover','readArticle','seeAllWritings','titleSuffix'].map(name => field(name,'string',{validation:requiredText(4000)})).concat(hidden(field('sampleDraftHome')))});
const achievementLinks = field('links','array',{title:'Destination link',description:'The first URL wraps the public title. Leave empty for plain text.',of:[{...link,preview:{select:{title:'url'}},fields:[hidden(field('label')),link.fields[1]]}]});
export const schemaTypes = [
  codeBlock,
  doc('siteSettings',[field('title','string',{title:'Browser and sharing title',validation:requiredText(200)}),field('description','text',{title:'Search and sharing description',validation:requiredText(500)}),media('socialImage'),field('wordmark','string',{validation:requiredText(4000)}),field('navigation','array',{of:[link],validation:renderedLinks}),field('footerNavigation','array',{of:[link],validation:renderedLinks}),field('footerBackToTop','string',{validation:requiredText(4000)}),field('sections','array',{of:[section],validation:Rule => Rule.custom(value=>{try {adaptSections(value); return true;} catch(e) {return e.message;}})}),field('contactQuestion','string',{validation:requiredText(4000)}),field('contactAction','string',{validation:requiredText(4000)}),field('terminalReadme','text',{validation:requiredText(4000)}),writingUi,hidden(field('footerCopy','text')),hidden(seo)]),
  doc('profile',[field('displayName','string',{validation:requiredText(4000)}),field('expertiseLine','string',{validation:requiredText(4000)}),field('biography','text',{validation:requiredText(4000)}),field('email','email',{validation:Rule=>Rule.required().custom(validEmail)}),{...links,title:'Social links',validation:renderedLinks},hidden(field('contactCta')),hidden(media('photo')),hidden(field('resume','file'))]),
  doc('writing',[field('title','string',{validation:requiredText(4000)}),field('slug','slug',{options:{source:'title'},validation:Rule => Rule.required().custom(value => !!value?.current && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.current) || 'Use lowercase words separated by hyphens').error()}),field('excerpt','text'),media('cover',true),field('body','array',{of:[block,bodyImage,{type:'codeBlock'}],validation:required}),field('publishedAt','date',{title:'Publication date',description:'Sets the date shown in lists and their chronological order. Optional.'}),hidden(field('featured','boolean')),...displayFields,{...seo,title:'Search and sharing overrides',options:{collapsible:true,collapsed:true}}],{...displayFieldset,validation:Rule=>Rule.custom(value=>{try {adaptWriting([{...value,_id:'validation',_type:'writing',visible:true}],{projectId:'validation',dataset:'validation'}); return true;} catch(e) {return e.message;}})}),
  doc('project',[field('title','string',{validation:requiredText(400)}),field('description','text',{validation:requiredText(4000)}),{...urlField('repository'),title:'Destination URL',description:'Primary public destination. If empty, the first legacy link is used.'},media('cover'),hidden(field('screenshots','array',{of:[media('screenshot')]})),hidden(field('technologies','array',{of:[{type:'string'}]})),{...links,title:'Legacy destination links',description:'The first link is used when Destination URL is empty. Existing links are retained.',hidden:({document})=>!!document?.repository || !document?.links?.length},...displayFields,hidden(seo)],{...displayFieldset,validation:Rule=>Rule.custom(validProjectLink)}),
  doc('experience',[field('role','string',{validation:requiredText(400)}),field('organization','string',{validation:requiredText(400)}),field('displayDate','string',{title:'Public date range',description:'Enter the exact text shown (e.g. July 2026 – present).',validation:requiredText(400)}),...displayFields,hidden(field('location')),hidden(field('employmentType')),partialDate('startDate'),partialDate('endDate'),hidden(field('current','boolean')),hidden(field('description','text')),hidden(links)],{...displayFieldset,validation:Rule => Rule.custom(validDateRange)}),
  doc('achievement',[field('title','string',{description:'Full public achievement statement, including date, placement and event as desired.',validation:requiredText(1000)}),achievementLinks,...displayFields,hidden(field('placement')),hidden(field('event')),partialDate('date'),hidden(field('displayDate')),hidden(field('description','text')),hidden(field('evidence','file'))],displayFieldset),
  doc('tool',[field('name','string',{validation:requiredText(400)}),field('localLogo','string',{description:'Choose this OR upload a raster logo, not both.',options:{list:localLogoIds}}),{...media('logo'),description:'Uploaded logos display in monochrome white. Use a transparent background for best results; backgrounds are not removed.'},field('accessibleLabel','string',{description:'Text that assistive technology reads for the logo.',validation:requiredText(400)}),field('row','number',{options:{list:[1,2,3]},validation:Rule=>Rule.required().integer().min(1).max(3),fieldset:'display'}),...displayFields],{...displayFieldset,validation:Rule=>Rule.custom(validToolLogo)}),
  doc('certificate',[field('title','string',{validation:requiredText(400)}),field('issuer','string',{validation:requiredText(400)}),field('displayDate','string',{title:'Public date label',description:'Enter the exact text shown (e.g. Issued October 2025).',validation:requiredText(400)}),field('verificationUrl','url',{title:'Public evidence URL',validation:reqUrl}),media('image'),field('originalFile','file',{options:{accept:'application/pdf'},description:'PDF original only.',validation:Rule=>Rule.custom(value=>!value || !!pdfAssetId(value) || 'Provide a valid PDF asset reference').error()}),...displayFields,partialDate('date'),partialDate('expiry'),hidden(field('credentialId'))],displayFieldset),
];