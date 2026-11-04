const path=require('node:path'),fs=require('node:fs'),os=require('node:os'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.CARDEX_PLAYWRIGHT||path.join(os.tmpdir(),'aibootcamp-frontend-review/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CARDEX_CHROMIUM||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const out=path.resolve(__dirname,'../docs/previews');const snapshots=[];
 try{
  for(const variant of ['lemon','gray'])for(const width of [1440,390]){
   const page=await browser.newPage({offline:true,viewport:{width,height:900}});
   await page.goto(pathToFileURL(path.resolve(__dirname,'../'+variant+'.html')).href);
   await page.evaluate(()=>document.fonts.ready);
   const click=a=>page.locator('[data-action="'+a+'"]').first().click();
   const shot=async view=>{
    await page.evaluate(()=>scrollTo(0,0));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(out,variant+'-'+view+'-'+width+'.png'),fullPage:true});
    snapshots.push({variant,view,width,body:await page.locator('#app').innerText(),chart:await page.locator('.stats-chart').count()?await page.locator('.stats-chart').evaluate(e=>e.outerHTML):null});
   };
   await shot('write');
   if(width===390){await page.evaluate(()=>CardexTheme.set('dark'));await shot('dark');await page.evaluate(()=>CardexTheme.set('light'));}
   await click('settings');await shot('settings');await click('preview');await shot('records');
   await page.locator('[data-open=sample-1]').click();await page.locator('[data-record-tab=card]').click();await shot('card');
   await click('history');await page.locator('[data-archive=stats]').click();await shot('stats');
   await page.locator('[data-archive=catalog]').click();await shot('catalog');
   await page.close();
  }
  fs.writeFileSync(path.resolve(__dirname,'../docs/figma-source.json'),JSON.stringify(snapshots,null,2));
  console.log('PASS: 26 screen captures, both variants, 1440/390, light/dark; synthetic example content only');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
