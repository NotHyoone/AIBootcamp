/* Display preferences only; runs before the first paint. */
(() => {
  "use strict";
  const themes = Object.freeze([
    {id:"paper",name:"페이퍼 다이어리",description:"종이 질감과 메모지의 따뜻함",light:["#f5f0e6","#fffcf6","#262323","#6e6269","#4039db","#ffffff"],dark:["#211e25","#302b35","#f6eef6","#c7bbc9","#b8adff","#211e25"]},
    {id:"sage",name:"세이지 터치",description:"세이지 색감과 부드러운 표면",light:["#edf2e8","#f8fcf5","#20392b","#526858","#35664c","#ffffff"],dark:["#18231d","#24362b","#eff8ed","#b7cbb8","#a9d6b8","#18231d"]},
    {id:"aurora",name:"리퀴드 오로라",description:"은은한 빛과 반투명 유리",light:["#eef3fc","#ffffff","#202c4c","#586581","#3654b8","#ffffff"],dark:["#141b30","#242f4a","#f0f4ff","#b8c6df","#b6c5ff","#141b30"]},
    {id:"editorial",name:"에디토리얼 모노",description:"절제된 색과 명확한 구분선",light:["#fafaf7","#ffffff","#282828","#62625d","#282828","#ffffff"],dark:["#191919","#292929","#ecece5","#bdbdb5","#ecece5","#191919"]},
    {id:"retro",name:"레트로 플레이",description:"격자와 선명한 테두리의 즐거움",light:["#fff4df","#fffaf0","#32243e","#6d5b73","#7635b5","#ffffff"],dark:["#251d32","#362943","#fff2df","#d1bbdb","#d7b4ff","#251d32"]}
  ].map(Object.freeze));
  const prefix="moment-card:diary-simple-v3:", modeKey=prefix+"color-scheme", themeKey=prefix+"appearance";
  const media=window.matchMedia("(prefers-color-scheme: dark)");
  const validMode=v=>["system","light","dark"].includes(v), validTheme=v=>themes.some(t=>t.id===v);
  const read=k=>{try{return localStorage.getItem(k);}catch{return null;}};
  let preference=validMode(read(modeKey))?read(modeKey):"system", theme=validTheme(read(themeKey))?read(themeKey):"paper";
  // The registry supplies both root colors and isolated settings previews.
  const style=document.createElement("style");
  style.textContent=themes.flatMap(t=>["light","dark"].map(mode=>{
    const [paper,surface,ink,muted,accent,onAccent]=t[mode];
    return `:root[data-appearance="${t.id}"][data-theme="${mode}"],.theme-preview[data-appearance="${t.id}"][data-theme="${mode}"]{--paper:${paper};--surface:${surface};--ink:${ink};--muted:${muted};--blue:${accent};--on-accent:${onAccent};--line:${mode==="dark"?"#79838c":"#92868d"};--tint:${surface};--error:${mode==="dark"?"#ffb4c4":"#a12b43"};--positive:${mode==="dark"?"#7bd6c1":"#227466"};--negative:${mode==="dark"?"#ffac8e":"#b34424"};--pos_1:${mode==="dark"?"#7bd6c1":"#227466"};--pos_2:${mode==="dark"?"#bbd89c":"#527842"};--pos_3:${mode==="dark"?"#8cd4ed":"#417d9b"};--neg_1:${mode==="dark"?"#cfb3ff":"#8068b3"};--neg_2:${mode==="dark"?"#a4ccff":"#417da7"};--neg_3:${mode==="dark"?"#ffb4c4":"#c34b52"};--neutral:${mode==="dark"?"#b7c7db":"#596b80"};}`;
  })).join("\n");
  document.head.append(style);
  function sync(){
    document.querySelectorAll('[name="appearance"]').forEach(c=>c.checked=c.value===theme);
    document.querySelectorAll('[name="color-mode"]').forEach(c=>c.checked=c.value===preference);
    const control=document.getElementById("theme-preference");if(control)control.value=preference;
  }
  function apply(){
    const resolved=preference==="system"?(media.matches?"dark":"light"):preference;
    document.documentElement.dataset.appearance=theme;
    document.documentElement.dataset.theme=resolved;
    document.documentElement.style.colorScheme=resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content",themes.find(t=>t.id===theme)[resolved][0]);
    sync();window.dispatchEvent(new Event("cardex-theme-change"));
  }
  function persist(k,v){try{localStorage.setItem(k,v);}catch{/* Selection still works for this session. */}}
  function set(v){if(validMode(v)){preference=v;persist(modeKey,v);apply();}}
  function setTheme(v){if(validTheme(v)){theme=v;persist(themeKey,v);apply();}}
  window.CardexTheme=Object.freeze({themes,sync,set,setTheme,getTheme:()=>theme,getPreference:()=>preference,getResolvedMode:()=>document.documentElement.dataset.theme});
  media.addEventListener("change",()=>{if(preference==="system")apply();});
  window.addEventListener("storage",e=>{
    if(e.key===modeKey||e.key===null)preference=validMode(read(modeKey))?read(modeKey):"system";
    if(e.key===themeKey||e.key===null)theme=validTheme(read(themeKey))?read(themeKey):"paper";
    if([modeKey,themeKey,null].includes(e.key))apply();
  });
  document.addEventListener("change",e=>{
    if(e.target.name==="appearance")setTheme(e.target.value);
    if(e.target.name==="color-mode"||e.target.id==="theme-preference")set(e.target.value);
  });
  apply();
})();
