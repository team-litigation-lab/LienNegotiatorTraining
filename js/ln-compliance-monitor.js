/* ============================================================
   📋 COMPLIANCE AND PLATFORM UTILIZATION MONITORING, from 🛡 Admin → a trainee's 📋 Monitoring
   ------------------------------------------------------------
   The section every LSH program's trainee scorecard carries (the Foundational Training's Batch Sheet has it first; Case
   Management's 🏅 Scorecard card and the EA/PA, PD Claims and Medsum & Demand View Detail the same): a dark heading, then a
   row per measure — what it is, the count, and a box per item, ✓ or ✗ — so a trainer sees at a glance whether the trainee
   is keeping up with the course. This course has no trainee page of its own in Admin, so it opens in a window from the
   📋 Monitoring button beside the trainee's name.
     📚 Days completed          each day marked done (dayProgress[day].done)
     🧩 Modules done            each day's module (deck, recording, handout, demo…) gone through
     ✍️ Process Questions       each set of process questions answered (progress:<id>.answers)
     🕘 Last opened             the furthest day they reached and its step (the course keeps no time for it)
     ⏱ Last on the platform     their record's lastActive
   (This course has no trainer feedback to send, so there is no 📝 Send Feedback here.) It only reads what 🛡 Admin
   already loaded (state.admin.rows, state.admin.progress): nothing is saved.
   ============================================================ */
