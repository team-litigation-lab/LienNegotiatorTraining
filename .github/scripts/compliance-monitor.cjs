// 📋 Compliance and Platform Utilization Monitoring (js/ln-compliance-monitor.js): 🛡 Admin's 📋 Monitoring beside a trainee's
// name opens the section every LSH program's trainee scorecard carries — 📚 Days completed, 🧩 Modules done, ✍️ Process
// Questions, 🕘 Last opened and ⏱ Last on the platform — each item ✓ or ✗ from what is stored.
// Usage: node .github/scripts/compliance-monitor.cjs http://localhost:8787/   (server.mjs with MASTER_ADMIN_PASSWORD=ci-admin)
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = (m) => failures.push(m);

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', (e) => fail(`page error: ${e.message}`));
  try {
    // a trainer signs in with the admin password (server.mjs with MASTER_ADMIN_PASSWORD=ci-admin, as the Checks workflow runs it)
    await p.goto(BASE);
    await p.waitForSelector('#gate-apass');
    await p.fill('#gate-apass', 'ci-admin');
    await p.click('#gate-box .go');
    await p.waitForSelector('.day-card');
    if (!(await p.evaluate(() => !!window.lnCompliance))) fail('index.html should load js/ln-compliance-monitor.js');
    const id = 'lea-monitor--b112626';
    const want = await p.evaluate(async (id) => {
      const d1 = COURSE.days[0], d2 = COURSE.days[1], q = ALL_MODULES.find(m => m.kind === 'questions');
      await kvSet('trainee:' + id, { id, name: 'Lea Monitor', batch: 'B112626', approved: true, lastActive: new Date(Date.now() - 3 * 3600e3).toISOString(),
        dayProgress: { [d1.day]: { done: true, doneAt: '2026-11-20T10:00:00Z', step: d1.modules.length, modules: Object.fromEntries(d1.modules.map(m => [m.id, true])) },
          [d2.day]: { step: 2, modules: { [d2.modules[0].id]: true } } } });
      await kvSet('progress:' + id, { answers: { [q.id]: ['An answer'] } });
      state.admin.rows = null; goto('admin');
      for (let i = 0; i < 60 && !((state.admin.rows || []).some(r => r.id === id)); i++) await new Promise(r => setTimeout(r, 300));
      return { days: COURSE.days.length, mods: ALL_MODULES.length, d1n: d1.modules.length, d2: d2.day };
    }, id);
    const btn = p.locator('tr:has-text("Lea Monitor") button:has-text("📋 Monitoring")');
    if (!(await btn.count())) fail('🛡 Admin should have 📋 Monitoring beside the trainee\'s name');
    else {
      await btn.first().click();
      await p.waitForSelector('.ccm', { timeout: 10000 });
      const r = await p.evaluate(() => { const s = document.querySelector('.ccm');
        return { head: s.querySelector('thead').textContent, rows: [...s.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(c => c.textContent.replace(/\s+/g, ' ').trim())),
          days: [...s.querySelectorAll('tbody tr:nth-child(1) .ccm-mk')].map(b => b.textContent).join('') }; });
      const row = (l) => r.rows.find(x => x[0].includes(l)) || [];
      if (!/Compliance and Platform Utilization Monitoring/.test(r.head)) fail(`the section's heading: ${r.head}`);
      if (row('Days completed')[1] !== `1 / ${want.days}` || !r.days.startsWith('✓✗')) fail(`📚 Days completed: Day 1 → 1 / ${want.days}: ${JSON.stringify(row('Days completed'))} ${r.days}`);
      if (row('Modules done')[1] !== `${want.d1n + 1} / ${want.mods}`) fail(`🧩 Modules done: Day 1's ${want.d1n} and one of Day 2's → ${want.d1n + 1} / ${want.mods}: ${JSON.stringify(row('Modules done'))}`);
      if (!/^1 \/ \d+$/.test(row('Process Questions')[1] || '')) fail(`✍️ Process Questions: one set answered: ${JSON.stringify(row('Process Questions'))}`);
      if (row('Last opened')[1] !== `Day ${want.d2}` || !/step 2/.test(row('Last opened')[2] || '')) fail(`🕘 Last opened should be Day ${want.d2}, step 2: ${JSON.stringify(row('Last opened'))}`);
      if (!/3 h ago/.test(row('Last on the platform')[1] || '')) fail(`⏱ Last on the platform should say 3 h ago: ${JSON.stringify(row('Last on the platform'))}`);
    }
  } catch (e) { fail(`threw: ${e.message}`); }
  await browser.close();
  if (failures.length) { console.error('Compliance monitor test FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
  console.log('Compliance monitor test passed (🛡 Admin → 📋 Monitoring: 📚 Days completed, 🧩 Modules done, ✍️ Process Questions, 🕘 Last opened, ⏱ Last on the platform).');
})();
