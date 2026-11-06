const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(count=25){
 const props=new Map(),saved=[],tokens=new Map();let nextToken=0,owner=true;
 const files=Array.from({length:count},(_,i)=>({getId:()=>String(i),getName:()=>`article-${i}.html`,getSize:()=>200,getBlob:()=>({getDataAsString:()=>`<!-- METADATA\nTiêu đề: Robot ${i}\nNguồn: https://example.com/${i}\nChuyên mục: Cơ khí\nTrạng thái: READY\n--><h1>Robot</h1><p>Content</p>`})}));
 function iterator(items,index=0){return {hasNext:()=>index<items.length,next:()=>items[index++],getContinuationToken(){const token=String(++nextToken);tokens.set(token,{items,index});return token;}};}
 const folders={root:{getId:()=> 'root',getName:()=> 'Robot Ideas Articles',getFiles:()=>iterator([]),getFolders:()=>iterator([folders.child])},child:{getId:()=> 'child',getName:()=> 'articles',getFiles:()=>iterator(files),getFolders:()=>iterator([])}};
 const resume=token=>{const state=tokens.get(token);if(!state)throw Error('Expired');return iterator(state.items,state.index);};
 const triggers=[];
 const ctx={console,PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v)})},DriveApp:{getFoldersByName:()=>iterator([folders.root]),getFolderById:id=>folders[id],continueFileIterator:resume,continueFolderIterator:resume},Session:{getActiveUser:()=>({getEmail:()=>owner?'owner@example.com':''}),getEffectiveUser:()=>({getEmail:()=> 'owner@example.com'})},ScriptApp:{getProjectTriggers:()=>triggers,deleteTrigger(t){triggers.splice(triggers.indexOf(t),1)},newTrigger(handler){return {timeBased(){return this},everyMinutes(n){assert.equal(n,10);return this},create(){triggers.push({getHandlerFunction:()=>handler})}}}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('google-apps-script/Code.gs','utf8'),ctx);
 ctx.rows_=()=>saved.map(article=>({article}));ctx.locked_=fn=>fn();ctx.save_=({article},id)=>saved.push({...article,importFileId:id});
 return {ctx,saved,props,files,triggers,revokeOwner:()=>owner=false};
}
test('Drive import resumes batches, forces pending and never overwrites reviewed articles',()=>{
 const f=fixture();assert.equal(f.ctx.scheduledDriveImport_().imported,10);assert.equal(f.ctx.scheduledDriveImport_().imported,10);assert.equal(f.ctx.scheduledDriveImport_().imported,5);
 assert.equal(f.saved.length,25);assert.ok(f.saved.every(a=>a.status==='pending'));assert.equal(f.saved[0].title,'Robot 0');assert.equal(f.saved[0].category,'Cơ khí');assert.ok(!f.saved[0].html.includes('METADATA'));
 f.saved[0].status='published';f.saved[1].status='rejected';f.ctx.scheduledDriveImport_();assert.equal(f.saved.length,25);assert.equal(f.saved[0].status,'published');assert.equal(f.saved[1].status,'rejected');
});
test('Drive import deduplicates URLs and isolates oversize files',()=>{
 const f=fixture(3);f.saved.push({sourceUrl:'https://example.com/0',status:'draft'});f.files[1].getSize=()=>2000000;
 const result=f.ctx.scheduledDriveImport_();assert.equal(result.imported,1);assert.equal(result.errors,1);assert.equal(f.saved.length,2);assert.equal(f.saved[1].title,'Robot 2');
});
test('Drive importer installation is owner only and replaces its own timer',()=>{
 const f=fixture(0);f.ctx.installDriveImport();f.ctx.installDriveImport();assert.equal(f.triggers.length,1);f.revokeOwner();for(const name of ['installDriveImport','importDriveNow','stopDriveImport'])assert.throws(()=>f.ctx[name](),/Chỉ chạy/);
});
