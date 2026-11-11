// Smoke test in a browser, against .github/scripts/server.mjs started with MASTER_ADMIN_PASSWORD=ci-admin and
// PORTAL_SSO_SECRET=ci-portal: a trainee arriving from the Portal lands on the dashboard; each part shows its Canva
// deck and its Drive video in the frame; checking both off completes the part and is saved; a direct visit shows
// the admin sign-in; the admin password opens Admin with the trainee listed. Every view at desktop and phone width,
// with no page error and no sideways scroll. The deck and video frames are stubbed (no Canva or Google in CI).
// Usage: node .github/scripts/smoke.cjs http://localhost:8787/
const { chromium } = require('playwright');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const BASE = process.argv[2] || 'http://localhost:8787/';
const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ticket = (t) => { const p = b64u(JSON.stringify(t)); return `${p}.${b64u(crypto.createHmac('sha256', 'portal-sso:ci-portal').update(p).digest())}`; };

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const page = async (viewport) => {
    const ctx = await browser.newContext({ viewport });
    await ctx.route(/canva\.com|drive\.google\.com|fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>stub</body></html>' }));
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    return p;
  };
  const noSideScroll = async (p, what) => {
    const w = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    assert.ok(w[0] <= w[1] + 1, `${what} scrolls sideways (${w[0]} > ${w[1]})`);
  };

  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    const tag = `${viewport.width}px`;
    const p = await page(viewport);
    const t = ticket({ first: 'Ada', last: 'Lovelace' + viewport.width, b: 'B100926', exp: Date.now() + 5 * 60 * 1000 });
    await p.goto(BASE + '?ticket=' + encodeURIComponent(t));
    await p.waitForSelector('.dash-top');
    assert.ok(!(await p.evaluate(() => location.search)).includes('ticket'), 'the ticket is taken out of the address');
    assert.match(await p.textContent('.dash-top h1'), /Welcome, Ada/);
    // The Portal sign-in's "Opening your training…" cover is lifted as soon as the dashboard is drawn (not after its 10 s fallback).
    await p.waitForFunction(() => ![].some.call(document.documentElement.children, (el) => el.style && el.style.zIndex === '2147483000'), null, { timeout: 2000 });
    await noSideScroll(p, `${tag} dashboard`);

    for (const [i, part] of ['Part 1', 'Part 2'].entries()) {
      await p.click(`.module-card:nth-child(${i + 1}) .btn`);
      await p.waitForSelector('.page-hero');
      assert.match(await p.getAttribute('.frame iframe', 'src'), /^https:\/\/www\.canva\.com\/design\/[\w-]+\/[\w-]+\/view\?embed$/, `${part} deck`);
      await noSideScroll(p, `${tag} ${part} deck`);
      await p.click('.tabs button:nth-child(2)');
      assert.match(await p.getAttribute('.frame iframe', 'src'), /^https:\/\/drive\.google\.com\/file\/d\/[\w-]+\/preview$/, `${part} video`);
      await noSideScroll(p, `${tag} ${part} video`);
      await p.check('.check:nth-of-type(1) input');
      await p.check('.check:nth-of-type(2) input');
      await p.waitForSelector('.side .pill-done');
      await p.click('.topbar .brand');
      await p.waitForSelector('.dash-top');
    }
    await p.waitForTimeout(600);   // the save is debounced
    await p.reload();
    await p.waitForSelector('.dash-top');
    assert.equal(await p.locator('.module-card .pill-done').count(), 2, `${tag}: both parts saved as complete`);
    assert.match(await p.textContent('.dash-top'), /All parts complete/);
    await p.context().close();
  }

  // A direct visit: the admin sign-in, then Admin with the trainees listed.
  const a = await page({ width: 1366, height: 768 });
  await a.goto(BASE);
  await a.waitForSelector('#gate-apass');
  await a.fill('#gate-apass', 'wrong');
  await a.click('#gate-box .go');
  await a.waitForSelector('#gate-aerr:not([style*="none"])');
  await a.fill('#gate-apass', 'ci-admin');
  await a.click('#gate-box .go');
  await a.waitForSelector('.dash-top');
  await a.click('.nav button:has-text("Admin")');
  await a.waitForSelector('.admin-table td:has-text("Ada Lovelace1366")');
  assert.equal(await a.locator('.admin-table tbody tr').count(), 2);
  await noSideScroll(a, 'admin');
  await a.fill('#cl-deck-ln1', 'https://example.com/not-canva');
  await a.click('text=Save course links');
  await a.waitForSelector('#toast.show:has-text("canva.com/design")');

  await browser.close();
  if (errors.length) { console.error('Page errors:\n' + errors.join('\n')); process.exit(1); }
  console.log('OK: smoke test passed.');
})().catch((e) => { console.error(e); process.exit(1); });
