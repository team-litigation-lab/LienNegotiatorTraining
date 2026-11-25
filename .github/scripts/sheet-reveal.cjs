// The Net Sheet's Check says which lines don't tie out and where to look, never the figure or a payee's name, and a figure the
// trainee asks to see ("Show me (no credit)") earns nothing in the grade (platform QA 2026-11-19, LN findings 2 and 3).
// Usage: node .github/scripts/sheet-reveal.cjs http://localhost:8787/   (server.mjs with PORTAL_SSO_SECRET=ci-portal)
const { chromium } = require('playwright');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const BASE = process.argv[2] || 'http://localhost:8787/';
const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ticket = (t) => { const p = b64u(JSON.stringify(Object.assign({ p: 'LIEN NEGOTIATION' }, t))); return `${p}.${b64u(crypto.createHmac('sha256', 'portal-sso:ci-portal').update(p).digest())}`; };
(async () => {
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(BASE + '?ticket=' + encodeURIComponent(ticket({ first: 'Rev', last: 'Eal', b: 'B100926', exp: Date.now() + 300000 })));
  await p.waitForSelector('.day-card');
  await p.evaluate(() => { state.deskAssign = 'johndoe'; });
  await p.click('.nav button:has-text("Lien Desk")'); await p.waitForSelector('.ld-head');
  await p.click('.ld-tabs button:has-text("Net Sheet")');
  await p.click('button:has-text("Check initial sheet")'); await p.waitForSelector('.ld-check');
  const x = await p.evaluate(() => LNDesk.expected('initial'));
  const txt = await p.textContent('.ld-check');
  assert.doesNotMatch(txt, /the file says/, 'a blank check shows no figure');
  for (const r of x.rows) assert.ok(!txt.includes(r.p.name), `a blank check doesn't name ${r.p.name}`);
  assert.ok(!txt.includes(Number(x.gross).toLocaleString('en-US', { minimumFractionDigits: 2 })), 'nor the settlement amount');
  // Show me: the figure shows, and the line earns no credit even once typed in
  await p.click('.ld-check li:has-text("Settlement amount") button:has-text("Show me")');
  assert.match(await p.textContent('.ld-check li:has-text("Settlement amount")'), /the file says/);
  await p.fill('input[data-k="S1a"]', String(x.gross)); await p.dispatchEvent('input[data-k="S1a"]', 'input');
  await p.click('button:has-text("Check initial sheet")');
  const ck = await p.evaluate(() => state.progress.desk.cases.johndoe.checks.initial);
  const items = await p.evaluate(() => [...document.querySelectorAll('.ld-check li')].map((li) => li.className + ' ' + li.textContent));
  assert.ok(items.some((t) => /^ok .*Settlement amount.*no credit/.test(t)), 'the shown line ties out, marked no credit: ' + items[0]);
  assert.equal(ck.revealed, 1); assert.equal(ck.passed, items.filter((t) => t.startsWith('ok')).length - 1, 'the shown line is left out of the lines that earn credit');
  await browser.close();
  console.log('OK: the Net Sheet check gives no figures away, and a shown figure earns no credit.');
})().catch((e) => { console.error(e); process.exit(1); });
