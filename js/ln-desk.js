/* ============================================================
   🗂 The Lien Desk: a settled case worked end to end, the way the Day 3
   demo does it (Drafting and Sending Reduction Request and Closing
   Statement), with the case's own documents and a working email inbox.

   Day 2  Download the Settlement Release(s) → email them to the trainer →
          the fully executed release comes back → the initial Net Sheet →
          the Reduction Request letter(s), ready to send.
   Day 3  Request updated bills and payoffs where the file is out of date →
          send the Reduction Requests → the providers and lienholders answer
          → the final Net Sheet → the Closing Statement → send it, with the
          Settlement Release Form(s), to the client → the client signs.

   Everything the trainee does is kept in progress:<id> (desk), so it
   follows them across devices and their trainer sees it. A trainer can
   also upload a real fully executed release (release:<id>) and assign the
   case (assign:<id>).

   The cases are js/ln-desk-cases.js. The page (index.html) gives this file
   state, esc, toast, overlay, kvGet/kvSet, saveProgress and render.
   ============================================================ */
(function(){
"use strict";
const F = window.LN_FIRM, CASES = window.LN_CASES;
const $ = (s) => document.querySelector(s);
const r2 = (n) => Math.round(n * 100) / 100;
const num = (v) => { if(typeof v === "number") return v; const s = String(v == null ? "" : v).replace(/[$,\s]/g, ""); if(!s) return 0; const n = Number(s.replace(/[()]/g, "")); return isNaN(n) ? 0 : (/^\(.*\)$/.test(s) ? -n : n); };
const money = (n) => (n < 0 ? "–" : "") + "$" + Math.abs(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function rate(v){ const s = String(v == null ? "" : v).trim(); if(/⅓|1\/3/.test(s)) return 1 / 3; const n = num(s.replace("%", "")); return n > 1 ? n / 100 : n; }
const E = (t) => window.esc(t);
const low = (t) => String(t || "").toLowerCase();
const todayStr = () => { const d = new Date(); return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`; };

/* ---------- the case's numbers ---------- */
const keyOf = (p) => low(p.name).split(/[\s—–,-]+/).filter((w) => w && !["the", "of"].includes(w))[0];
// a bill on file can carry lines the corrected bill takes out (a duplicate, a pre-accident visit, an unrelated charge)
const linesOf = (p, corrected) => p.lines.concat(!corrected && p.onFile && p.onFile.extraLines ? p.onFile.extraLines : []);
function charges(p, corrected){ return p.lien ? (!corrected && p.onFile && p.onFile.amount != null ? p.onFile.amount : p.amount) : r2(linesOf(p, corrected).reduce((s, l) => s + l.amount, 0)); }
// what the file says now (corrected = the trainee has the corrected bill / updated payoff)
function figures(p, corrected){
  if(p.lien){ const amt = corrected || !p.onFile ? p.amount : p.onFile.amount; return { charges: amt, pip: 0, health: 0, adj: 0, balance: amt }; }
  const o = !corrected && p.onFile ? Object.assign({ pip: p.pip, health: p.health, adj: p.adj }, p.onFile) : p;
  const c = charges(p, corrected);
  return { charges: c, pip: o.pip || 0, health: o.health || 0, adj: o.adj || 0, balance: r2(c - (o.pip || 0) - (o.health || 0) - (o.adj || 0)) };
}
const gross = (c) => r2(c.settlements.reduce((s, x) => s + x.amount, 0));
const feeOf = (c) => r2(gross(c) * rate(c.fee.pct));
const costsOf = (c) => r2(c.costs.reduce((s, x) => s + x.amount, 0));
const reducible = (p) => p.reduce && p.reduce.floor != null;
const outdated = (c) => c.payees.filter((p) => p.onFile);

/* ---------- the trainee's desk ---------- */
function prog(){ const S = window.state; S.progress = S.progress || {}; S.progress.desk = S.progress.desk || { cases: {} }; return S.progress.desk; }
function caseId(){
  const d = prog(), S = window.state;
  if(S.deskAssign && CASES.some((c) => c.id === S.deskAssign)) return S.deskAssign;
  if(d.caseId && CASES.some((c) => c.id === d.caseId)) return d.caseId;
  // not assigned by a trainer: a case of their own, the same one every time
  let h = 0; for(const ch of String(S.traineeId || "trainer")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CASES[h % CASES.length].id;
}
const CASE = () => CASES.find((c) => c.id === caseId()) || CASES[0];
function W(){ const d = prog(), id = caseId(); d.caseId = id; d.cases[id] = d.cases[id] || { mail: [], viewed: {}, sheet: { cells: { C11: "" } }, checks: {}, got: { corrected: {}, approved: {}, answered: {} }, drafts: { rr: {}, cs: {} } }; return d.cases[id]; }
function save(){ if(typeof window.saveProgress === "function") window.saveProgress(); }
const traineeFirst = () => { const t = window.state.trainee || {}; return String(t.firstName || String(t.name || "").split(/\s+/)[0] || "").trim(); };
const traineeName = () => String((window.state.trainee || {}).name || "").trim();

/* ---------- the documents (crisp, on letterhead) ---------- */
const DOC_CSS = `body{font:13px/1.5 Georgia,'Times New Roman',serif;color:#1b1e2e;margin:0;padding:34px 44px;background:#fff}
h1{font:700 17px Arial,Helvetica,sans-serif;text-align:center;letter-spacing:.04em;margin:8px 0 14px;text-transform:uppercase}
h2{font:700 13px Arial,Helvetica,sans-serif;margin:16px 0 6px;text-transform:uppercase;letter-spacing:.03em}
.lh{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #262B45;padding-bottom:8px;margin-bottom:14px;font-family:Arial,Helvetica,sans-serif}
.lh b{font-size:19px;color:#262B45;letter-spacing:.02em}.lh span{font-size:11px;color:#444;text-align:right}
.org{font:700 16px Arial,Helvetica,sans-serif;color:#1d3d6b}.orgsub{font:11px Arial,Helvetica,sans-serif;color:#555;margin-bottom:12px;border-bottom:1px solid #999;padding-bottom:6px}
table{width:100%;border-collapse:collapse;margin:8px 0;font:12px Arial,Helvetica,sans-serif}th,td{border:1px solid #9aa0b4;padding:5px 7px;text-align:left;vertical-align:top}th{background:#eef0f6}
td.m,th.m{text-align:right;white-space:nowrap}tr.tot td{font-weight:700;background:#f6f7fb}
.meta td{border:0;padding:2px 6px 2px 0}.sig{margin-top:30px;display:flex;gap:40px}.sig div{flex:1;border-top:1px solid #333;padding-top:4px;font:11px Arial,sans-serif}
.signed{font:italic 22px 'Brush Script MT','Segoe Script',cursive;color:#1b3a8a;margin-bottom:-6px}
.stamp{display:inline-block;border:3px solid #b42318;color:#b42318;font:800 13px Arial,sans-serif;padding:4px 10px;transform:rotate(-6deg);letter-spacing:.08em}
.note{font:11px Arial,sans-serif;color:#555}.box{border:1px solid #9aa0b4;padding:8px 10px;margin:8px 0;font:12px Arial,sans-serif}
.hl{background:#fff4c4}`;
const wrap = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${E(title)}</title><style>${DOC_CSS}</style></head><body>${body}</body></html>`;
const letterhead = () => `<div class="lh"><b>${E(F.name)}</b><span>${E(F.address)}<br>${E(F.phone)} · ${E(F.email)}</span></div>`;
const org = (p) => `<div class="org">${E(p.name)}</div><div class="orgsub">${E(p.address || "")}${p.email ? " · " + E(p.email) : ""}</div>`;
const clientLF = (c) => `${c.client.last.toUpperCase()}, ${c.client.first.toUpperCase()}`;

function docRelease(c, s, signed){
  const cl = `${c.client.first} ${c.client.last}`;
  return wrap(`Release ${s.type}`, `${letterhead()}<h1>Release of All Claims (${s.type === "UM" ? "Uninsured/Underinsured Motorist" : "Bodily Injury"})</h1>
  <p>FOR AND IN CONSIDERATION of the sum of <b>${E(money(s.amount))}</b>, the receipt and sufficiency of which is hereby acknowledged, the undersigned, <b>${E(cl)}</b> ("Releasor"), hereby releases and forever discharges <b>${E(s.insured)}</b> ("Releasee") and their insurance carrier, <b>${E(s.carrier)}</b> (Claim No. ${E(s.claimNo)}), from any and all claims, demands, damages, actions, or causes of action of every kind and nature, specifically including any claims for ${s.type === "UM" ? "uninsured/underinsured motorist benefits" : "BODILY INJURY"} arising out of an accident which occurred on or about <b>${E(c.dol)}</b>.</p>
  <h2>1. Scope of release</h2><p>This release is intended to be a full and final settlement of all claims related to bodily injuries, medical expenses, and pain and suffering. It does not include claims for Property Damage.</p>
  <h2>2. No admission of liability</h2><p>It is understood and agreed that this settlement is the compromise of a doubtful and disputed claim, and that the payment made is not to be construed as an admission of liability on the part of the party or parties hereby released.</p>
  <h2>3. Liens and indemnification</h2><p>Releasor agrees to pay and satisfy all medical liens, subrogation claims, hospital liens and pre-settlement funding advances from the proceeds of this settlement, and to indemnify and hold harmless the Releasee from any further claims made by any third party for medical services rendered.</p>
  <div class="sig"><div>${signed ? `<div class="signed">${E(cl)}</div>` : "<br>"}RELEASOR SIGNATURE · Date: ${signed ? E(s.signedOn || todayStr()) : "________________"}</div><div>${signed ? `<div class="signed">${E(s.adjuster)}</div>` : "<br>"}FOR ${E(s.carrier.toUpperCase())}</div></div>
  <div class="box"><b>NOTARY ACKNOWLEDGMENT.</b> State of Texas, County of Collin. Subscribed and sworn to before me ${signed ? `on <b>${E(s.signedOn || todayStr())}</b>. <span class="stamp">NOTARIZED</span> <span class="signed" style="font-size:18px">K. Alvarado</span>` : "this ____ day of ________, 20__."}</div>
  ${signed ? `<p class="note"><b>FULLY EXECUTED.</b> Signed by the Releasor and the Releasee's carrier, and notarized.</p>` : `<p class="note">Settlement Release Form · ${E(s.type)} · for the client's review and signature.</p>`}`);
}
function docBill(c, p, corrected){
  const f = figures(p, corrected), asOf = corrected ? todayStr() : (p.onFile ? p.onFile.asOf : "09/20/2026");
  return wrap(`${p.name} statement`, `${org(p)}<h1>${corrected ? "Updated Itemized Statement" : "Itemized Statement"}</h1>
  <table class="meta"><tr><td><b>Patient:</b> ${E(clientLF(c))}</td><td><b>DOB:</b> ${E(c.client.dob)}</td><td><b>Statement date:</b> ${E(asOf)}</td></tr>
  <tr><td><b>Account:</b> ${E(p.id.toUpperCase())}-${E(c.caseNo.slice(-6))}</td><td><b>Date of injury:</b> ${E(c.dol)}</td><td><b>Dates of service:</b> ${E(p.dos)}</td></tr></table>
  <table><tr><th>Date</th><th>Code</th><th>Description</th><th class="m">Charge</th></tr>${linesOf(p, corrected).map((l) => `<tr><td>${E(l.date)}</td><td>${E(l.code)}</td><td>${E(l.desc)}</td><td class="m">${money(l.amount)}</td></tr>`).join("")}
  <tr class="tot"><td colspan="3">Total charges</td><td class="m">${money(f.charges)}</td></tr>
  <tr><td colspan="3">PIP payments</td><td class="m">${f.pip ? "–" + money(f.pip).slice(1) : "$0.00"}</td></tr>
  <tr><td colspan="3">Health insurance payments</td><td class="m">${f.health ? "–" + money(f.health).slice(1) : "$0.00"}</td></tr>
  <tr><td colspan="3">Contractual adjustments / write-offs</td><td class="m">${f.adj ? "–" + money(f.adj).slice(1) : "$0.00"}</td></tr>
  <tr class="tot"><td colspan="3">BALANCE DUE</td><td class="m">${money(f.balance)}</td></tr></table>
  ${p.type.indexOf("LOP") >= 0 ? `<p class="note">Treatment rendered under a Letter of Protection from ${E(F.name)}. Payment is due from the settlement proceeds.</p>` : ""}
  <p class="note">Balance as of ${E(asOf)}. Payments posted after this date are not reflected.</p>`);
}
function docLien(c, p, updated){
  const f = figures(p, updated), asOf = updated ? todayStr() : (p.onFile ? p.onFile.asOf : "09/22/2026");
  const funding = /funding/i.test(p.type), health = /health|medicare|medicaid/i.test(p.type);
  const title = funding ? (updated ? "Updated Payoff Letter" : "Payoff Letter") : /child support/i.test(p.type) ? "Notice of Child Support Lien" : /medicare/i.test(p.name) ? (updated ? "Final Demand" : "Conditional Payment Letter") : (updated && p.onFile ? "Updated Lien Itemization" : "Notice of Lien and Right of Reimbursement");
  return wrap(`${p.name}`, `${org(p)}<h1>${title}</h1>
  <table class="meta"><tr><td><b>Re:</b> ${E(clientLF(c))}</td><td><b>Date of loss:</b> ${E(c.dol)}</td><td><b>Date:</b> ${E(asOf)}</td></tr><tr><td colspan="3"><b>Attorney:</b> ${E(F.attorney)}, ${E(F.name)}</td></tr></table>
  <p>${E(p.notice || "")}</p>
  ${p.plan ? `<div class="box"><b>Plan information:</b> ${E(p.plan)}</div>` : ""}
  ${funding ? `<table><tr><th>Payoff</th><th class="m">Amount</th></tr><tr><td>Payoff amount, good through ${E(updated ? "30 days from " + asOf : p.onFile ? p.onFile.asOf : asOf)}</td><td class="m">${money(f.balance)}</td></tr></table>
    <p class="note">This payoff is valid only through the date stated. After that date, request an updated payoff before disbursement. Our payoff is contractual under the funding agreement.</p>`
    : health ? `<table><tr><th>Provider paid</th><th>Dates of service</th><th class="m">Amount paid</th></tr>${c.payees.filter((x) => !x.lien && x.health).map((x) => `<tr><td>${E(x.name)}</td><td>${E(x.dos)}</td><td class="m">${money(x.health)}</td></tr>`).join("")}${!updated && p.onFile && p.onFile.extra ? p.onFile.extra.map((x) => `<tr class="hl"><td>${E(x.desc)}</td><td>${E(x.date)}</td><td class="m">${money(x.amount)}</td></tr>`).join("") : ""}<tr class="tot"><td colspan="2">Total lien asserted</td><td class="m">${money(f.balance)}</td></tr></table>`
    : `<table><tr><th>Lien</th><th class="m">Amount</th></tr><tr><td>${E(p.type)}</td><td class="m">${money(f.balance)}</td></tr></table>`}`);
}
function docPip(c){
  return wrap("PIP payment log", `<div class="org">${E(c.pip.carrier)}</div><div class="orgsub">Personal Injury Protection · Claim for ${E(clientLF(c))} · DOL ${E(c.dol)} · Limit ${money(c.pip.limit)}</div><h1>PIP Payment Log</h1>
  <table><tr><th>Payee</th><th>Date paid</th><th class="m">Amount</th></tr>${c.pip.payments.map((x) => `<tr><td>${E(x.to)}</td><td>${E(x.date)}</td><td class="m">${money(x.amount)}</td></tr>`).join("")}
  <tr class="tot"><td colspan="2">Total paid (limit exhausted: ${c.pip.payments.reduce((s, x) => s + x.amount, 0) >= c.pip.limit ? "yes" : "no"})</td><td class="m">${money(c.pip.payments.reduce((s, x) => s + x.amount, 0))}</td></tr></table>
  <p class="note">PIP is a first-party benefit. It is not part of the settlement recovery.</p>`);
}
function docCosts(c){
  return wrap("Case cost ledger", `${letterhead()}<h1>Case Cost Ledger</h1><table class="meta"><tr><td><b>Client:</b> ${E(clientLF(c))}</td><td><b>Case:</b> ${E(c.caseNo)}</td></tr></table>
  <table><tr><th>Expense</th><th class="m">Amount</th></tr>${c.costs.map((x) => `<tr><td>${E(x.label)}</td><td class="m">${money(x.amount)}</td></tr>`).join("")}<tr class="tot"><td>Total advanced case expenses</td><td class="m">${money(costsOf(c))}</td></tr></table>`);
}
function docRetainer(c){
  return wrap("Retainer", `${letterhead()}<h1>Contingency Fee Agreement (excerpt)</h1><p>Client <b>${E(c.client.first)} ${E(c.client.last)}</b> retains ${E(F.name)} for claims arising from the accident of <b>${E(c.dol)}</b>.</p>
  <h2>Attorney's fee</h2><p>33⅓% (one-third) of the gross recovery if the matter resolves before a lawsuit is filed; 40% of the gross recovery once a lawsuit has been filed.</p>
  <h2>Case expenses</h2><p>Advanced case expenses are reimbursed to the firm from the client's share, in addition to the fee. Medical bills, liens, subrogation claims and pre-settlement funding advances are paid from the settlement before the client's net disbursement.</p>
  <div class="box"><b>File status:</b> ${E(c.fee.why)}</div>`);
}
function docSettlement(c, s){
  return wrap(`${s.carrier} settlement`, `<div class="org">${E(s.carrier)}</div><div class="orgsub">Claims Department · Adjuster ${E(s.adjuster)}</div><h1>Settlement Confirmation</h1>
  <table class="meta"><tr><td><b>To:</b> ${E(F.attorney)}, ${E(F.name)}</td><td><b>Date:</b> ${E(s.date)}</td></tr><tr><td><b>Claimant:</b> ${E(clientLF(c))}</td><td><b>Claim No.:</b> ${E(s.claimNo)}</td></tr><tr><td><b>Our insured:</b> ${E(s.insured)}</td><td><b>Date of loss:</b> ${E(c.dol)}</td></tr></table>
  <p>This confirms our agreement to resolve the ${s.type === "UM" ? "uninsured/underinsured motorist" : "bodily injury"} claim for the total sum of <b>${E(money(s.amount))}</b>.${s.note ? ` ${E(s.note)}` : ""} Payment will issue upon receipt of the fully executed Release of All Claims. Please have your client sign and notarize the enclosed release and return it to our office.</p>`);
}
// every document in the case file, the ones that came by email included
function docs(c, w){
  const out = [{ id: "retainer", group: "Intake", title: "Contingency Fee Agreement", html: () => docRetainer(c) }];
  c.settlements.forEach((s) => {
    out.push({ id: "settle-" + s.type, group: "Settlement", title: `Settlement Confirmation · ${s.type} · ${s.carrier}`, html: () => docSettlement(c, s) });
    out.push({ id: "release-" + s.type, group: "Settlement", title: `Settlement Release Form · ${s.type}`, release: s.type, html: () => docRelease(c, s, false) });
  });
  if(c.pip) out.push({ id: "pip", group: "Bills & payments", title: `PIP Payment Log · ${c.pip.carrier}`, html: () => docPip(c) });
  c.payees.forEach((p) => out.push({ id: "bill-" + p.id, group: p.lien ? "Liens" : "Bills & payments", title: p.lien ? `${/funding/i.test(p.type) ? "Payoff Letter" : "Lien Notice"} · ${p.name}` : `Itemized Statement · ${p.name}`, html: () => p.lien ? docLien(c, p, false) : docBill(c, p, false) }));
  out.push({ id: "costs", group: "Settlement", title: "Case Cost Ledger", html: () => docCosts(c) });
  // received by email
  (w.mail || []).filter((m) => m.dir === "in").forEach((m) => (m.att || []).forEach((a) => { const d = attDoc(c, w, a); if(d) out.push(Object.assign({}, d, { id: "in-" + m.id + "-" + a.ref, group: "Received by email", title: a.name })); }));
  return out;
}
function attDoc(c, w, a){
  if(a.kind === "doc"){
    const m = /^(release|exec)-(\w+)$/.exec(a.ref); if(m){ const s = c.settlements.find((x) => x.type === m[2]); if(s) return { html: () => docRelease(c, Object.assign({}, s, { signedOn: w.got.execOn }), m[1] === "exec") }; }
    const b = /^(bill|corrected)-(.+)$/.exec(a.ref); if(b){ const p = c.payees.find((x) => x.id === b[2]); if(p) return { html: () => p.lien ? docLien(c, p, b[1] === "corrected") : docBill(c, p, b[1] === "corrected") }; }
    if(a.ref === "approval") return { html: () => a.html };
    const d = docs(c, { mail: [] }).find((x) => x.id === a.ref); return d || null;
  }
  if(a.kind === "rr"){ const p = c.payees.find((x) => x.id === a.ref); return p ? { html: () => docRR(c, p, w.drafts.rr[p.id] || {}) } : null; }
  if(a.kind === "cs") return { html: () => docCS(c, w.drafts.cs || {}, a.signed) };
  if(a.kind === "upload") return { url: a.url };
  if(a.kind === "reply") return { html: () => a.html };
  return null;
}

/* ---------- drafts: the Reduction Request and the Closing Statement ---------- */
function docRR(c, p, d){
  const f = figures(p, true);
  return wrap(d.file || "Reduction Request", `${letterhead()}<p>${E(d.date || todayStr())}</p>
  <p><b>${E(p.name)}</b><br>${E(p.address || "")}<br>Attn: Billing / Accounts Receivable</p>
  <p><b>Re:</b> Billing Reduction Request · Patient: ${E(d.client || clientLF(c))} · Date of loss: ${E(d.dol || c.dol)} · Dates of service: ${E(p.dos || "—")}</p>
  <p>Dear Billing Department,</p>
  <p>We sincerely appreciate the quality care and treatment provided to our client. Our client's claim has resolved for a limited settlement of ${E(money(gross(c)))}, from which attorney's fees, case expenses and all outstanding medical bills and liens must be paid.</p>
  <table><tr><th>Account</th><th class="m">Amount</th></tr><tr><td>Total charges</td><td class="m">${E(money(num(d.charges)))}</td></tr><tr><td>Payments and adjustments</td><td class="m">${E(money(num(d.paid)))}</td></tr><tr class="tot"><td>Current balance</td><td class="m">${E(money(num(d.balance)))}</td></tr><tr class="tot"><td>Requested reduced amount, as payment in full</td><td class="m">${E(money(num(d.requested)))}</td></tr></table>
  ${d.reasons && d.reasons.length ? `<p>We ask for your consideration because:</p><ul>${d.reasons.map((x) => `<li>${E(x)}</li>`).join("")}</ul>` : ""}
  ${d.note ? `<p>${E(d.note)}</p>` : ""}
  <p>We respectfully request that you accept <b>${E(money(num(d.requested)))}</b> as payment in full of this account. Upon your written acceptance, payment will be issued from the settlement proceeds.</p>
  <p>Hoping for your kind consideration. Thank you.</p><p>Best regards,<br>${E(d.signer || traineeName() || "[your name]")}<br>Lien Negotiator, ${E(F.name)}<br>${E(F.email)} · ${E(F.phone)}</p>`);
}
function docCS(c, d, signed){
  const rows = c.payees.map((p) => ({ p, amt: num((d.pay || {})[p.id]) })).filter((x) => x.amt);
  return wrap(d.file || "Closing Statement", `${letterhead()}<h1>Closing Statement · Settlement Disbursement</h1>
  <table class="meta"><tr><td><b>Client:</b> ${E(c.client.first)} ${E(c.client.last)}</td><td><b>Date:</b> ${E(d.date || todayStr())}</td></tr><tr><td><b>Date of loss:</b> ${E(c.dol)}</td><td><b>Claim No(s).:</b> ${E(c.settlements.map((s) => s.claimNo).join(", "))}</td></tr></table>
  <table><tr><th>Description</th><th class="m">Credit (+)</th><th class="m">Debit (–)</th></tr>
  ${c.settlements.map((s) => `<tr><td>Settlement · ${E(s.type)} · ${E(s.carrier)}</td><td class="m"></td><td class="m"></td></tr>`).join("")}
  <tr class="tot"><td>GROSS SETTLEMENT AMOUNT</td><td class="m">${E(money(num(d.gross)))}</td><td class="m"></td></tr>
  <tr><td>Attorney's fees (${E(d.feePct || "")})</td><td class="m"></td><td class="m">(${E(money(num(d.fee)))})</td></tr>
  <tr><td>Advanced case expenses</td><td class="m"></td><td class="m">(${E(money(num(d.costs)))})</td></tr>
  <tr><td colspan="3"><b>MEDICAL BILLS, LIENS & REIMBURSEMENTS</b></td></tr>
  ${rows.map((x) => `<tr><td>${E(x.p.name)}</td><td class="m"></td><td class="m">(${E(money(x.amt))})</td></tr>`).join("")}
  <tr class="tot"><td>NET RECOVERY TO CLIENT</td><td class="m">${E(money(num(d.net)))}</td><td class="m"></td></tr></table>
  <div class="box"><b>ACKNOWLEDGMENT:</b> I have reviewed the above statement and authorize the disbursement of funds as indicated. I understand that once these payments are made, no further funds will be available to me from this settlement.</div>
  <div class="sig"><div>${signed ? `<div class="signed">${E(c.client.first)} ${E(c.client.last)}</div>` : "<br>"}CLIENT SIGNATURE · Date: ${signed ? E(todayStr()) : "________"}</div><div><br>ATTORNEY SIGNATURE · ${E(F.attorney)}</div></div>`);
}

/* ---------- what the case expects (from the trainee's own negotiation) ---------- */
function finalAmount(c, w, p){
  const f = figures(p, true);
  if(f.balance <= 0) return 0;
  if(reducible(p) && w.got.approved[p.id] != null) return w.got.approved[p.id];
  return f.balance;
}
function expected(c, w, stage){
  const g = gross(c), fee = feeOf(c), costs = costsOf(c);
  if(stage === "initial"){
    const rows = c.payees.map((p) => ({ p, want: figures(p, false).balance, col: "I" }));
    const tot = r2(rows.reduce((s, x) => s + x.want, 0));
    return { gross: g, fee, costs, rows, total: tot, net: r2(g - fee - costs - tot), netLabel: "Net before reductions" };
  }
  const rows = c.payees.map((p) => ({ p, want: finalAmount(c, w, p), col: "L" }));
  const tot = r2(rows.reduce((s, x) => s + x.want, 0));
  return { gross: g, fee, costs, rows, total: tot, net: r2(g - fee - costs - tot), netLabel: "Net client disbursement" };
}

/* ---------- the Net Sheet (the LSH Net Sheet's sections) ---------- */
const COST_ROWS = [12, 13, 14, 15, 16, 17, 18, 19];
const LEDGER_ROWS = () => Array.from({ length: Math.max(8, CASE().payees.length + 2) }, (_, i) => 25 + i);
function sheetCalc(cells){
  const g = (k) => num(cells[k]), o = {};
  o.L7 = g("L7"); o.L11 = r2(o.L7 * rate(cells.C11)); o.L20 = r2(COST_ROWS.reduce((s, r) => s + g("L" + r), 0)); o.L21 = r2(o.L11 + o.L20);
  LEDGER_ROWS().forEach((r) => { o["I" + r] = r2(g("D" + r) - g("E" + r) - g("F" + r) - g("G" + r)); o["L" + r] = g("L" + r); });
  o.I44 = r2(LEDGER_ROWS().reduce((s, r) => s + o["I" + r], 0)); o.L44 = r2(LEDGER_ROWS().reduce((s, r) => s + o["L" + r], 0));
  o.N0 = r2(o.L7 - o.L11 - o.L20 - o.I44); o.L52 = r2(o.L7 - o.L11 - o.L20 - o.L44);
  return o;
}
// the row the trainee put a payee on (by its name)
function rowFor(cells, p){ const k = keyOf(p); return LEDGER_ROWS().find((r) => low(cells["C" + r]).includes(k)); }
function checkSheet(stage){
  const c = CASE(), w = W(), cells = w.sheet.cells, o = sheetCalc(cells), x = expected(c, w, stage);
  const items = [
    { what: "Gross settlement", got: o.L7, want: x.gross, why: `${c.settlements.map((s) => `${s.type} ${money(s.amount)}`).join(" + ")}. PIP is not recovery.` },
    { what: "Attorney's fee", got: o.L11, want: x.fee, why: `${c.fee.pct} of the gross. ${c.fee.why} Type 33⅓% (or 1/3), not 33.33%.` },
    { what: "Advanced case expenses", got: o.L20, want: x.costs, why: "Every receipted cost on the Case Cost Ledger." }
  ];
  x.rows.forEach((y) => {
    const r = rowFor(cells, y.p), got = r ? (stage === "initial" ? o["I" + r] : o["L" + r]) : 0;
    if(!r && y.want === 0) return;
    items.push({ what: `${y.p.name}${stage === "initial" ? " · balance" : " · amount to pay"}`, got, want: y.want, missing: !r,
      why: stage === "initial" ? (y.p.lien ? "The lien or payoff amount on the letter on file." : "Total charges less the payments and write-offs on the statement on file.")
        : (y.want === 0 ? "A $0.00 balance: nothing is paid." : reducible(y.p) && w.got.approved[y.p.id] != null ? "The amount the payee approved in writing (its reply)." : y.p.reduce && y.p.reduce.policy === "contract" ? "The updated payoff: funding companies don't reduce." : y.p.reduce && y.p.reduce.policy === "statute" ? "A statutory lien: paid in full." : y.p.onFile ? "Its current balance, from the corrected bill or updated letter (no reduction approved)." : "Its current balance (no reduction approved).") });
  });
  items.push({ what: stage === "initial" ? "Total liens & balances (before reductions)" : "Total liens (reduced)", got: stage === "initial" ? o.I44 : o.L44, want: x.total, why: "The sum of the rows." });
  items.push({ what: x.netLabel, got: stage === "initial" ? o.N0 : o.L52, want: x.net, why: "Gross – fee – expenses – liens." });
  items.forEach((i) => { i.ok = !i.missing && Math.abs(i.got - i.want) < 0.005; });
  w.checks[stage] = { at: new Date().toISOString(), passed: items.filter((i) => i.ok).length, total: items.length, ok: items.every((i) => i.ok) };
  save();
  return items;
}

/* ---------- the tasks, by day ---------- */
function rrValid(c, w, p){
  const d = w.drafts.rr[p.id] || {}, f = figures(p, !!w.got.corrected[p.id] || !p.onFile);
  const fm = /^MED\s*-\s*(.+?)\s*-\s*Reduction Request\s*\((.+)\)\s*$/i.exec(String(d.file || "").trim());
  const issues = [];
  if(!fm) issues.push("File name: MED - Provider's name - Reduction Request (your first name only)");
  else { if(!low(fm[1]).includes(keyOf(p))) issues.push(`File name: the provider's name (${p.name}) goes in the middle`); if(traineeFirst() && low(fm[2]).trim() !== low(traineeFirst())) issues.push(`File name: your first name only in the brackets (${traineeFirst()})`); }
  if(Math.abs(num(d.balance) - f.balance) >= 0.005) issues.push(`Current balance: ${money(num(d.balance))} isn't the balance on the ${w.got.corrected[p.id] || !p.onFile ? "current" : "statement on file"} (${money(f.balance)})`);
  if(!(num(d.requested) > 0 && num(d.requested) < f.balance)) issues.push("Requested amount: more than $0.00 and less than the current balance");
  if(!d.client || !low(d.client).includes(low(c.client.last))) issues.push("Patient: LAST NAME, FIRST NAME of the client");
  return issues;
}
function csIssues(c, w){
  const d = w.drafts.cs || {}, x = expected(c, w, "final"), issues = [];
  const fm = /^(.+?)\s*[–-]\s*Closing Statement\s*\((.+)\)\s*$/i.exec(String(d.file || "").trim());
  if(!fm || !low(fm[1]).includes(low(c.client.first)) || !low(fm[1]).includes(low(c.client.last))) issues.push("File name: Client's Name – Closing Statement (your name)");
  [["gross", x.gross, "Gross settlement"], ["fee", x.fee, "Attorney's fee"], ["costs", x.costs, "Case expenses"], ["net", x.net, "Net to client"]].forEach(([k, want, label]) => { if(Math.abs(num(d[k]) - want) >= 0.005) issues.push(`${label}: ${money(num(d[k]))} doesn't match the final figures (${money(want)})`); });
  x.rows.forEach((y) => { if(Math.abs(num((d.pay || {})[y.p.id]) - y.want) >= 0.005) issues.push(`${y.p.name}: ${money(num((d.pay || {})[y.p.id]))}, the final figure is ${money(y.want)}`); });
  const o = sheetCalc(w.sheet.cells);
  if(Math.abs(o.L52 - num(d.net)) >= 0.005) issues.push(`The net must match your Net Sheet exactly (your sheet: ${money(o.L52)})`);
  return issues;
}
function tasks(stage){
  const c = CASE(), w = W(), sent = (w.mail || []).filter((m) => m.dir === "out"), inbox = (w.mail || []).filter((m) => m.dir === "in");
  const red = c.payees.filter(reducible);
  if(stage === "day2") return [
    { t: "Open the Settlement Release Form(s) in the Case File", ok: c.settlements.every((s) => w.viewed["release-" + s.type]) },
    { t: "Email the Settlement Release(s) to your trainer", ok: !!w.got.releaseSent },
    { t: "Receive the fully executed release", ok: !!w.got.exec },
    { t: "Draft the initial Net Sheet (the bills and liens as on file)", ok: !!(w.checks.initial && w.checks.initial.ok) },
    { t: `Draft the Reduction Request${red.length > 1 ? "s" : ""} (${red.length}), ready to send`, ok: red.every((p) => w.drafts.rr[p.id] && w.drafts.rr[p.id].file && num(w.drafts.rr[p.id].requested) > 0) }
  ];
  return [
    { t: "Request updated bills and payoffs where the file is out of date", ok: outdated(c).every((p) => w.got.corrected[p.id]) },
    { t: `Send the Reduction Request${red.length > 1 ? "s" : ""} and get each answer`, ok: red.every((p) => w.got.approved[p.id] != null) },
    { t: "Finalize the Net Sheet", ok: !!(w.checks.final && w.checks.final.ok) },
    { t: "Draft the Closing Statement (it matches the Net Sheet)", ok: !!(w.drafts.cs && w.drafts.cs.file) && csIssues(c, w).length === 0 },
    { t: "Send the Closing Statement and Settlement Release Form(s) to the client", ok: !!w.got.clientSent },
    { t: "Receive the client's signed Closing Statement", ok: !!w.got.signed }
  ];
}

/* ---------- the email simulator ---------- */
function book(c){
  return [{ who: "trainer", name: F.trainer.name, email: F.trainer.email }, { who: "client", name: `${c.client.first} ${c.client.last} (client)`, email: c.client.email }]
    .concat(c.payees.map((p) => ({ who: "payee", id: p.id, name: `${p.name} (${p.lien ? "lienholder" : "billing"})`, email: p.email })));
}
function attachables(c, w){
  const out = c.settlements.map((s) => ({ kind: "doc", ref: "release-" + s.type, name: `Settlement Release Form · ${s.type}` }));
  if(w.got.exec) c.settlements.forEach((s) => out.push({ kind: "doc", ref: "exec-" + s.type, name: `Fully Executed Release · ${s.type}` }));
  c.payees.filter((p) => w.drafts.rr[p.id] && w.drafts.rr[p.id].file).forEach((p) => out.push({ kind: "rr", ref: p.id, name: w.drafts.rr[p.id].file }));
  if(w.drafts.cs && w.drafts.cs.file) out.push({ kind: "cs", ref: "cs", name: w.drafts.cs.file });
  out.push({ kind: "doc", ref: "costs", name: "Case Cost Ledger" });
  return out;
}
let mailSeq = 0;
const mid = () => Date.now().toString(36) + (mailSeq++).toString(36);
function deliver(w, m, delay){
  setTimeout(() => { w.mail.push(Object.assign({ id: mid(), dir: "in", at: new Date().toISOString(), unread: true }, m)); save(); if(window.state.view === "desk") window.render(); window.toast(`📨 New email: ${m.subject}`); }, delay || 1400);
}
const sig = (name, extra) => `\n\nBest regards,\n${name}${extra ? "\n" + extra : ""}`;
function respond(c, w, out){
  const to = book(c).find((b) => low(b.email) === low(out.to));
  const subj = out.subject || "", body = out.body || "", all = low(subj + " " + body);
  const lf = clientLF(c), hasClient = all.includes(low(c.client.last)) && all.includes(low(c.client.first));
  const re = "RE: " + subj;
  if(!to){ deliver(w, { from: "Mail Delivery System", fromEmail: "mailer-daemon@lshlawfirm.example", subject: "Undeliverable: " + subj, body: `Your message to ${out.to} couldn't be delivered: the address isn't in this case's contacts.\n\nUse the address book in the To field.` }, 800); return; }
  if(to.who === "trainer"){
    const rel = (out.att || []).filter((a) => a.kind === "doc" && /^release-/.test(a.ref)).map((a) => a.ref.slice(8));
    if(!rel.length){ deliver(w, { from: F.trainer.name, fromEmail: F.trainer.email, subject: re, body: `Hi,\n\nI don't see the settlement release attached. Please attach the Settlement Release Form${c.settlements.length > 1 ? "s" : ""} from the case file and resend.` + sig("Training Desk") }); return; }
    const missing = c.settlements.filter((s) => !rel.includes(s.type));
    if(missing.length){ deliver(w, { from: F.trainer.name, fromEmail: F.trainer.email, subject: re, body: `Hi,\n\nThanks. This case settled with ${c.settlements.length} carriers: I still need the ${missing.map((s) => s.type).join(" and ")} release before I can return a fully executed set.` + sig("Training Desk") }); return; }
    w.got.releaseSent = true; w.got.execOn = todayStr();
    deliver(w, { from: F.trainer.name, fromEmail: F.trainer.email, subject: `Fully Executed Release${c.settlements.length > 1 ? "s" : ""} | ${lf}`, body: `Hi,\n\nAttached is the fully executed release${c.settlements.length > 1 ? "s" : ""} for ${lf} (DOL ${c.dol}): signed by the client, countersigned by the carrier, and notarized. The settlement funds will issue against ${c.settlements.length > 1 ? "them" : "it"}.\n\nYou can now draft the initial Net Sheet.` + sig("Training Desk"),
      att: c.settlements.map((s) => ({ kind: "doc", ref: "exec-" + s.type, name: `${c.client.first} ${c.client.last} – Fully Executed Release ${s.type}` })), onArrive: "exec" }, 2200);
    return;
  }
  if(to.who === "client"){
    const csA = (out.att || []).find((a) => a.kind === "cs"), relA = (out.att || []).filter((a) => a.kind === "doc" && /^(release|exec)-/.test(a.ref));
    const subjOk = new RegExp(`^\\s*${c.client.last}\\s*,\\s*${c.client.first}\\b.*-\\s*closing statement and settlement release form`, "i").test(subj);
    if(!csA || relA.length < c.settlements.length){ deliver(w, { from: `${c.client.first} ${c.client.last}`, fromEmail: c.client.email, subject: re, body: `Hello,\n\nThank you for reaching out. I think something is missing: I was told I'd receive my closing statement and the settlement release form${c.settlements.length > 1 ? "s" : ""} to review and sign. Could you send ${!csA ? "the closing statement" : "the release form" + (c.settlements.length > 1 ? "s" : "")}?\n\nThank you,\n${c.client.first}` }); return; }
    const issues = csIssues(c, w);
    w.got.clientSent = true;
    if(issues.length){ deliver(w, { from: `${c.client.first} ${c.client.last}`, fromEmail: c.client.email, subject: re, body: `Hello,\n\nThanks for sending these. Before I sign, I have a question: the numbers on the closing statement don't seem to add up to what I was told. Can you double-check it and send me a corrected one?\n\nThank you,\n${c.client.first}`, coach: issues }); w.got.clientSent = false; return; }
    w.got.subjectOk = subjOk;
    deliver(w, { from: `${c.client.first} ${c.client.last}`, fromEmail: c.client.email, subject: re, body: `Hello,\n\nThank you so much for walking me through this. I've reviewed the closing statement and the release form${c.settlements.length > 1 ? "s" : ""}, signed them, and attached them here.\n\nThank you,\n${c.client.first}`,
      att: [{ kind: "cs", ref: "cs", name: `${c.client.first} ${c.client.last} – Closing Statement (signed)`, signed: true }], onArrive: "signed", coach: subjOk ? [] : [`Subject line: ${lf} - Closing Statement and Settlement Release Form/s`] }, 2400);
    return;
  }
  // a provider's billing office or a lienholder
  const p = c.payees.find((x) => x.id === to.id), from = { from: p.lien ? `${p.name}` : `${p.name} · Billing`, fromEmail: p.email };
  const dolOk = all.includes(c.dol) || all.includes(c.dol.replace(/\/20(\d\d)$/, "/$1"));
  if(!hasClient || !dolOk){ deliver(w, Object.assign({ subject: re, body: `Good day,\n\nWe were unable to locate this account. Please include the patient's full name and date of loss (and the dates of service, if you have them) so we can route your request.` + sig(p.lien ? "Recovery Department" : "Billing Department", p.name) }, from)); return; }
  const rr = (out.att || []).find((a) => a.kind === "rr" && a.ref === p.id) || (out.att || []).find((a) => a.kind === "rr");
  if(rr && rr.ref !== p.id){ deliver(w, Object.assign({ subject: re, body: `Good day,\n\nThe reduction request attached is addressed to another provider (${(c.payees.find((x) => x.id === rr.ref) || {}).name || "another account"}), not ${p.name}. Please send the correct letter.` + sig("Billing Department", p.name) }, from)); return; }
  if(rr){
    const subjOk = new RegExp(`billing\\s+reduction\\s+request\\s*\\|\\s*${c.client.last}\\s*,\\s*${c.client.first}`, "i").test(subj);
    if(!subjOk){ deliver(w, Object.assign({ subject: re, body: `Good day,\n\nOur billing team routes reduction requests by subject line. Please resend with the subject:\n\nBilling Reduction Request | ${lf}\n\nThank you.` + sig("Billing Department", p.name) }, from)); return; }
    const d = w.drafts.rr[p.id] || {}, cur = figures(p, true);
    if(p.onFile && !w.got.corrected[p.id] && Math.abs(num(d.balance) - cur.balance) >= 0.005){
      w.got.corrected[p.id] = true;
      deliver(w, Object.assign({ subject: re, body: `Good day,\n\nYour request lists a balance of ${money(num(d.balance))}, but that statement is out of date: the current balance is ${money(cur.balance)}. Our updated ${p.lien ? "payoff" : "statement"} is attached. Please review it and resend your request against the current balance.` + sig(p.lien ? "Recovery Department" : "Billing Department", p.name),
        att: [{ kind: "doc", ref: "corrected-" + p.id, name: `${p.lien ? "Updated Payoff" : "Updated Itemized Statement"} · ${p.name}` }] }, from)); return;
    }
    if(Math.abs(num(d.balance) - cur.balance) >= 0.005){ deliver(w, Object.assign({ subject: re, body: `Good day,\n\nYour request lists a balance of ${money(num(d.balance))}. Our current balance is ${money(cur.balance)}. Please correct the letter and resend.` + sig("Billing Department", p.name) }, from)); return; }
    if(!p.reduce || p.reduce.floor == null){
      const zero = cur.balance <= 0;
      deliver(w, Object.assign({ subject: re, body: zero ? `Good day,\n\nThis account has a $0.00 balance: it was paid by the patient's health insurance with the contractual adjustment applied. Nothing is owed from the settlement.` + sig("Billing Department", p.name)
        : p.reduce.policy === "statute" ? `Good day,\n\nThis is a statutory lien for unpaid child support. It is not subject to reduction. Please remit ${money(cur.balance)} from the settlement proceeds, payable as stated on the notice.` + sig("Enforcement Unit", p.name)
        : `Good day,\n\nWe are unable to reduce this amount: our payoff is contractual under the funding agreement the client signed. The payoff of ${money(cur.balance)} is good for 30 days from today. Please remit from the settlement proceeds.` + sig("Payoff Department", p.name) }, from));
      return;
    }
    const ask = num(d.requested), floor = p.reduce.floor, approved = ask >= floor ? r2(Math.min(ask, cur.balance)) : floor;
    w.got.approved[p.id] = approved; w.got.answered[p.id] = true;
    const letter = wrap("Reduction approval", `${org(p)}<h1>${ask >= floor ? "Reduction Accepted" : "Counter-Offer"}</h1><table class="meta"><tr><td><b>Patient:</b> ${E(lf)}</td><td><b>Date of loss:</b> ${E(c.dol)}</td><td><b>Date:</b> ${E(todayStr())}</td></tr></table>
      <table><tr><th>Account</th><th class="m">Amount</th></tr><tr><td>Current balance</td><td class="m">${money(cur.balance)}</td></tr><tr><td>Amount requested</td><td class="m">${money(ask)}</td></tr><tr class="tot"><td>APPROVED AS PAYMENT IN FULL</td><td class="m">${money(approved)}</td></tr></table>
      <p>${E(p.reduce.why || "")}</p><p>This approval is valid for 30 days. Upon receipt of ${money(approved)}, the account will be considered paid in full and closed.</p>`);
    deliver(w, Object.assign({ subject: re, body: ask >= floor
      ? `Good day,\n\nThank you for your request. We accept ${money(approved)} as payment in full for ${lf}'s account (balance ${money(cur.balance)}). Our written approval is attached.` + sig(p.lien ? "Recovery Department" : "Billing Department", p.name)
      : `Good day,\n\nThank you for your request. We are unable to accept ${money(ask)}. The lowest we can accept is ${money(floor)} as payment in full for ${lf}'s account (balance ${money(cur.balance)}). Our written offer is attached; please use this figure.` + sig(p.lien ? "Recovery Department" : "Billing Department", p.name),
      att: [{ kind: "reply", ref: "approval-" + p.id, name: `${ask >= floor ? "Reduction Approval" : "Counter-Offer"} · ${p.name}`, html: letter }] }, from), 2600);
    return;
  }
  // a request for an updated bill or payoff
  if(/updat|itemi|current|statement|balance|payoff|ledger|bill/.test(all)){
    if(p.onFile){
      w.got.corrected[p.id] = true;
      deliver(w, Object.assign({ subject: re, body: `Good day,\n\nPlease see the attached ${p.lien ? "updated payoff" : "updated itemized statement"} for ${lf} (DOL ${c.dol}). The current ${p.lien ? "payoff" : "balance"} is ${money(figures(p, true).balance)}.` + sig(p.lien ? "Payoff Department" : "Billing Department", p.name),
        att: [{ kind: "doc", ref: "corrected-" + p.id, name: `${p.lien ? "Updated Payoff" : "Updated Itemized Statement"} · ${p.name}` }] }, from));
    } else {
      deliver(w, Object.assign({ subject: re, body: `Good day,\n\nOur records match the ${p.lien ? "lien notice" : "statement"} you have: the current ${p.lien ? "amount" : "balance"} for ${lf} is ${money(figures(p, true).balance)}. A copy is attached.` + sig(p.lien ? "Recovery Department" : "Billing Department", p.name),
        att: [{ kind: "doc", ref: "bill-" + p.id, name: `${p.lien ? "Lien Notice" : "Itemized Statement"} · ${p.name}` }] }, from));
    }
    return;
  }
  deliver(w, Object.assign({ subject: re, body: `Good day,\n\nThank you for your email. How can we help with ${lf}'s account? If you need an updated statement or payoff, or are requesting a reduction, please say so and attach your letter.` + sig("Billing Department", p.name) }, from));
}
function arrived(w){ (w.mail || []).forEach((m) => { if(m.dir !== "in" || m.done) return; if(m.onArrive === "exec") w.got.exec = true; if(m.onArrive === "signed") w.got.signed = true; m.done = true; }); }

/* ---------- the trainer's real release (Admin upload) ---------- */
function mergeUpload(){
  const S = window.state, up = S.deskRelease, w = W();
  if(!up || !up.url || w.got.uploadAt === up.at) return;
  w.got.uploadAt = up.at; w.got.exec = true; w.got.execOn = w.got.execOn || todayStr();
  w.mail.push({ id: mid(), dir: "in", at: up.at, unread: true, done: true, from: F.trainer.name, fromEmail: F.trainer.email, subject: `Fully Executed Release | ${clientLF(CASE())}`, body: "Hi,\n\nAttached is the fully executed release for your case.\n\nBest regards,\nYour trainer", att: [{ kind: "upload", ref: "upload", name: up.name || "Fully Executed Release", url: up.url }] });
  save();
}

/* ---------- the view ---------- */
const UI = { tab: "tasks", doc: null, mail: null, compose: null, draft: null, checks: {} };
function viewer(d){
  if(!d) return `<div class="ld-empty">Pick a document.</div>`;
  if(d.url) return `<iframe class="ld-doc" src="${E(d.url)}" title="${E(d.title || "Document")}"></iframe>`;
  return `<iframe class="ld-doc" srcdoc="${E(d.html())}" title="${E(d.title || "Document")}"></iframe>`;
}
function head(c, w){
  const unread = (w.mail || []).filter((m) => m.dir === "in" && m.unread).length;
  const tab = (k, label) => `<button class="${UI.tab === k ? "on" : ""}" onclick="LNDesk.tab('${k}')">${label}</button>`;
  return `<div class="ld-head">
    <div class="ld-case"><span class="mono">${E(c.caseNo)}</span><h1>${E(c.client.first)} ${E(c.client.last)}</h1>
      <p>DOL ${E(c.dol)} · ${E(c.facts)} · ${c.settlements.map((s) => `${E(s.type)} ${money(s.amount)} (${E(s.carrier)})`).join(" + ")} · Attorney ${E(F.attorney)}</p></div>
    <div class="ld-tabs">${tab("tasks", "📋 Tasks")}${tab("file", "📁 Case File")}${tab("mail", `✉️ Email${unread ? ` <b class="ld-badge">${unread}</b>` : ""}`)}${tab("sheet", "🧮 Net Sheet")}${tab("drafts", "✍️ Drafts")}</div>
  </div>`;
}
function vTasks(c, w){
  const sec = (h, list) => `<div class="ld-card"><h2>${h}</h2><ol class="ld-tasks">${list.map((t) => `<li class="${t.ok ? "ok" : ""}">${t.ok ? "✅" : "⬜"} ${E(t.t)}</li>`).join("")}</ol></div>`;
  return `<div class="ld-grid2">${sec("Day 2 · The release, the initial Net Sheet, the Reduction Requests", tasks("day2"))}${sec("Day 3 · Updated bills, reductions, the Closing Statement", tasks("day3"))}</div>
    <div class="ld-card"><h2>How the demo does it</h2><ol class="ld-how">
      <li><b>Case File:</b> open the Settlement Release Form(s), the bills, the PIP log, the lien notices and payoff letters, and the cost ledger. Note the dates: a statement or payoff can be out of date.</li>
      <li><b>Email:</b> send the release(s) to your trainer; the fully executed release comes back.</li>
      <li><b>Net Sheet:</b> the gross, the fee from the retainer, the costs, and every provider and lien as on file. Check it.</li>
      <li><b>Drafts:</b> a Reduction Request for each provider or lien that can be reduced: <span class="mono">MED - Provider's name - Reduction Request (your first name)</span>.</li>
      <li><b>Email:</b> request updated bills or payoffs (client's full name and DOL), then send each Reduction Request with the subject <span class="mono">Billing Reduction Request | ${E(clientLF(c))}</span>.</li>
      <li><b>Net Sheet:</b> the approved amounts and updated payoffs, then check the final sheet.</li>
      <li><b>Drafts:</b> the Closing Statement, <span class="mono">${E(c.client.first)} ${E(c.client.last)} – Closing Statement (your name)</span>, matching the Net Sheet exactly.</li>
      <li><b>Email:</b> send it with the Settlement Release Form(s) (named <span class="mono">${E(c.client.first)} ${E(c.client.last)} – Settlement Release Form BI</span>) to the client: <span class="mono">${E(clientLF(c))} - Closing Statement and Settlement Release Form/s</span>.</li>
    </ol></div>`;
}
function vFile(c, w){
  const all = docs(c, w), cur = all.find((d) => d.id === UI.doc) || all[0];
  if(cur && !w.viewed[cur.id]){ w.viewed[cur.id] = true; save(); }
  const groups = [...new Set(all.map((d) => d.group))];
  return `<div class="ld-split"><nav class="ld-list">${groups.map((g) => `<h3>${E(g)}</h3>${all.filter((d) => d.group === g).map((d) => `<button class="${cur && d.id === cur.id ? "on" : ""}" onclick="LNDesk.doc('${E(d.id)}')">${w.viewed[d.id] ? "" : "<i></i>"}${E(d.title)}</button>`).join("")}`).join("")}</nav>
    <div class="ld-view"><div class="ld-view-bar"><b>${E(cur ? cur.title : "")}</b><button class="btn btn-sm btn-ghost" onclick="LNDesk.print()">⬇ Download / Print (Save as PDF)</button></div>${viewer(cur)}</div></div>`;
}
function vMail(c, w){
  arrived(w);
  const list = (w.mail || []).slice().reverse();
  const cur = UI.compose ? null : list.find((m) => m.id === UI.mail) || list[0];
  if(cur && cur.unread){ cur.unread = false; save(); }
  const row = (m) => `<button class="${cur && m.id === cur.id ? "on" : ""} ${m.unread ? "unread" : ""}" onclick="LNDesk.open('${m.id}')"><span>${m.dir === "out" ? "To: " + E(m.to) : E(m.from)}</span><b>${E(m.subject || "(no subject)")}</b><small>${E(new Date(m.at).toLocaleString())}${(m.att || []).length ? " · 📎 " + m.att.length : ""}</small></button>`;
  let pane;
  if(UI.compose){
    const k = UI.compose, opts = attachables(c, w);
    pane = `<div class="ld-compose"><h2>New email</h2>
      <label>To<select id="ldTo"><option value="">Choose a contact…</option>${book(c).map((b) => `<option value="${E(b.email)}" ${k.to === b.email ? "selected" : ""}>${E(b.name)} &lt;${E(b.email)}&gt;</option>`).join("")}</select></label>
      <label>Subject<input id="ldSubj" value="${E(k.subject || "")}" placeholder="e.g. Billing Reduction Request | ${E(clientLF(c))}"></label>
      <label>Message<textarea id="ldBody" rows="9" placeholder="Good day! …">${E(k.body || "")}</textarea></label>
      <div class="ld-att"><b>Attach</b>${opts.map((a, i) => { const on = (k.att || []).some((x) => x.kind === a.kind && x.ref === a.ref); const nm = ((k.att || []).find((x) => x.kind === a.kind && x.ref === a.ref) || a).name;
        return `<div class="ld-att-row"><label><input type="checkbox" data-i="${i}" ${on ? "checked" : ""}> ${E(a.kind === "doc" ? a.name : "Draft")}</label><input class="ld-att-name" data-i="${i}" value="${E(nm)}" title="The attachment's file name" ${a.kind === "doc" && /^(release|exec)-/.test(a.ref) ? "" : a.kind === "doc" ? "" : "readonly"}></div>`; }).join("")}</div>
      <div class="ld-row"><button class="btn btn-primary" onclick="LNDesk.send()">Send</button><button class="btn btn-ghost" onclick="LNDesk.cancel()">Discard</button></div></div>`;
  } else if(cur){
    pane = `<div class="ld-read"><h2>${E(cur.subject || "(no subject)")}</h2><p class="ld-from">${cur.dir === "out" ? `To: ${E(cur.to)}` : `From: ${E(cur.from)} &lt;${E(cur.fromEmail || "")}&gt;`} · ${E(new Date(cur.at).toLocaleString())}</p>
      <pre class="ld-body">${E(cur.body || "")}</pre>
      ${(cur.att || []).length ? `<div class="ld-atts">${cur.att.map((a, j) => `<button class="btn btn-sm btn-ghost" onclick="LNDesk.att('${cur.id}',${j})">📎 ${E(a.name)}</button>`).join("")}</div>` : ""}
      ${(cur.coach || []).length && window.state.isAdmin ? "" : ""}${(cur.coach || []).length ? `<div class="ld-coach"><b>Coach:</b><ul>${cur.coach.map((x) => `<li>${E(x)}</li>`).join("")}</ul></div>` : ""}
      ${cur.dir === "in" ? `<div class="ld-row"><button class="btn btn-sm btn-navy" onclick="LNDesk.reply('${cur.id}')">↩ Reply</button></div>` : ""}</div>`;
  } else pane = `<div class="ld-empty">No emails yet. Start one with ✉️ New email.</div>`;
  return `<div class="ld-split ld-mail"><nav class="ld-list"><button class="btn btn-primary btn-sm ld-new" onclick="LNDesk.compose()">✉️ New email</button>${list.map(row).join("") || '<p class="ld-muted">Inbox empty</p>'}</nav><div class="ld-view">${pane}</div></div>`;
}
function vSheet(c, w){
  const cells = w.sheet.cells, o = sheetCalc(cells);
  const inp = (k, cls) => `<input class="ld-in ${cls || ""}" data-k="${k}" value="${E(cells[k] != null ? cells[k] : "")}">`;
  const out = (k) => `<output data-o="${k}">${money(o[k])}</output>`;
  const res = (stage) => { const r = UI.checks[stage]; return r ? `<div class="ld-check"><b>${r.every((i) => i.ok) ? "✓ Your sheet ties out" : `${r.filter((i) => i.ok).length} of ${r.length} tie out`}</b><ul>${r.map((i) => `<li class="${i.ok ? "ok" : "miss"}">${i.ok ? "✓" : "✗"} ${E(i.what)}: ${i.ok ? money(i.want) : i.missing ? `no row for it (put the name in Provider Name)` : `${money(i.got)}, the file says ${money(i.want)}`}${i.ok ? "" : ` <small>${E(i.why)}</small>`}</li>`).join("")}</ul></div>` : (w.checks[stage] ? `<p class="ld-muted">Last check (${stage}): ${w.checks[stage].passed}/${w.checks[stage].total}</p>` : ""); };
  return `<div class="ld-card ld-sheet">
    <div class="ld-row"><h2 style="margin:0;flex:1">LSH Net Sheet · ${E(c.client.first)} ${E(c.client.last)}</h2><button class="btn btn-sm btn-navy" onclick="LNDesk.check('initial')">✓ Check initial sheet (Day 2)</button><button class="btn btn-sm btn-primary" onclick="LNDesk.check('final')">✓ Check final sheet (Day 3)</button></div>
    ${res("initial")}${res("final")}
    <h3>1. Settlement Recovery Summary</h3><table class="ld-t"><tr><th>Description</th><th>Reference</th><th class="m">Amount</th></tr><tr><td>Gross Settlement</td><td>${inp("C7", "wide")}</td><td class="m">${inp("L7")}</td></tr></table>
    <h3>2. Attorney Fees &amp; Advanced Case Expenses</h3><table class="ld-t"><tr><th>Expense</th><th>Details</th><th class="m">Amount</th></tr>
      <tr><td>Attorney Fees</td><td>${inp("C11", "pct")} <small>of the gross (33⅓% pre-suit, 40% once suit is filed)</small></td><td class="m">${out("L11")}</td></tr>
      ${COST_ROWS.map((r) => `<tr><td>${inp("B" + r)}</td><td>${inp("C" + r, "wide")}</td><td class="m">${inp("L" + r)}</td></tr>`).join("")}
      <tr class="tot"><td colspan="2">Total Advanced Case Expenses</td><td class="m">${out("L20")}</td></tr><tr class="tot"><td colspan="2">Total Fees &amp; Costs</td><td class="m">${out("L21")}</td></tr></table>
    <h3>3. Medical Provider Ledger &amp; Liens</h3><div class="ld-scroll"><table class="ld-t"><tr><th>Type</th><th>Provider / Lienholder Name</th><th class="m">Total Charges</th><th class="m">PIP Payments</th><th class="m">Health Payments</th><th class="m">Adjustments</th><th class="m">Balance Owed</th><th class="m">Reduced / Final</th></tr>
      ${LEDGER_ROWS().map((r) => `<tr><td>${inp("B" + r)}</td><td>${inp("C" + r, "wide")}</td>${["D", "E", "F", "G"].map((k) => `<td class="m">${inp(k + r)}</td>`).join("")}<td class="m">${out("I" + r)}</td><td class="m">${inp("L" + r)}</td></tr>`).join("")}
      <tr class="tot"><td colspan="6">Total</td><td class="m">${out("I44")}</td><td class="m">${out("L44")}</td></tr></table></div>
    <h3>4. Final Client Disbursement</h3><table class="ld-t"><tr><td>Gross Settlement – Fees – Expenses – Balances (before reductions)</td><td class="m">${out("N0")}</td></tr><tr class="tot"><td>NET CLIENT DISBURSEMENT (with the reduced / final amounts)</td><td class="m">${out("L52")}</td></tr></table>
  </div>`;
}
function vDrafts(c, w){
  const kinds = c.payees.map((p) => ({ k: "rr:" + p.id, label: `Reduction Request · ${p.name}`, p })).concat([{ k: "cs", label: "Closing Statement" }]);
  const cur = kinds.find((x) => x.k === UI.draft) || kinds[0];
  let form, preview, issues = [];
  if(cur.k === "cs"){
    const d = w.drafts.cs = w.drafts.cs || {};
    issues = d.file ? csIssues(c, w) : [];
    form = `<label>File name<input data-d="file" value="${E(d.file || "")}" placeholder="${E(c.client.first)} ${E(c.client.last)} – Closing Statement (your name)"></label>
      <label>Date<input data-d="date" value="${E(d.date || todayStr())}"></label>
      <label>Gross settlement<input data-d="gross" value="${E(d.gross || "")}"></label><label>Fee %<input data-d="feePct" value="${E(d.feePct || "")}" placeholder="33⅓%"></label><label>Attorney's fee<input data-d="fee" value="${E(d.fee || "")}"></label><label>Case expenses<input data-d="costs" value="${E(d.costs || "")}"></label>
      <fieldset><legend>Paid from the settlement</legend>${c.payees.map((p) => `<label>${E(p.name)}<input data-p="${p.id}" value="${E((d.pay || {})[p.id] || "")}" placeholder="0.00 if nothing is owed"></label>`).join("")}</fieldset>
      <label>Net to client<input data-d="net" value="${E(d.net || "")}"></label>`;
    preview = { html: () => docCS(c, d, false) };
  } else {
    const p = cur.p, d = w.drafts.rr[p.id] = w.drafts.rr[p.id] || {};
    issues = d.file ? rrValid(c, w, p) : [];
    form = `<p class="ld-muted">${p.reduce && p.reduce.floor == null ? (p.reduce.policy === "zero" ? "Check the statement first: is anything owed?" : p.reduce.policy === "statute" ? "A statutory lien: check the notice before you ask." : "Funding companies rarely reduce: their payoff is contractual. You can still ask.") : ""}</p>
      <label>File name<input data-d="file" value="${E(d.file || "")}" placeholder="MED - ${E(p.name.split(" —")[0])} - Reduction Request (your first name)"></label>
      <label>Date<input data-d="date" value="${E(d.date || todayStr())}"></label>
      <label>Patient (LAST, FIRST)<input data-d="client" value="${E(d.client || "")}" placeholder="${E(clientLF(c))}"></label><label>Date of loss<input data-d="dol" value="${E(d.dol || "")}" placeholder="mm/dd/yyyy"></label>
      <label>Total charges<input data-d="charges" value="${E(d.charges || "")}"></label><label>Payments &amp; adjustments<input data-d="paid" value="${E(d.paid || "")}"></label><label>Current balance<input data-d="balance" value="${E(d.balance || "")}"></label><label>Requested amount (payment in full)<input data-d="requested" value="${E(d.requested || "")}"></label>
      <fieldset><legend>Persuasive documentation</legend>${["The settlement is limited to the available policy limits.", "Total medical bills and liens exceed what the settlement can pay in full.", "Our client faces financial hardship from the injuries and lost time from work.", "The firm is reducing its own fee and costs so the client receives a fair recovery."].map((t) => `<label class="ld-chk"><input type="checkbox" data-r="${E(t)}" ${(d.reasons || []).includes(t) ? "checked" : ""}> ${E(t)}</label>`).join("")}</fieldset>
      <label>Note (optional)<textarea data-d="note" rows="2">${E(d.note || "")}</textarea></label>`;
    preview = { html: () => docRR(c, p, d) };
  }
  return `<div class="ld-split"><nav class="ld-list">${kinds.map((x) => `<button class="${x.k === cur.k ? "on" : ""}" onclick="LNDesk.draft('${x.k}')">${E(x.label)}</button>`).join("")}</nav>
    <div class="ld-view ld-draft"><div class="ld-form" oninput="LNDesk.field(event,'${cur.k}')" onchange="LNDesk.field(event,'${cur.k}')">${form}
      <div class="ld-row"><button class="btn btn-primary btn-sm" onclick="LNDesk.saveDraft()">💾 Save draft</button></div>
      ${issues.length ? `<div class="ld-coach"><b>Before you send:</b><ul>${issues.map((x) => `<li>${E(x)}</li>`).join("")}</ul></div>` : ""}</div>
      <div class="ld-prev">${viewer(preview)}</div></div></div>`;
}
function view(){
  const c = CASE(), w = W(); mergeUpload(); arrived(w);
  const body = UI.tab === "file" ? vFile(c, w) : UI.tab === "mail" ? vMail(c, w) : UI.tab === "sheet" ? vSheet(c, w) : UI.tab === "drafts" ? vDrafts(c, w) : vTasks(c, w);
  return `<div class="ld">${head(c, w)}${body}</div>`;
}

/* ---------- actions ---------- */
function bindSheet(){
  document.querySelectorAll(".ld-sheet .ld-in").forEach((el) => el.addEventListener("input", () => {
    const w = W(); w.sheet.cells[el.dataset.k] = el.value; const o = sheetCalc(w.sheet.cells);
    document.querySelectorAll("[data-o]").forEach((x) => { x.textContent = money(o[x.dataset.o]); }); save();
  }));
}
window.LNDesk = {
  view, tasks, cases: CASES, caseOf: () => CASE(), expected: (stage) => expected(CASE(), W(), stage),
  stageDone: (stage) => tasks(stage).every((t) => t.ok),
  after(){ if(UI.tab === "sheet") bindSheet(); },
  tab(k){ UI.tab = k; UI.compose = null; window.render(); },
  doc(id){ UI.doc = id; window.render(); },
  print(){ const f = document.querySelector(".ld-doc"); try{ f.contentWindow.focus(); f.contentWindow.print(); }catch(e){ window.toast("Open the document in a new tab to print it."); } },
  open(id){ UI.mail = id; UI.compose = null; window.render(); },
  compose(pre){ UI.compose = Object.assign({ to: "", subject: "", body: "", att: [] }, pre || {}); window.render(); },
  reply(id){ const m = W().mail.find((x) => x.id === id); if(m) this.compose({ to: m.fromEmail, subject: /^re:/i.test(m.subject) ? m.subject : "RE: " + m.subject }); },
  cancel(){ UI.compose = null; window.render(); },
  send(){
    const c = CASE(), w = W(), opts = attachables(c, w);
    const att = [...document.querySelectorAll(".ld-att input[type=checkbox]:checked")].map((el) => { const a = opts[+el.dataset.i], nm = document.querySelector(`.ld-att-name[data-i="${el.dataset.i}"]`); return Object.assign({}, a, { name: (nm && nm.value.trim()) || a.name }); });
    const m = { id: mid(), dir: "out", at: new Date().toISOString(), to: $("#ldTo").value, subject: $("#ldSubj").value.trim(), body: $("#ldBody").value, att };
    if(!m.to){ window.toast("Choose who it's to."); return; }
    if(!m.subject){ window.toast("Add a subject line."); return; }
    // the client's copies of the release must be named by convention
    if(book(c).find((b) => b.email === m.to && b.who === "client")){
      const bad = att.filter((a) => a.kind === "doc" && /^(release|exec)-/.test(a.ref) && !new RegExp(`${c.client.first}\\s+${c.client.last}\\s*[–-]\\s*Settlement Release Form\\s+${a.ref.split("-")[1]}`, "i").test(a.name));
      if(bad.length){ window.toast(`Name the release attachment: ${c.client.first} ${c.client.last} – Settlement Release Form ${bad[0].ref.split("-")[1]}`); return; }
    }
    w.mail.push(m); UI.compose = null; UI.mail = m.id; save(); window.render(); window.toast("Sent.");
    respond(c, w, m);
  },
  att(id, j){ const c = CASE(), w = W(), m = w.mail.find((x) => x.id === id), a = m && m.att[j]; const d = a && attDoc(c, w, a); if(!d) return;
    window.overlay(`<div class="mh-day">Attachment</div><div class="mh-title">${E(a.name)}</div>`, `<div class="ld-ov">${viewer(Object.assign({ title: a.name }, d))}</div>`); },
  draft(k){ UI.draft = k; window.render(); },
  field(e, k){
    const w = W(), el = e.target, d = k === "cs" ? (w.drafts.cs = w.drafts.cs || {}) : (w.drafts.rr[k.slice(3)] = w.drafts.rr[k.slice(3)] || {});
    if(el.dataset.d) d[el.dataset.d] = el.value;
    if(el.dataset.p){ d.pay = d.pay || {}; d.pay[el.dataset.p] = el.value; }
    if(el.dataset.r){ d.reasons = (d.reasons || []).filter((x) => x !== el.dataset.r); if(el.checked) d.reasons.push(el.dataset.r); }
    save();
    if(e.type === "change"){ const f = document.querySelector(".ld-prev iframe"); const c = CASE(); if(f) f.srcdoc = k === "cs" ? docCS(c, d, false) : docRR(c, c.payees.find((p) => p.id === k.slice(3)), d); }
  },
  saveDraft(){ save(); window.render(); window.toast("Draft saved."); },
  check(stage){ UI.checks[stage] = checkSheet(stage); window.render(); },
  // the trainer's view of one trainee's desk (Admin)
  summary(rec, progRec){ const d = (progRec || {}).desk; if(!d || !d.cases) return null; const id = d.caseId, w = d.cases[id]; if(!w) return null;
    return { caseId: id, emails: (w.mail || []).length, initial: w.checks.initial, final: w.checks.final, signed: !!(w.got || {}).signed, exec: !!(w.got || {}).exec }; }
};

/* ---------- styles ---------- */
const css = document.createElement("style");
css.textContent = `.ld{display:flex;flex-direction:column;gap:12px}
.ld-head{background:linear-gradient(135deg,#1F2440 0%,#2B3158 55%,#353C68 100%);color:#fff;border-radius:18px;padding:14px 18px 10px;display:flex;flex-direction:column;gap:10px}
.ld-case h1{margin:2px 0;font-size:22px;color:#fff}.ld-case .mono{color:#F5C99A;font-size:12px}.ld-case p{margin:0;color:#C9CDE3;font-size:13px;font-weight:500}
.ld-tabs{display:flex;gap:4px;flex-wrap:wrap}.ld-tabs button{border:0;background:rgba(255,255,255,.08);color:#D7DAEC;padding:8px 14px;border-radius:9px;font-size:14px;font-weight:700}
.ld-tabs button.on{background:var(--orange);color:#241304}.ld-badge{background:#b42318;color:#fff;border-radius:99px;padding:0 7px;font-size:11px}
.ld-card{background:rgba(255,255,255,.85);border:1px solid var(--line);border-radius:14px;padding:14px 16px}.ld-card h2{margin:0 0 8px;font-size:17px;color:var(--navy);font-family:var(--font-ui);font-weight:800}
.ld-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:900px){.ld-grid2{grid-template-columns:1fr}}
.ld-tasks{list-style:none;margin:0;padding:0;font-size:14px}.ld-tasks li{padding:5px 0;border-bottom:1px solid var(--line)}.ld-tasks li.ok{color:var(--success)}
.ld-how{margin:0;padding-left:20px;font-size:13.5px;font-weight:500}.ld-how li{padding:3px 0}.mono{font-family:'IBM Plex Mono',monospace}
.ld-split{display:grid;grid-template-columns:280px minmax(0,1fr);gap:12px;min-height:calc(100vh - 290px)}@media(max-width:900px){.ld-split{grid-template-columns:1fr}}
.ld-list{background:rgba(255,255,255,.85);border:1px solid var(--line);border-radius:14px;padding:8px;display:flex;flex-direction:column;gap:3px;overflow-y:auto;max-height:calc(100vh - 290px)}
.ld-list h3{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-soft);margin:8px 6px 2px}
.ld-list button{position:relative;text-align:left;border:0;background:none;border-radius:8px;padding:7px 9px;font-size:13px;font-weight:600;color:var(--ink);display:flex;flex-direction:column;gap:1px}
.ld-list button.on{background:rgba(219,132,55,.16)}.ld-list button:hover{background:rgba(38,43,69,.06)}.ld-list button i{position:absolute;left:0;top:12px;width:6px;height:6px;border-radius:50%;background:var(--orange)}
.ld-list button span{font-size:12px;color:var(--ink-soft)}.ld-list button small{font-size:11px;color:var(--ink-soft);font-weight:500}.ld-list button.unread b{color:var(--orange-deep)}.ld-new{margin:2px 2px 6px}
.ld-view{background:rgba(255,255,255,.9);border:1px solid var(--line);border-radius:14px;padding:10px;display:flex;flex-direction:column;min-width:0}
.ld-view-bar{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:2px 4px 8px;font-size:14px;flex-wrap:wrap}
.ld-doc{flex:1;width:100%;min-height:calc(100vh - 360px);border:1px solid var(--line);border-radius:8px;background:#fff}
.ld-ov .ld-doc{min-height:70vh}.ld-empty{padding:40px;text-align:center;color:var(--ink-soft);font-weight:600}.ld-muted{color:var(--ink-soft);font-size:13px;font-weight:500;margin:4px}
.ld-compose,.ld-read{padding:4px 8px;display:flex;flex-direction:column;gap:8px}.ld-compose h2,.ld-read h2{margin:0;font-size:18px;color:var(--navy)}
.ld-compose label{display:flex;flex-direction:column;gap:3px;font-size:12px;font-weight:700;color:var(--ink-soft)}
.ld-compose input,.ld-compose select,.ld-compose textarea,.ld-form input,.ld-form textarea{border:1px solid var(--line);border-radius:8px;padding:8px 10px;font:500 13.5px var(--font-ui);background:#fff;color:var(--ink)}
.ld-att{border:1px dashed var(--line);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:4px;font-size:13px}
.ld-att-row{display:grid;grid-template-columns:220px minmax(0,1fr);gap:8px;align-items:center}.ld-att-row label{flex-direction:row;align-items:center;gap:6px;font-size:13px;color:var(--ink)}
.ld-att-name{font:500 12.5px 'IBM Plex Mono',monospace !important;padding:5px 8px !important}
.ld-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.ld-from{margin:0;font-size:12.5px;color:var(--ink-soft);font-weight:600}
.ld-body{white-space:pre-wrap;font:500 14px/1.55 var(--font-ui);background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:0}
.ld-atts{display:flex;gap:6px;flex-wrap:wrap}.ld-coach{background:#FFF7E8;border:1px solid var(--orange-soft);border-radius:10px;padding:8px 12px;font-size:13px}.ld-coach ul{margin:4px 0 0;padding-left:18px}
.ld-sheet h3{margin:14px 0 6px;font-size:14.5px;color:var(--navy)}.ld-t{width:100%;border-collapse:collapse;font-size:13px}.ld-t th{text-align:left;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-soft);padding:6px;border-bottom:1px solid var(--line)}
.ld-t td{padding:3px 4px;border-bottom:1px solid rgba(38,43,69,.06)}.ld-t .m{text-align:right}.ld-t tr.tot td{font-weight:800;background:rgba(38,43,69,.04)}
.ld-in{width:100%;min-width:70px;border:1px solid var(--line);border-radius:6px;padding:5px 7px;font:500 13px var(--font-ui);background:#fff}.ld-in.wide{min-width:180px}.ld-in.pct{width:90px}
.ld-t .m .ld-in{text-align:right;width:110px}.ld-t output{font-family:'IBM Plex Mono',monospace;font-size:12.5px}.ld-scroll{overflow-x:auto}
.ld-check{background:#F6F7FB;border-radius:10px;padding:8px 12px;margin-top:8px;font-size:13px}.ld-check ul{margin:4px 0 0;padding-left:4px;list-style:none}.ld-check li.ok{color:var(--success)}.ld-check li.miss{color:var(--danger)}.ld-check small{color:var(--ink-soft);font-weight:500}
.ld-draft{display:grid;grid-template-columns:minmax(260px,360px) minmax(0,1fr);gap:10px}@media(max-width:1100px){.ld-draft{grid-template-columns:1fr}}
.ld-form{display:flex;flex-direction:column;gap:6px;overflow-y:auto;max-height:calc(100vh - 300px);padding-right:4px}.ld-form label{display:flex;flex-direction:column;gap:2px;font-size:12px;font-weight:700;color:var(--ink-soft)}
.ld-form fieldset{border:1px solid var(--line);border-radius:10px;padding:6px 10px;display:flex;flex-direction:column;gap:4px}.ld-form legend{font-size:12px;font-weight:800;color:var(--navy)}
.ld-chk{flex-direction:row !important;align-items:flex-start;gap:6px !important;font-weight:600 !important;color:var(--ink) !important}.ld-prev{display:flex;min-width:0}.ld-prev .ld-doc{min-height:calc(100vh - 320px)}`;
document.head.appendChild(css);
})();
