import {readFile,writeFile} from 'node:fs/promises';
const base=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,base),'utf8');
const safe=s=>s.replace(/<\/script/gi,'<\\/script');
let shell=await read('templates/shell.html');
const integrated=await read('scripts/integrated.js');
const app=(await read('scripts/app.js')).replace('/*__INTEGRATED__*/',()=>integrated);
const styles=(await Promise.all(['base','integrated','refinements'].map(p=>read('styles/'+p+'.css')))).join('\n');
const domain=await read('scripts/core.js')+'\n'+await read('scripts/diary-core.js');
for(const [key,value] of Object.entries({STYLES:styles,THEME:safe(await read('scripts/theme.js')),DOMAIN:safe(domain),APP:safe(app)})){
 const marker='/*__'+key+'__*/';if(!shell.includes(marker))throw Error('Missing marker '+key);
 shell=shell.replace(marker,()=>value);
}
const license=await read('docs/licenses/ibm-plex-sans-kr.txt');
shell=shell.replace('</body>',()=>'<script type="text/plain" id="embedded-font-license">'+safe(license)+'</script>\n</body>');
await writeFile(new URL('index.html',base),shell);
console.log('Built Diary Simple v3 standalone HTML ('+Buffer.byteLength(shell)+' bytes)');
