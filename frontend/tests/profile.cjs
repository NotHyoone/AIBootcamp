// 2026-11-20 soft UI v1.1 profile page: avatar entry, profile card numbers, edit dialog (12-char
// nickname, avatar color reflected in the top bar and kept after reload), notice preferences,
// person icon on the avatar, no record export, section menu, font license, phone layout. Plain Node script.
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

    // Before any record: day count invites the first record. The avatar shows a person icon.
    assert.equal(await page.locator('header .avatar-face svg.profile-icon').count(), 1, 'top bar avatar has a person icon');
    await page.locator('header .avatar').click();
    assert.equal(await page.locator('.avatar[aria-current=page]').count(), 1);
    assert.equal(await page.locator('#profile-title').innerText(), '프로필');
    assert.equal(await page.locator('#profile-name').innerText(), '하루');
    assert.match(await page.locator('.profile-days').innerText(), /첫 기록을 남기면/);
    assert.equal(await page.locator('.profile-avatar svg.profile-icon').count(), 1, 'profile card avatar has a person icon');
    // Record export was removed from 기록 관리; the preview switch stays.
    assert.equal(await page.locator('[data-profile-action=export], .export-row').count(), 0, 'no record export');
    assert.equal(await page.locator('#settings-records [data-action=preview]').count(), 1);

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
    assert.equal(await dialog.locator('.color-option svg.profile-icon').count(), await page.evaluate(() => MomentProfile.COLORS.length), 'each color option previews the icon');
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

    // Example mode still leaves no export button.
    await reveal(page, 'preview');
    assert.equal(await page.evaluate(() => DiaryReview.getState().mode), 'example');
    await reveal(page, 'settings');
    assert.equal(await page.locator('[data-profile-action=export]').count(), 0);

    // Section menu moves focus to the section heading; the license opens in the info dialog.
    // Figma F7: one prefs panel holds notices, demo mode, delete-all and app info; the menu has no panel.
    assert.equal(await page.locator('.prefs-panel').count(), 1);
    assert.equal(await page.locator('.prefs-panel :is(#settings-notice, #settings-records, #settings-data, #settings-about)').count(), 4);
    assert.equal(await page.locator('.profile-nav.panel').count(), 0, 'menu without a panel');
    assert.equal(await page.locator('[data-profile-jump=theme]').getAttribute('aria-current'), 'true', 'theme selected first');
    assert.equal(await page.locator('.profile-card').evaluate(el => Math.round(el.getBoundingClientRect().width)), 240, 'profile card 240 wide');
    assert.equal(await page.locator('[data-action=delete-all]').getAttribute('aria-label'), '모든 기록 삭제');
    await page.locator('[data-profile-jump=about]').click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'about-title');
    assert.deepEqual(await page.locator('[data-profile-jump][aria-current=true]').evaluateAll(xs => xs.map(x => x.dataset.profileJump)), ['about'], 'one current menu item');
    await page.locator('[data-profile-action=license]').click();
    assert.match(await page.locator('#info-dialog[open] #info-copy').innerText(), /Bricolage Grotesque Project Authors/);
    await page.keyboard.press('Escape');

    // Phones: one column, horizontal section menu, no page overflow.
    await page.setViewportSize({ width: 360, height: 640 });
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const [card, theme] = await Promise.all(['.profile-card', '#settings-theme'].map(s => page.locator(s).boundingBox()));
    assert.ok(theme.y > card.y + card.height - 1, 'sections below the profile card on phones');
    // Phones (Figma): compact profile row, no menu, themes in one horizontal strip.
    assert.ok(card.height < 100, 'compact profile row ' + card.height);
    assert.equal(await page.locator('.profile-nav').isVisible(), false);
    const tops = await page.locator('.theme-swatch').evaluateAll(xs => new Set(xs.map(x => Math.round(x.getBoundingClientRect().top))).size);
    assert.equal(tops, 1, 'theme thumbnails in one row');
    assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS: profile entry, card numbers, 12-char nickname and avatar color (top bar, reload), notices stored only, person icon (top bar, card, color options), no record export, section menu, license, phone layout');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
