const {test,afterEach}=require('node:test');
const openWindows=[];afterEach(()=>{openWindows.splice(0).forEach(w=>w.close())});
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture(count=3,supported=true){
 const dom=new JSDOM(fs.readFileSync('admin.html','utf8'),{url:'https://example.com/admin.html',runScripts:'outside-only'}),w=dom.window,d=w.document;
 w.confirm=()=>true;w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 const articles=Array.from({length:count},(_,i)=>({id:String(i),title:i===0?'<img src=x onerror=alert(1)> Robot '+i:'Robot '+i,category:'Cơ khí',sourceName:'Nguồn thử',status:i===1?'published':'pending',updatedAt:'2026-11-07',coverImage:i===0?'https://example.com/cover.jpg':i===1?'javascript:alert(1)':''}));
 let playlists=[{id:'p',name:'Cơ cấu',description:'Dự án robot',articleIds:['0','1'],version:1}],counter=0;const calls=[];
 w.google={script:{run:{withSuccessHandler(success){return {withFailureHandler(failure){return {adminApi(action,payload){calls.push({action,payload});try{
  let result={ok:true};if(action==='login')result.token='test-session';
  if(action==='list')result={ok:true,apiVersion:2,articles,...(supported?{playlists,playlistVersion:1}:{})};
  if(action==='savePlaylist'){const input=payload.playlist,index=playlists.findIndex(p=>p.id===input.id),p={...input,id:input.id||'new-'+(++counter),version:(input.version||0)+1};if(index<0)playlists.push(p);else playlists[index]=p;result.playlist=p;}
  if(action==='deletePlaylist')playlists=playlists.filter(p=>p.id!==payload.id);
  if(action==='setArticlePlaylists'){playlists=playlists.map(p=>({...p,articleIds:payload.playlistIds.includes(p.id)?[...new Set([...p.articleIds,payload.articleId])]:p.articleIds.filter(id=>id!==payload.articleId),version:p.version+1}));result.playlists=playlists;}
  queueMicrotask(()=>success(JSON.parse(JSON.stringify(result))));
 }catch(e){failure(e)}}}}}}}}};
 w.eval(fs.readFileSync('admin.js','utf8'));d.getElementById('loginForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
 openWindows.push(w);return {dom,w,d,articles,calls,getPlaylists:()=>playlists};
}
test('admin thumbnails load lazily, reject unsafe URLs, recover from broken images and keep titles as text',async()=>{
 const {dom,w,d}=await fixture();d.querySelector('[data-view="articles"]').click();
 const rows=d.querySelectorAll('#list tr');assert.equal(rows.length,3);const img=rows[0].querySelector('.article-thumbnail img');assert.equal(img.getAttribute('src'),'https://example.com/cover.jpg');assert.equal(img.loading,'lazy');assert.equal(img.referrerPolicy,'no-referrer');
 assert.equal(rows[1].querySelector('.article-thumbnail img'),null);assert.equal(rows[0].querySelector('.title-button img'),null);assert.match(rows[0].querySelector('.title-button').textContent,/<img/);
 img.dispatchEvent(new w.Event('error'));assert.equal(rows[0].querySelector('.article-thumbnail img'),null);assert.equal(rows[0].querySelector('.article-thumbnail').classList.contains('missing-cover'),true);dom.window.close();
});
test('create and rename playlist, filter its ordered articles, reorder and remove membership without changing status',async()=>{
 const f=await fixture(),{dom,w,d}=f;d.querySelector('[data-view="playlists"]').click();assert.equal(d.getElementById('viewPlaylists').hidden,false);assert.equal(d.querySelectorAll('.playlist-card').length,1);
 d.getElementById('newPlaylist').click();d.getElementById('playlistName').value='SLAM';d.getElementById('playlistDescription').value='Ý tưởng cần thử';d.getElementById('playlistForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();assert.equal(f.getPlaylists().length,2);
 d.querySelector('.playlist-card-open').click();assert.equal(d.getElementById('playlistFilter').value,'p');assert.deepEqual([...d.querySelectorAll('#list tr')].map(row=>row.dataset.articleId),['0','1']);
 d.querySelector('#list button[aria-label^="Đưa xuống:"]').click();await tick();assert.deepEqual([...d.querySelectorAll('#list tr')].map(row=>row.dataset.articleId),['1','0']);assert.equal(d.querySelector('#list button[aria-label^="Đưa lên:"]').disabled,true);
 d.getElementById('editActivePlaylist').click();d.getElementById('playlistName').value='Cơ cấu robot';d.getElementById('playlistForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();assert.match(d.getElementById('articleListTitle').textContent,/Cơ cấu robot/);
 d.querySelector('#list button[aria-label^="Gỡ khỏi playlist:"]').click();await tick();assert.equal(d.querySelectorAll('#list tr').length,1);assert.equal(f.articles[1].status,'published');assert.equal(f.calls.some(c=>c.action==='save'),false);dom.window.close();
});
test('select across pages and add in bulk, then classify one article into multiple playlists',async()=>{
 const f=await fixture(55),{dom,w,d}=f;d.querySelector('[data-view="articles"]').click();const select=row=>{const c=row.querySelector('input[type=checkbox]');c.checked=true;c.dispatchEvent(new w.Event('change'))};
 select(d.querySelector('#list tr'));d.querySelector('#listPager button:last-child').click();select(d.querySelector('#list tr'));assert.match(d.getElementById('selectedCount').textContent,/2 bài/);
 d.getElementById('bulkPlaylist').value='p';d.getElementById('bulkAddPlaylist').click();await tick();assert(f.getPlaylists()[0].articleIds.includes('40'));assert.equal(d.getElementById('bulkPlaylistBar').hidden,true);
 d.querySelector('[data-view="playlists"]').click();d.getElementById('newPlaylist').click();d.getElementById('playlistName').value='Thử nghiệm';d.getElementById('playlistForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
 d.querySelector('[data-view="articles"]').click();const assignedId=d.querySelector('#list tr').dataset.articleId;d.querySelector('#list .playlist-action').click();const checks=d.querySelectorAll('#articlePlaylistChoices input');assert.equal(checks.length,2);checks.forEach(c=>c.checked=true);d.getElementById('articlePlaylistsForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();assert(f.getPlaylists().every(p=>p.articleIds.includes(assignedId)));
 d.getElementById('playlistFilter').value='unassigned';d.getElementById('playlistFilter').dispatchEvent(new w.Event('change'));assert.equal([...d.querySelectorAll('#list tr')].some(row=>row.dataset.articleId==='0'),false);dom.window.close();
});
test('playlist deletion retains articles, logout removes private playlist content, and old backends fail with clear upgrade guidance',async()=>{
 const f=await fixture(),{dom,d}=f;d.querySelector('[data-view="playlists"]').click();d.querySelector('.playlist-card-actions button').click();d.getElementById('deletePlaylist').click();await tick();assert.equal(f.getPlaylists().length,0);assert.equal(f.articles.length,3);
 d.getElementById('logout').click();await tick();assert.equal(d.getElementById('playlistCards').children.length,0);assert.equal(d.getElementById('articlePlaylistChoices').children.length,0);assert.equal(d.getElementById('playlistName').value,'');dom.window.close();
 const old=await fixture(3,false);old.d.querySelector('[data-view="playlists"]').click();old.d.getElementById('newPlaylist').click();assert.match(old.d.getElementById('notice').textContent,/Backend chưa hỗ trợ playlist/);assert.equal(old.d.getElementById('playlistEditorDialog').open,false);old.dom.window.close();
});
