const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.CARDEX_PLAYWRIGHT || path.join(os.tmpdir(),'aibootcamp-frontend-review/node_modules/playwright'));
(async () => {
  const browser = await chromium.launch({headless:true,executablePath:process.env.CARDEX_CHROMIUM || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const evidence = [];
  try {
    const context = await browser.newContext({offline:true,acceptDownloads:true});
    for (const variant of ['lemon','gray']) {
      const page = await context.newPage();
      const errors=[],requests=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
      await page.goto(pathToFileURL(path.resolve(__dirname,'../'+variant+'.html')).href);
      assert.equal(await page.getAttribute('html','data-theme'),'light');
      assert.equal(await page.getAttribute('html','data-appearance'),variant);
      const click = a => page.locator('[data-action="'+a+'"]').first().click();
      await page.locator('#diary-text').fill('PRIVATE_DRAFT');
      await click('settings');
      assert.equal(await page.locator('[name=reduce-glass]').count(),0);
      for (const mode of ['light','dark']) {
        await page.locator('[name=color-mode][value='+mode+']').check();
        const ratios = await page.evaluate(() => {
          const c=getComputedStyle(document.documentElement);
          const l=n=>{const h=c.getPropertyValue(n).trim().slice(1);const a=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;};
          return [['--ink','--surface'],['--muted','--surface'],['--ink','--paper'],['--muted','--paper'],['--ink','--stage'],['--muted','--stage'],['--blue','--on-accent']].map(([a,b])=>(Math.max(l(a),l(b))+.05)/(Math.min(l(a),l(b))+.05));
        });
        assert.ok(ratios.every(n=>n>=4.5),variant+'/'+mode+' contrast '+ratios);
        evidence.push({variant,mode,minimumTextContrast:Math.min(...ratios)});
        for(const width of [320,375,390,1440]) {
          await page.setViewportSize({width,height:900});
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        }
      }
      await page.locator('[name=color-mode][value=system]').check();
      await page.emulateMedia({colorScheme:'light'});
      await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
      await page.emulateMedia({colorScheme:'dark'});
      await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
      await click('write');
      assert.equal(await page.locator('#diary-text').inputValue(),'PRIVATE_DRAFT');
      assert.ok(await page.locator('.editor,.object-frame,.bottom-nav').evaluateAll(es=>es.every(e=>getComputedStyle(e).backdropFilter==='none')));
      await click('settings');await click('preview');
      // Every emotion renders its own embedded character, including in the exported PNG.
      for(const sample of [7,1,2,3,4,5,6]) {
        await click('history');
        while(await page.evaluate(()=>DiaryReview.getState().page>0)) await click('prev');
        for(let n=0;n<Math.floor(sample/4);n++) await click('next');
        await page.locator('[data-open="sample-'+sample+'"]').click();
        await page.locator('[data-record-tab=card]').click();
        const svg=await page.locator('.art-card').evaluate(e=>e.outerHTML);
        assert.ok(svg.includes('data:image/png;base64,'));
        assert.ok(!svg.includes('PRIVATE_DRAFT'));
      }
      const download=page.waitForEvent('download');await click('download');
      const bytes=fs.readFileSync(await (await download).path());
      assert.equal(bytes.readUInt32BE(16),1080);assert.equal(bytes.readUInt32BE(20),1620);
      fs.writeFileSync(path.resolve(__dirname,'../docs/previews/'+variant+'-export.png'),bytes);
      // Inspect pixels from the actual PNG in the browser, beyond only checking its header.
      const imagePixels=await page.evaluate(async data=>{
        const i=new Image();i.src=data;await i.decode();const c=document.createElement('canvas');c.width=1080;c.height=1620;const x=c.getContext('2d');x.drawImage(i,0,0);
        const a=x.getImageData(540,500,1,1).data,b=x.getImageData(540,790,1,1).data;
        return Array.from(a).slice(0,3).some((v,j)=>Math.abs(v-b[j])>8);
      },'data:image/png;base64,'+bytes.toString('base64'));
      assert.ok(imagePixels,'export character is not blank');
      await page.evaluate(()=>CardexTheme.set('dark'));await page.reload();
      assert.equal(await page.getAttribute('html','data-theme'),'dark');
      assert.equal(await page.evaluate(()=>DiaryReview.getState().sessions.length),0);
      await page.evaluate(id=>localStorage.setItem('moment-card:diary-3d-v1:'+id+':color-scheme','invalid'),variant);await page.reload();
      assert.equal(await page.getAttribute('html','data-theme'),'light');
      assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
      await page.close();
    }
    const blocked=await browser.newPage();
    await blocked.addInitScript(()=>{Storage.prototype.getItem=Storage.prototype.setItem=()=>{throw Error('blocked');};});
    await blocked.goto(pathToFileURL(path.resolve(__dirname,'../lemon.html')).href);
    await blocked.evaluate(()=>CardexTheme.set('dark'));
    assert.equal(await blocked.getAttribute('html','data-theme'),'dark');
    await blocked.close();
    fs.writeFileSync(path.resolve(__dirname,'../docs/theme-verification.json'),JSON.stringify(evidence,null,2));
    console.log('PASS: both palettes, contrast, light/dark/system, 7 character cards, PNG pixels, storage separation, blocked storage, offline');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
