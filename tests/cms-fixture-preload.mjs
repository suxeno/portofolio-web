// TEST ONLY: intercept only the synthetic Sanity snapshot, never real network.
const originalFetch = globalThis.fetch;
const paragraph = (text, extra={}) => ({_type:'block',children:[{_type:'span',text}],...extra});
const image = (id,alt) => ({_type:'bodyImage',asset:{_ref:`image-${id}-400x300-png`},alt,caption:alt+' caption'});
const hostile = 'TEST " ><script id="injected">alert(1)</script> &';
const originalTools = [
 [['Python','python'],['Apache Airflow','apacheairflow'],['Google BigQuery','googlebigquery'],['ClickHouse','clickhouse'],['MySQL','mysql'],['Docker','docker']],
 [['Linux','linux'],['Google Cloud','googlecloud'],['Grafana','grafana'],['Prometheus','prometheus'],['Metabase','metabase'],['JavaScript','javascript']],
 [['TensorFlow','tensorflow'],['scikit-learn','scikitlearn'],['Flask','flask'],['R','r'],['C++','cplusplus'],['Kotlin','kotlin']],
].flatMap((row,i)=>row.map(([name,localLogo],order)=>({_id:`tool.original.${localLogo}`,_type:'tool',name,accessibleLabel:name,localLogo,row:i+1,order})));
globalThis.fetch = (url, options) => {
 if (String(url).startsWith('https://synthetic.api.sanity.io/')) return Promise.resolve(new Response(JSON.stringify({result:[
  {_id:'siteSettings',_type:'siteSettings',title:'TEST SEO',description:'TEST description',socialImage:{asset:{_ref:'image-abcdef-400x300-png'},alt:'TEST site social'},wordmark:'TEST WORDMARK',contactQuestion:'TEST question',contactAction:'TEST contact',navigation:[{label:'TEST Writing',url:'#writing'},{label:'TEST Hidden',url:'https://portofolio.arvinantobahtiar.workers.dev/#projects'}],sections:[{id:'writing',visible:process.env.TEST_WRITING_HIDDEN !== '1'},{id:'experience',order:-1,heading:'TEST Career'},{id:'projects',visible:process.env.TEST_PROJECTS_VISIBLE === '1'}],footerNavigation:[{label:'TEST Footer',url:'#writing'}],footerBackToTop:'TEST top',terminalReadme:'TEST README',writingUi:{archiveTitle:'TEST Archive',backToPortfolio:'TEST back',backToWritings:'TEST article back',sampleDraft:'TEST draft',dummyCover:'TEST cover',readArticle:'TEST read',seeAllWritings:'TEST all',titleSuffix:'TEST suffix'}},
  {_id:'profile',_type:'profile',displayName:'TEST Person',expertiseLine:'TEST expertise',biography:'TEST bio',email:'test@example.com',links:[{label:'TEST Social',url:'https://example.com'}]},
  {_id:'writing.test',_type:'writing',title:process.env.TEST_HOSTILE_METADATA === '1' ? hostile : 'TEST ONLY article',slug:{current:'test-only-article'},excerpt:'Fixture only',seo:process.env.TEST_EMPTY_ARTICLE_SEO === '1' ? {title:' ',description:''} : process.env.TEST_HOSTILE_METADATA === '1' ? {title:hostile,description:hostile} : process.env.TEST_NO_ARTICLE_SEO === '1' ? undefined : {title:'TEST article SEO',description:'TEST article description',socialImage:{asset:{_ref:'image-abcdee-600x400-png'},alt:'TEST article social'}},body:[
   paragraph('Heading',{style:'h2'}),paragraph('Before <script>alert(1)</script>'),image('abcdef','First image'),paragraph('Between'),
   paragraph('List',{listItem:'bullet'}),paragraph('Nested',{listItem:'bullet',level:2}),paragraph('Quote',{style:'blockquote'}),
   image('abcdee','Second image'),paragraph('After'),{_type:'codeBlock',language:'js',code:'<img onerror=alert(1)>'},
   {_type:'block',markDefs:[{_key:'link',_type:'link',href:'https://example.com'}],children:[{_type:'span',text:'Link',marks:['link']}]}
  ]},
  {_id:'project.test',_type:'project',title:'TEST project',description:'TEST project description',repository:'https://example.com/project',order:1},
  {_id:'project.hidden',_type:'project',title:'TEST hidden project',description:'TEST hidden',repository:'https://example.com/hidden',visible:false},
  {_id:'experience.b',_type:'experience',role:'TEST second role',organization:'TEST second org',displayDate:'2024',order:2},
  {_id:'experience.a',_type:'experience',role:'TEST first role',organization:'TEST first org',displayDate:'2025 — PRESENT',startDate:'2025',current:true,order:1},
  {_id:'experience.hidden',_type:'experience',role:'TEST hidden role',organization:'TEST hidden org',displayDate:'2024',visible:false},
  {_id:'achievement.b',_type:'achievement',title:'TEST second achievement',order:2},
  {_id:'achievement.a',_type:'achievement',title:'TEST first achievement',order:1},
  {_id:'achievement.hidden',_type:'achievement',title:'TEST hidden achievement',visible:false},
  ...(process.env.TEST_ORIGINAL_TOOLS === '1' ? originalTools : [
   {_id:'tool.b',_type:'tool',name:'TEST tool B',accessibleLabel:'TEST tool B accessible',row:1,order:2,logo:{_type:'image',asset:{_ref:'image-abcdef-400x300-png'},alt:'TEST tool B logo'}},
   {_id:'tool.a',_type:'tool',name:'TEST tool A',accessibleLabel:'TEST tool A accessible',row:1,order:1,logo:{_type:'image',asset:{_ref:'image-abcdee-400x300-png'},alt:'TEST tool A logo'}},
  ]),
  {_id:'tool.hidden',_type:'tool',name:'TEST hidden tool',accessibleLabel:'hidden',row:2,visible:false},
  {_id:'certificate.b',_type:'certificate',title:'TEST certificate B',issuer:'TEST issuer',displayDate:'Issued 2024',verificationUrl:'https://example.com/b',order:2},
  {_id:'certificate.pdf',_type:'certificate',title:'TEST certificate PDF',issuer:'TEST issuer',displayDate:'Issued 2023',verificationUrl:'https://example.com/pdf',order:3,originalFile:{asset:{_ref:'file-027401f31c3ac1e6d78c5d539ccd1beff72b9b11-pdf'}}},
  {_id:'certificate.a',_type:'certificate',title:'TEST certificate A',issuer:'TEST issuer',displayDate:'Issued 2025',verificationUrl:'https://example.com/a',order:1,image:{_type:'image',asset:{_ref:'image-abcdef-400x300-png'},alt:'TEST certificate image'}},
  {_id:'certificate.hidden',_type:'certificate',title:'TEST hidden certificate',visible:false},
  {_id:'drafts.experience.secret',_type:'experience',role:'SECRET CAREER',organization:'Secret',displayDate:'2025'},
  {_id:'drafts.achievement.secret',_type:'achievement',title:'SECRET ACHIEVEMENT'},
  {_id:'drafts.writing.secret',_type:'writing',title:'SECRET DRAFT',slug:{current:'secret'},body:[]}
 ]}),{status:200,headers:{'content-type':'application/json'}}));
 return originalFetch(url,options);
};
