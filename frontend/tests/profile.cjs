// 2026-11-20 soft UI v1.1 profile page: avatar entry, profile card numbers, edit dialog (12-char
// nickname, avatar color reflected in the top bar and kept after reload), notice preferences,
// .txt export of real records only, section menu, font license, phone layout. Plain Node script.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { pathToFileURL } = require('node:url');
const { executablePath, reveal } = require('./browser-runtime.cjs');
const { chromium } = require(process.env.CARDEX_PLAYWRIGHT || path.join(os.tmpdir(), 'aibootcamp-frontend-review/node_modules/playwright'));
const KEY = 'moment-card:profile-v1';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    await page.waitForFunction(() => DiaryReview.isReady());

    // Before any record: day count invites the first record; export is disabled.
    await page.locator('header .avatar').click();
    assert.equal(await page.locator('.avatar[aria-current=page]').count(), 1);
    assert.equal(await page.locator('#profile-title').innerText(), '프로필');
    assert.equal(await page.locator('#profile-name').innerText(), '하루');
    assert.match(await page.locator('.profile-days').innerText(), /첫 기록을 남기면/);
    assert.equal(await page.locator('[data-profile-action=export]').isDisabled(), true);

    // One real record: 1 record, day 1, 1-day streak, 0 cards (pending).
    await reveal(page, 'write');
    await page.locator('#diary-text').fill('PROFILE_EXPORT 오늘의 기록\n둘째 줄');
    await reveal(page, 'save');
    await reveal(page, 'settings');
    assert.deepEqual(await page.locator('.profile-stats dd').allInnerTexts(), ['1', '0', '1일']);
    assert.match(await page.locator('.profile-days').innerText(), /함께한 지 1일째/);

    // Edit: 13 characters become 12, the color shows on the profile and the top bar, and survives reload.
    await page.locator('[data-profile-edit]').click();
    const dialog = page.locator('#profile-dialog[open]');
    await dialog.waitFor();
    await dialog.locator('#profile-name-input').fill('  가나다라마바사아자차카타파  ');
    await dialog.locator('.color-option').nth(3).click();
    await dialog.locator('button[type=submit]').click();
    await page.locator('#profile-dialog[open]').waitFor({ state: 'detached' }).catch(() => {});
    assert.equal(await page.locator('#profile-name').innerText(), '가나다라마바사아자차카타');
    const color = await page.evaluate(() => MomentProfile.COLORS[3]);
    assert.equal(await page.locator('header .avatar-face').evaluate(el => getComputedStyle(el).getPropertyValue('--avatar').trim()), color);
    assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-profile-edit')), true, 'focus returns to the edit button');
    // Cancel keeps the saved profile.
    await page.locator('[data-profile-edit]').click();
    await dialog.locator('#profile-name-input').fill('취소될 이름');
    await dialog.locator('[data-profile-cancel]').click();
    assert.equal(await page.locator('#profile-name').innerText(), '가나다라마바사아자차카타');

    // Notices are saved (but never sent).
    await page.locator('[data-notice=notifyDaily]').check();
    assert.match(await page.locator('.notice-note').innerText(), /아직 알림을 보낼 수 없어요/);
    const stored = JSON.parse(await page.evaluate(k => localStorage.getItem(k), KEY));
    assert.deepEqual(stored, { name: '가나다라마바사아자차카타', color, notifyDaily: true, notifyAnalysis: false });
    // The diary snapshot never holds the profile.
    assert.equal(await page.evaluate(async () => {
      const db = await new Promise(r => { const q = indexedDB.open('moment-diary-main'); q.onsuccess = () => r(q.result); });
      const data = await new Promise(r => { const q = db.transaction('data').objectStore('data').get('state'); q.onsuccess = () => r(q.result); });
      db.close(); return JSON.stringify(data).includes('profile') || JSON.stringify(data).includes('notifyDaily');
    }), false, 'profile stays out of IndexedDB');
    await page.reload(); await page.waitForFunction(() => DiaryReview.isReady());
    assert.equal(await page.locator('header .avatar-face').evaluate(el => getComputedStyle(el).getPropertyValue('--avatar').trim()), color, 'avatar color kept after reload');
    await reveal(page, 'settings');
    assert.equal(await page.locator('[data-notice=notifyDaily]').isChecked(), true);

    // Export: a .txt with the real record (never the example records), even while example mode is on.
    await reveal(page, 'preview');
    assert.equal(await page.evaluate(() => DiaryReview.getState().mode), 'example');
    await reveal(page, 'settings'); // turning example mode on opens the archive
    const download = page.waitForEvent('download');
    await page.locator('[data-profile-action=export]').click();
    const file = await download;
    assert.match(file.suggestedFilename(), /^moment-records-\d{8}\.txt$/);
    const text = fs.readFileSync(await file.path(), 'utf8');
    assert.ok(text.includes('PROFILE_EXPORT 오늘의 기록\n둘째 줄'));
    assert.ok(text.includes('카드: 분석 대기'));
    assert.ok(!text.includes('퇴근길에 작은 꽃을 샀다'), 'example records are not exported');
    assert.match(text, /기록 1편/);

    // Section menu moves focus to the section heading; the license opens in the info dialog.
    await page.locator('[data-profile-jump=about]').click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'about-title');
    await page.locator('[data-profile-action=license]').click();
    assert.match(await page.locator('#info-dialog[open] #info-copy').innerText(), /Bricolage Grotesque Project Authors/);
    await page.keyboard.press('Escape');

    // Phones: one column, horizontal section menu, no page overflow.
    await page.setViewportSize({ width: 360, height: 640 });
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const [card, theme] = await Promise.all(['.profile-card', '#settings-theme'].map(s => page.locator(s).boundingBox()));
    assert.ok(theme.y > card.y + card.height - 1, 'sections below the profile card on phones');
    assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS: profile entry, card numbers, 12-char nickname and avatar color (top bar, reload), notices stored only, .txt export of real records, section menu, license, phone layout');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
