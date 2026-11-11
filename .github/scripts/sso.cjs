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
const ticket = (t, secret = SECRET) => { const p = b64u(JSON.stringify(t)); return `${p}.${b64u(crypto.createHmac('sha256', 'portal-sso:' + secret).update(p).digest())}`; };

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

  r = await call(base, '/api/checkin', { training: 'Lien Negotiator Training' }, tTok);
  assert.equal(r.j.ok, true);
  console.log('OK: single sign-on and storage rules hold.');
})().catch((e) => { console.error(e); process.exit(1); });
