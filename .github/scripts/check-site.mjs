// Syntax and files: every JavaScript file and inline <script> parses, every local file index.html loads exists,
// and every day in js/ln-course.js has modules the page can embed.
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
let n = 0;
for (const d of LN_COURSE.days) {
  if (days.has(d.day)) fail.push(`js/ln-course.js: day ${d.day} repeats`);
  days.add(d.day);
  if (!d.title || !d.theme || !Array.isArray(d.modules) || !d.modules.length) fail.push(`js/ln-course.js: day ${d.day} needs a title, a theme and modules`);
  if (!Array.isArray(d.objectives) || !d.objectives.length || !Array.isArray(d.topics) || !d.topics.length || d.topics.some((t) => !t.h)) fail.push(`js/ln-course.js: day ${d.day} needs objectives and topics`);
  for (const m of d.modules || []) {
    n++;
    if (ids.has(m.id)) fail.push(`js/ln-course.js: module id ${m.id} repeats`);
    ids.add(m.id);
    if (!['deck', 'video', 'files', 'questions', 'guide', 'lab'].includes(m.kind)) fail.push(`js/ln-course.js: ${m.id} kind must be deck, video, files, questions, guide or lab`);
    if (m.kind === 'lab' && !['day2', 'day3'].includes(m.stage)) fail.push(`js/ln-course.js: ${m.id} (lab) needs stage "day2" or "day3"`);
    else if ((m.kind === 'deck' || m.kind === 'video') && !lnEmbed.embed(m.kind, m.link)) fail.push(`js/ln-course.js: ${m.id} is not a ${m.kind === 'video' ? 'drive.google.com/file/d/…' : 'canva.com/design/…'} link: ${m.link}`);
    if (m.kind === 'files' && (!Array.isArray(m.items) || !m.items.length || m.items.some((x) => !x.title || !lnEmbed.video(x.link)))) fail.push(`js/ln-course.js: ${m.id} needs items, each a title and a drive.google.com/file/d/… link`);
    if (m.kind === 'questions' && (!Array.isArray(m.questions) || !m.questions.length || m.questions.some((q) => !q.q))) fail.push(`js/ln-course.js: ${m.id} needs questions`);
    if (m.kind === 'guide' && (!Array.isArray(m.sections) || !m.sections.length)) fail.push(`js/ln-course.js: ${m.id} needs sections`);
    if (m.kind === 'deck' && /\/edit\b/.test(m.link)) fail.push(`js/ln-course.js: ${m.id} is a Canva editor link; use the /view link`);
  }
}
// The Lien Desk's cases (js/ln-desk-cases.js): every case is complete, and its numbers hold together.
const dctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/ln-desk-cases.js'), 'utf8'), dctx);
const CASES = dctx.window.LN_CASES || [];
if (!CASES.length) fail.push('js/ln-desk-cases.js has no cases');
const cids = new Set();
for (const c of CASES) {
  const at = `js/ln-desk-cases.js ${c.id}`;
  if (cids.has(c.id)) fail.push(`${at}: the id repeats`); cids.add(c.id);
  for (const k of ['client', 'dol', 'caseNo', 'facts', 'settlements', 'fee', 'costs', 'payees', 'challenges']) if (!c[k]) fail.push(`${at}: missing ${k}`);
  if (!c.settlements || !c.settlements.length || c.settlements.some((s) => !['BI', 'UM'].includes(s.type) || !(s.amount > 0) || !s.carrier || !s.claimNo)) fail.push(`${at}: every settlement needs type BI/UM, carrier, claimNo and amount`);
  const ps = c.payees || [];
  if (!ps.some((p) => p.lien && /health subrogation/i.test(p.type))) fail.push(`${at}: needs a health subrogation lien`);
  if (!ps.some((p) => p.lien && /pre-settlement funding/i.test(p.type))) fail.push(`${at}: needs a pre-settlement funding lien`);
  const keys = ps.map((p) => p.name.toLowerCase().split(/[\s—–,-]+/).filter((w) => w && !['the', 'of'].includes(w))[0]);
  keys.forEach((k, i) => { if (keys.some((x, j) => j !== i && (x.includes(k) || k.includes(x)))) fail.push(`${at}: payee names must start with distinct words (the Net Sheet finds rows by them): ${ps[i].name}`); });
  if (new Set(ps.map((p) => p.email)).size !== ps.length) fail.push(`${at}: every payee needs its own email address`);
  for (const p of ps) {
    const bal = p.lien ? p.amount : p.lines.reduce((s, l) => s + l.amount, 0) - (p.pip || 0) - (p.health || 0) - (p.adj || 0);
    if (!(bal >= 0)) fail.push(`${at} ${p.id}: the balance is below zero`);
    if (!/\.example$/.test(p.email || '')) fail.push(`${at} ${p.id}: emails end in .example (nothing can be sent)`);
    if (p.reduce && p.reduce.floor != null && !(p.reduce.floor > 0 && p.reduce.floor < bal)) fail.push(`${at} ${p.id}: the reduction floor must be above $0 and below the current balance (${bal})`);
    if (/pre-settlement funding/i.test(p.type) && !(p.onFile && p.onFile.amount < p.amount)) fail.push(`${at} ${p.id}: a funding lien's payoff on file must be out of date (onFile.amount below the current payoff)`);
    if (/health subrogation/i.test(p.type) && Math.abs(p.amount - ps.filter((x) => !x.lien).reduce((s, x) => s + (x.health || 0), 0)) > 0.005) fail.push(`${at} ${p.id}: the health lien must equal what the plan paid on the providers' bills`);
  }
  if (!/\.example$/.test(c.client.email || '')) fail.push(`${at}: the client's email ends in .example`);
}
if (/answer key/i.test(JSON.stringify(LN_COURSE).replace(/answer keys are not on this page/i, ''))) fail.push('js/ln-course.js mentions an answer key: keep answer keys off this public page');
if (fail.length) { console.error(fail.join('\n')); process.exit(1); }
console.log(`OK: scripts parse, index.html's files exist, ${LN_COURSE.days.length} days and ${n} modules embed, ${CASES.length} Lien Desk case(s) hold together.`);
