/**
 * LSH Lien Negotiator Training — Cloudflare Worker (secured)
 *
 * The same sign-in and storage rules as the Case Management course's Worker
 * (Case-Management-Training/worker.js), cut down to what this course uses:
 * the Portal's single sign-on, the admin password, the trainee's progress,
 * the automatic Time In, and admin-only lists.
 *
 * All storage lives in the shared LSH_KV namespace under an "ln:" key prefix,
 * so Lien Negotiator trainees, progress and settings never mix with the CM or
 * EA/PA records in the same namespace.
 *
 * Secrets (Cloudflare → this Worker → Settings → Variables and Secrets):
 *   MASTER_ADMIN_PASSWORD — admin sign-in (the LSH Training Portal's master admin password: one password on
 *                        every platform). Setting it switches on SECURE MODE: every storage request must carry
 *                        a signed session token.
 *   PORTAL_SSO_SECRET  — the Portal sign-in secret (the same value as the Portal's). Trainees are signed in
 *                        with the Portal's ticket; until it is set no trainee can be signed in.
 *   SESSION_SECRET     — optional; signs session tokens (defaults to MASTER_ADMIN_PASSWORD).
 *
 * Without MASTER_ADMIN_PASSWORD the Worker runs in open mode so nothing breaks before it is configured.
 */
/* ---------- KV with the "ln:" namespace prefix ---------- */
const KV_PREFIX = "ln:";
function kvOf(env) {
  const raw = env.LSH_KV;
  if (!raw) return null;
  return {
    get: (k) => raw.get(KV_PREFIX + k),
    put: (k, v, o) => raw.put(KV_PREFIX + k, v, o),
    delete: (k) => raw.delete(KV_PREFIX + k),
    list: async (opts = {}) => {
      const r = await raw.list(Object.assign({}, opts, { prefix: KV_PREFIX + (opts.prefix || "") }));
      return Object.assign({}, r, { keys: r.keys.map((x) => Object.assign({}, x, { name: x.name.slice(KV_PREFIX.length) })) });
    }
  };
}

const JSON_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });
const enc = new TextEncoder();

