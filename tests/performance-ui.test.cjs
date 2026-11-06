const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('public library bounds initial cards and searches the full library without rebuilding filters',async()=>{
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.com/',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 w.NEWS_CONFIG={apiUrl:'https://script.google.com/macros/s/test/exec'};
 const articles=Array.from({length:1000},(_,i)=>({id:String(i),title:'Robot '+i,summary:'Summary',category:i===999?'Cơ khí':'AI & ROS',tags:''}));
 w.fetch=async()=>({ok:true,json:async()=>({ok:true,articles})});
 w.eval(fs.readFileSync('app.js','utf8'));await tick();
 assert.equal(d.querySelectorAll('.card').length,18);
 const filter=d.querySelector('#filters button');
 d.getElementById('loadMore').click();assert.equal(d.querySelectorAll('.card').length,36);
 d.getElementById('search').value='Robot 999';d.getElementById('search').dispatchEvent(new w.Event('input'));
 await new Promise(resolve=>w.setTimeout(resolve,160));
 assert.equal(d.querySelectorAll('.card').length,1);
 assert.match(d.querySelector('.card h3').textContent,/Robot 999/);
 assert.equal(d.getElementById('loadMore').hidden,true);
 assert.equal(d.querySelector('#filters button'),filter);
 dom.window.close();
});

test('admin pagination reaches all rows and resets when searching a large library',async()=>{
 const dom=new JSDOM(fs.readFileSync('admin.html','utf8'),{url:'https://example.com/admin.html',runScripts:'outside-only'});
 const w=dom.window,d=w.document;w.confirm=()=>true;
 const articles=Array.from({length:1000},(_,i)=>({id:String(i),title:'Robot '+i,category:'Cơ khí',status:'draft',updatedAt:'2026-11-06'}));
 w.google={script:{run:{withSuccessHandler(success){return {withFailureHandler(){return {adminApi(action){queueMicrotask(()=>success(action==='list'?{ok:true,apiVersion:2,articles}:{ok:true,token:'test'}));}}}}}}}};
 w.eval(fs.readFileSync('admin.js','utf8'));
 d.getElementById('loginForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
 d.getElementById('seeAll').click();
 assert.equal(d.getElementById('list').children.length,40);
 assert.match(d.getElementById('listPager').textContent,/Trang 1 \/ 25/);
 d.querySelector('#listPager button:last-child').click();
 assert.equal(d.querySelector('#list .title-button').textContent,'Robot 40');
 d.getElementById('articleSearch').value='Robot 999';d.getElementById('articleSearch').dispatchEvent(new w.Event('input'));
 await new Promise(resolve=>w.setTimeout(resolve,160));
 assert.equal(d.getElementById('list').children.length,1);
 assert.match(d.getElementById('list').textContent,/Robot 999/);
 assert.equal(d.getElementById('listPager').hidden,true);
 dom.window.close();
});
