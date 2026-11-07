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
 require('./helpers/admin-account.cjs')(w);w.eval(fs.readFileSync('admin.js','utf8'));
 await tick();
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

test('public library renders instantly from localStorage SWR cache and prefetches article HTML on hover',async()=>{
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.com/',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 w.NEWS_CONFIG={apiUrl:'https://script.google.com/macros/s/test/exec'};
 const cachedArticles=[{id:'a1',title:'Cached Robot',summary:'Fast summary',category:'Cơ khí',tags:'cad',publishedAt:'2026-11-01T00:00:00Z'}];
 w.localStorage.setItem('robot_ideas_published_cache_v1',JSON.stringify({savedAt:Date.now(),articles:cachedArticles}));
 let resolveList;const listPromise=new Promise(r=>{resolveList=r;});
 const fetchedUrls=[];
 w.fetch=async(url)=>{
  fetchedUrls.push(url);
  if(url.includes('action=published'))return listPromise;
  if(url.includes('action=article'))return {ok:true,json:async()=>({ok:true,article:{...cachedArticles[0],html:'<h1>Prefetched Body</h1>'}})};
  return {ok:false};
 };
 w.eval(fs.readFileSync('app.js','utf8'));
 // Immediately rendered from cache before network resolves!
 assert.equal(d.querySelectorAll('.card').length,1);
 assert.equal(d.querySelector('.card h3').textContent,'Cached Robot');
 // Hover over card triggers background prefetch
 d.querySelector('.card').dispatchEvent(new w.Event('pointerenter'));
 await tick();
 assert.ok(fetchedUrls.some(u=>u.includes('action=article&id=a1')));
 const cachedBody=JSON.parse(w.sessionStorage.getItem('robot_ideas_article_html_v1:a1'));
 assert.equal(cachedBody.article.html,'<h1>Prefetched Body</h1>');
 // Resolve network with updated list
 resolveList({ok:true,json:async()=>({ok:true,articles:[...cachedArticles,{id:'a2',title:'Fresh Robot',summary:'New',category:'AI & ROS',tags:''}]})});
 await tick();await tick();
 assert.equal(d.querySelectorAll('.card').length,2);
 dom.window.close();
});

test('article.html renders cached metadata and prefetched HTML immediately before network completes',async()=>{
 const dom=new JSDOM(fs.readFileSync('article.html','utf8'),{url:'https://datahub-shark.github.io/news/article.html?id=a1',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 w.NEWS_CONFIG={apiUrl:'https://script.google.com/macros/s/test/exec'};
 const article={id:'a1',title:'Instant Robot',category:'Cơ khí',summary:'Tóm tắt tức thì',robotIdea:'Ý tưởng tức thì',publishedAt:'2026-11-07T00:00:00Z',html:'<p>Nội dung từ bộ nhớ đệm</p>'};
 w.localStorage.setItem('robot_ideas_published_cache_v1',JSON.stringify({savedAt:Date.now(),articles:[article]}));
 w.sessionStorage.setItem('robot_ideas_article_html_v1:a1',JSON.stringify({savedAt:Date.now(),stamp:article.publishedAt,article}));
 let resolveNet;w.fetch=()=>new Promise(r=>{resolveNet=r;});
 for(const f of ['vendor/purify.min.js','html-viewer.js'])w.eval(fs.readFileSync(f,'utf8'));
 const inlineScripts=[...d.querySelectorAll('script:not([src])')];
 w.eval(inlineScripts.at(-1).textContent);
 // Rendered at 0ms while fetch is still pending
 assert.equal(d.getElementById('loadingBox').hidden,true);
 assert.equal(d.getElementById('articleContainer').hidden,false);
 assert.equal(d.getElementById('articleTitle').textContent,'Instant Robot');
 assert.ok(d.querySelector('#articleFrameContainer iframe'));
 resolveNet({ok:true,json:async()=>({ok:true,article})});
 await tick();
 dom.window.close();
});
