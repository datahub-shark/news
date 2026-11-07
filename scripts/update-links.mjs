import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {localizeLinks} from './localize-links.mjs';
import {enhanceLinks} from './enhance-links.mjs';
const source=resolve(process.argv[2]||'../link-shark-dxf/dist/linkS.html');
// Keep the published bytes identical after Git's Windows line-ending normalization.
let html=(await readFile(source,'utf8')).replace(/\r\n/g,'\n');
if(!html.includes('linkS')||!html.includes('window.LinkSharkUI')||!html.includes('window.LinkSharkForces'))throw Error('Expected the complete linkS workbench.');
if(/<script[^>]+src=/i.test(html))throw Error('Workbench must be self-contained.');
if(html.includes('id="links-draft-storage"'))throw Error('Use the original standalone workbench as input.');
const localized=localizeLinks(html,JSON.parse(await readFile('links/vi-defaults.json','utf8')));
html=await enhanceLinks(localized.html);
const scopedStorage=(await readFile('links/workbench-storage.js','utf8')).replace(/\r\n/g,'\n');
// Redirect every inherited storage reference, including backups and legacy recovery.
html=html.replace(/\blocalStorage\b/g,'LinkSDraftStorage');
html=html.replace(/<head([^>]*)>/i,head=>head+'\n<script id="links-draft-storage">'+scopedStorage.replace(/<\/script/gi,'<\\/script')+'</script>');
for(const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
await mkdir('links',{recursive:true});
await writeFile('links/linkS.html',html);
await writeFile('links/build-info.json',JSON.stringify({name:'linkS',sha256:createHash('sha256').update(html).digest('hex'),bytes:Buffer.byteLength(html),source:'link-shark-dxf/dist/linkS.html',defaultLanguage:'vi',localizedDefaults:localized.changedDefaults},null,2)+'\n');
console.log('Updated complete linkS workbench: '+Buffer.byteLength(html)+' bytes; '+localized.changedDefaults+' Vietnamese defaults.');
