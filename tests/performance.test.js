import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1));

function filesNamed(dir, filename, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.wrangler') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) filesNamed(path, filename, out);
    else if (entry.name === filename) out.push(path);
  }
  return out;
}

test('HTML pages do not depend on blocking third-party fonts', () => {
  const pages = filesNamed(ROOT, 'index.html');
  pages.push(join(ROOT, 'login.html'));
  assert.ok(pages.length >= 20);
  for (const page of pages) {
    const html = readFileSync(page, 'utf8');
    assert.doesNotMatch(html, /fonts\.(?:googleapis|gstatic)\.com/, page);
  }
});

test('Pages Functions routing bypasses common static assets', () => {
  const routes = JSON.parse(readFileSync(join(ROOT, '_routes.json'), 'utf8'));
  assert.equal(routes.version, 1);
  assert.deepEqual(routes.include, ['/*']);
  for (const pattern of ['/*.css', '/*.js', '/*.json', '/*.wasm', '/*.png', '/*.svg']) {
    assert.ok(routes.exclude.includes(pattern), `${pattern} should bypass Pages Functions`);
  }
});

test('static assets receive browser cache headers', () => {
  const headers = readFileSync(join(ROOT, '_headers'), 'utf8');
  for (const pattern of ['/*.css', '/*.js', '/*.json', '/*.wasm', '/*.png']) {
    assert.ok(headers.includes(pattern), `${pattern} needs a cache rule`);
  }
  assert.match(headers, /stale-while-revalidate/);
});

test('hiking thumbnails are smaller and lazy loaded', () => {
  const logic = readFileSync(join(ROOT, 'hiking', 'logic.js'), 'utf8');
  const ui = readFileSync(join(ROOT, 'hiking', 'hiking.js'), 'utf8');
  assert.match(logic, /w=640&h=360/);
  assert.match(logic, /auto=format&q=72/);
  assert.match(ui, /loading="lazy"/);
  assert.match(ui, /fetchpriority="low"/);
});
