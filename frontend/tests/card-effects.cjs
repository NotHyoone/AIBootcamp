async function reveal(page, action) {
  const target = page.locator(`[data-action="${action}"]`).first();
  await target.evaluate(el => { for(let p=el.parentElement;p;p=p.parentElement) if(p.tagName==='DETAILS') p.open=true; });
  const pop = await target.evaluate(el => el.closest('[popover]')?.id);
  if(pop && !await target.isVisible()) await page.locator(`[popovertarget="${pop}"]`).click();
  await target.click();
}
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
      await reveal(page,'preview');
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
        assert.equal(styles.art[0], '14px'); assert.notEqual(styles.art[1], 'none');
        assert.equal(styles.rear[0], '14px'); assert.notEqual(styles.rear[1], 'none');
        assert.deepEqual(styles.perspective, ['1200px']); assert.deepEqual(styles.flip, ['0.6s']);
        assert.deepEqual(styles.tilt, ['0.18s']); assert.equal(styles.light[1], '0.2s');
        const boxes = await page.locator('.flip-scene').evaluate(el => ['.art-card','.flip-front .flip-light','.flip-back'].map(s => { const r=el.querySelector(s).getBoundingClientRect(); return [r.x,r.y,r.width,r.height]; }));
        for (const other of boxes.slice(1)) boxes[0].forEach((v,i)=>assert.ok(Math.abs(v-other[i])<=1, `${id}/${mode}: card/light/rear geometry`));
        assert.ok(Math.abs(boxes[0][2]/boxes[0][3]-2/3)<.01);
        assert.equal(await page.locator('.card-actions > button').count(),3);
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
    // 카드 효과 설정: auto는 OS reduced-motion을 따르고, on/off는 OS 설정보다 우선한다.
    {
      const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1366, height: 768 } });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
      await page.waitForFunction(() => DiaryReview.isReady());
      assert.equal(await page.evaluate(() => CardexTheme.getMotion()), 'auto');
      assert.equal(await page.evaluate(() => document.documentElement.dataset.motion), 'auto');
      await page.locator('[data-action=settings]').click();
      assert.deepEqual(await page.locator('[name=card-motion]').evaluateAll(xs => xs.map(x => [x.value, x.checked])), [['auto', true], ['on', false], ['off', false]]);
      await page.locator('[name=card-motion][value=on]').check();
      assert.equal(await page.evaluate(() => document.documentElement.dataset.motion), 'on');
      await reveal(page, 'preview');
      await page.locator('[data-open=sample-1]').click();
      const scene = page.locator('.flip-scene'), front = page.locator('.flip-trigger');
      const hoverCard = async () => {
        const box = await front.boundingBox();
        await page.mouse.move(0, 0);
        await page.mouse.move(box.x + box.width * .7, box.y + box.height * .3, { steps: 4 });
        await page.waitForTimeout(120);
        return page.locator('.tilt-layer').evaluate(el => ({ shine: el.style.getPropertyValue('--shine'),
          angles: ['--tilt-x', '--tilt-y'].map(k => parseFloat(el.style.getPropertyValue(k)) || 0),
          transform: getComputedStyle(el).transform, light: getComputedStyle(el.querySelector('.flip-light')).display,
          flip: getComputedStyle(el.querySelector('.flip-inner')).transitionDuration }));
      };
      const on = await hoverCard();
      assert.equal(on.shine, '1', 'on + reduce: light');
      assert.ok(on.angles.every(n => n > 0 && n <= 9), 'on + reduce: tilt '+on.angles);
      assert.notEqual(on.transform, 'none'); assert.notEqual(on.light, 'none'); assert.equal(on.flip, '0.6s');
      await page.evaluate(() => CardexTheme.setMotion('auto'));
      await page.mouse.move(0, 0);
      const auto = await hoverCard();
      assert.notEqual(auto.shine, '1', 'auto + reduce: no light');
      assert.equal(auto.transform, 'none'); assert.equal(auto.light, 'none'); assert.equal(auto.flip, '0s');
      await page.evaluate(() => CardexTheme.setMotion('bogus'));
      assert.equal(await page.evaluate(() => CardexTheme.getMotion()), 'auto', 'invalid value ignored');
      await page.evaluate(() => CardexTheme.setMotion('on'));
      await page.reload();
      await page.waitForFunction(() => DiaryReview.isReady());
      assert.equal(await page.evaluate(() => document.documentElement.dataset.motion), 'on', 'persists after reload');
      await page.evaluate(() => localStorage.setItem('moment-card:diary-simple-v3:card-motion', '<script>'));
      await page.reload();
      await page.waitForFunction(() => DiaryReview.isReady());
      assert.equal(await page.evaluate(() => document.documentElement.dataset.motion), 'auto', 'corrupt stored value falls back');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.evaluate(() => CardexTheme.setMotion('off'));
      await page.locator('[data-action=settings]').click();
      await reveal(page, 'preview');
      await page.locator('[data-open=sample-1]').click();
      const off = await hoverCard();
      assert.notEqual(off.shine, '1', 'off: no light');
      assert.equal(off.transform, 'none'); assert.equal(off.light, 'none'); assert.equal(off.flip, '0s');
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: 12 palettes, desktop/touch effects, flip/keyboard, reduced motion, mobile layout, card-motion auto/on/off');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
