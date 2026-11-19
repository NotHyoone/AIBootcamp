const fs=require('node:fs'), path=require('node:path'), os=require('node:os');
const {chromium}=require(process.env.CARDEX_PLAYWRIGHT || path.join(os.tmpdir(),'aibootcamp-frontend-review/node_modules/playwright'));
// Prefer the browser matching this Playwright installation. Explicit overrides win.
const executablePath=process.env.CARDEX_CHROMIUM || (fs.existsSync(chromium.executablePath()) ? chromium.executablePath() : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
// The full archive and favorites open from the record tab (Figma v0.3 four tabs).
const RECORD_TAB_ACTIONS = new Set(['archive-records', 'favorite-records']);
// Saving opens the sealed card page (2026-11-19). Tests written for the editor flow get the card unsealed
// and are taken back to the editor; pass {stay: true} to inspect the sealed card page instead.
async function reveal(page, action, {stay = false} = {}) {
  if (action !== 'save') await unseal(page);
  if (RECORD_TAB_ACTIONS.has(action) && !await page.locator(`[data-action="${action}"]:visible`).count()) {
    if (await page.locator('dialog[open]').count()) await page.keyboard.press('Escape');
    await page.locator('[data-action="write"]').first().click();
  }
  // Statistics keeps all three panels in the DOM and hides some with CSS, so prefer a visible match.
  const visible = page.locator(`[data-action="${action}"]:visible`);
  const target = (await visible.count()) ? visible.first() : page.locator(`[data-action="${action}"]`).first();
  await target.evaluate(el => { for (let p = el.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true; });
  const popover = await target.evaluate(el => el.closest('[popover]')?.id);
  if (popover && !await target.isVisible()) await page.locator(`[popovertarget="${popover}"]`).click();
  await target.click();
  if (action === 'save' && !stay) {
    const sealed = await page.locator('.card-box.is-sealed .mystery-card').waitFor({timeout: 1500}).then(() => true, () => false);
    if (sealed) {
      await unseal(page);
      await page.locator('.record-panel [data-action="history"]').click();
      await page.locator('#diary-text').waitFor();
    }
  }
}
// A freshly saved record (or an example record opened for the first time) shows a sealed "?" card.
// Tap it and wait until the real card and its information are back.
async function unseal(page) {
  if (!await page.locator('.mystery-card').count()) return false;
  await page.locator('.mystery-card').click({force: true}); // the idle float never settles
  await page.waitForFunction(() => !document.querySelector('.card-box.is-sealed, .card-box.is-flipping'), null, {timeout: 5000});
  return true;
}
module.exports={executablePath,reveal,unseal};
