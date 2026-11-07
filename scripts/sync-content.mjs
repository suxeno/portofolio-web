import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const pageUrl = new URL('index.html', root);
const source = (await readFile(new URL('content/sections.html', root), 'utf8')).trim();
const page = await readFile(pageUrl, 'utf8');
const start = '<!-- content:sections:start -->';
const end = '<!-- content:sections:end -->';
const begin = page.indexOf(start);
const finish = page.indexOf(end);
if (begin < 0 || finish <= begin || page.indexOf(start, begin + start.length) !== -1 || page.indexOf(end, finish + end.length) !== -1) throw Error('Invalid content markers');
await writeFile(pageUrl, `${page.slice(0, begin + start.length)}\n    ${source}\n    ${page.slice(finish)}`);
