const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const load = n => JSON.parse(fs.readFileSync(path.join(__dirname,`../design/tokens/${n}.json`),'utf8'));
const compiler = import('../tools/build-tokens.mjs');
test('all existing themes resolve and generated tokens are current',async()=>{
  const {compileTokens,buildTokens} = await compiler;
  const {css,script} = compileTokens(load('primitives'),load('semantic'),load('themes'));
  assert.equal((css.match(/:root\[data-appearance=/g)||[]).length,22);
  const context = {window:{}}; require('node:vm').runInNewContext(script,context);
  assert.deepEqual(Array.from(context.window.CardexDesignThemes,t=>t.id),['blossom','paper','sage','aurora','editorial','retro','lemon','forest','sunset','starlight','doodle']);
  assert.equal(context.window.CardexDesignThemes[0].light[0],'#FBF3F1');
  assert.equal(context.window.CardexDesignThemes[1].light[0],'#f5f0e6');
  const doodle = context.window.CardexDesignThemes.at(-1);
  assert.equal(doodle.name,'펫 두들');
  assert.equal(doodle.light[0],'#F3EFE2');
  assert.equal(doodle.dark[0],'#1E1B19');
  assert.match(css,/:root\[data-appearance="doodle"\]\[data-theme="light"\][^}]*--color-border:\s*#2A2724/i);
  await buildTokens({check:true});
});
test('missing references, cycles, unsafe values and absent modes fail generation',async()=>{
  const {compileTokens} = await compiler;
  for (const extra of [{bad:'{missing}'},{a:'{b}',b:'{a}'}]) {
    assert.throws(()=>compileTokens(load('primitives'),{...load('semantic'),...extra},load('themes')),/Missing|Circular/);
  }
  const primitives=load('primitives');primitives['space-4'].value='4px;}body{display:none';
  assert.throws(()=>compileTokens(primitives,load('semantic'),load('themes')),/Invalid/);
  const themes=load('themes');delete themes.themes[0].modes.dark;
  assert.throws(()=>compileTokens(load('primitives'),load('semantic'),themes),/Missing mode/);
  const duplicate=load('themes');duplicate.themes.push(duplicate.themes[0]);
  assert.throws(()=>compileTokens(load('primitives'),load('semantic'),duplicate),/duplicate/);
  const noDefault=load('themes');noDefault.themes = noDefault.themes.filter(t=>t.id !== 'blossom');
  assert.throws(()=>compileTokens(load('primitives'),load('semantic'),noDefault),/Missing default/);
});