/* ---------- tokens: "<role>.<subject>.<expiry>.<hmac>" ---------- */
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
// The admin password: MASTER_ADMIN_PASSWORD, the LSH Training Portal's master admin password (one password signs an admin in on the Portal and on every platform).
function adminPass(env) { return env.MASTER_ADMIN_PASSWORD || ""; }
// The admin password is compared as a person types it. Both the stored and the typed password are read without spaces or line
// breaks around them, quotes pasted around the whole password, invisible characters (zero-width spaces, soft hyphens) or curly
// quotes and long dashes: a secret pasted into Cloudflare with any of these signs in from a saved (autofilled) password but could
// never be typed.
const PASS_INVISIBLE = /[\u00AD\u180E\u200B-\u200F\u2028-\u202F\u205F-\u206F\uFEFF]/g;
const PASS_CURLY = /[\u2018\u2019\u201A\u201B\u2032\u201C\u201D\u201E\u201F\u2033\u2010-\u2015\u2212]/;
function cleanPass(v) {
  return String(v || "").normalize("NFKC").replace(PASS_INVISIBLE, "")
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'").replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"').replace(/[\u2010-\u2015\u2212]/g, "-").trim();
}
const PASS_QUOTED = /^(["'`])([\s\S]*)\1$/;
function normPass(v) { const t = cleanPass(v), q = t.match(PASS_QUOTED); return q ? q[2].trim() : t; }
// What /version says about the stored password (never the password itself).
function adminPassStatus(env) {
  const raw = String(env.MASTER_ADMIN_PASSWORD || "");
  if (!raw) return "not set (open mode)";
  if (!normPass(raw)) return "MASTER_ADMIN_PASSWORD is set but holds no password, only quotes, spaces or invisible characters: not accepted";
  const ignored = [];
  if (raw !== raw.trim()) ignored.push("spaces or a line break around it");
  if (new RegExp(PASS_INVISIBLE.source).test(raw)) ignored.push("invisible characters");
  if (PASS_CURLY.test(raw)) ignored.push("curly quotes or long dashes");
  if (PASS_QUOTED.test(cleanPass(raw))) ignored.push("quotes around it");
  const odd = /[^\x20-\x7E]/.test(normPass(raw)) ? "; it has a character that isn't on a standard keyboard (an accented or look-alike letter): it must be typed exactly" : "";
  return "MASTER_ADMIN_PASSWORD" + (ignored.length ? ` (had ${ignored.join(", ")}: ignored)` : "") + odd;
}
function secretOf(env) { return env.SESSION_SECRET || adminPass(env); }
async function makeToken(env, role, subject, hours) {
  const exp = Date.now() + hours * 3600 * 1000;
  const body = `${role}.${encodeURIComponent(subject)}.${exp}`;
  return `${body}.${await hmac(secretOf(env), body)}`;
}
async function readToken(env, request) {
  const h = request.headers.get("Authorization") || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  const parts = t.split(".");
  if (parts.length !== 4) return null;
  const [role, subj, exp, sig] = parts;
  if (Date.now() > Number(exp)) return null;
  const good = await hmac(secretOf(env), `${role}.${subj}.${exp}`);
  if (!safeEqual(good, sig)) return null;
  return { role, id: decodeURIComponent(subj) };
}
function safeEqual(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/* ---------- Main Portal sign-in: the LSH Training Portal signs a trainee in, this site trusts its ticket ----------
   ticket = "<base64url JSON {first, last, b, exp}>.<HMAC-SHA256 of that text, keyed with PORTAL_SSO_SECRET>"
   (an administrator's ticket is {r: "a", exp}: they were signed in on the Portal with the master admin password).
   exp is epoch milliseconds; a ticket is good for a few minutes, so a copied link is no use later. */
const PORTAL_TICKET_MAX_MS = 10 * 60 * 1000;
// The Portal secret, without any space or line break pasted around it (the Portal does the same).
function portalSecret(env) { return String(env.PORTAL_SSO_SECRET || "").trim(); }
/* Single sign-on: the LSH Training Portal is the only way a trainee gets in, on every LSH platform. The same
   rule as the CMS (portalOnly in its functions/_portal.js): on as soon as this program has an admin password,
   whether or not the Portal secret is set yet. A name + batch typed at /api/auth/trainee is refused — the
   sign-in screen hasn't offered that form since js/portal-gate.js took it over — and only a trainee already
   signed in on this device can renew their session that way.
   PORTAL_SSO_SECRET (the same value as the Portal's) is what lets a Portal ticket be checked, so until it is
   set here no trainee can be signed in at all: /api/auth/portal says so plainly (portal-secret-missing) and
   /api/auth/status reports portalSecret false, which the sign-in screen shows an administrator.
   PORTAL_ONLY=off is the way back to the old name + batch sign-in; leave it unset in production. */
function portalOnly(env) { return !!(adminPass(env) && String(env.PORTAL_ONLY || "").trim().toLowerCase() !== "off"); }
// why (optional) gets why a ticket was refused: "format", "signature" (the Portal and this program don't share the same secret) or "expired".
// An administrator's Portal ticket signs in once: its signature is remembered for 10 minutes (longer than the ticket
// lives), and a second use is refused.
async function useTicketOnce(kv, ticket) {
  if (!kv) return true;
  const key = "sso-used:" + String(ticket || "").split(".").pop().slice(0, 43);
  if (await kv.get(key)) return false;
  await kv.put(key, "1", { expirationTtl: 600 });
  return true;
}
async function readPortalTicket(env, ticket, why = {}) {
  if (!portalSecret(env)) { why.r = "format"; return null; }
  const parts = String(ticket || "").split(".");
  if (parts.length !== 2) { why.r = "format"; return null; }
  const good = await hmac("portal-sso:" + portalSecret(env), parts[0]);
  if (!safeEqual(good, parts[1])) { why.r = "signature"; return null; }
  let t; try { t = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)))); } catch (e) { why.r = "format"; return null; }
  const exp = Number(t && t.exp);
  if (!exp || Date.now() > exp || exp - Date.now() > PORTAL_TICKET_MAX_MS) { why.r = "expired"; return null; }
  if (t.r === "s") return { system: true };   // the Portal's own server-side tools (sign-in check, registration import): never given to a person
  if (t.r === "a") return { admin: true, name: String(t.n || "").trim().slice(0, 60) };   // an administrator signed in on the Portal (their own admin account)
  const first = String(t.first || "").trim(), last = String(t.last || "").trim(), batch = String(t.b || "").trim();
  if (!first || !last || !batch) return null;
  return { name: `${first} ${last}`, first, last, batch };
}
// Like readToken, but an expired token still counts for a while (same signature, same trainee), so a trainee
// midway through the course whose 30 days run out isn't sent back to the portal in the middle of a lesson.
const TOKEN_GRACE_MS = 60 * 24 * 3600 * 1000;
async function readTraineeTokenGrace(env, request) {
  const h = request.headers.get("Authorization") || "";
  const parts = (h.startsWith("Bearer ") ? h.slice(7) : "").split(".");
  if (parts.length !== 4 || parts[0] !== "t") return null;
  const [role, subj, exp, sig] = parts;
  if (Date.now() > Number(exp) + TOKEN_GRACE_MS) return null;
  if (!safeEqual(await hmac(secretOf(env), `${role}.${subj}.${exp}`), sig)) return null;
  return { role, id: decodeURIComponent(subj) };
}

