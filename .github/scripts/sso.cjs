// Single sign-on, straight against worker.js (no browser): the Portal's ticket signs a trainee in and approves
// them, a ticket signed with another secret or out of date is refused with its reason, an admin ticket works once,
// a name + batch typed here is refused, a missing PORTAL_SSO_SECRET says so, and a trainee reads and writes
// only their own records (never their approval).
// Usage: node .github/scripts/sso.cjs   (run from the repository root)
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const SECRET = 'portal-test-secret';
const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
// A Portal ticket names the program it is for (p, its topic key: the Portal's makeTicket); p: undefined leaves it out.
const PORTAL_TOPIC = 'LIEN NEGOTIATION';
const ticket = (t, secret = SECRET) => { const p = b64u(JSON.stringify(Object.assign({ p: PORTAL_TOPIC }, t))); return `${p}.${b64u(crypto.createHmac('sha256', 'portal-sso:' + secret).update(p).digest())}`; };

(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map();
  const KV = { get: async (k) => store.get(k) ?? null, put: async (k, v) => { store.set(k, String(v)); }, delete: async (k) => { store.delete(k); },
    list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }) };
  const ASSETS = { fetch: async () => new Response('<html>APP_BUILD = "test"</html>', { headers: { 'Content-Type': 'text/html' } }) };
  const base = { LSH_KV: KV, ASSETS, MASTER_ADMIN_PASSWORD: 'admin-pass', PORTAL_SSO_SECRET: SECRET };
  const call = async (env, p, body, tok) => {
    const r = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}), body: JSON.stringify(body || {}) }), env);
    return { status: r.status, j: await r.json() };
  };
  const exp = () => Date.now() + 5 * 60 * 1000;

  let r = await call(base, '/api/auth/status');
  assert.deepEqual(r.j, { secure: true, portalOnly: true, portalSecret: true });

  r = await call(base, '/api/auth/portal', { ticket: ticket({ first: 'Jane', last: 'Doe', b: 'B100926', exp: exp() }) });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.equal(r.j.id, 'jane-doe--b100926');
  const tTok = r.j.token;
  const rec = JSON.parse(store.get('ln:trainee:jane-doe--b100926'));
  assert.equal(rec.approved, true, 'a trainee the Portal signs in is approved here');
  assert.ok([...store.keys()].every((k) => k.startsWith('ln:')), 'every key is under ln:');

  r = await call(base, '/api/auth/portal', { ticket: ticket({ first: 'Jane', last: 'Doe', b: 'B100926', exp: exp() }, 'other') });
  assert.equal(r.status, 401); assert.equal(r.j.code, 'signature');
  r = await call(base, '/api/auth/portal', { ticket: ticket({ first: 'Jane', last: 'Doe', b: 'B100926', exp: Date.now() - 1 }) });
  assert.equal(r.status, 401); assert.equal(r.j.code, 'expired');

  const aT = ticket({ r: 'a', n: 'Trainer', exp: exp() });
  r = await call(base, '/api/auth/portal', { ticket: aT });
  assert.equal(r.j.admin, true); const aTok = r.j.token;
  r = await call(base, '/api/auth/portal', { ticket: aT });
  assert.equal(r.status, 401); assert.equal(r.j.code, 'used', 'an admin ticket works once');

  r = await call(base, '/api/auth/trainee', { name: 'Jane Doe', batch: 'B100926' });
  assert.equal(r.status, 403); assert.equal(r.j.error, 'portal-required');

  r = await call(Object.assign({}, base, { PORTAL_SSO_SECRET: '' }), '/api/auth/portal', { ticket: 'x.y' });
  assert.equal(r.status, 503); assert.equal(r.j.code, 'portal-secret-missing');

  r = await call(base, '/api/auth/admin', { passphrase: 'wrong' }); assert.equal(r.status, 401);
  r = await call(base, '/api/auth/admin', { passphrase: ' admin-pass ' }); assert.equal(r.status, 200);

  // A trainee writes their own progress but never their approval, and reads no one else's record.
  const mine = Object.assign({}, rec, { approved: false, archived: false, dayProgress: { 1: { deck: true, video: true, done: true } } });
  r = await call(base, '/api/storage/set', { key: 'trainee:jane-doe--b100926', value: JSON.stringify(mine) }, tTok);
  assert.equal(r.status, 200);
  const after = JSON.parse(store.get('ln:trainee:jane-doe--b100926'));
  assert.equal(after.approved, true); assert.equal(after.dayProgress[1].done, true);
  r = await call(base, '/api/storage/get', { key: 'trainee:someone-else--b100926' }, tTok); assert.equal(r.status, 403);
  r = await call(base, '/api/storage/set', { key: 'settings:course', value: '{}' }, tTok); assert.equal(r.status, 403);
  r = await call(base, '/api/storage/list', { prefix: 'trainee:' }, tTok); assert.deepEqual(r.j.keys, []);
  r = await call(base, '/api/storage/list', { prefix: 'trainee:' }, aTok); assert.deepEqual(r.j.keys, ['trainee:jane-doe--b100926']);
  r = await call(base, '/api/storage/get', { key: 'trainee:jane-doe--b100926' }); assert.equal(r.status, 401);

  // The Lien Desk: a trainer writes a trainee's case assignment and executed release; the trainee reads only their own.
  r = await call(base, '/api/storage/set', { key: 'assign:jane-doe--b100926', value: JSON.stringify({ caseId: 'miller' }) }, aTok); assert.equal(r.status, 200);
  r = await call(base, '/api/storage/get', { key: 'assign:jane-doe--b100926' }, tTok); assert.equal(JSON.parse(r.j.value).caseId, 'miller');
  r = await call(base, '/api/storage/get', { key: 'assign:someone-else--b100926' }, tTok); assert.equal(r.status, 403);
  r = await call(base, '/api/storage/set', { key: 'assign:jane-doe--b100926', value: '{"caseId":"other"}' }, tTok); assert.equal(r.status, 403, 'a trainee cannot pick their own case');
  r = await call(base, '/api/storage/set', { key: 'release:jane-doe--b100926', value: '{}' }, tTok); assert.equal(r.status, 403, 'a trainee cannot upload an executed release');
  r = await call(base, '/api/storage/get', { key: 'release:jane-doe--b100926' }, tTok); assert.equal(r.status, 200);
  r = await call(base, '/api/checkin', { training: 'Lien Negotiator Training' }, tTok);
  assert.equal(r.j.ok, true);
  // 🎯 A Portal ticket names the program it is for (p) and works once, whoever it is for (platform QA 2026-11-19, finding 1):
  // a ticket made for another program or a tool is refused, so Program Access on the Portal stays the one gate.
  for (const p of ['SOME OTHER PROGRAM', 'kb', 'tool', '']) {
    for (const t of [{ first: 'Pat', last: 'Lane', b: 'B100926' }, { r: 'a', n: 'Trainer' }, { r: 's' }]) {
      r = await call(base, '/api/auth/portal', { ticket: ticket(Object.assign({}, t, { p, exp: exp() })) });
      assert.equal(r.status, 401, JSON.stringify([p, t, r.j])); assert.equal(r.j.code, 'audience'); assert.ok(!r.j.token);
    }
  }
  assert.ok(![...store.keys()].some((k) => /pat-lane/.test(k) && !/sso-used:/.test(k)), 'a refused ticket creates no record');
  // a ticket with no p (made before the Portal named the program) is still taken, so nobody is locked out mid-rollout
  r = await call(base, '/api/auth/portal', { ticket: ticket({ first: 'Pat', last: 'Lane', b: 'B100926', p: undefined, exp: exp() }) });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  // SSO_REQUIRE_AUDIENCE=1 (once everything is deployed): a ticket with no p is refused too; this program's own still opens
  {
    const req = Object.assign({}, base, { SSO_REQUIRE_AUDIENCE: '1' });
    r = await call(req, '/api/auth/portal', { ticket: ticket({ first: 'Pat', last: 'Lane', b: 'B100926', p: undefined, exp: exp() }) });
    assert.equal(r.status, 401); assert.equal(r.j.code, 'audience');
    r = await call(req, '/api/auth/portal', { ticket: ticket({ first: 'Pat', last: 'Lane', b: 'B100926', exp: exp() }) });
    assert.equal(r.status, 200, JSON.stringify(r.j));
  }
  // a trainee's own ticket works once, like a trainer's; and the Sign-in check's
  for (const t of [{ first: 'Pat', last: 'Lane', b: 'B100926' }, { r: 's' }]) {
    const once = ticket(Object.assign({ exp: exp() }, t));
    r = await call(base, '/api/auth/portal', { ticket: once }); assert.equal(r.status, 200, JSON.stringify(r.j));
    r = await call(base, '/api/auth/portal', { ticket: once }); assert.equal(r.status, 401); assert.equal(r.j.code, 'used');
  }
  // the full registered name is kept as fullName, the ID stays first + last + batch
  r = await call(base, '/api/auth/portal', { ticket: ticket({ first: 'Maria', last: 'Santos', b: 'B100926', full: 'Maria L. Santos', exp: exp() }) });
  assert.equal(r.j.id, 'maria-santos--b100926'); assert.equal(r.j.fullName, 'Maria L. Santos');
  assert.equal(JSON.parse(store.get('ln:trainee:maria-santos--b100926')).fullName, 'Maria L. Santos');
  // 🏅 a day's score is the Worker's copy of the Desk grade saved with the work: a score typed into the record is ignored
  {
    const rec0 = JSON.parse(store.get('ln:trainee:jane-doe--b100926'));
    const forged = Object.assign({}, rec0, { dayProgress: Object.assign({}, rec0.dayProgress, { 2: { done: true, score: 100, deskScore: 100 }, 3: { done: true, score: 100 } }) });
    r = await call(base, '/api/storage/set', { key: 'trainee:jane-doe--b100926', value: JSON.stringify(forged) }, tTok); assert.equal(r.status, 200);
    let rec = JSON.parse(store.get('ln:trainee:jane-doe--b100926'));
    assert.ok(rec.dayProgress[2].done && rec.dayProgress[2].score === undefined && rec.dayProgress[3].score === undefined, 'a score written straight into the record is dropped: ' + JSON.stringify(rec.dayProgress));
    // (any day: security review 2026-11-19)
    r = await call(base, '/api/storage/set', { key: 'trainee:jane-doe--b100926', value: JSON.stringify(Object.assign({}, rec, { dayProgress: Object.assign({}, rec.dayProgress, { 1: { done: true, score: 100 }, 9: { score: 100 } }) })) }, tTok);
    rec = JSON.parse(store.get('ln:trainee:jane-doe--b100926'));
    assert.ok(rec.dayProgress[1].score === undefined && (!rec.dayProgress[9] || rec.dayProgress[9].score === undefined), 'no day takes a score from the trainee: ' + JSON.stringify(rec.dayProgress));
    const prog = { desk: { caseId: 'miller', cases: { miller: { grade: { day2: { score: 72 }, day3: { score: 140 } } } } } };
    r = await call(base, '/api/storage/set', { key: 'progress:jane-doe--b100926', value: JSON.stringify(prog) }, tTok); assert.equal(r.status, 200);
    rec = JSON.parse(store.get('ln:trainee:jane-doe--b100926'));
    assert.equal(rec.dayProgress[2].score, 72, 'the Desk grade saved with the work is Day 2\'s score');
    assert.equal(rec.dayProgress[2].deskScore, 72);
    assert.equal(rec.dayProgress[3].score, undefined, 'a grade outside 0-100 is not copied');
  }
  // 🔁 a Batch ID changed on the Portal: the trainee keeps their record (platform QA 2026-11-19, LN finding 5)
  {
    r = await call(base, '/api/auth/portal', { ticket: ticket({ first: 'Mark', last: 'Lee', b: 'B100126', u: 'ML1', exp: exp() }) }); assert.equal(r.status, 200);
    const rec = JSON.parse(store.get('ln:trainee:mark-lee--b100126')); rec.dayProgress = { 1: { done: true } }; store.set('ln:trainee:mark-lee--b100126', JSON.stringify(rec));
    r = await call(base, '/api/auth/portal', { ticket: ticket({ first: 'Mark', last: 'Lee', b: 'B110226', u: 'ML1', exp: exp() }) });
    assert.equal(r.status, 200); assert.equal(r.j.id, 'mark-lee--b100126', 'the kept record opens');
    const kept = JSON.parse(store.get('ln:trainee:mark-lee--b100126'));
    assert.equal(kept.batch, 'B110226'); assert.equal(kept.batchFrom, 'B100126'); assert.ok(kept.dayProgress[1].done);
    assert.ok(!store.has('ln:trainee:mark-lee--b110226'), 'no empty record under the new batch');
    assert.equal(store.get('ln:trainee-alias:mark-lee--b110226'), 'mark-lee--b100126');
    const rn = await call(base, '/api/auth/trainee', { name: 'Mark Lee', batch: 'B110226' }, r.j.token);
    assert.equal(rn.status, 200, JSON.stringify(rn.j)); assert.equal(rn.j.id, 'mark-lee--b100126');
    // (data-safety review 2026-11-19) another person with the same name (another Portal account) never takes the record
    r = await call(base, '/api/auth/portal', { ticket: ticket({ first: 'Mia', last: 'Same', b: 'B100126', u: 'S1', exp: exp() }) });
    r = await call(base, '/api/auth/portal', { ticket: ticket({ first: 'Mia', last: 'Same', b: 'B110226', u: 'S2', exp: exp() }) });
    assert.equal(r.j.id, 'mia-same--b110226'); assert.equal(JSON.parse(store.get('ln:trainee:mia-same--b100126')).batch, 'B100126');
    assert.ok(!store.has('ln:trainee-alias:mia-same--b110226'));
    // and a trainee can't rewrite who their record is
    const recS = JSON.parse(store.get('ln:trainee:mia-same--b110226')); assert.equal(recS.portalUid, 'S2');
    await call(base, '/api/storage/set', { key: 'trainee:mia-same--b110226', value: JSON.stringify(Object.assign({}, recS, { name: 'Bob Victim', batch: 'B200000', portalUid: 'X' })) }, r.j.token);
    const afterS = JSON.parse(store.get('ln:trainee:mia-same--b110226'));
    assert.equal(afterS.name, 'Mia Same'); assert.equal(afterS.batch, 'B110226'); assert.equal(afterS.portalUid, 'S2');
  }
  // 🔓 signed in until 8 hours with no activity (worker.js SESSION_IDLE_HOURS, js/lsh-session.js): a trainee's and a
  // trainer's sign-in lasts 8 hours and a page in use renews it, so 7 hours away is still signed in and 9 hours away isn't
  // (a trainee's name + batch can't bring it back either). It was 12 hours for a trainer, however busy, and 30 days for a trainee.
  {
    const realNow = Date.now, later = (h) => { Date.now = () => realNow() + h * 3600e3; };
    const tIn = await call(base, '/api/auth/portal', { ticket: ticket({ first: 'Ida', last: 'Idle', b: 'B100926', exp: exp() }) });
    const aIn = await call(base, '/api/auth/admin', { passphrase: 'admin-pass' });
    assert.ok(tIn.j.token && aIn.j.token, 'signed in');
    try {
      for (const [who, t0, renewBy] of [['a trainee', tIn.j.token, true], ['a trainer', aIn.j.token, false]]) {
        const left = Number(t0.split('.')[2]) - realNow();
        assert.ok(Math.abs(left - 8 * 3600e3) < 60e3, `${who}'s sign-in lasts 8 hours from the last activity (it lasts ${(left / 3600e3).toFixed(1)} h)`);
        later(7);
        const r7 = await call(base, '/api/auth/refresh', {}, t0);
        assert.equal(r7.status, 200, `${who} 7 hours idle is still signed in`); assert.ok(r7.j.token, `${who}'s sign-in is renewed`);
        if (renewBy) assert.equal((await call(base, '/api/auth/trainee', { name: 'Ida Idle', batch: 'B100926' }, t0)).status, 200, `${who} 7 hours idle still renews by name + batch`);
        later(7 + 7);
        assert.equal((await call(base, '/api/auth/refresh', {}, r7.j.token)).status, 200, `${who}'s renewed sign-in lasts 8 hours from the renewal`);
        later(9);
        assert.equal((await call(base, '/api/auth/refresh', {}, t0)).status, 401, `${who} 9 hours idle is signed out`);
        assert.equal((await call(base, '/api/storage/get', { key: 'trainee:ida-idle--b100926' }, t0)).status, 401, `${who} 9 hours idle gets nothing`);
        if (renewBy) {
          const n9 = await call(base, '/api/auth/trainee', { name: 'Ida Idle', batch: 'B100926' }, t0);
          assert.equal(n9.status, 403, `${who} 9 hours idle can't renew by name + batch`); assert.equal(n9.j.error, 'portal-required');
        }
        Date.now = realNow;
      }
    } finally { Date.now = realNow; }
  }
  // 🔓 the page's side (js/lsh-session.js, in <head>): a stored sign-in that has run out (9 hours idle) is dropped before
  // the page reads it, one 7 hours idle is kept and renewed, and a hidden tab asks nothing
  {
    const vm = require('node:vm'), fs = require('node:fs');
    const mkStore = (o) => { const m = new Map(Object.entries(o)); return { get length() { return m.size; }, key: (i) => [...m.keys()][i], getItem: (k) => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };
    const tok = (role, h) => `${role}.someone.${Date.now() + h * 3600e3}.${'s'.repeat(43)}`;
    const t7 = tok('t', 1), a9 = tok('a', -1);
    const ls = mkStore({ t: t7, a: a9, other: 'kept' }), ss = mkStore({ old: tok('a', -0.5) });
    const asked = [], set = []; let vis = 'visible', interval = null;
    const sb = { localStorage: ls, sessionStorage: ss, document: { get visibilityState() { return vis; }, addEventListener() {} }, setInterval: (f) => { interval = f; }, setTimeout() {},
      fetch: async (u, o) => { asked.push([u, o.headers.Authorization]); return { ok: true, json: async () => ({ token: 'renewed' }) }; } };
    sb.window = sb; vm.createContext(sb);
    vm.runInContext(fs.readFileSync(path.join(process.cwd(), 'js/lsh-session.js'), 'utf8'), sb);
    const f = ((m) => assert.fail(m));
    if (ls.getItem('a') !== null || ss.getItem('old') !== null) f('a stored sign-in that has run out (9 hours idle) should be dropped when the page opens');
    if (ls.getItem('t') !== t7 || ls.getItem('other') !== 'kept') f('a stored sign-in 7 hours idle (and anything else stored) should be kept');
    sb.state = { authToken: t7, adminToken: '' }; sb.setTraineeToken = (t) => { set.push(t); sb.state.authToken = t; }; sb.setAdminToken = () => {};
    vis = 'hidden'; await sb.lshSessionRenew();
    if (asked.length) f('a tab in the background should ask nothing');
    vis = 'visible'; await sb.lshSessionRenew();
    if (asked.length !== 1 || asked[0][0] !== '/api/auth/refresh' || asked[0][1] !== 'Bearer ' + t7 || set[0] !== 'renewed') f(`a sign-in in use should be renewed: ${JSON.stringify({ asked, set })}`);
    sb.state.authToken = tok('t', 8); await sb.lshSessionRenew();
    if (asked.length !== 1) f('a sign-in renewed in the last 10 minutes should not be renewed again');
    if (typeof interval !== 'function') f('the renewal should run on a timer');
  }

  console.log('OK: single sign-on and storage rules hold.');
})().catch((e) => { console.error(e); process.exit(1); });
