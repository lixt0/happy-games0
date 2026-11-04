import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const ignored = new Set(['node_modules', '.git', '.wrangler', '.tmp-xdg']);
const files = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.isFile() && path.endsWith('.js')) files.push(path);
  }
}

function checkSyntax(path) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['--check', path], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('close', code => resolve({ path, code, stderr }));
  });
}

await walk(root);
const syntaxResults = await Promise.all(files.map(checkSyntax));
const failures = syntaxResults.filter(result => result.code !== 0);
const htmlFiles = [];
async function findHtml(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await findHtml(path);
    else if (entry.isFile() && entry.name === 'index.html') htmlFiles.push(path);
  }
}
await findHtml(root);
for (const path of htmlFiles) {
  const text = await readFile(path, 'utf8');
  if (!/<meta\s+charset=/i.test(text)) failures.push({ path, code: 1, stderr: 'missing charset meta' });
  if (!/<meta\s+name=["']viewport["']/i.test(text)) failures.push({ path, code: 1, stderr: 'missing viewport meta' });
}

if (failures.length) {
  for (const failure of failures) console.error(`${relative(root, failure.path)}\n${failure.stderr}`);
  process.exitCode = 1;
} else {
  console.log(`check passed: ${files.length} JavaScript files and ${htmlFiles.length} page shells`);
}
