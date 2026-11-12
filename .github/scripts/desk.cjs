// The Lien Desk, played end to end in a browser on John Doe (the demo's own case, Activity 1.2 + the closing statement activity), the way a trainee works it on
// Days 2 and 3: the release round-trip to the trainer, the initial Net Sheet, the Reduction Requests, an updated bill
// and an updated payoff, the reduction answers (a counter-offer below the floor, a waiver), the final Net Sheet, the
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
  // every trainee works the same case here: John Doe, the demo's own case (what a trainer's assignment does)
  await p.evaluate(() => { state.deskAssign = 'johndoe'; });
  await p.click('.nav button:has-text("Lien Desk")');
  await p.waitForSelector('.ld-head');
  assert.match(await p.textContent('.ld-case h1'), /John Doe/);
  await p.click('button:has-text("Watch the demo recording")');
  await p.waitForSelector('#lecture-viewer-pane.open');
  assert.match(await p.getAttribute('#lecture-viewer-body iframe', 'src'), /drive\.google\.com\/file\/d\/1EcVjtKuR-cYQ-K3QomaADzBiJ05Apu6X\/preview/);
  await p.click('#lecture-viewer-close');

  const W = 'state.progress.desk.cases.johndoe';
  const tab = (name) => p.click(`.ld-tabs button:has-text("${name}")`);
  const tasksOk = (stage) => p.evaluate((s) => LNDesk.tasks(s).map((t) => t.ok), stage);
  const lastIn = () => p.evaluate(() => { const w = state.progress.desk.cases.johndoe; const m = w.mail.filter((x) => x.dir === 'in').slice(-1)[0]; return m ? { subject: m.subject, body: m.body, att: (m.att || []).map((a) => a.name) } : null; });
  const inCount = () => p.evaluate(() => state.progress.desk.cases.johndoe.mail.filter((x) => x.dir === 'in').length);
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
    await p.waitForFunction((n) => state.progress.desk.cases.johndoe.mail.filter((x) => x.dir === 'in').length > n, before, { timeout: 8000 });
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
  const rel = await p.locator('.ld-doc').getAttribute('srcdoc');
  assert.match(rel, /Release of All Claims/); assert.match(rel, /John Doe and Mary Doe/, 'the spouse joins the release');
  let r = await send('training@lshlawfirm.example', 'Settlement Release | DOE, JOHN', 'Good day! Please see the attached release.', []);
  assert.match(r.body, /don't see the settlement release attached/, 'no attachment: the trainer asks for it');
  r = await send('training@lshlawfirm.example', 'Settlement Release | DOE, JOHN', 'Good day! Attached is the settlement release.', [['Settlement Release Form · BI']]);
  assert.match(r.subject, /Fully Executed Release/); assert.equal(r.att.length, 1);
  await tab('Email'); // reading the inbox records the arrival
  // the demo's own initial Net Sheet: each balance squared with the PIP log (Colonnade $6,272.66, not its ledger's $6,286.20)
  await fill({ S1c: 'Gulfline Casualty Company', S1n: '8678440420-2', S1a: 10000, FEE: '1/3', X1a: 414, X6a: 28.48, X8a: 250,
    M1t: 'Chiro', M1p: 'Colonnade Post Rehab Center', M1c: 14130.79, M1pip: 6272.66,
    M2t: 'MRI', M2p: 'Shreeve MRI', M2c: 5400, M2pip: 2974.62, M2adj: 1681.73,
    M3t: 'EMC', M3p: 'MediVista Inc', M3c: 625, M3pip: 456.45,
    M4p: 'Palmetto Urgent Care', M4c: 480, M4hea: 312, M4adj: 168, M5p: 'Sunshine Health Plan', M5c: 312,
    N1p: 'Harbor Pre-Settlement Funding', N1bal: 1240 });
  await p.click('button:has-text("Check initial sheet")');
  const ini = await p.evaluate(() => state.progress.desk.cases.johndoe.checks.initial);
  assert.ok(ini.ok, `the initial sheet ties out: ${JSON.stringify(ini)}`);
  const RR = { Colonnade: [6272.66, 7858.13, 600], Shreeve: [2974.62, 743.65, 250], MediVista: [456.45, 168.55, 0], Sunshine: [0, 312, 208] };
  for (const [nm, [pip, bal, req]] of Object.entries(RR))
    await draft(`Reduction Request · ${nm}`, Object.assign({ file: `MED - ${nm} - Reduction Request (Ada)`, client: 'JOHN DOE', dob: '08/13/1990', dol: '07/01/2025', balance: bal, requested: req }, nm === 'Sunshine' ? {} : { pip }));
  assert.match(await p.locator('.ld-prev iframe').getAttribute('srcdoc'), /BILL REDUCTION REQUEST/);
  assert.deepEqual(await tasksOk('day2'), [true, true, true, true, true], 'Day 2 is done');
  assert.equal(await p.evaluate(() => LNDesk.grade('day2').score), 100, 'the automated grader: a perfect Day 2');

  // ---- Day 3 ----
  r = await send('billing@colonnaderehab.example', 'Updated bill request', 'Please send an updated itemized statement.', []);
  assert.match(r.body, /unable to locate this account/, 'without the client and DOL the provider can\'t find the account');
  r = await send('billing@colonnaderehab.example', 'Updated Itemized Statement Request | DOE, JOHN', 'Good day! Please send the updated itemized statement for John Doe, DOL 07/01/2025.', []);
  assert.match(r.body, /current balance is \$7,858\.13/); assert.match(r.att[0], /Updated Itemized Statement/);
  r = await send('payoffs@harborpsf.example', 'Updated Payoff Request | DOE, JOHN', 'Good day! Please send an updated payoff for John Doe, DOL 07/01/2025.', []);
  assert.match(r.body, /\$1,315\.00/);
  r = await send('billing@shreevemri.example', 'Reduction | DOE, JOHN', 'John Doe, DOL 07/01/2025: please see our request.', [['Shreeve']]);
  assert.match(r.body, /Billing Reduction Request \| DOE, JOHN/, 'a wrong subject line gets the routing reply');
  const subj = 'Billing Reduction Request | DOE, JOHN', body = 'Good day!\n\nWe would like to take this opportunity to thank you for the excellent medical care and treatment provided to our client- DOE, JOHN - DOL 07/01/2025. Kindly see the attached bill reduction request for our client.';
  r = await send('billing@colonnaderehab.example', subj, body, [['Colonnade']]); assert.match(r.body, /lowest we can accept is \$700\.00/, 'below the floor: a counter-offer');
  r = await send('billing@shreevemri.example', subj, body, [['Shreeve']]); assert.match(r.body, /accept \$250\.00/);
  r = await send('billing@medivista.example', subj, body, [['MediVista']]); assert.match(r.body, /agree to waive/, 'a $0.00 request is a waiver');
  r = await send('recovery@sunshinehealthplan.example', subj, body, [['Sunshine']]); assert.match(r.body, /accept \$208\.00/);
  await fill({ M1red: 700, M2red: 250, M3red: 0, M4red: 0, M5red: 208, N1bal: 1315, N1red: 1315 });
  await p.click('button:has-text("Check final sheet")');
  const fin = await p.evaluate(() => state.progress.desk.cases.johndoe.checks.final);
  assert.ok(fin.ok, `the final sheet ties out: ${JSON.stringify(fin)}`);
  assert.equal(await p.evaluate(() => LNDesk.expected('final').net), 3501.19);   // the demo's $5,024.19, less the health lien and the funding payoff
  await draft('Closing Statement', { file: 'John Doe – Closing Statement (Ada Desk)', gross: 10000, feePct: '33.33%', fee: 3333.33, costs: 692.48,
    'pay.colonnade': 700, 'pay.shreeve': 250, 'pay.medivista': 0, 'pay.palmetto': 0, 'pay.sunshine': 208, 'pay.harbor': 1315, net: 3501.19 });
  const cs = await p.locator('.ld-prev iframe').getAttribute('srcdoc');
  assert.match(cs, /SETTLEMENT CLOSING STATEMENT AND INSTRUCTION FOR DISTRIBUTION/i); assert.match(cs, /JOHN DOE &amp; MARY DOE/); assert.match(cs, /as husband and wife/); assert.match(cs, /\(Waived\)/);
  r = await send('john.doe@mail.example', 'DOE, JOHN - Closing Statement and Settlement Release Form/s',
    'Good day!\n\nCongratulations on your case settlement! Please find attached your closing statement and settlement release for your review and signature.',
    [['John Doe – Closing Statement'], ['Settlement Release Form · BI', 'John Doe – Settlement Release Form BI']]);
  assert.match(r.body, /signed them/); await tab('Email');
  assert.deepEqual(await tasksOk('day3'), [true, true, true, true, true, true], 'Day 3 is done');
  // the grader: three replies asked for a fix (the release not attached, no client name / DOL, a wrong subject line):
  // email conventions 4/10, so 94
  const g3 = await p.evaluate(() => LNDesk.grade('day3'));
  assert.equal(g3.items.find((i) => /conventions/.test(i.label)).got, 4); assert.equal(g3.score, 94); assert.ok(g3.pass);
  await tab('Tasks'); assert.match(await p.textContent('.ld-grade:last-child'), /94/);
  // the Final Net Sheet, embedded in Day 3's step: the same sheet, with its figures
  await p.click('.nav button:has-text("Day 3")'); await p.waitForSelector('.obj-list');
  await p.click('.stage-bar .btn-primary'); await p.click('text=Slide Map');
  await p.locator('#overlay .map-list button', { hasText: 'Final Net Sheet' }).click();
  await p.waitForSelector('.ns-embed .ld-sheet');
  assert.equal(await p.inputValue('.ns-embed .ld-in[data-k="M1red"]'), '700');
  await p.click('.ns-embed button:has-text("Check final sheet")');
  await p.waitForSelector('.ns-embed .ld-check');
  assert.match(await p.textContent('.ns-embed .ld-check'), /ties out/);

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
    assert.ok(Number.isFinite(x.net), `${id}: the case's figures compute`);   // (the net after reductions is checked in check-site.mjs)
  }

  await browser.close();
  if (errors.length) { console.error('Page errors:\n' + errors.join('\n')); process.exit(1); }
  console.log('OK: the Lien Desk plays a case end to end.');
})().catch((e) => { console.error(e); process.exit(1); });
function browser0() { return chromium.launch(); }
