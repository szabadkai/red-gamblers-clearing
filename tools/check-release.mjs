// Check the actual Pages artifact, resolving URLs under a project-site prefix.
import assert from 'node:assert/strict';
import {readdir, readFile, stat} from 'node:fs/promises';

const root = new URL('../poker-web/dist/', import.meta.url);
const base = new URL('https://example.invalid/red-gamblers-clearing/');
const files = [];
async function walk(directory, prefix = '') {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) await walk(new URL(entry.name + '/', directory), name + '/');
    else files.push(name);
  }
}
await walk(root);
const published = new Set(files);
for (const required of ['index.html', 'game.mjs', 'runtime.mjs', 'music-worker.mjs',
  'chip.mjs', 'poker/index.html', '.nojekyll', 'assets/ASSET_RIGHTS.md',
  'assets/AUDIO_CREDITS.md', 'assets/FONT_LICENSE.txt']) {
  assert(published.has(required), `Missing release file: ${required}`);
}
assert(!files.some(file => /^(tests\/|local-tools\.mjs$|serve\.mjs$|build\.mjs$)/.test(file)),
  'Developer tools must not be published');
assert.doesNotMatch(await readFile(new URL('runtime.mjs', root), 'utf8'), /__RED_REVIEW__|__POKER_STATE__/);

let checked = 0;
for (const file of files.filter(name => /\.(mjs|html|css)$/.test(name))) {
  const source = await readFile(new URL(file, root), 'utf8');
  const patterns = file.endsWith('.mjs') ? [
    /\b(?:from\s*|import\s*(?:\(\s*)?)["']([^"']+)["']/g,
    /\bnew URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url/g
  ] : file.endsWith('.html') ? [
    /(?:src|href)=["']([^"']+)["']/g,
    /url=([^"'>\s]+)/g
  ] : [/url\(\s*["']?([^\s"')]+)["']?\s*\)/g];
  for (const pattern of patterns) for (const match of source.matchAll(pattern)) {
    const reference = match[1];
    if (/^(?:[a-z]+:|\/\/|#)/i.test(reference)) continue;
    const target = new URL(reference, new URL(file, base));
    assert(target.pathname.startsWith(base.pathname), `${file}: URL escapes the Pages project: ${reference}`);
    let relative = decodeURIComponent(target.pathname.slice(base.pathname.length));
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    assert(published.has(relative), `${file}: missing published dependency ${reference}`);
    checked++;
  }
}
// Every source asset and license must survive the build, including dynamic frame paths.
async function checkAssets(directory, prefix = 'assets/') {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    if (entry.isDirectory()) await checkAssets(new URL(entry.name + '/', directory), prefix + entry.name + '/');
    else {
      const file = prefix + entry.name;
      assert(published.has(file), `Missing published asset: ${file}`);
      assert.equal((await stat(new URL(file, root))).size,
        (await stat(new URL(entry.name, directory))).size, `Truncated asset: ${file}`);
    }
  }
}
await checkAssets(new URL('../poker-web/assets/', import.meta.url));
console.log(`Verified ${files.length} release files and ${checked} references under ${base.pathname}`);
