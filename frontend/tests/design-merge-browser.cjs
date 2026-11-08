const assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.CARDEX_PLAYWRIGHT||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CARDEX_CHROMIUM?{executablePath:process.env.CARDEX_CHROMIUM}:{})});try{
 const p=await browser.newPage({viewport:{width:390,height:844}});await p.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
 await p.locator('#diary-text').fill('회귀 검사 기록\n두 번째 줄 <script>문자 그대로</script>');await p.locator('[data-action=save]').click();
 assert.equal(await p.getByRole('button',{name:'보관함',exact:true}).count(),1);
 const expand=p.getByRole('button',{name:'기록 전체보기',exact:true});await expand.click();assert.ok(await p.locator('#read-full-dialog').evaluate(d=>d.open));assert.match(await p.locator('.full-text').innerText(),/회귀 검사 기록/);await p.keyboard.press('Escape');assert.equal(await expand.evaluate(e=>e===document.activeElement),true);
 await p.locator('.flip-trigger').click();assert.ok(await p.locator('.flip-scene').evaluate(e=>e.classList.contains('flipped')));await expand.click();await p.keyboard.press('Escape');assert.ok(await p.locator('.flip-scene').evaluate(e=>e.classList.contains('flipped')));
 await p.locator('.flip-back').focus();await p.keyboard.press('Enter');assert.equal(await p.locator('.flip-scene').evaluate(e=>e.classList.contains('flipped')),false);
 console.log('icons, record content, dialog focus return and flip state passed');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
