// 2026-11-19: graph-first statistics (wide trend, side summary + distribution), trend focus
// toggle, x-axis ending today, and centred previous/next arrows.
const assert = require('node:assert/strict'), path = require('node:path'), { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.CARDEX_PLAYWRIGHT || path.join(require('node:os').tmpdir(), 'aibootcamp-frontend-review/node_modules/playwright'));
const { executablePath, reveal } = require('./browser-runtime.cjs');
async function arrowsCentred(page, where) {
  const offsets = await page.locator('.nav-arrow:visible').evaluateAll(bs => bs.map(b => {
    const r = b.getBoundingClientRect(), s = b.querySelector('svg').getBoundingClientRect();
    return Math.max(Math.abs(r.left + r.width / 2 - (s.left + s.width / 2)), Math.abs(r.top + r.height / 2 - (s.top + s.height / 2)));
  }));
  assert.ok(offsets.length > 0, `${where}: arrows exist`);
  for (const o of offsets) assert.ok(o <= 1.5, `${where}: arrow chevron centred (off by ${o}px)`);
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    for (const [width, height] of [[1440, 810], [390, 844]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(process.env.CARDEX_TEST_URL || pathToFileURL(path.resolve(__dirname, '../index.html')).href);
      await page.waitForFunction(() => DiaryReview.isReady());
      const desktop = width >= 960, today = await page.evaluate(() => DiaryReview.localDate());

      // Arrows on the record card calendar in both week and month views.
      await arrowsCentred(page, 'record week view');
      await page.locator('[data-write-calendar=month]').click();
      await arrowsCentred(page, 'record month view');
      await page.locator('[data-write-calendar=week]').click();

      // Example data has analyzed records; find a month with a chart.
      await reveal(page, 'settings');
      await reveal(page, 'preview');
      await reveal(page, 'review-month');
      assert.equal(await page.locator('.stats-banner').count(), 0, 'no banner above the chart');
      assert.equal(await page.locator('.stats-summary').count(), 0, 'no duplicate count summary');
      if (!desktop) assert.equal(await page.locator('[data-stats=trend]').getAttribute('aria-pressed'), 'true', 'phones open on the trend');
      const chart = page.locator('.stats-chart');
      assert.equal(await chart.count(), 1, 'example month has a chart');

      // The current month's axis stops at today.
      const lastDay = await chart.locator('.chart-day').last().textContent();
      assert.ok(Number.parseInt(lastDay) <= Number(today.slice(8)), `axis ends by today: ${lastDay}`);
      assert.equal(Number(await chart.getAttribute('data-days')), Number(today.slice(8)));

      const box = await chart.boundingBox();
      if (desktop) {
        assert.ok(box.y < 420 && box.y + box.height <= height, `chart fully in the first screen: ${JSON.stringify(box)}`);
        const [trend, summary, dist] = await Promise.all(['.stats-trend', '.stats-summary-card', '.stats-dist'].map(s => page.locator(s).boundingBox()));
        assert.ok(trend.width >= dist.width * 1.6, 'trend is the wide column');
        assert.ok(trend.x + trend.width <= summary.x && Math.abs(summary.x - dist.x) < 2 && summary.y < dist.y, 'summary over distribution on the right');
      } else {
        assert.ok(box.height >= 180, `phone chart is tall enough: ${box.height}`);
        await page.locator('[data-stats=distribution]').click();
        assert.equal(await page.locator('.stats-summary-card').isVisible(), true);
        assert.equal(await page.locator('.stats-dist').isVisible(), true);
        assert.equal(await page.locator('.stats-trend').isVisible(), false);
        await page.locator('[data-stats=trend]').click();
      }

      // Focus toggle: one series stays strong, the others fade; pressing again clears it.
      const key = page.locator('[data-trend-focus=negative]');
      await key.click();
      assert.equal(await page.locator('[data-trend-focus=negative]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('[data-trend-focus=negative]').evaluate(el => el === document.activeElement), true);
      assert.equal(await page.locator('.stats-chart').getAttribute('data-focus'), 'negative');
      const faded = await page.locator('.stats-chart .chart-line[data-series=positive]').first().evaluate(el => Number(getComputedStyle(el).opacity));
      const strong = await page.locator('.stats-chart .chart-line[data-series=negative]').first().evaluate(el => Number(getComputedStyle(el).opacity));
      assert.ok(faded < 0.5 && strong === 1, `focus fades others (${faded}/${strong})`);
      await page.locator('[data-trend-focus=negative]').click();
      assert.equal(await page.locator('.stats-chart').getAttribute('data-focus'), null);
      assert.equal(await page.locator('[data-trend-focus=negative]').getAttribute('aria-pressed'), 'false');

      // Day stepper arrows are centred too; the phone calendar's week/day arrows as well.
      await arrowsCentred(page, 'stats trend');
      if (!desktop) {
        await page.locator('[data-stats=count]').click();
        await arrowsCentred(page, 'stats week view');
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('PASS: graph-first stats layout, axis ends today, focus toggle, centred arrows');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