/* ---------- trainee IDs (must match the portal's generateTraineeId) ---------- */
function slugPart(t) {
  return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
/* A Batch ID is B + the date the batch started, as MMDDYY: B100926 for 9 October 2026. The same rule on every
   LSH platform (canonicalBatch in the CMS's functions/_utils.js). Whatever is typed — any capitals, spaces or
   dashes, the B left off, a four-digit year, or the older long forms B09102026 and B09102026-LSHTRAINEE-001 —
   reads as that one form, so B100926, "b 10-09-26" and B10092026 are the same batch. A Batch ID given out
   before as B + DDMMYY reads the same as before. "" when it isn't a real date. */
const batchRealDay = (mm, dd, yy) => { const d = new Date(Date.UTC(2000 + yy, mm - 1, dd)); return mm >= 1 && mm <= 12 && dd >= 1 && d.getUTCMonth() === mm - 1; };
function canonicalBatch(raw) {
  const v = String(raw || "").toUpperCase().replace(/[\s\-]/g, "");
  const m = /^B?(\d{2})(\d{2})(\d{4}|\d{2})(?:LSH[A-Z]*\d+)?$/.exec(v);
  if (!m) return "";
  const yy = m[3].slice(-2);
  if (!batchRealDay(+m[1], +m[2], +yy) && !batchRealDay(+m[2], +m[1], +yy)) return "";
  return `B${m[1]}${m[2]}${yy}`;
}
// The same Batch ID whatever its form. An older code that isn't a date (B1, a guest account's) compares as
// typed, so a trainee registered under one still matches their own records.
const batchKey = (s) => slugPart(canonicalBatch(s) || s);
// A trainee's record id. newId uses the Batch ID in its one form, so the same batch typed differently is the
// same record; rawId is the id a record made before this rule got from the batch exactly as it was typed, and
// legacyId the older name-only id. traineeSession tries all three, so nobody's records are left behind.
function candidateIds(name, batch) {
  let slug = slugPart(name).slice(0, 40);
  if (!slug) { let h = 0; for (const c of String(name || "")) h = (h * 31 + c.codePointAt(0)) >>> 0; slug = "trainee-" + h.toString(36); }
  const b = slugPart(canonicalBatch(batch) || batch).slice(0, 20), raw = slugPart(batch).slice(0, 20);
  return { newId: b ? `${slug}--${b}` : slug, rawId: raw ? `${slug}--${raw}` : slug, legacyId: slugPart(name).slice(0, 40) || "trainee" };
}

/* ---------- what a trainee may touch ---------- */
// settings:course holds the admin's overrides of a module's deck or video address (Admin → Course links).
const PUBLIC_READ = [/^settings:course$/];
const OWN = (id) => [`trainee:${id}`, `progress:${id}`];
const PROTECTED_TRAINEE_FIELDS = ["approved", "rejected", "archived", "registeredAt"];
function canRead(tok, key) {
  if (tok.role === "a") return true;
  // assign:<id> (the Lien Desk case a trainer assigned) and release:<id> (a fully executed release a trainer uploaded):
  // a trainee reads their own, and only a trainer writes them.
  return OWN(tok.id).includes(key) || key === `assign:${tok.id}` || key === `release:${tok.id}` || PUBLIC_READ.some((re) => re.test(key));
}
async function traineeWrite(env, tok, key, value) {
  const kv = kvOf(env);
  const id = tok.id;
  let incoming; try { incoming = JSON.parse(value); } catch (e) { return "Invalid JSON"; }
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return "Invalid JSON";
  if (key === `trainee:${id}`) {
    // Trainees keep their own record current, but can never change their approval.
    const existingRaw = await kv.get(key);
    let existing = null; try { existing = existingRaw ? JSON.parse(existingRaw) : null; } catch (e) { /* a damaged record is replaced */ }
    const merged = Object.assign({}, incoming);
    PROTECTED_TRAINEE_FIELDS.forEach((f) => { if (existing && f in existing) merged[f] = existing[f]; else delete merged[f]; });
    if (!existing) { merged.approved = false; merged.registeredAt = new Date().toISOString(); }
    merged.id = id;
    await kv.put(key, JSON.stringify(merged)); return null;
  }
  if (key === `progress:${id}`) {
    if (String(value).length > 1000000) return "Too large";   // the answers and a whole Lien Desk case, emails included
    await kv.put(key, value); return null;
  }
  return "Not allowed";
}
async function listAll(env, prefix) {
  const kv = kvOf(env);
  const out = [];
  let cursor;
  do {
    const r = await kv.list({ prefix, cursor });
    r.keys.forEach((k) => out.push(k.name));
    cursor = r.list_complete ? undefined : r.cursor;
  } while (cursor);
  return withoutBlocked(env, out);
}

/* ---------- 🚫 trainees whose access the LSH Training Portal closed ----------
   access:blocked = {ids: {"<trainee id>": {why: "offboarded", name, batch, at, by: "portal", reason, portalUser}}}, written by the
   Portal (its functions/_ft-block.js programBlock / programUnblock): a trainer revokes or suspends this program for a trainee on the
   Portal's Program Access, and it is taken off again when the access is granted or restored. The same list Standard Foundational
   Training keeps. A trainee on it leaves every list here: listAll drops every key of theirs, so every roster, Batch Sheet, ranking,
   Trainee Audit and scorecard leaves them out; a Portal ticket doesn't sign them in; and a session they already hold reads only their
   own record, shown not approved (rejected), so the page closes. The list is read at most once a minute per Worker instance. */
const BLOCK_KEY = "access:blocked";
const BLOCK_MSG = "Your access to this program has been revoked. Contact your trainer if you believe this is a mistake.";
let BLOCKED = { at: 0, ids: {} };
async function blockedIds(env, fresh) {
  const kv = kvOf(env);
  if (!kv) return {};
  if (fresh || Date.now() - BLOCKED.at > 60000) {
    let v = null; try { v = JSON.parse((await kv.get(BLOCK_KEY)) || "null"); } catch (e) { v = null; }
    BLOCKED = { at: Date.now(), ids: (v && v.ids && typeof v.ids === "object") ? v.ids : {} };
  }
  return BLOCKED.ids;
}
// the trainee id a key belongs to (trainee:<id>, progress:<id>, checkin:<day>:<id>…): its last part
const keyTrainee = (k) => String(k).slice(String(k).lastIndexOf(":") + 1);
// (listAll's keys, without any of a blocked trainee's)
async function withoutBlocked(env, keys) {
  const b = await blockedIds(env);
  return Object.keys(b).length ? keys.filter((k) => k === BLOCK_KEY || !b[keyTrainee(k)]) : keys;
}

/* ---------- 🕘 automatic Time In: a trainee's first visit today ----------
   The same record as the CM course (checkin:<date>:<trainee>), under this course's prefix. */
function etNow(d) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const g = (t) => (p.find((x) => x.type === t) || {}).value;
  return { date: `${g("year")}-${g("month")}-${g("day")}`, time: `${g("hour")}:${g("minute")}` };
}
async function checkIn(kv, id, training) {
  const now = new Date(), et = etNow(now), key = `checkin:${et.date}:${id}`;
  const had = JSON.parse((await kv.get(key)) || "null");
  if (had) return { ok: true, date: et.date, timeIn: had.timeIn, already: true };
  const rec = JSON.parse((await kv.get(`trainee:${id}`)) || "null");
  if (!rec || rec.approved !== true || rec.archived) return { ok: false, error: "Not an approved trainee" };
  const v = { timeIn: et.time, at: now.toISOString(), name: String(rec.name || id).slice(0, 80), batch: String(rec.batch || "").slice(0, 24), training: String(training || "").slice(0, 160) };
  await kv.put(key, JSON.stringify(v), { expirationTtl: 40 * 86400, metadata: { t: v.timeIn, at: v.at, n: v.name, b: v.batch, tr: v.training } });
  return { ok: true, date: et.date, timeIn: v.timeIn };
}

