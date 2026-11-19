/* Display preferences only; runs before the first paint. */
(() => {
  "use strict";
  const themes = Object.freeze(window.CardexDesignThemes.map(Object.freeze));
  const prefix="moment-card:diary-simple-v3:", modeKey=prefix+"color-scheme", themeKey=prefix+"appearance";
  const validMode=v=>["light","dark"].includes(v), validTheme=v=>themes.some(t=>t.id===v);
  const read=k=>{try{return localStorage.getItem(k);}catch{return null;}};
  // Card effects are always on (product decision 2026-11-19); the old card-motion key is ignored.
  const motion="on";
  let preference=validMode(read(modeKey))?read(modeKey):"light", theme=validTheme(read(themeKey))?read(themeKey):"blossom";
  function sync(){
    document.querySelectorAll('[name="appearance"]').forEach(c=>c.checked=c.value===theme);
    document.querySelectorAll('[name="color-mode"]').forEach(c=>c.checked=c.value===preference);
    const control=document.getElementById("theme-preference");if(control)control.value=preference;
  }
  function apply(){
    const resolved=preference;
    document.documentElement.dataset.appearance=theme;
    document.documentElement.dataset.theme=resolved;
    document.documentElement.dataset.motion=motion;
    document.documentElement.style.colorScheme=resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content",themes.find(t=>t.id===theme)[resolved][0]);
    sync();window.dispatchEvent(new Event("cardex-theme-change"));
  }
  function persist(k,v){try{localStorage.setItem(k,v);}catch{/* Selection still works for this session. */}}
  function set(v){if(validMode(v)){preference=v;persist(modeKey,v);apply();}}
  function setTheme(v){if(validTheme(v)){theme=v;persist(themeKey,v);apply();}}
  // Kept for callers of the old API; card effects can no longer be turned off.
  function setMotion(){}
  window.CardexTheme=Object.freeze({themes,sync,set,setTheme,setMotion,getMotion:()=>motion,getTheme:()=>theme,getPreference:()=>preference,getResolvedMode:()=>document.documentElement.dataset.theme});
  if (read(modeKey) === "system") persist(modeKey,"light");
  window.addEventListener("storage",e=>{
    if(e.key===modeKey||e.key===null)preference=validMode(read(modeKey))?read(modeKey):"light";
    if(e.key===themeKey||e.key===null)theme=validTheme(read(themeKey))?read(themeKey):"blossom";
    if([modeKey,themeKey,null].includes(e.key))apply();
  });
  document.addEventListener("change",e=>{
    if(e.target.name==="appearance")setTheme(e.target.value);
    if(e.target.name==="color-mode"||e.target.id==="theme-preference")set(e.target.value);
  });
  apply();
})();
