// The Lien Desk, played end to end in a browser on the first case (Sarah Miller), the way a trainee works it on
// Days 2 and 3: the release round-trip to the trainer, the initial Net Sheet, the Reduction Requests, an updated bill
// and an updated payoff, the reduction answers (one below the floor gets a counter-offer), the final Net Sheet, the
// Closing Statement, and the client's signature. It also checks the simulator's realistic refusals (no client name or
// DOL, a wrong subject line, a stale balance) and that the Day 2 / Day 3 steps in the course follow the desk.
// Usage: node .github/scripts/desk.cjs http://localhost:8787/   (server.mjs with PORTAL_SSO_SECRET=ci-portal)
const { chromium } = require('playwright');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const BASE = process.argv[2] || 'http://localhost:8787/';
const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ticket = (t) => { const p = b64u(JSON.stringify(t)); return `${p}.${b64u(crypto.createHmac('sha256', 'portal-sso:ci-portal').update(p).digest())}`; };

(async () => {
  const browser = await browser0();
  const errors = [];
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(BASE + '?ticket=' + encodeURIComponent(ticket({ first: 'Ada', last: 'Desk', b: 'B100926', exp: Date.now() + 300000 })));
  await p.waitForSelector('.day-card');
  // every trainee works the same case here: pin it to Sarah Miller (what a trainer's assignment does)
  await p.evaluate(() => { state.deskAssign = 'miller'; });
  await p.click('.nav button:has-text("Lien Desk")');
  await p.waitForSelector('.ld-head');
  assert.match(await p.textContent('.ld-case h1'), /Sarah Miller/);
  await p.click('button:has-text("Watch the demo recording")');
  await p.waitForSelector('#lecture-viewer-pane.open');
  assert.match(await p.getAttribute('#lecture-viewer-body iframe', 'src'), /drive\.google\.com\/file\/d\/1EcVjtKuR-cYQ-K3QomaADzBiJ05Apu6X\/preview/);
  await p.click('#lecture-viewer-close');

  const tab = (name) => p.click(`.ld-tabs button:has-text("${name}")`);
  const tasksOk = (stage) => p.evaluate((s) => LNDesk.tasks(s).map((t) => t.ok), stage);
  const lastIn = () => p.evaluate(() => { const w = state.progress.desk.cases.miller; const m = w.mail.filter((x) => x.dir === 'in').slice(-1)[0]; return m ? { subject: m.subject, body: m.body, att: (m.att || []).map((a) => a.name) } : null; });
  const inCount = () => p.evaluate(() => state.progress.desk.cases.miller.mail.filter((x) => x.dir === 'in').length);
  async function send(to, subject, body, attach) {
    await tab('Email');
    await p.click('.ld-new');
    await p.selectOption('#ldTo', { value: to });
    await p.fill('#ldSubj', subject);
    await p.fill('#ldBody', body);
    for (const [match, rename] of attach || []) {
      const row = p.locator('.ld-att-row').filter({ has: p.locator(`.ld-att-name[value*="${match}"]`) }).first();
      await row.locator('input[type=checkbox]').check();
      if (rename) await row.locator('.ld-att-name').fill(rename);
    }
    const before = await inCount();
    await p.click('.ld-compose .btn-primary');
    await p.waitForFunction((n) => state.progress.desk.cases.miller.mail.filter((x) => x.dir === 'in').length > n, before, { timeout: 8000 });
    return lastIn();
  }
  async function fill(cells) { await tab('Net Sheet'); for (const [k, v] of Object.entries(cells)) await p.fill(`.ld-in[data-k="${k}"]`, String(v)); }
  async function draft(label, fields) {
    await tab('Drafts');
    await p.click(`.ld-list button:has-text("${label}")`);
    for (const [k, v] of Object.entries(fields)) await p.fill(`.ld-form [data-${k.startsWith('pay.') ? 'p' : 'd'}="${k.replace('pay.', '')}"]`, String(v));
    await p.click('.ld-form button:has-text("Save draft")');
  }

  // ---- Day 2 ----
  await tab('Case File');
  await p.click('.ld-list button:has-text("Settlement Release Form · BI")');
  assert.match(await p.locator('.ld-doc').getAttribute('srcdoc'), /Release of All Claims/);
  let r = await send('training@lshlawfirm.example', 'Settlement Release | MILLER, SARAH', 'Good day! Please see the attached release.', []);
  assert.match(r.body, /don't see the settlement release attached/, 'no attachment: the trainer asks for it');
  r = await send('training@lshlawfirm.example', 'Settlement Release | MILLER, SARAH', 'Good day! Attached is the settlement release.', [['Settlement Release Form · BI']]);
  assert.match(r.subject, /Fully Executed Release/); assert.equal(r.att.length, 1);
  await tab('Email'); // reading the inbox records the arrival
  await fill({ L7: 25000, C11: '33⅓%', B12: 'Police report', L12: 25, B13: 'Records', L13: 145.5, B14: 'Postage', L14: 38.2,
    C25: 'Mercy General ER', D25: 4850, C26: 'Align Chiropractic', D26: 4320, C27: 'Clearview Imaging', D27: 1850,
    C28: 'Northside PT', D28: 1600, F28: 960, G28: 640, C29: 'Blue Horizon Health Plan', D29: 960, C30: 'Summit Legal Funding', D30: 2145 });
  await p.click('button:has-text("Check initial sheet")');
  const ini = await p.evaluate(() => state.progress.desk.cases.miller.checks.initial);
  assert.ok(ini.ok, `the initial sheet ties out: ${JSON.stringify(ini)}`);
  const RR = { mercy: ['Mercy General', 4850, 0, 4850, 3600], align: ['Align', 4320, 0, 4320, 2880], clearview: ['Clearview', 1850, 0, 1850, 1295], bluehorizon: ['Blue Horizon', 960, 0, 960, 640] };
  for (const [id, [nm, ch, pd, bal, req]] of Object.entries(RR))
    await draft(`Reduction Request · ${nm}`, { file: `MED - ${nm} - Reduction Request (Ada)`, client: 'MILLER, SARAH', dol: '03/10/2026', charges: ch, paid: pd, balance: bal, requested: req });
  assert.deepEqual(await tasksOk('day2'), [true, true, true, true, true], 'Day 2 is done');

  // ---- Day 3 ----
  r = await send('billing@mercygeneral.example', 'Updated bill request', 'Please send an updated itemized statement.', []);
  assert.match(r.body, /unable to locate this account/, 'without the client and DOL the provider can\'t find the account');
  r = await send('billing@mercygeneral.example', 'Updated Itemized Statement Request | MILLER, SARAH', 'Good day! Please send the updated itemized statement for Sarah Miller, DOL 03/10/2026.', []);
  assert.match(r.body, /current balance is \$2,350\.00/); assert.match(r.att[0], /Updated Itemized Statement/);
  r = await send('payoffs@summitlegalfunding.example', 'Updated Payoff Request | MILLER, SARAH', 'Good day! Please send an updated payoff for Sarah Miller, DOL 03/10/2026.', []);
  assert.match(r.body, /\$2,235\.00/);
  r = await send('billing@clearviewimaging.example', 'Reduction | MILLER, SARAH', 'Sarah Miller, DOL 03/10/2026: please see our request.', [['Clearview']]);
  assert.match(r.body, /Billing Reduction Request \| MILLER, SARAH/, 'a wrong subject line gets the routing reply');
  // Mercy: the draft still has the out-of-date balance → the provider says so; then a request below the floor → counter-offer
  await draft('Reduction Request · Mercy General', { balance: 2350, charges: 4850, paid: 2500, requested: 1700 });
  const subj = 'Billing Reduction Request | MILLER, SARAH', body = 'Good day! We would like to thank you for the care provided to our client, MILLER, SARAH - DOL 03/10/2026. Kindly see the attached bill reduction request.';
  r = await send('billing@mercygeneral.example', subj, body, [['Mercy General']]);
  assert.match(r.body, /lowest we can accept is \$1,762\.50/);
  r = await send('accounts@alignchiro.example', subj, body, [['Align']]); assert.match(r.body, /accept \$2,880\.00/);
  r = await send('billing@clearviewimaging.example', subj, body, [['Clearview']]); assert.match(r.body, /accept \$1,295\.00/);
  r = await send('recovery@bluehorizonhealth.example', subj, body, [['Blue Horizon']]); assert.match(r.body, /accept \$640\.00/);
  await fill({ L25: 1762.5, L26: 2880, L27: 1295, L28: 0, L29: 640, L30: 2235 });
  await p.click('button:has-text("Check final sheet")');
  const fin = await p.evaluate(() => state.progress.desk.cases.miller.checks.final);
  assert.ok(fin.ok, `the final sheet ties out: ${JSON.stringify(fin)}`);
  assert.equal(await p.evaluate(() => LNDesk.expected('final').net), 7645.47);
  await draft('Closing Statement', { file: 'Sarah Miller – Closing Statement (Ada Desk)', gross: 25000, feePct: '33⅓%', fee: 8333.33, costs: 208.7,
    'pay.mercy': 1762.5, 'pay.align': 2880, 'pay.clearview': 1295, 'pay.northside': 0, 'pay.bluehorizon': 640, 'pay.summit': 2235, net: 7645.47 });
  r = await send('sarah.miller@mail.example', 'MILLER, SARAH - Closing Statement and Settlement Release Form/s',
    'Good day!\n\nCongratulations on your case settlement! Please find attached your closing statement and settlement release for your review and signature.',
    [['Sarah Miller – Closing Statement'], ['Settlement Release Form · BI', 'Sarah Miller – Settlement Release Form BI']]);
  assert.match(r.body, /signed them/); await tab('Email');
  assert.deepEqual(await tasksOk('day3'), [true, true, true, true, true, true], 'Day 3 is done');

  // the course's Day 3 step follows the desk
  await p.click('.nav button:has-text("Day 3")'); await p.waitForSelector('.obj-list');
  await p.click('.stage-bar .btn-primary'); await p.click('text=Slide Map');
  await p.locator('#overlay .map-list button', { hasText: 'Case Activity' }).click();
  assert.equal(await p.locator('.lab-tasks li.ok').count(), 6);
  await p.waitForTimeout(900);   // the save is debounced
  await p.reload(); await p.waitForSelector('.stage');   // a trainee resumes where they left off: the Day 3 step
  assert.equal(await p.evaluate(() => LNDesk.tasks('day3').every((t) => t.ok)), true, 'the desk is saved to the account');

  // every case opens: each document, each draft, the Net Sheet and the tasks, with no page error
  for (const id of await p.evaluate(() => LNDesk.cases.map((c) => c.id))) {
    await p.evaluate((x) => { state.deskAssign = x; goto('desk'); }, id);
    await p.waitForSelector('.ld-head');
    await tab('Case File');
    const n = await p.locator('.ld-list button').count();
    assert.ok(n >= 8, `${id}: a full case file (${n} documents)`);
    for (let i = 0; i < n; i++) { await p.locator('.ld-list button').nth(i).click(); assert.ok((await p.locator('.ld-doc').getAttribute('srcdoc')).length > 500, `${id}: document ${i} renders`); }
    await tab('Drafts');
    for (let i = 0; i < await p.locator('.ld-list button').count(); i++) await p.locator('.ld-list button').nth(i).click();
    await tab('Net Sheet'); await tab('Tasks');
    const x = await p.evaluate(() => LNDesk.expected('final'));
    assert.ok(x.net > 0, `${id}: a positive net`);
  }

  await browser.close();
  if (errors.length) { console.error('Page errors:\n' + errors.join('\n')); process.exit(1); }
  console.log('OK: the Lien Desk plays a case end to end.');
})().catch((e) => { console.error(e); process.exit(1); });
function browser0() { return chromium.launch(); }
