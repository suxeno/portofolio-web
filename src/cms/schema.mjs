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
const safeUrl = Rule => Rule.custom(value => !value ? true : safeLink(value));
const reqUrl = Rule => Rule.required().custom(value => !value ? true : safeLink(value));
const partialDate = name => field(name, 'string', {description:'Use YYYY or YYYY-MM; preserve the original precision.', validation: Rule => Rule.custom(validYearMonth)});
const link = {name:'link', type:'object', fields:[field('label','string',{validation:requiredText(4000)}), field('url','string',{validation:reqUrl})]};
const media = name => field(name,'image',{options:{hotspot:true},validation:Rule=>Rule.custom(value=>{if (!value) return true; try { image(value,{projectId:'validation',dataset:'validation'}); return true; } catch { return 'Provide a supported image asset with dimensions and alt text'; }}),fields:[field('alt','string',{validation:required}),field('caption')]});
const common = [field('order','number',{validation:Rule => Rule.integer().custom(value=>value == null || Number.isSafeInteger(value) || 'Order must be a safe integer')}), field('visible','boolean')];
const seo = field('seo','object',{fields:[field('title','string',{validation:Rule=>Rule.max(200)}),field('description','text',{validation:Rule=>Rule.max(500)}),media('socialImage')]});
const links = field('links','array',{of:[link]});
const renderedLinks = Rule=>Rule.required().max(20).custom(value=>{try {adaptLinks(value,'links'); return true;} catch(e) {return e.message;}});
const doc = (name, fields, extra = {}) => ({name, type:'document', fields, ...extra});
const codeBlock = {name:'codeBlock',type:'object',fields:[field('language','string',{validation:Rule => Rule.regex(/^[a-zA-Z0-9_+.#-]*$/)}),field('code','text',{validation:required})]};
const block = {type:'block',styles:[{title:'Normal',value:'normal'},{title:'Heading 2',value:'h2'},{title:'Heading 3',value:'h3'},{title:'Quote',value:'blockquote'}],lists:[{title:'Bullet',value:'bullet'},{title:'Number',value:'number'}],marks:{decorators:[{title:'Strong',value:'strong'},{title:'Emphasis',value:'em'},{title:'Code',value:'code'}],annotations:[{name:'link',type:'object',fields:[field('href','string',{validation:reqUrl})]}]}};
const bodyImage = media('bodyImage');
const section = {name:'section',type:'object',fields:[field('id','string',{options:{list:sectionIds},validation:required}),field('heading'),field('intro','text',{description:'Reserved data only; not displayed on the public site.'}),...common]};
const urlField = name => field(name,'string',{validation:safeUrl});
export const schemaTypes = [
  codeBlock,
  doc('siteSettings',[field('title','string',{validation:requiredText(200)}),field('description','text',{validation:requiredText(500)}),media('socialImage'),field('wordmark','string',{validation:requiredText(4000)}),field('footerNavigation','array',{of:[link],validation:renderedLinks}),field('footerBackToTop','string',{validation:requiredText(4000)}),field('writingUi','object',{validation:required,fields:['archiveTitle','backToPortfolio','backToWritings','sampleDraft','dummyCover','readArticle','seeAllWritings','titleSuffix'].map(name => field(name,'string',{validation:requiredText(4000)})).concat([field('sampleDraftHome','string',{description:'Optional homepage-specific sample label.',validation:Rule=>Rule.max(4000).custom(value=>!value || !!value.trim() || 'Must not be blank')})])}),field('navigation','array',{of:[link],validation:renderedLinks}),field('sections','array',{of:[section],validation:Rule => Rule.custom(value=>{try {adaptSections(value); return true;} catch(e) {return e.message;}})}),field('contactQuestion','string',{validation:requiredText(4000)}),field('contactAction','string',{validation:requiredText(4000)}),field('footerCopy','text',{description:'Reserved data only; not displayed.'}),field('terminalReadme','text',{validation:requiredText(4000)}),{...seo,description:'Reserved data only; use site title, description and social image above.'}]),
  doc('profile',[field('displayName','string',{validation:requiredText(4000)}),field('expertiseLine','string',{validation:requiredText(4000)}),field('biography','text',{validation:requiredText(4000)}),field('email','string',{validation:Rule=>Rule.required().custom(validEmail)}),field('contactCta','string',{description:'Reserved data only; use site contact action for the visible CTA.'}),{...links,validation:renderedLinks},media('photo'),field('resume','file')]),
  doc('writing',[field('title','string',{validation:requiredText(4000)}),field('slug','slug',{options:{source:'title'},validation:Rule => Rule.required().custom(value => !!value?.current && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.current) || 'Use lowercase words separated by hyphens').error()}),field('excerpt','text'),media('cover'),field('body','array',{of:[block,bodyImage,{type:'codeBlock'}],validation:required}),field('publishedAt','datetime'),field('featured','boolean'),...common,seo],{validation:Rule=>Rule.custom(value=>{try {adaptWriting([{...value,_id:'validation',_type:'writing',visible:true}],{projectId:'validation',dataset:'validation'}); return true;} catch(e) {return e.message;}})}),
  doc('project',[field('title','string',{validation:requiredText(400)}),field('description','text',{validation:requiredText(4000)}),media('cover'),field('screenshots','array',{of:[media('screenshot')]}),field('technologies','array',{of:[{type:'string'}]}),urlField('repository'),links,...common,{...seo,description:'Reserved data only; projects have no public detail route.'}],{validation:Rule=>Rule.custom(validProjectLink)}),
  doc('experience',[field('role','string',{validation:requiredText(400)}),field('organization','string',{validation:requiredText(400)}),field('location'),field('employmentType'),partialDate('startDate'),partialDate('endDate'),field('displayDate','string',{description:'Exact date label shown publicly; preserve original precision.',validation:requiredText(400)}),field('current','boolean'),field('description','text'),links,...common],{validation:Rule => Rule.custom(validDateRange)}),
  doc('achievement',[field('title','string',{description:'Full public achievement statement, including date, placement and event as desired.',validation:requiredText(1000)}),field('placement'),field('event'),partialDate('date'),field('displayDate'),field('description','text'),links,field('evidence','file'),...common]),
  doc('tool',[field('name','string',{validation:requiredText(400)}),field('localLogo','string',{description:'Choose this OR upload a raster logo, not both.',options:{list:localLogoIds}}),{...media('logo'),description:'Uploaded logos display in monochrome white. Use a transparent background for best results; backgrounds are not removed.'},field('accessibleLabel','string',{validation:requiredText(400)}),field('row','number',{validation:Rule=>Rule.required().integer().min(1).max(3)}),...common],{validation:Rule=>Rule.custom(validToolLogo)}),
  doc('certificate',[field('title','string',{validation:requiredText(400)}),field('issuer','string',{validation:requiredText(400)}),partialDate('date'),partialDate('expiry'),field('displayDate','string',{validation:requiredText(400)}),field('credentialId'),field('verificationUrl','string',{validation:reqUrl}),media('image'),field('originalFile','file',{options:{accept:'application/pdf'},description:'PDF original only.',validation:Rule=>Rule.custom(value=>!value || !!pdfAssetId(value) || 'Provide a valid PDF asset reference').error()}),...common]),
];