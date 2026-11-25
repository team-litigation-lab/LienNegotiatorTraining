// One failed read of the trainee's record (a 500, a network blip) must never save an empty record over the real one
// (platform QA 2026-11-19, LN finding 1). The trainee finishes a step, reloads with the record's read failing once, works on,
// and the record (and progress:<id>) on the server keeps every finished step.
// Usage: node .github/scripts/load-fail.cjs http://localhost:8787/   (server.mjs with PORTAL_SSO_SECRET=ci-portal)
const { chromium } = require('playwright');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const BASE = process.argv[2] || 'http://localhost:8787/';
const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ticket = (t) => { const p = b64u(JSON.stringify(Object.assign({ p: 'LIEN NEGOTIATION' }, t))); return `${p}.${b64u(crypto.createHmac('sha256', 'portal-sso:ci-portal').update(p).digest())}`; };

(async () => {
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(BASE + '?ticket=' + encodeURIComponent(ticket({ first: 'Lo', last: 'Adfail', b: 'B100926', exp: Date.now() + 300000 })));
  await p.waitForSelector('.day-card');
  // a finished day and some saved work, as the page saves them
  await p.evaluate(async () => {
    state.trainee.dayProgress[1] = { done: true, step: 3, modules: { x: true } }; saveTrainee();
    state.progress.answers = { q: ['my saved answer'] }; saveProgress();
    await new Promise((r) => setTimeout(r, 1200));
  });
  const read = (key) => p.evaluate(async (k) => (await api('/api/storage/get', { key: k })).value, key);
  const before = JSON.parse(await read('trainee:' + await p.evaluate(() => state.traineeId)));
  assert.equal(before.dayProgress[1].done, true, 'the finished day was saved');
  // reload: the record's read fails once
  let failed = 0;
  await p.route('**/api/storage/get', async (route) => {
    const body = route.request().postDataJSON() || {};
    if (!failed && /^trainee:/.test(body.key || '')) { failed++; return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' }); }
    return route.continue();
  });
  await p.reload();
  await p.waitForTimeout(2500);
  assert.equal(failed, 1, 'the read failed once');
  // the trainee carries on (a step, an answer): nothing may be saved over the real record
  await p.evaluate(async () => { try { saveTrainee(); saveProgress(); } catch (e) {} await new Promise((r) => setTimeout(r, 1200)); });
  await p.unroute('**/api/storage/get');
  const id = await p.evaluate(() => state.traineeId);
  const after = JSON.parse(await read('trainee:' + id));
  assert.ok(after.dayProgress && after.dayProgress[1] && after.dayProgress[1].done === true, 'the record still has the finished day: ' + JSON.stringify(after.dayProgress));
  assert.notEqual(after.name, id, 'the name was not replaced by the id');
  const prog = JSON.parse(await read('progress:' + id));
  assert.deepEqual(prog.answers, { q: ['my saved answer'] }, 'the saved work is untouched');
  await browser.close();
  console.log('OK: a failed read never saves over the trainee\'s record or work.');
})().catch((e) => { console.error(e); process.exit(1); });
