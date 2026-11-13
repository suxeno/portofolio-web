import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('certificate folio supports authentic original images while leaving missing sources explicit', () => {
  const source = readFileSync('src/components/CertificatesSection.astro', 'utf8');
  assert.match(source, /item\.image\s*\?/);
  assert.match(source, /href=\{item\.image\.src\}/);
  assert.match(source, /alt=\{item\.image\.alt\}/);
  assert.match(source, /width=\{item\.image\.width\}/);
  assert.match(source, /height=\{item\.image\.height\}/);
  assert.match(source, /object-fit:\s*contain/);
  assert.match(source, /Certificate image awaiting source file/);
});
