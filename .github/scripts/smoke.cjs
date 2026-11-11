// Smoke test in a browser, against .github/scripts/server.mjs started with MASTER_ADMIN_PASSWORD=ci-admin and
// PORTAL_SSO_SECRET=ci-portal: a trainee arriving from the Portal lands on the dashboard (the banner, with its completion ribbon, over the Day cards); a day opens on its
// Objectives page; Start plays the day's steps (Training Agenda, each module's Canva deck or Drive video, Day complete);
// finishing the steps completes the day and is saved; the Topics pop-up and the Slide Map work;
// a direct visit shows the admin sign-in; the admin password opens Admin with the trainee listed. Every view at desktop and
// phone width, with no page error and no sideways scroll. The deck and video frames are stubbed (no Canva or Google in CI).
// Usage: node .github/scripts/smoke.cjs http://localhost:8787/
const { chromium } = require('playwright');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const BASE = process.argv[2] || 'http://localhost:8787/';
const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ticket = (t) => { const p = b64u(JSON.stringify(t)); return `${p}.${b64u(crypto.createHmac('sha256', 'portal-sso:ci-portal').update(p).digest())}`; };
const DECK = /^https:\/\/www\.canva\.com\/design\/[\w-]+\/[\w-]+\/view\?embed$/, VIDEO = /^https:\/\/drive\.google\.com\/file\/d\/[\w-]+\/preview$/;

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
    await p.waitForSelector('.day-card');
    assert.ok(!(await p.evaluate(() => location.search)).includes('ticket'), 'the ticket is taken out of the address');
    assert.match(await p.textContent('.topbar .who'), /Ada Lovelace/);
    // The Portal sign-in's "Opening your training…" cover is lifted as soon as the dashboard is drawn (not after its 10 s fallback).
    await p.waitForFunction(() => ![].some.call(document.documentElement.children, (el) => el.style && el.style.zIndex === '2147483000'), null, { timeout: 2000 });
    // The banner, as in the CM course: the completion ribbon and the title (no Roadmap button).
    assert.match(await p.textContent('.dash-top h1'), /Lien Negotiator Professional Development Workshop/);
    assert.match(await p.getAttribute('.completion-ribbon', 'aria-label'), /^0% /);
    assert.equal(await p.locator('.dash-roadmap-btn').count(), 0, 'the banner has no Roadmap button');
    assert.deepEqual(await p.$$eval('.day-card .mh-title', (els) => els.map((e) => e.textContent.trim().split(' · ')[0])), ['Day 1', 'Day 2', 'Day 3'], 'the dashboard is Day cards');
    await noSideScroll(p, `${tag} dashboard`);

    // ☰ Topics opens the day's outline.
    await p.click('#day-1 .module-topics-btn');
    assert.ok(await p.locator('#overlay .topic-list li').count() > 3, 'Topics lists the day\'s outline');
    await p.click('#overlay .btn');

    const days = await p.$$eval('.day-card', (els) => els.map((e) => Number(e.id.replace('day-', ''))));
    assert.deepEqual(days, [1, 2, 3]);
    for (const day of days) {
      // Day card → the Objectives page → Start → the Training Agenda, then every module, then Day complete.
      await p.click(`#day-${day} .module-start-btn`);
      await p.waitForSelector('.obj-list li');
      await noSideScroll(p, `${tag} day ${day} objectives`);
      await p.click(`.stage-bar .btn-primary`);
      await p.waitForSelector('.stage-agenda');
      const total = Number((await p.textContent('.step-count')).match(/of (\d+)/)[1]);
      await noSideScroll(p, `${tag} day ${day} agenda`);
      for (let i = 2; i < total; i++) {
        await p.click('.next-btn');
        await p.waitForSelector('.stage-module');
        assert.match(await p.textContent('.step-count'), new RegExp(`Step ${i} of ${total}`));
        const what = `${tag} day ${day} step ${i}`;
        if (await p.locator('.frame iframe').count()) assert.match(await p.getAttribute('.frame iframe', 'src'), new RegExp(`${DECK.source}|${VIDEO.source}`), what);
        if (await p.locator('.doc-frame').count()) {
          assert.match(await p.getAttribute('.doc-frame iframe', 'src'), VIDEO, what);
          await p.click('.doc-tabs button:nth-child(2)');
          assert.match(await p.getAttribute('.doc-tabs button.on', 'aria-selected'), /true/);
        }
        if (await p.locator('.qa-list textarea').count()) {
          await p.fill('.qa-list li:nth-child(1) textarea', `Answer from ${tag}`);
          assert.match(await p.textContent('.qa-count'), /^1\//);
        }
        await noSideScroll(p, what);
      }
      await p.click('.next-btn');
      await p.waitForSelector('.stage-done');
      assert.match(await p.textContent('.done-box h2'), new RegExp(`Day ${day} is complete`));
      if (day === 3) assert.match(await p.textContent('.wrap-box'), /Litigation Training/);
      assert.equal(await p.locator('.trainer-notes').count(), 0, 'a trainee never sees trainer notes');
      await p.click('.next-btn');   // Finish → the dashboard
      await p.waitForSelector('.day-card');
      assert.equal(await p.locator(`#day-${day}.mc-done`).count(), 1, `day ${day} shows as completed`);
    }
    // The Slide Map jumps to a step.
    await p.click('#day-2 .module-start-btn'); await p.waitForSelector('.obj-list li');
    await p.click('.stage-bar .btn-primary'); await p.waitForSelector('.stage');
    await p.click('text=Slide Map'); await p.click('#overlay .map-list li:nth-child(3) button');
    await p.waitForSelector('.stage-module'); assert.match(await p.textContent('.step-count'), /Step 3 of 4/);
    await p.click('.nav button:has-text("Dashboard")'); await p.waitForSelector('.day-card');
    await p.waitForTimeout(600);   // the save is debounced
    await p.reload();
    await p.waitForSelector('.day-card');
    assert.equal(await p.locator('.day-card.mc-done').count(), 3, `${tag}: every day saved as complete`);
    assert.match(await p.getAttribute('.completion-ribbon', 'aria-label'), /^100% /, 'the ribbon shows the program complete');
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
  await a.waitForSelector('.day-card');
  await a.click('.nav button:has-text("Admin")');
  await a.waitForSelector('.admin-table td:has-text("Ada Lovelace1366")');
  assert.equal(await a.locator('.admin-table tbody tr').count(), 2);
  await noSideScroll(a, 'admin');
  await a.click('.admin-table button:has-text("Answers")');
  assert.match(await a.textContent('#overlay'), /Answer from 1366px/, 'a trainer reads the trainee\'s answers');
  await a.click('#overlay .btn');
  await a.fill('#cl-d1-deck', 'https://example.com/not-canva');
  await a.click('text=Save course links');
  await a.waitForSelector('#toast.show:has-text("canva.com/design")');
  await a.click('.nav button:has-text("Day 3")'); await a.waitForSelector('.obj-list');
  await a.click('.stage-bar .btn-primary'); await a.waitForSelector('.stage-agenda');
  assert.equal(await a.locator('.trainer-notes').count(), 1, 'a trainer sees the trainer notes');

  await browser.close();
  if (errors.length) { console.error('Page errors:\n' + errors.join('\n')); process.exit(1); }
  console.log('OK: smoke test passed.');
})().catch((e) => { console.error(e); process.exit(1); });
