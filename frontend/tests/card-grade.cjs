// Tap-to-flip card reveal after saving and grade effects on every card surface. Plain Node script.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const {pathToFileURL} = require('node:url');
const {executablePath, reveal, unseal} = require('./browser-runtime.cjs');
const {chromium} = require(process.env.CARDEX_PLAYWRIGHT || path.join(os.tmpdir(), 'aibootcamp-frontend-review/node_modules/playwright'));

(async () => {
  const browser = await chromium.launch({headless: true, executablePath});
  const evidence = fs.mkdtempSync(path.join(os.tmpdir(), 'moment-card-grade-'));
  try {
    const page = await browser.newPage({viewport: {width: 1366, height: 768}});
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    await page.waitForFunction(() => DiaryReview.isReady());
    const click = action => reveal(page, action);
    const view = () => page.evaluate(() => DiaryReview.getState().view);

    // Empty or over-limit text never leaves the editor or seals a card.
    await reveal(page, 'save', {stay: true});
    assert.equal(await view(), 'write', 'empty save stays on the editor');
    assert.equal(await page.locator('.mystery-card').count(), 0);

    // Save → card page with a sealed "?" card that has focus; info and actions are hidden and inert.
    await page.locator('#diary-text').fill('카드 등급 검사 PRIVATE_GRADE_TEXT');
    await reveal(page, 'save', {stay: true});
    await page.waitForFunction(() => DiaryReview.getState().sessions.length === 1);
    // The card page opens once the record is stored.
    await page.waitForFunction(() => DiaryReview.getState().view === 'entry');
    await page.locator('.card-box.is-sealed .mystery-card').waitFor();
    await page.waitForFunction(() => document.activeElement?.classList.contains('mystery-card'));
    assert.match(await page.locator('.mystery-card').innerText(), /\?/);
    assert.equal(await page.locator('.card-box').getAttribute('data-reveal'), 'pending');
    assert.equal(await page.locator('.card-info').isVisible(), false);
    assert.equal(await page.locator('.card-info').evaluate(el => el.inert), true);
    assert.equal(await page.locator('.flip-scene').evaluate(el => el.inert), true);
    // Layout size (the idle float rotates the box slightly, so compare offset sizes, not bounding boxes).
    const size = sel => page.locator(sel).evaluate(el => [el.offsetWidth, el.offsetHeight]);
    assert.deepEqual(await size('.mystery-card'), await size('.flip-scene'), 'sealed card covers the real card');
    await page.screenshot({path: path.join(evidence, 'sealed-1366.png')});

    // A re-render before the tap keeps the card sealed.
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await page.locator('[data-action="card-more"], [popovertarget]').first().count();
    await page.evaluate(() => window.CardexTheme && window.dispatchEvent(new Event('cardex-theme-change')));
    assert.equal(await page.locator('.card-box.is-sealed .mystery-card').count(), 1, 'still sealed before tapping');

    // Keyboard (Enter) flips it: the pending effect plays, then the info is shown and focused.
    await page.keyboard.press('Enter');
    await page.locator('.card-box.is-flipping').waitFor();
    const during = await page.locator('.flip-scene').boundingBox();
    assert.equal(await page.locator('.grade-burst .grade-particles i').count(), 6, 'pending particle count');
    assert.equal(await page.locator('.grade-flash').count(), 0, 'no flash for a pending card');
    await page.waitForFunction(() => !document.querySelector('.card-box.is-flipping'), null, {timeout: 5000});
    const after = await page.locator('.flip-scene').boundingBox();
    for (const k of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(during[k] - after[k]) <= 1, 'geometry fixed: ' + k);
    assert.equal(await page.locator('.mystery-card, .grade-burst').count(), 0);
    assert.equal(await page.locator('.card-info').isVisible(), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'card-info-title');
    assert.match(await page.locator('#card-info-title').innerText(), /분석 대기/);
    assert.equal(await page.locator('.flip-back').evaluate(el => el.inert), true, 'card back stays inert');
    assert.equal(await page.locator('.card-box[data-grade="pending"] .grade-aura').count(), 1);

    // Flipping the revealed card fires a grade pulse; reopening the record never seals it again.
    await page.locator('.flip-trigger').click();
    assert.equal(await page.locator('.card-box.grade-pulse').count(), 1);
    await click('history');
    assert.equal(await view(), 'write');
    assert.equal(await page.locator('.recent-list .mini-art[data-grade="pending"]').count(), 1);
    assert.equal(await page.locator('.today-card .mystery-mini[data-grade="pending"]').count(), 1);
    await page.locator('.recent-list [data-open]').first().click();
    assert.equal(await page.locator('.mystery-card').count(), 0, 'no seal when reopening');
    // Saving the same day again (new version) seals the card once more.
    await click('write');
    await page.locator('#diary-text').fill('카드 등급 검사 수정본');
    await reveal(page, 'save', {stay: true});
    await page.locator('.card-box.is-sealed .mystery-card').waitFor();
    assert.ok(await unseal(page));

    // Example mode: stage 3 gets rays + flash + 22 particles; stage 1 gets 10 and no flash.
    await click('settings');
    await page.locator('[data-action=preview]').evaluate(el => el.closest('details').open = true);
    await click('preview');
    await click('catalog');
    assert.ok(await page.locator('.slot[data-grade^="stage-"]').count() > 0, 'unlocked slots carry a grade');
    assert.equal(await page.locator('.slot.is-locked[data-grade]').count(), 0, 'locked slots have no grade');
    await page.locator('[data-catalog-filter="pos_1"]').click();
    await page.locator('.slot[data-stage="3"]').click();
    assert.equal(await page.locator('#card-detail[open] .detail-card[data-grade="stage-3"] .grade-sheen').count(), 1);
    await page.screenshot({path: path.join(evidence, 'detail-stage3.png')});
    await page.locator('#card-detail[open] [data-open]').first().click();
    await page.locator('.card-box.is-sealed[data-reveal="stage-3"]').waitFor();
    await page.locator('.mystery-card').click({force: true});
    await page.locator('.grade-flash').waitFor({state: 'attached'});
    assert.equal(await page.locator('.grade-burst .grade-particles i').count(), 22);
    await page.waitForTimeout(800);
    await page.screenshot({path: path.join(evidence, 'flip-stage3.png')});
    await page.waitForFunction(() => !document.querySelector('.card-box.is-flipping'), null, {timeout: 5000});
    assert.equal(await page.locator('.card-box[data-grade="stage-3"]').count(), 1);
    await page.screenshot({path: path.join(evidence, 'revealed-stage3.png')});

    await click('catalog');
    const stage1 = page.locator('.slot[data-grade="stage-1"]').first();
    await page.locator('[data-catalog-filter="all"]').click().catch(() => {});
    if (await stage1.count()) {
      await stage1.click();
      await page.locator('#card-detail[open] [data-open]').first().click();
      if (await page.locator('.mystery-card').count()) {
        assert.equal(await page.locator('.card-box').getAttribute('data-reveal'), 'stage-1');
        await page.locator('.mystery-card').click({force: true});
        assert.equal(await page.locator('.grade-burst .grade-particles i').count(), 10);
        assert.equal(await page.locator('.grade-flash').count(), 0, 'flash is stage 3 only');
        await page.waitForFunction(() => !document.querySelector('.card-box.is-flipping'), null, {timeout: 5000});
      }
    }

    // Share preview and the new-card badge follow the grade.
    await click('share');
    assert.match(await page.locator('.share-art-frame').getAttribute('data-grade'), /^(stage-[123]|blank)$/);
    await click('share-close');
    await page.evaluate(() => {
      const el = document.createElement('div'); el.id = 'probe'; el.className = 'moment-celebrate'; el.dataset.grade = 'stage-2'; document.body.append(el);
    });
    assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('probe')).getPropertyValue('--grade').trim()), '#9b74ff');

    // Phone width: sealed card fits without horizontal overflow.
    await page.setViewportSize({width: 390, height: 844});
    await click('archive-records');
    const unseen = await page.evaluate(() => {
      const s = DiaryReview.getState();
      return [...document.querySelectorAll('.entry-list [data-open]')].map(b => b.dataset.open).find(id => !s.revealed[`example:${id}`]);
    });
    if (unseen) {
      await page.locator(`.entry-list [data-open="${unseen}"]`).first().click();
      await page.locator('.mystery-card').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no overflow while sealed (390)');
      await page.screenshot({path: path.join(evidence, 'sealed-390.png')});
      assert.ok(await unseal(page));
    }
    assert.deepEqual(errors, []);
    console.log('PASS: save opens a sealed card, tap/Enter flip with grade effects, no reseal, grade on catalog/detail/share/badge/rows; evidence: ' + evidence);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
