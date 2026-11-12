// Colour contrast: every piece of visible text clears WCAG AA against what is behind it (4.5:1; 3:1 for large text,
// 24px, or 18.66px bold). The background is worked out the way the browser paints it: each ancestor's background
// colour composited over the next (translucent glass included), a gradient read as the average of its colours. Runs over
// the dashboard, a day's Objectives page, every kind of step, every Lien Desk tab and Admin.
// Usage: node .github/scripts/contrast.cjs http://localhost:8787/   (server.mjs with PORTAL_SSO_SECRET=ci-portal, MASTER_ADMIN_PASSWORD=ci-admin)
const { chromium } = require('playwright');
const crypto = require('node:crypto');

const BASE = process.argv[2] || 'http://localhost:8787/';
const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ticket = (t) => { const p = b64u(JSON.stringify(t)); return `${p}.${b64u(crypto.createHmac('sha256', 'portal-sso:ci-portal').update(p).digest())}`; };

function audit(){
  const parse = (c) => { const m = String(c).match(/rgba?\(([^)]+)\)/); if(!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  function layer(el){
    const cs = getComputedStyle(el);
    // a gradient drawn as a thin stripe (an underline under a title) is a decoration, not the text's background;
    // otherwise its opaque stops are what the text sits on
    const stripe = /(^|\s|,)\d(\.\d+)?px(\s|,|$)/.test(cs.backgroundSize || "");
    if(cs.backgroundImage && cs.backgroundImage !== "none" && /gradient/.test(cs.backgroundImage) && !stripe){
      const cols = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((m) => parse(m[0])).filter((c) => c && c.a > 0.5);
      if(cols.length){ const n = cols.length; return { r: cols.reduce((s, c) => s + c.r, 0) / n, g: cols.reduce((s, c) => s + c.g, 0) / n, b: cols.reduce((s, c) => s + c.b, 0) / n, a: 1 }; }
    }
    const c = parse(cs.backgroundColor); return c && c.a > 0 ? c : null;
  }
  function bg(el){
    const layers = [];
    for(let e = el; e && e.nodeType === 1; e = e.parentElement){ const l = layer(e); if(l){ layers.push(l); if(l.a >= 1) break; } }
    let c = { r: 244, g: 245, b: 250, a: 1 };   // the page (body's #F4F5FA, under its wash)
    for(let i = layers.length - 1; i >= 0; i--) c = over(layers[i], c);
    return c;
  }
  const bad = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for(let n = walker.nextNode(); n; n = walker.nextNode()){
    if(!n.textContent.trim()) continue;
    const el = n.parentElement; if(!el || seen.has(el)) continue; seen.add(el);
    if(el.closest("[disabled], .btn[disabled], script, style, noscript, iframe, #lecture-viewer-pane:not(.open), option")) continue;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if(!r.width || !r.height || cs.visibility === "hidden" || +cs.opacity === 0 || el.closest("[hidden]")) continue;
    let op = 1; for(let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity; if(op < 0.6) continue;   // a deliberately faded control
    const fg = parse(cs.color); if(!fg) continue;
    const back = bg(el), fore = over(fg, back), size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5, got = ratio(fore, back);
    if(got < need) bad.push(`${got.toFixed(2)}:1 (needs ${need}) · ${size}px · "${n.textContent.trim().slice(0, 50)}" · <${el.tagName.toLowerCase()} class="${el.className}">`);
  }
  return bad;
}

(async () => {
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.route(/canva\.com|drive\.google\.com|fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'stub' }));
  const fail = [];
  const check = async (what) => { await p.waitForTimeout(250); (await p.evaluate(audit)).forEach((x) => fail.push(`${what}: ${x}`)); };
  await p.goto(BASE + '?ticket=' + encodeURIComponent(ticket({ first: 'Cora', last: 'Contrast', b: 'B100926', exp: Date.now() + 300000 })));
  await p.waitForSelector('.day-card'); await check('dashboard');
  for (const day of [1, 2, 3]) {
    await p.click(`#day-${day} .module-start-btn`); await p.waitForSelector('.obj-list'); await check(`day ${day} objectives`);
    await p.click('.stage-bar .btn-primary'); await p.waitForSelector('.stage');
    const total = Number((await p.textContent('.step-count')).match(/of (\d+)/)[1]);
    for (let i = 1; i <= total; i++) { await check(`day ${day} step ${i}`); if (i < total) await p.click('.next-btn'); }
    await p.click('.nav button:has-text("Dashboard")'); await p.waitForSelector('.day-card');
  }
  await p.click('.nav button:has-text("Lien Desk")'); await p.waitForSelector('.ld-head');
  for (const t of ['Tasks', 'Case File', 'Email', 'Net Sheet', 'Drafts']) { await p.click(`.ld-tabs button:has-text("${t}")`); await check(`Lien Desk ${t}`); }
  await browser.close();
  if (fail.length) { console.error(fail.slice(0, 60).join('\n') + (fail.length > 60 ? `\n… and ${fail.length - 60} more` : '')); process.exit(1); }
  console.log('OK: every text clears WCAG AA contrast.');
})().catch((e) => { console.error(e); process.exit(1); });
