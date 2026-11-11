// Every step fits on one screen, as in the CM course: at 1366×768, 1920×1080 and 1280×720, each day's Objectives page
// ends with its Start bar inside the window, and every step of the day (the Training Agenda, each module, Day complete)
// ends with its Previous / Next bar inside the window. The deck and video frames are stubbed.
// Usage: node .github/scripts/fit.cjs http://localhost:8787/   (server.mjs with PORTAL_SSO_SECRET=ci-portal)
const { chromium } = require('playwright');
const crypto = require('node:crypto');

const BASE = process.argv[2] || 'http://localhost:8787/';
const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ticket = (t) => { const p = b64u(JSON.stringify(t)); return `${p}.${b64u(crypto.createHmac('sha256', 'portal-sso:ci-portal').update(p).digest())}`; };
const bottom = (p, sel) => p.evaluate((s) => document.querySelector(s).getBoundingClientRect().bottom, sel);

(async () => {
  const browser = await chromium.launch();
  const fail = [];
  for (const vp of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }, { width: 1280, height: 720 }]) {
    const p = await browser.newPage({ viewport: vp });
    await p.route(/canva\.com|drive\.google\.com|fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'stub' }));
    await p.goto(BASE + '?ticket=' + encodeURIComponent(ticket({ first: 'Fit', last: 'Check' + vp.width, b: 'B100926', exp: Date.now() + 300000 })));
    await p.waitForSelector('.day-card');
    for (const n of await p.$$eval('.day-card', (els) => els.map((e) => e.id.replace('day-', '')))) {
      await p.click(`#day-${n} .module-start-btn`);
      await p.waitForSelector('.obj-list');
      if ((await bottom(p, '.stage-bar')) > vp.height) fail.push(`${vp.width}×${vp.height} Day ${n} Objectives: the Start bar is below the window`);
      await p.click('.stage-bar .btn-primary');
      await p.waitForSelector('.stage');
      const total = Number((await p.textContent('.step-count')).match(/of (\d+)/)[1]);
      for (let i = 1; i <= total; i++) {
        if ((await bottom(p, '.player-bar')) > vp.height) fail.push(`${vp.width}×${vp.height} Day ${n} step ${i}: the Previous / Next bar is below the window`);
        if (i < total) await p.click('.next-btn');
      }
      await p.click('.nav button:has-text("Dashboard")');
      await p.waitForSelector('.day-card');
    }
    await p.close();
  }
  await browser.close();
  if (fail.length) { console.error(fail.join('\n')); process.exit(1); }
  console.log('OK: every step fits on one screen.');
})().catch((e) => { console.error(e); process.exit(1); });
