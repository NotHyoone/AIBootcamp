const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../scripts/core.js'),D=require('../scripts/diary-core.js');
function setup(){
 let code=fs.readFileSync(require.resolve('../scripts/app.js'),'utf8');
 const a=code.indexOf('  function render(focus = false) {'),b=code.indexOf('  function bindCardEffects()',a);
 code=code.slice(0,a)+'  function render() {}\n'+code.slice(b);
 code=code.replace('  render();\n  window.DiaryReview','  window.probe={state,action,hasUnsavedWork};\n  window.DiaryReview');
 const app={querySelector:()=>null,querySelectorAll:()=>[]},win={addEventListener(){},confirm:()=>false};
 const ctx={window:win,document:{getElementById:()=>app,documentElement:{style:{setProperty(){}}}},CardexCore:C,DiaryCore:D,structuredClone,crypto:require('node:crypto').webcrypto,innerHeight:768,setTimeout:()=>1,clearTimeout(){},history:{replaceState(){},state:null},location:{pathname:'/',search:''}};
 vm.runInNewContext(code,ctx);return win.probe;
}
const entry=()=>({id:'r1',text:'기존 기록',recordDate:[new Date().getFullYear(),String(new Date().getMonth()+1).padStart(2,'0'),String(new Date().getDate()).padStart(2,'0')].join('-'),version:1,analysis:{status:'pending'}});
test('deleting last real record retains unload protection during undo',async()=>{
 const x=setup(),r=entry();Object.assign(x.state,{sessions:[r],selected:r.id,view:'entry',text:r.text,savedText:r.text});
 await x.action('delete-example');await x.action('delete-example');assert.equal(x.state.sessions.length,0);assert.ok(x.state.undo);assert.equal(x.hasUnsavedWork(),true);
});
test('saving another record preserves undo and restores both records',async()=>{
 const x=setup(),r=entry();Object.assign(x.state,{sessions:[r],selected:r.id,view:'entry',text:r.text,savedText:r.text});
 await x.action('delete-example');await x.action('delete-example');Object.assign(x.state,{policy:'multi',text:'새로운 기록',currentEntryId:null});await x.action('save');assert.ok(x.state.undo);await x.action('undo-delete');assert.equal(x.state.sessions.length,2);assert.equal(x.state.sessions[0].id,r.id);
});
test('cancelled overwrite preserves example mode and existing real text',async()=>{
 const x=setup(),r=entry();Object.assign(x.state,{sessions:[r],mode:'example',text:'취소할 입력',currentEntryId:null});await x.action('save');assert.equal(x.state.mode,'example');assert.equal(x.state.sessions[0].text,r.text);
});
