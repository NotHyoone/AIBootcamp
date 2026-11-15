// Self-chosen emotion flow: pick → save → card/rows/calendar/statistics, change, reload, catalog isolation, mobile fit.
const assert = require('node:assert/strict'), path = require('node:path'), { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.CARDEX_PLAYWRIGHT || path.join(require('node:os').tmpdir(), 'aibootcamp-frontend-review/node_modules/playwright'));
const { executablePath, reveal } = require('./browser-runtime.cjs');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const ready = () => page.waitForFunction(() => DiaryReview.isReady());
    const saved = () => page.waitForFunction(() => document.querySelector('#save-status')?.textContent === '초안 저장됨');
    await page.goto(process.env.CARDEX_TEST_URL || pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    await ready();

    // Picker: 11 native radios (none + 10), "none" checked by default, arrow keys move selection.
    const radios = page.locator('[name=self-label]');
    assert.equal(await radios.count(), 11);
    assert.equal(await page.locator('[name=self-label][value=""]').isChecked(), true);
    await page.locator('[name=self-label][value=pos_1]').check();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[name=self-label][value=pos_2]').isChecked(), true);
    await page.locator('[name=self-label][value=pos_1]').check();

    // Draft label survives reload before saving.
    await page.locator('#diary-text').fill('직접 고른 감정 검증 기록');
    await saved();
    await page.reload(); await ready();
    assert.equal(await page.locator('[name=self-label][value=pos_1]').isChecked(), true, 'draft label restored');

    await reveal(page, 'save');
    await page.waitForFunction(() => DiaryReview.getState().sessions.length === 1);
    await saved();
    let state = await page.evaluate(() => DiaryReview.getState());
    assert.equal(state.sessions[0].selfLabel, 'pos_1');
    assert.deepEqual(state.sessions[0].analysis, { status: 'pending' });

    // Home rows and summary show the chosen emotion, labelled as self-chosen.
    const row = page.locator('.recent-list .entry').first();
    assert.ok((await row.innerText()).includes('내가 고른 감정 · 기쁨·활력'));
    assert.equal(await row.locator('[data-character=pos_1]').count(), 1);
    assert.equal(await page.locator('.latest-art [data-character=pos_1]').count(), 1);

    // Card front uses the chosen character and allows PNG export.
    await row.click();
    const card = page.locator('.flip-trigger .art-card');
    assert.equal(await card.getAttribute('aria-label'), '기쁨·활력 감정 카드');
    assert.ok((await card.innerHTML()).includes('내가 고른 감정'));
    assert.equal(await page.locator('[data-action=download]').count(), 1);
    const download = page.waitForEvent('download');
    await page.locator('[data-action=download]').click();
    assert.match((await download).suggestedFilename(), /^moment-.+\.png$/);
    await page.waitForFunction(() => !DiaryReview.getState().busy);
    assert.equal(await page.locator('#feedback').innerText(), '카드 이미지 다운로드를 요청했어요.');

    // Change on the detail page persists, and clears back to the pending card.
    await page.selectOption('#record-self-label', 'neg_2');
    await page.waitForFunction(() => DiaryReview.getState().sessions[0].selfLabel === 'neg_2');
    assert.equal(await page.locator('#record-self-label').evaluate(el => el === document.activeElement), true);
    await page.reload(); await ready();
    state = await page.evaluate(() => DiaryReview.getState());
    assert.equal(state.sessions[0].selfLabel, 'neg_2', 'change persisted');
    assert.equal(state.draftLabel, 'neg_2', 'current entry draft label follows the change');
    await page.locator('.recent-list .entry').first().click();
    await page.selectOption('#record-self-label', '');
    await page.waitForFunction(() => !('selfLabel' in DiaryReview.getState().sessions[0]));
    assert.equal(await page.locator('.flip-trigger .art-card').getAttribute('aria-label'), '분석 대기 감정 카드');
    assert.equal(await page.locator('[data-action=download]').count(), 0);
    await page.selectOption('#record-self-label', 'neg_2');
    await page.waitForFunction(() => DiaryReview.getState().sessions[0].selfLabel === 'neg_2');

    // Calendar shows a dot under the date number; statistics show a separate self-chosen block.
    await reveal(page, 'review-month');
    await page.selectOption('#stats-kind', 'count');
    const today = await page.evaluate(() => DiaryReview.localDate());
    const day = page.locator(`[data-month-date="${today}"]`);
    assert.equal(await day.locator('.self-dots i').count(), 1);
    assert.ok((await day.getAttribute('aria-label')).includes('내가 고른 감정 슬픔'));
    assert.equal(await day.locator('strong').isVisible(), true, 'date number stays visible');
    await page.selectOption('#stats-kind', 'distribution');
    const summary = page.locator('.self-summary');
    assert.equal(await summary.isVisible(), true);
    assert.ok((await summary.innerText()).includes('슬픔'));

    // Catalog stays model-only.
    await reveal(page, 'catalog');
    assert.equal(await page.locator('.catalog-character').count(), 0);

    // Mobile: picker scrolls horizontally, editor and primary action stay usable.
    await page.setViewportSize({ width: 360, height: 640 });
    await reveal(page, 'write');
    const chips = page.locator('.mood-chips');
    assert.equal(await chips.evaluate(el => getComputedStyle(el).overflowX), 'auto');
    assert.ok(await chips.evaluate(el => el.scrollWidth > el.clientWidth));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no horizontal page scroll');
    assert.ok((await page.locator('#diary-text').boundingBox()).height >= 80);
    assert.equal(await page.locator('.write-actions>.primary').isVisible(), true);

    assert.deepEqual(errors, []);
    console.log('PASS: self-chosen emotion pick/save/card/PNG/change/reload/calendar/statistics/catalog isolation/mobile');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
