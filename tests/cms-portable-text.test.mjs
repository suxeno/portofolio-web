import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPortableText} from '../src/cms/portable-text.mjs';

test('TEST ONLY interleaves body images, headings, lists, quote and escaped code', () => {
 const blocks = [
  {_type:'block',style:'h2',children:[{_type:'span',text:'Heading'}]},
  {_type:'block',children:[{_type:'span',text:'First <script>alert(1)</script>'}]},
  {_type:'bodyImage',url:'https://cdn.sanity.io/images/test/prod/a-400x300.png',width:400,height:300,alt:'First image',caption:'First caption'},
  {_type:'block',listItem:'bullet',level:1,children:[{_type:'span',text:'List entry'}]},
  {_type:'block',style:'blockquote',children:[{_type:'span',text:'Quote'}]},
  {_type:'bodyImage',url:'https://cdn.sanity.io/images/test/prod/b-200x100.png',width:200,height:100,alt:'Second image'},
  {_type:'codeBlock',language:'js',code:'<img onerror=alert(1)>'}
 ];
 const html = renderPortableText(blocks);
 assert.ok(html.indexOf('First &lt;script&gt;') < html.indexOf('First image'));
 assert.ok(html.indexOf('First image') < html.indexOf('List entry'));
 assert.match(html, /<h2>Heading<\/h2>/); assert.match(html, /<ul><li>List entry<\/li><\/ul>/);
 assert.match(html, /<blockquote>Quote<\/blockquote>/); assert.match(html, /Second image/);
 assert.match(html, /&lt;img onerror=alert\(1\)&gt;/); assert.doesNotMatch(html, /<script|<img onerror/);
});
test('nested lists render as nested accessible lists', () => {
 const b = (text,level) => ({_type:'block',listItem:'bullet',level,children:[{_type:'span',text}]});
 assert.match(renderPortableText([b('outer',1),b('inner',2),b('next',1)]), /<ul><li>outer<ul><li>inner<\/li><\/ul><\/li><li>next<\/li><\/ul>/);
});

test('rejects unsafe links and images without alt or geometry', () => {
 assert.throws(() => renderPortableText([{_type:'block',markDefs:[{_key:'a',_type:'link',href:'javascript:alert(1)'}],children:[{_type:'span',text:'x',marks:['a']}]}]));
 assert.throws(() => renderPortableText([{_type:'bodyImage',url:'javascript:alert(1)',alt:'x',width:10,height:10}]));
 assert.throws(() => renderPortableText([{_type:'bodyImage',url:'https://cdn.sanity.io/images/x',width:10,height:10}]));
});
