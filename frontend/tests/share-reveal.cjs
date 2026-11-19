// Card reveal, card information panel and share sheet (Figma v0.3 카드 등장 · 공유). Plain Node script.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const {pathToFileURL} = require('node:url');
const {executablePath, reveal, unseal} = require('./browser-runtime.cjs');
const {chromium} = require(process.env.CARDEX_PLAYWRIGHT || path.join(os.tmpdir(), 'aibootcamp-frontend-review/node_modules/playwright'));

(async () => {
  const browser = await chromium.launch({headless: true, executablePath});
  const evidence = fs.mkdtempSync(path.join(os.tmpdir(), 'moment-share-reveal-'));
  try {
    const page = await browser.newPage({acceptDownloads: true, viewport: {width: 1440, height: 900}});
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    await page.waitForFunction(() => DiaryReview.isReady());
    await page.evaluate(() => CardexTheme.setMotion('on'));
    const click = action => reveal(page, action);

    // Real record: pending card, no share, no emotion picker.
    await page.locator('#diary-text').fill('공유 검사용 PRIVATE_DIARY_TEXT');
    await reveal(page, 'save', {stay: true});
    await page.waitForFunction(() => DiaryReview.getState().sessions.length === 1);
    // Saving opens the card page sealed; the card info stays hidden until the "?" card is tapped.
    await page.waitForFunction(() => DiaryReview.getState().view === 'entry');
    await page.locator('.card-box.is-sealed .mystery-card').waitFor();
    assert.equal(await page.locator('.card-info').isVisible(), false, 'card info hidden while sealed');
    assert.ok(await unseal(page));
    assert.equal(await page.locator('.card-box[data-grade="pending"]').count(), 1);
    assert.match(await page.locator('#card-info-title').innerText(), /분석 대기/);
    assert.equal(await page.locator('[data-action=share]').count(), 0, 'pending cards cannot be shared');
    assert.match(await page.locator('.card-info').innerText(), /감정 직접 선택 없음/);

    // Example mode: the first open seals the card; tapping flips it with the grade effect, geometry stays fixed.
    await click('settings');
    await page.locator('[data-action=preview]').evaluate(el => el.closest('details').open = true);
    await click('preview');
    // Open a stage-3 card from the catalog detail sheet.
    await click('catalog');
    await page.locator('[data-catalog-filter="pos_1"]').click();
    await page.locator('.slot[data-stage="3"]').click();
    await page.locator('#card-detail[open] [data-open]').first().click();
    await page.locator('.card-box.is-sealed .mystery-card').waitFor();
    assert.equal(await page.locator('.card-box[data-reveal="stage-3"]').count(), 1, 'stage 3 reveal');
    const before = await page.locator('.flip-scene').boundingBox();
    await page.locator('.mystery-card').click({force: true}); // the idle float never settles
    await page.locator('.card-box.is-flipping').waitFor();
    const during = await page.locator('.flip-scene').boundingBox();
    for (const k of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(before[k] - during[k]) <= 1, 'card geometry fixed while sealed: ' + k);
    await page.waitForFunction(() => !document.querySelector('.card-box.is-flipping'), null, {timeout: 5000});
    const after = await page.locator('.flip-scene').boundingBox();
    for (const k of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(during[k] - after[k]) <= 1, 'card geometry fixed during reveal: ' + k);
    assert.equal(await page.locator('.mystery-card').count(), 0);
    assert.match(await page.locator('#card-info-title').innerText(), /3단계 카드를 얻었어요!/);
    assert.match(await page.locator('.card-info').innerText(), /최고 확률 95%/);
    assert.equal(await page.locator('.record-panel [data-action=history]').innerText(), '목록으로');
    await page.screenshot({path: path.join(evidence, 'card-stage3.png')});
    // Re-render of the same record does not replay.
    await click('favorite');
    assert.equal(await page.locator('.mystery-card').count(), 0);

    // Share sheet: 4:5 preview without the diary text, formats, optional sentence, PNG 1080×1350.
    await click('share');
    assert.equal(await page.evaluate(() => DiaryReview.getState().view), 'share');
    assert.equal(await page.locator('.screen-title').innerText(), '공유하기');
    assert.equal(await page.locator('.share-art').getAttribute('viewBox'), '0 0 1080 1350');
    assert.match(await page.evaluate(() => DiaryReview.getState().selected), /^sample-\d+$/);
    const art = () => page.locator('.share-art').evaluate(el => el.outerHTML);
    assert.ok(!(await art()).includes('PRIVATE_DIARY_TEXT'));
    for (const body of ['퇴근길에 작은 꽃', '오랜만에 친구와 산책', '바쁜 하루 끝']) assert.ok(!(await art()).includes(body), 'diary body is never drawn: ' + body);
    for (const format of ['record', 'mixed', 'card']) {
      await page.locator(`[data-share-format="${format}"]`).click();
      assert.equal(await page.locator(`[data-share-format="${format}"]`).getAttribute('aria-pressed'), 'true');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.shareFormat), format);
    }
    await page.locator('[data-share-sentence="on"]').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'share-sentence');
    await page.locator('#share-sentence').fill('오늘은 산책이 좋았다');
    assert.ok((await art()).includes('오늘은 산책이 좋았다'));
    assert.equal(await page.locator('#share-sentence').getAttribute('maxlength'), '40');
    await page.screenshot({path: path.join(evidence, 'share-desktop.png')});
    const download = page.waitForEvent('download');
    await click('share-download');
    const file = await download;
    const bytes = fs.readFileSync(await file.path());
    assert.equal(bytes.readUInt32BE(16), 1080);
    assert.equal(bytes.readUInt32BE(20), 1350);
    await page.locator('[data-share-sentence="off"]').click();
    assert.ok(!(await art()).includes('오늘은 산책이 좋았다'), 'removing the sentence clears it');
    await click('share-close');
    assert.equal(await page.evaluate(() => DiaryReview.getState().view), 'entry');

    // Catalog detail → share → back to the catalog.
    await click('catalog');
    await page.locator('.slot[data-stage="2"]').first().click();
    await page.locator('#card-detail[open] [data-share-record]').click();
    assert.equal(await page.evaluate(() => DiaryReview.getState().view), 'share');
    assert.equal(await page.locator('.tabs [aria-current=page]').innerText(), '도감');
    await click('share-close');
    assert.equal(await page.evaluate(() => [DiaryReview.getState().view, DiaryReview.getState().archiveTab].join()), 'history,catalog');

    // Card effects cannot be turned off any more: the old switch is a no-op and settings has no toggle.
    await page.evaluate(() => CardexTheme.setMotion('off'));
    assert.equal(await page.evaluate(() => document.documentElement.dataset.motion), 'on');
    await click('settings');
    assert.equal(await page.locator('[data-card-motion-toggle]').count(), 0);
    await click('archive-records');
    await page.locator('[data-open="sample-2"]').click();
    await unseal(page);

    // Phones: share sheet and card screen fit without horizontal overflow.
    for (const [w, h] of [[390, 844], [320, 568]]) {
      await page.setViewportSize({width: w, height: h});
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `card ${w}`);
      await click('share');
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `share ${w}`);
      await page.screenshot({path: path.join(evidence, `share-${w}.png`), fullPage: true});
      await click('share-close');
    }
    assert.deepEqual(errors, []);
    console.log('PASS: pending card, one-time reveal with fixed geometry, card info, share formats/sentence/PNG 1080x1350, catalog share, motion always on, phones; evidence: ' + evidence);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