export default {
  async fetch(request, env) {
    const kv = kvOf(env);
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const secure = !!adminPass(env);
      if (path === "/version" || path === "/api/version") {
        // Diagnostic: shows which build is actually deployed.
        const page = await env.ASSETS.fetch(new Request(new URL("/", request.url)));
        const html = await page.text();
        const m = html.match(/APP_BUILD = "([^"]+)"/);
        const deployment = (env.CF_VERSION_METADATA && env.CF_VERSION_METADATA.id) || "unknown";
        return new Response(`Build deployed: ${m ? m[1] : "unknown"}\nDeployment: ${deployment}\nWorker: secure-mode worker.js\nSecure mode: ${secure ? "ON" : "OFF"}\nAdmin password: ${adminPassStatus(env)}\nPortal sign-in secret: ${portalSecret(env) ? "set" : "not set"}\n`, { headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
      }
      if (!path.startsWith("/api/")) {
        const res = await env.ASSETS.fetch(request);
        const type = res.headers.get("Content-Type") || "";
        if (!type.includes("text/html")) return res;
        // Never let browsers or the edge keep an old copy of the page.
        const h = new Headers(res.headers);
        h.set("Cache-Control", "no-cache, no-store, must-revalidate");
        return new Response(res.body, { status: res.status, headers: h });
      }
      if (request.method !== "POST") return json({ error: "POST only" }, 405);
      if (!kv) return json({ error: "LSH_KV namespace is not bound on this Worker." }, 500);

      /* ---------- auth ---------- */
      if (path === "/api/auth/status") return json({ secure, portalOnly: portalOnly(env), portalSecret: !!portalSecret(env) });
      if (path === "/api/auth/admin") {
        if (!secure) return json({ error: "not-configured" }, 501);
        const { passphrase } = await request.json().catch(() => ({}));
        await new Promise((r) => setTimeout(r, 400)); // slow down guessing
        const given = normPass(passphrase), want = normPass(adminPass(env));
        if (!given || !want || !safeEqual(given, want)) return json({ error: "Incorrect password" }, 401);
        return json({ token: await makeToken(env, "a", "admin", 12) });
      }
      // The trainee's session for a name + batch: their record id (new or legacy form) and token.
      const traineeSession = async (name, batch, id) => {
        const { newId, rawId, legacyId } = candidateIds(name, batch);
        let chosen = newId, existing = await kv.get(`trainee:${newId}`);
        // a record made before Batch IDs were read in one form: keyed by the batch exactly as it was typed
        if (!existing && rawId !== newId) {
          const raw = await kv.get(`trainee:${rawId}`);
          if (raw) { chosen = rawId; existing = raw; }
        }
        if (!existing) {
          const legacy = await kv.get(`trainee:${legacyId}`);
          const lrec = legacy ? JSON.parse(legacy) : null;
          if (lrec && (!lrec.batch || batchKey(lrec.batch) === batchKey(batch))) { chosen = legacyId; existing = legacy; }
        }
        if (id && id !== chosen && id !== newId && id !== rawId && id !== legacyId) return json({ error: "Name/batch don't match this session" }, 403);
        if (id && id !== chosen && (id === newId || id === rawId || id === legacyId)) { chosen = id; existing = await kv.get(`trainee:${id}`); }
        if ((await blockedIds(env, true))[chosen]) return json({ error: BLOCK_MSG, code: "access-offboarded" }, 403);
        return json({ id: chosen, token: await makeToken(env, "t", chosen, 24 * 30), existing: existing ? JSON.parse(existing) : null, batch: canonicalBatch(batch) || String(batch || "").trim() });
      };
      if (path === "/api/auth/trainee") {
        if (!secure) return json({ error: "not-configured" }, 501);
        const { name, batch, id } = await request.json().catch(() => ({}));
        if (!name || !batch) return json({ error: "Name and batch are required" }, 400);
        const { newId, rawId, legacyId } = candidateIds(name, batch);
        let own = null;
        if (portalOnly(env)) {
          // Trainees come in through the LSH Training Portal (/api/auth/portal). A name + batch typed here is
          // accepted only to renew the session of a trainee who is already signed in on this device.
          own = await readTraineeTokenGrace(env, request);
          if (!own || (own.id !== newId && own.id !== rawId && own.id !== legacyId)) return json({ error: "portal-required" }, 403);
        }
        // A new registration has to give the Batch ID in its one form: B + the date the batch started (MMDDYY).
        // Someone whose records are already here keeps signing in with the Batch ID they registered under.
        if (!canonicalBatch(batch)) {
          const known = (await Promise.all([newId, rawId, legacyId].map(k => kv.get(`trainee:${k}`)))).some(Boolean);
          if (!known) return json({ error: "batch-format" }, 400);
        }
        // Under single sign-on the renewal is for the record the trainee is already signed in to, never a
        // same-named trainee's: the id in the body is ignored.
        return traineeSession(name, batch, portalOnly(env) ? own.id : id);
      }
      if (path === "/api/auth/portal") {
        // The Main Portal's sign-in: a signed ticket carries who the trainee is (their name and batch as registered there).
        if (!portalOnly(env)) return json({ error: "not-configured" }, 501);
        // Single sign-on is on, but this Worker has no PORTAL_SSO_SECRET, so no ticket can be checked and nobody
        // can be signed in. Say which setting is missing rather than letting it read as an expired link.
        if (!portalSecret(env)) return json({ error: "This program isn't connected to the LSH Training Portal yet. Please tell your administrator: PORTAL_SSO_SECRET needs to be set on this program's Worker, to the same value as the Portal's.", code: "portal-secret-missing" }, 503);
        const { ticket } = await request.json().catch(() => ({}));
        const why = {};
        const who = await readPortalTicket(env, ticket, why);
        if (!who) return json({ error: why.r === "signature"
          ? "The LSH Training Portal couldn't be verified (code: bad-signature). Please tell your administrator: the Portal and this program need the same sign-in secret."
          : "This sign-in link has expired. Open the program again from the LSH Training Portal.", code: why.r || "format" }, 401);
        if (who.system) return json({ admin: true, token: await makeToken(env, "a", "admin", 12) });
        if (who.admin) {
          // Single sign-on for trainers too: an administrator signed in on the Main Portal opens every program as a
          // trainer, with no second password here. Their ticket works once, so a copy of the link (browser history,
          // a forwarded URL) can't sign anyone in again inside its 5 minutes.
          if (!(await useTicketOnce(kv, ticket))) return json({ error: "This sign-in link was already used. Open the program again from the LSH Training Portal.", code: "used" }, 401);
          return json({ admin: true, name: who.name, token: await makeToken(env, "a", "admin", 12) });
        }
        const res = await traineeSession(who.name, who.batch, "");
        if (res.status !== 200) return res;   // 🚫 (blocked: access-offboarded)
        const out = await res.json();
        // The Portal's approval is the only trainee approval: a trainee it signs in is approved here too
        // (unless an admin here rejected them), so this program never shows "Registration Pending Approval".
        const cur = out.existing;
        if (!cur || (cur.approved !== true && !cur.rejected)) {
          const rec = Object.assign({}, cur || { id: out.id, name: who.name, firstName: who.first, lastName: who.last, batch: who.batch, registeredAt: new Date().toISOString() }, { approved: true });
          await kv.put(`trainee:${out.id}`, JSON.stringify(rec));
          out.existing = rec;
        }
        return json(Object.assign(out, { name: who.name, first: who.first, last: who.last, batch: who.batch }));
      }

      const tok = secure ? await readToken(env, request) : { role: "a", id: "open-mode" };
      if (!tok) return json({ error: "Sign-in required" }, 401);
      // 🚫 a trainee whose access the Portal closed: their own record only, shown not approved, so the page closes; nothing else
      if (tok.role === "t" && (await blockedIds(env))[tok.id]) {
        const b = await request.clone().json().catch(() => ({}));
        if (path === "/api/storage/get" && b.key === `trainee:${tok.id}`) {
          const rec = JSON.parse((await kvOf(env).get(b.key)) || "null");
          return json({ value: rec ? JSON.stringify(Object.assign({}, rec, { approved: false, rejected: true })) : null });
        }
        return json({ error: BLOCK_MSG, code: "access-offboarded" }, 403);
      }

      /* ---------- a session that is still in use is renewed before it runs out ----------
         The page asks for a fresh token in the last hours of a valid one (an admin's lasts 12 hours, a trainee's
         30 days), so a trainer's tab left open through a long day never drops a live call with "Sign-in
         required". An expired token is never renewed: that still takes a sign-in. */
      if (path === "/api/auth/refresh") {
        if (!secure) return json({ token: "" });
        return json({ token: await makeToken(env, tok.role, tok.id, tok.role === "a" ? 12 : 24 * 30) });
      }

      /* ---------- 🕘 automatic Time In: a trainee's first visit today (see checkIn) ---------- */
      if (path === "/api/checkin") {
        const b = await request.json().catch(() => ({}));
        const id = tok.role === "t" ? tok.id : (!secure && typeof b.id === "string" ? b.id.slice(0, 100) : "");
        if (!id) return json({ ok: false, error: "Trainees only" }, 403);
        return json(await checkIn(kv, id, b.training));
      }

      /* ---------- storage ---------- */
      const body = await request.json().catch(() => ({}));
      const key = String(body.key || "");
      if (path === "/api/storage/get") {
        if (!key) return json({ error: "Missing key" }, 400);
        if (!canRead(tok, key)) return json({ error: "Not allowed" }, 403);
        return json({ value: await kv.get(key) });
      }
      if (path === "/api/storage/get-many") {
        // Several records in one request (the admin's trainee list): every Worker request counts toward
        // Cloudflare's allowance, so lists aren't fetched one request per record. A key this user may not read is left out.
        const keys = Array.isArray(body.keys) ? body.keys.map((k) => String(k || "")) : [];
        if (!keys.length || keys.length > 100) return json({ error: "Send 1 to 100 keys" }, 400);
        const values = {};
        await Promise.all(keys.map(async (k) => { if (k && canRead(tok, k)) values[k] = await kv.get(k); }));
        return json({ values });
      }
      if (path === "/api/storage/set") {
        if (!key) return json({ error: "Missing key" }, 400);
        if (typeof body.value !== "string") return json({ error: "value must be a string" }, 400);
        if (tok.role === "a") { await kv.put(key, body.value); return json({ ok: true }); }
        const err = await traineeWrite(env, tok, key, body.value);
        return err ? json({ error: err }, 403) : json({ ok: true });
      }
      if (path === "/api/storage/list") {
        if (tok.role !== "a") return json({ keys: [] });
        return json({ keys: await listAll(env, String(body.prefix || "")) });
      }
      if (path === "/api/storage/delete") {
        if (tok.role !== "a") return json({ error: "Not allowed" }, 403);
        await kv.delete(key); return json({ ok: true });
      }
      return json({ error: "Unknown endpoint" }, 404);
    } catch (e) {
      console.error(e);   // the stack goes to the Worker's logs, not to the browser
      return json({ error: "Unhandled Worker exception." }, 500);
    }
  }
};
