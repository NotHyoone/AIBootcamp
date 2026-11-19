// 2026-11-19: week strip on the record tab, week/day calendar with first-line snippets,
// and the statistics screen without the month input and date select.
const assert = require('node:assert/strict'), path = require('node:path'), { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.CARDEX_PLAYWRIGHT || path.join(require('node:os').tmpdir(), 'aibootcamp-frontend-review/node_modules/playwright'));
const { executablePath, reveal } = require('./browser-runtime.cjs');
const LONG = '<b>굵게</b> 아주아주 긴 첫 줄 미리보기 문장이 계속 이어집니다';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    for (const [width, height] of [[1440, 900], [390, 844]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(process.env.CARDEX_TEST_URL || pathToFileURL(path.resolve(__dirname, '../index.html')).href);
      await page.waitForFunction(() => DiaryReview.isReady());
      const today = await page.evaluate(() => DiaryReview.localDate());
      const desktop = width >= 960;

      // Week strip: 7 days, nothing written yet, future days are not buttons.
      const streak = page.locator('.week-streak');
      assert.equal(await streak.isVisible(), true);
      assert.equal(await streak.locator('.week-day').count(), 7);
      assert.equal(await streak.locator('.is-done').count(), 0);
      assert.match(await streak.locator('.streak-title').innerText(), /이번 주 0일/);
      assert.equal(await streak.locator('.is-today').count(), 1);
      assert.equal(await streak.locator('button.is-future').count(), 0, 'future days are not clickable');

      // Statistics: no duplicate month input or date select.
      await reveal(page, 'review-month');
      assert.equal(await page.locator('#stats-month').count(), 0);
      assert.equal(await page.locator('#stats-date').count(), 0);

      // A written day gets the check stamp.
      await reveal(page, 'write');
      await page.locator('#diary-text').fill(LONG + '\n둘째 줄');
      await reveal(page, 'save');
      await page.waitForFunction(() => DiaryReview.getState().sessions.length === 1);
      if (await page.locator('dialog[open]').count()) await page.keyboard.press('Escape');
      await reveal(page, 'write');
      assert.equal(await streak.locator('.is-done').count(), 1);
      assert.equal(await streak.locator(`button.is-done[data-month-date="${today}"]`).count(), 1);
      assert.match(await streak.locator('.streak-title').innerText(), /이번 주 1일/);

      // Calendar lives on the record tab (desktop) or the statistics calendar tab (phone).
      if (!desktop) { await reveal(page, 'review-month'); await page.locator('[data-stats=count]').click(); }
      const scope = page.locator(desktop ? '.home-aside .calendar-panel' : '.stats-calendar');
      assert.equal(await scope.locator('[data-calendar-view=week]').getAttribute('aria-pressed'), 'true', 'week view is the default');
      assert.equal(await scope.locator('.week-row').count(), 7);
      const snippet = await scope.locator(`.week-row[data-month-date="${today}"] .day-snippet`).innerText();
      assert.ok(snippet.startsWith('<b>굵게</b>'), 'markup is shown as text: ' + snippet);
      assert.ok(snippet.endsWith('…') && snippet.length <= 25, 'snippet is cut to a few words: ' + snippet);
      assert.equal(await scope.locator('.day-snippet b').count(), 0, 'record text is escaped');
      assert.equal(await scope.locator('[data-week-step="1"]').isDisabled(), true, 'no future weeks');
      const title = await scope.locator('.calendar-title').innerText();
      await scope.locator('[data-week-step="-1"]').click();
      assert.notEqual(await scope.locator('.calendar-title').innerText(), title);
      assert.equal(await page.locator('[data-week-step="-1"]').evaluate(el => el === document.activeElement), true);
      await scope.locator('[data-week-step="1"]').click();
      assert.equal(await scope.locator('.calendar-title').innerText(), title);
      assert.equal(await page.locator('[data-week-step="-1"]').evaluate(el => el === document.activeElement), true, 'focus falls back when next disables');

      // Day view: month grid with the same snippet in today's cell.
      await scope.locator('[data-calendar-view=day]').click();
      assert.equal(await scope.locator('[data-calendar-view=day]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('[data-calendar-view=day]').evaluate(el => el === document.activeElement), true);
      assert.ok(await scope.locator('.calendar-grid .calendar-day').count() >= 28);
      assert.ok((await scope.locator(`.calendar-grid [data-month-date="${today}"] .day-snippet`).textContent()).startsWith('<b>굵게'));
      assert.match(await scope.locator(`.calendar-grid [data-month-date="${today}"]`).getAttribute('aria-label'), /기록 1편/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no horizontal overflow');
      await scope.locator('[data-calendar-view=week]').click();

      // Tapping a stamped day opens that record.
      await reveal(page, 'write');
      await streak.locator(`button.is-done[data-month-date="${today}"]`).click();
      await page.locator('.flip-scene').waitFor();

      // Example mode: analyzed days step with ‹ › buttons instead of the old select.
      await reveal(page, 'settings');
      await reveal(page, 'preview');
      await reveal(page, 'review-month');
      if (!desktop) await page.locator('[data-stats=trend]').click();
      let stepped = false;
      for (let i = 0; i < 12 && !stepped; i++) {
        const prev = page.locator('[data-stats-day="-1"]');
        if (await prev.count() && !(await prev.isDisabled())) {
          const label = await page.locator('.stats-day-nav strong').innerText();
          await prev.click();
          assert.notEqual(await page.locator('.stats-day-nav strong').innerText(), label);
          assert.equal(await page.locator('[data-stats-day="-1"], [data-stats-day="1"]').evaluateAll(xs => xs.includes(document.activeElement)), true);
          assert.equal(await page.locator('[data-stats-day="1"]').isDisabled(), false);
          stepped = true;
        } else await page.locator('[data-month-step="-1"]').click();
      }
      assert.ok(stepped, 'found a month with two analyzed days');
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('PASS: week strip, week/day calendar snippets, stats without month input/date select');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