(function(){
"use strict";
if(typeof COURSE === "undefined" || typeof overlay !== "function") return;
const E = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const T0 = v => { const d = v ? new Date(v) : null; return d && isFinite(d) ? d : null; };
const DTF = new Intl.DateTimeFormat(undefined, {month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"});
const when = v => { const d = T0(v); return d ? DTF.format(d) : ""; };
const ago = v => { const d = T0(v); if(!d) return ""; const m = Math.round((Date.now() - d) / 60000);
  return m < 2 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} day${Math.round(m / 1440) === 1 ? "" : "s"} ago`; };
const box = (icon, label, ok, tip) => `<div class="ccm-it" title="${E(tip || label)}"><span class="ccm-ic">${icon}</span><span class="ccm-lb">${E(label)}</span><b class="ccm-mk ${ok ? "ok" : "no"}">${ok ? "✓" : "✗"}</b></div>`;
const tone = (n, of) => n == null ? "" : n >= of ? "ok" : n ? "mid" : "no";
const row = (label, count, cls, detail) => `<tr><th scope="row">${E(label)}</th><td class="ccm-n ${cls || ""}">${count}</td><td>${detail}</td></tr>`;
const grid = items => `<div class="ccm-g">${items.join("")}</div>`;
const KIND = {deck: "🖼", video: "▶", videos: "▶", files: "📄", guide: "🧭", lab: "🧪", netsheet: "🧮", tools: "🛠", questions: "✍️"};
const allMods = () => (typeof ALL_MODULES !== "undefined" ? ALL_MODULES : COURSE.days.flatMap(d => d.modules.map(m => Object.assign({day: d.day}, m))));
const qMods = () => allMods().filter(m => m.kind === "questions");
const done = (m, r) => typeof moduleDone === "function" ? !!moduleDone(m, r) : !!((((r.dayProgress || {})[m.day] || {}).modules || {})[m.id]);

function html(r){
  const prog = ((state.admin || {}).progress || {})[r.id] || {};
  const dp = r.dayProgress || {}, dayP = d => dp[d.day] || dp[String(d.day)] || {};
  const ds = COURSE.days.map(d => ({d, ok: !!dayP(d).done})), dsN = ds.filter(x => x.ok).length;
  const ms = allMods().map(m => ({m, ok: done(m, r)})), msN = ms.filter(x => x.ok).length;
  const qs = qMods().map(m => { const a = ((prog.answers || {})[m.id] || []).filter(x => String(x || "").trim()); return {m, n: a.length, of: (m.questions || []).length, ok: a.length > 0}; }), qsN = qs.filter(x => x.ok).length;
  const reached = COURSE.days.filter(d => dayP(d).step || dayP(d).done || Object.keys(dayP(d).modules || {}).length).pop() || null, rp = reached ? dayP(reached) : {};
  return `<div class="ccm"><table class="ccm-t"><thead><tr><th colspan="3">Compliance and Platform Utilization Monitoring</th></tr></thead><tbody>
    ${row("📚 Days completed", `${dsN} / ${ds.length}`, tone(dsN, ds.length), grid(ds.map(x => box("📖", `Day ${x.d.day} · ${x.d.title}`, x.ok, x.ok ? `Completed${dayP(x.d).doneAt ? " " + when(dayP(x.d).doneAt) : ""}` : "Not completed yet"))))}
    ${row("🧩 Modules done", `${msN} / ${ms.length}`, tone(msN, ms.length), grid(ms.map(x => box(KIND[x.m.kind] || "🧩", `Day ${x.m.day} · ${x.m.title}`, x.ok, x.ok ? "Gone through" : "Not yet"))))}
    ${qs.length ? row("✍️ Process Questions", `${qsN} / ${qs.length}`, tone(qsN, qs.length), grid(qs.map(x => box("✍️", `Day ${x.m.day} · ${x.m.title}`, x.ok, `${x.n} of ${x.of} answered`)))) : ""}
    ${row("🕘 Last opened", reached ? `Day ${reached.day}` : "—", "", reached ? E(`${reached.title}${rp.step ? ` · step ${rp.step}` : ""}`) : `<small class="ccm-mu">Nothing opened yet</small>`)}
    ${row("⏱ Last on the platform", r.lastActive ? E(ago(r.lastActive)) : "—", "", r.lastActive ? E(when(r.lastActive)) : `<small class="ccm-mu">Not seen yet</small>`)}
  </tbody></table></div>`;
}
function open(id){
  const r = ((state.admin || {}).rows || []).find(x => x.id === id); if(!r) return;
  overlay(`<div class="mh-day">${E(r.batch || "")}</div><div class="mh-title">${E(r.name || id)}: 📋 Monitoring</div>`, html(r));
}
const button = r => `<button type="button" class="btn btn-ghost btn-sm ccm-open" onclick="lnCompliance.open('${E(r.id)}')" title="Compliance and Platform Utilization Monitoring">📋 Monitoring</button>`;

const st = document.createElement("style"); st.id = "ln-compliance-monitor"; st.textContent = `
.ccm{margin:6px 0;}
.ccm-t{width:100%;border-collapse:collapse;background:#fff;border:1px solid #C9CEDB;font-size:14px;}
.ccm-t thead th{background:#1E2340;color:#fff;text-align:left;padding:12px 14px;font-size:17px;font-weight:800;}
.ccm-t tbody th{text-align:left;vertical-align:top;padding:10px 12px;width:24%;color:#1E2340;border-top:1px solid #C9CEDB;}
.ccm-t td{vertical-align:top;padding:10px 12px;border-top:1px solid #C9CEDB;border-left:1px solid #C9CEDB;}
.ccm-n{font-weight:800;width:11%;white-space:nowrap;} .ccm-n.ok{background:#ECFDF3;} .ccm-n.mid{background:#FFF4E2;} .ccm-n.no{background:#FDECEC;}
.ccm-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));border:1px solid #C9CEDB;border-radius:10px;overflow:hidden;}
.ccm-it{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 6px;text-align:center;border-right:1px solid #E1E4EC;border-bottom:1px solid #E1E4EC;font-size:12.5px;}
.ccm-ic{font-size:18px;} .ccm-lb{color:#2A2F4A;line-height:1.2;overflow-wrap:anywhere;}
.ccm-mk{display:inline-flex;align-items:center;justify-content:center;width:30px;height:26px;border-radius:7px;font-size:15px;}
.ccm-mk.ok{background:#DCF5E5;color:#137A3A;} .ccm-mk.no{background:#FCE1E1;color:#B42318;}
.ccm-mu{color:#5B6178;} .ccm-open{margin-left:8px;}
@media(max-width:600px){.ccm-t tbody th{width:auto;} .ccm-g{grid-template-columns:repeat(2,1fr);}}
`; document.head.appendChild(st);

window.lnCompliance = {html, open, button};
})();
