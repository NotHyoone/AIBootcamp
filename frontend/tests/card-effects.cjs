const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.CARDEX_PLAYWRIGHT || path.join(os.tmpdir(), 'aibootcamp-frontend-review/node_modules/playwright'));

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CARDEX_CHROMIUM || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const errors = [];
    let baseline;
    for (const mobile of [false, true]) {
      const context = await browser.newContext({ offline: true, hasTouch: mobile, isMobile: mobile,
        viewport: mobile ? { width: 375, height: 667 } : { width: 1366, height: 768 } });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
      await page.waitForFunction(() => DiaryReview.isReady());
      await page.locator('[data-action=settings]').click();
      await page.locator('[data-action=preview]').click();
      await page.locator('[data-open=sample-1]').click();
      const ids = await page.evaluate(() => CardexTheme.themes.map(t => t.id));
      const client = mobile ? await context.newCDPSession(page) : null;
      for (const id of ids) for (const mode of ['light', 'dark']) {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.evaluate(({ id, mode }) => { CardexTheme.setTheme(id); CardexTheme.set(mode); }, { id, mode });
        const scene = page.locator('.flip-scene'), front = page.locator('.flip-trigger');
        const styles = await scene.evaluate(el => {
          // Compare gradients at the same light position after each theme switch.
          const tilt = el.querySelector('.tilt-layer');
          tilt.style.setProperty('--light-x', '70%');
          tilt.style.setProperty('--light-y', '30%');
          tilt.style.setProperty('--rear-light-x', '30%');
          const read = (selector, keys) => {
            const css = getComputedStyle(selector ? el.querySelector(selector) : el);
            return keys.map(key => css[key]);
          };
          return { art: read('.art-card', ['borderRadius', 'filter']), rear: read('.flip-back', ['borderRadius', 'boxShadow']),
            perspective: read(null, ['perspective']), flip: read('.flip-inner', ['transitionDuration']),
            tilt: read('.tilt-layer', ['transitionDuration']), light: read('.flip-light', ['borderRadius', 'transitionDuration', 'backgroundImage', 'mixBlendMode']) };
        });
        if (!baseline) baseline = styles;
        assert.deepEqual(styles, baseline, `${id}/${mode}: common effects`);
        assert.equal(styles.art[0], '10px'); assert.notEqual(styles.art[1], 'none');
        assert.equal(styles.rear[0], '14px'); assert.notEqual(styles.rear[1], 'none');
        assert.deepEqual(styles.perspective, ['1200px']); assert.deepEqual(styles.flip, ['0.6s']);
        assert.deepEqual(styles.tilt, ['0.18s']); assert.equal(styles.light[1], '0.2s');
        const box = await front.boundingBox();
        const point = { x: box.x + box.width * .7, y: box.y + box.height * .3 };
        if (mobile) {
          await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
          await page.waitForTimeout(550);
        } else await page.mouse.move(point.x, point.y);
        await page.waitForFunction(() => document.querySelector('.tilt-layer').style.getPropertyValue('--shine') === '1');
        const angles = await page.locator('.tilt-layer').evaluate(el => ['--tilt-x', '--tilt-y'].map(k => parseFloat(el.style.getPropertyValue(k))));
        assert.ok(angles.every(n => mobile ? n === 0 : n > 0 && n <= 9));
        if (mobile) await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        else await page.mouse.move(0, 0);
        await page.waitForFunction(() => document.querySelector('.tilt-layer').style.getPropertyValue('--shine') === '0');
        assert.equal(await scene.evaluate(el => el.classList.contains('flipped')), false);
        if (mobile) await front.tap();
        else { await front.focus(); await page.keyboard.press('Enter'); }
        assert.equal(await scene.evaluate(el => el.classList.contains('flipped')), true);
        await page.waitForTimeout(650);
        await page.locator('.flip-back').focus(); await page.keyboard.press('Space');
        assert.equal(await scene.evaluate(el => el.classList.contains('flipped')), false);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(await page.locator('.flip-light').first().evaluate(el => getComputedStyle(el).display), 'none');
        assert.equal(await page.locator('.tilt-layer').evaluate(el => getComputedStyle(el).transform), 'none');
        assert.equal(await page.locator('.flip-inner').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
        await front.focus(); await page.keyboard.press('Space');
        assert.equal(await scene.evaluate(el => el.classList.contains('flipped')), true);
        await page.locator('.flip-back').focus(); await page.keyboard.press('Enter');
        assert.equal(await scene.evaluate(el => el.classList.contains('flipped')), false);
        for (const width of mobile ? [320, 375] : [1366]) {
          await page.setViewportSize({ width, height: mobile ? 667 : 768 });
          await page.waitForFunction(() => parseInt(document.documentElement.style.getPropertyValue('--app-height')) === innerHeight);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          const bounds = await front.locator('.art-card').boundingBox();
          assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
        }
        if (id === 'lemon') await page.screenshot({ path: path.join(os.tmpdir(), `card-effects-${mobile ? 'mobile' : 'desktop'}-${mode}.png`) });
      }
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: 12 palettes, desktop/touch effects, flip/keyboard, reduced motion, mobile layout');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
