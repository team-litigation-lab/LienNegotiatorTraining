// Syntax and files: every JavaScript file and inline <script> parses, every local file index.html loads exists,
// and every module in js/ln-course.js has a deck and a video the page can embed.
// Usage: node .github/scripts/check-site.mjs   (run from the repository root)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const fail = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === '.git' || e.name === 'node_modules' ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(ROOT).filter((f) => /\.(c?js)$/.test(f))) {
  try { new vm.Script(fs.readFileSync(f, 'utf8').replace(/^export default/m, 'const __x =').replace(/^export /gm, ''), { filename: f }); }
  catch (e) { fail.push(`${path.relative(ROOT, f)}: ${e.message}`); }
}
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { new vm.Script(m[1]); } catch (e) { fail.push(`index.html inline script ${i + 1}: ${e.message}`); } });
const refs = [...html.matchAll(/(?:src|href)="(\/?[^"#:]+?)(?:\?[^"]*)?"/g)].map((m) => m[1]).filter((r) => !r.startsWith("//") && !r.includes("${"));
for (const r of new Set(refs)) if (!fs.existsSync(path.join(ROOT, r.replace(/^\//, '')))) fail.push(`index.html loads ${r}, which doesn't exist`);
JSON.parse(fs.readFileSync(path.join(ROOT, 'wrangler.json'), 'utf8'));

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/ln-course.js'), 'utf8'), ctx);
const { LN_COURSE, lnEmbed } = ctx.window;
const ids = new Set(), days = new Set();
for (const m of LN_COURSE.modules) {
  if (ids.has(m.id) || days.has(m.day)) fail.push(`js/ln-course.js: ${m.id} repeats a module id or day`);
  ids.add(m.id); days.add(m.day);
  if (!lnEmbed.deck(m.deck)) fail.push(`js/ln-course.js: ${m.id} deck is not a canva.com/design/… link: ${m.deck}`);
  if (/\/edit\b/.test(m.deck)) fail.push(`js/ln-course.js: ${m.id} deck is an editor link; use the /view link`);
  if (!lnEmbed.video(m.video)) fail.push(`js/ln-course.js: ${m.id} video is not a drive.google.com/file/d/… link: ${m.video}`);
}
if (fail.length) { console.error(fail.join('\n')); process.exit(1); }
console.log(`OK: scripts parse, index.html's files exist, ${LN_COURSE.modules.length} modules embed.`);
