/* Actual offline Chrome integration checks; requires Playwright only for development. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.CARDEX_PLAYWRIGHT||path.join(os.tmpdir(),'aibootcamp-frontend-review/node_modules/playwright'));
const output=process.env.CARDEX_QA_OUTPUT||path.join(os.tmpdir(),'diary-simple-v3-qa');
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CARDEX_CHROMIUM||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const results=[],errors=[],requests=[];
 try{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'diary-simple-v3-standalone-'));
  const file=path.join(dir,'index.html');fs.copyFileSync(path.join(__dirname,'../index.html'),file);
  const url=pathToFileURL(file).href;
  const context=await browser.newContext({offline:true,acceptDownloads:true,colorScheme:'light'});context.setDefaultTimeout(8000);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  async function route(r){await page.evaluate(r=>{location.hash=r;},r);await page.waitForFunction(r=>window.CardexApp?.getState().route===r,r);}
  await page.goto(url);await page.waitForSelector('#record-0');
  await page.locator('#record-0').fill('PRIVATE_INPUT_오늘은 산책했다.');
  await page.locator('[data-action="add-record"]').click();await page.locator('[data-action="confirm-diary"]').click();
  assert.equal(await page.locator('#record-1').getAttribute('aria-invalid'),'true');
  await page.locator('[data-action="delete-record"][data-index="1"]').click();assert.equal(await page.locator('#record-0').inputValue(),'PRIVATE_INPUT_오늘은 산책했다.');
  await page.locator('[data-action="confirm-diary"]').click();await page.locator('#diary-confirmed').check();await page.locator('[data-action="request-diary"]').click();
  await page.waitForFunction(()=>CardexApp.getState().route==='diary-pending');assert.equal(await page.evaluate(()=>CardexApp.getState().result),null);
  results.push('real input validation/delete/confirmation stays pending without synthetic analysis');
  await route('start');await page.locator('.simple-examples summary').click();await page.locator('[data-demo-mode="multi"]').click();
  await page.waitForFunction(()=>CardexApp.getState().route==='overview');
  assert.equal(await page.locator('main svg').count(),0);assert.equal(await page.locator('main table').count(),0);
  const summary=await page.evaluate(()=>JSON.stringify(CardexApp.getState().result.summary));
  await page.locator('.simple-result a[href="#analysis"]').click();await page.waitForFunction(()=>CardexApp.getState().route==='analysis');
  assert.equal(await page.locator('.scope-strip').count(),1);assert.equal(await page.locator('.overview-grid').count(),1);
  await page.locator('[data-overview-date]').first().click();await page.waitForFunction(()=>CardexApp.getState().route==='calendar');
  assert.equal(await page.evaluate(()=>CardexApp.getState().date),'2026-10-22');
  await route('period');await page.locator('[data-unit="week"]').click();assert.equal(await page.evaluate(()=>CardexApp.getState().periodUnit),'week');
  await route('repeats');await page.locator('#repeat-sort').selectOption('total');await page.locator('.table-reveal summary').first().click();
  assert.ok((await page.locator('.table-reveal[open]').innerText()).includes('fixture-record-'));
  await route('gallery');await page.locator('#card-search').fill('평온');assert.equal(await page.locator('[data-card-id="pos_3"]').count(),1);
  await page.locator('[data-card-id="pos_3"]').click();await page.waitForFunction(()=>CardexApp.getState().route==='detail');
  assert.equal(await page.evaluate(()=>JSON.stringify(CardexApp.getState().result.summary)),summary);
  await route('analysis');await page.locator('.detail-return [data-action="open-share"]').click();await page.waitForFunction(()=>CardexApp.getState().route==='share');
  assert.ok(!(await page.locator('.public-poster').innerText()).includes('PRIVATE_INPUT'));
  await page.locator('.share-settings summary').click();await page.locator('[data-share-format="portrait"]').click();await page.locator('#share-numbers').uncheck();
  const downloadPromise=page.waitForEvent('download');await page.locator('[data-action="save-png"]').click();const download=await downloadPromise;
  assert.equal(await download.failure(),null);const png=fs.readFileSync(await download.path());assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1350);
  await page.locator('[data-action="share-back"]').click();await page.waitForFunction(()=>CardexApp.getState().route==='analysis');
  assert.equal(await page.evaluate(()=>JSON.stringify(CardexApp.getState().result.summary)),summary);
  results.push('simple card → integrated details → calendar/period/repeats/gallery → private PNG → same detail result');
  const routes=['overview','analysis','distribution','flow','calendar','period','repeats','gallery','summary','share'];
  let checks=0;
  for(const mode of ['multi','single','no-date'])for(const width of [320,390,1440]){
   await page.setViewportSize({width,height:900});await page.evaluate(m=>DiaryApp.fixture(m),mode);
   for(const r of routes){await route(r);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,mode+'/'+width+'/'+r);checks++;
    if(mode==='single'&&['flow','calendar','period','repeats'].includes(r))assert.equal(await page.locator('main svg').count(),0);
    if(mode==='no-date'&&['calendar','period'].includes(r))assert.equal(await page.locator('.calendar-grid').count(),0);
   }
  }
  for(const theme of ['light','dark']){
   await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>DiaryApp.fixture('multi'));
   for(const r of ['overview','analysis']){await route(r);await page.locator('#theme-preference').selectOption(theme);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);await page.screenshot({path:path.join(output,r+'-'+theme+'.png'),fullPage:true});}
  }
  await page.setViewportSize({width:390,height:900});await route('analysis');await page.locator('#theme-preference').selectOption('light');await page.waitForTimeout(250);await page.screenshot({path:path.join(output,'analysis-mobile.png'),fullPage:true});
  results.push(checks+' single/multi/no-date route-width checks; light/dark screenshots');
  await page.reload();await page.waitForFunction(()=>CardexApp.getState().route==='analysis');assert.equal(await page.evaluate(()=>CardexApp.getState().result),null);
  assert.equal(await page.locator('.overview-grid').count(),0);
  assert.equal(requests.length,0);assert.deepEqual(errors,[]);
  results.push('refresh shows empty result recovery; offline standalone; no HTTP requests or JS errors');
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({results,errors,requests},null,2));console.log(JSON.stringify({results,errors,output},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
