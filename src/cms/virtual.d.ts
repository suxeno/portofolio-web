declare module 'virtual:cms-projects' {
  const projects: import('../content').LinkedRecord[] | null;
  export default projects;
}
declare module 'virtual:cms-writing' {
  const writing: any[] | null;
  export default writing;
}
declare module 'virtual:cms-site' {
  interface Link { label: string; url: string }
  interface Site { settings: { title:string; description:string; socialImage:{url:string; alt:string; width:number; height:number}|null; wordmark:string; sections:{id:string; visible:boolean; heading?:string; order:number}[]; navigation:Link[]; footerNavigation:Link[]; footerBackToTop:string; contactQuestion:string; contactAction:string; terminalReadme:string; writingUi:Record<string,string> }; profile: {displayName:string; expertiseLine:string; biography:string; email:string; links:Link[]} }
  const site: Site | null;
  export default site;
}
declare module 'virtual:cms-career' {
  const career: {experience: import('../content').Job[]; achievements: string[]} | null;
  export default career;
}
declare module 'virtual:cms-collections' {
  type Tool = {name:string; label:string; src:string; alt:string; width:number; height:number};
  type Credential = {title:string; issuer:string; date:string; href:string; file?:string; image?:{src:string; alt:string; width:number; height:number}};
  const collections: {rows:Tool[][]; credentials:Credential[]} | null;
  export default collections;
}
