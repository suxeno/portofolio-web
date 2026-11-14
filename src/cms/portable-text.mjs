// Server-only renderer for a validated, asset-resolved Portable Text subset.
// Integrated in article builds; no raw HTML is accepted.
import {safeLink} from './schema.mjs';
const escape = text => String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

function spans(block) {
  if (!Array.isArray(block.children)) throw new Error('Block requires children');
  const definitions = new Map((block.markDefs || []).map(mark => [mark._key, mark]));
  return block.children.map(span => {
    if (span._type !== 'span' || typeof span.text !== 'string') throw new Error('Unsupported inline content');
    let html = escape(span.text);
    for (const mark of span.marks || []) {
      if (mark === 'strong' || mark === 'em' || mark === 'code') html = `<${mark}>${html}</${mark}>`;
      else {
        const definition = definitions.get(mark);
        if (!definition || definition._type !== 'link' || safeLink(definition.href) !== true) throw new Error('Unsafe or unsupported mark');
        html = `<a href="${escape(definition.href)}">${html}</a>`;
      }
    }
    return html;
  }).join('');
}

export function renderPortableText(blocks) {
  if (!Array.isArray(blocks)) throw new Error('Body must be an array');
  let html = '', lists = [];
  const closeOne = () => { html += `</li></${lists.pop()}>`; };
  const closeList = () => { while (lists.length) closeOne(); };
  for (const block of blocks) {
    if (block?._type === 'block') {
      if (block.listItem) {
        const tag = {bullet:'ul',number:'ol'}[block.listItem];
        const level = block.level ?? 1;
        if (!tag || !Number.isInteger(level) || level < 1 || level > 20 || level > lists.length + 1) throw new Error('Unsupported list');
        while (lists.length > level) closeOne();
        if (lists.length === level && lists[level - 1] !== tag) closeOne();
        if (lists.length < level) { html += `<${tag}><li>`; lists.push(tag); }
        else html += '</li><li>';
        html += spans(block);
      } else {
        closeList();
        const tag = {normal:'p',h2:'h2',h3:'h3',blockquote:'blockquote'}[block.style || 'normal'];
        if (!tag) throw new Error('Unsupported block style');
        html += `<${tag}>${spans(block)}</${tag}>`;
      }
    } else if (block?._type === 'bodyImage') {
      closeList();
      let url; try { url = new URL(block.url); } catch { throw new Error('Invalid image URL'); }
      if (url.protocol !== 'https:' || url.hostname !== 'cdn.sanity.io' || url.username || url.password || typeof block.alt !== 'string' || !block.alt.trim() || !Number.isSafeInteger(block.width) || block.width < 1 || !Number.isSafeInteger(block.height) || block.height < 1) throw new Error('Invalid image');
      html += `<figure><img src="${escape(url.href)}" alt="${escape(block.alt)}" width="${block.width}" height="${block.height}" loading="lazy" decoding="async" style="max-width:100%;height:auto">${block.caption ? `<figcaption>${escape(block.caption)}</figcaption>` : ''}</figure>`;
    } else if (block?._type === 'codeBlock') {
      closeList();
      if (typeof block.code !== 'string' || (block.language && !/^[a-zA-Z0-9_+.#-]+$/.test(block.language))) throw new Error('Invalid code block');
      html += `<pre><code>${escape(block.code)}</code></pre>`;
    } else throw new Error('Unsupported body block');
  }
  closeList();
  return html;
}
