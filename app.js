const categories=['Tất cả','Robot di động','Thị giác máy','Điều khiển','Cơ khí','AI & ROS','Khác'];
const PUBLISHED_CACHE_KEY='robot_ideas_published_cache_v1';
const ARTICLE_BODY_CACHE_PREFIX='robot_ideas_article_html_v1:';
let articles=[],selected='Tất cả',visibleCount=18,searchTimer;
const searchText=new WeakMap();
const prefetchedIds=new Set();
const inFlightPrefetches=new Map();
const $=id=>document.getElementById(id);
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el}
function indexArticles(list){for(const a of list)searchText.set(a,`${a.title||''} ${a.summary||''} ${a.tags||''}`.toLocaleLowerCase('vi'));}
function readPublishedCache(){try{const raw=localStorage.getItem(PUBLISHED_CACHE_KEY);if(!raw)return null;const parsed=JSON.parse(raw);if(parsed&&Array.isArray(parsed.articles)&&parsed.articles.length)return parsed.articles;}catch{}return null;}
function writePublishedCache(list){try{localStorage.setItem(PUBLISHED_CACHE_KEY,JSON.stringify({savedAt:Date.now(),articles:list}));}catch{}}
function readCachedArticleBody(id,stamp){try{const raw=sessionStorage.getItem(ARTICLE_BODY_CACHE_PREFIX+id)||localStorage.getItem(ARTICLE_BODY_CACHE_PREFIX+id);if(!raw)return null;const parsed=JSON.parse(raw);if(parsed&&typeof parsed.html==='string'&&(!stamp||!parsed.stamp||parsed.stamp===stamp))return parsed;}catch{}return null;}
function writeCachedArticleBody(id,article){if(!id||!article||typeof article.html!=='string')return;const payload=JSON.stringify({savedAt:Date.now(),stamp:article.publishedAt||article.updatedAt||'',article});try{sessionStorage.setItem(ARTICLE_BODY_CACHE_PREFIX+id,payload);}catch{}try{if(payload.length<=180000)localStorage.setItem(ARTICLE_BODY_CACHE_PREFIX+id,payload);}catch{}}
function prefetchArticle(a){
 const api=window.NEWS_CONFIG?.apiUrl;if(!api||!a?.id||prefetchedIds.has(a.id)||inFlightPrefetches.has(a.id))return;
 const stamp=a.publishedAt||a.updatedAt||'';
 if(readCachedArticleBody(a.id,stamp)){prefetchedIds.add(a.id);return;}
 try{const url=new URL(api);if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!url.pathname.endsWith('/exec'))return;}catch{return;}
 const p=fetch(`${api}?action=article&id=${encodeURIComponent(a.id)}`,{redirect:'follow'}).then(r=>r.ok?r.json():null).then(d=>{if(d?.ok&&d.article){prefetchedIds.add(a.id);writeCachedArticleBody(a.id,d.article);}}).catch(()=>{}).finally(()=>inFlightPrefetches.delete(a.id));
 inFlightPrefetches.set(a.id,p);
}
function render(){
 if(!$('filters').children.length)$('filters').replaceChildren(...categories.map(c=>{const b=node('button',c);b.type='button';b.onclick=()=>{selected=c;visibleCount=18;render()};return b}));
 for(const b of $('filters').children){b.classList.toggle('active',b.textContent===selected);b.setAttribute('aria-pressed',String(b.textContent===selected));}
 const q=$('search').value.toLocaleLowerCase('vi');const list=articles.filter(a=>(selected==='Tất cả'||a.category===selected)&&(searchText.get(a)||'').includes(q));
 $('count').textContent=`${list.length} bài viết`;if(articles.length)$('status').textContent=list.length?'':'Chưa có bài phù hợp. Thử chủ đề hoặc từ khóa khác.';
 $('articles').replaceChildren(...list.slice(0,visibleCount).map((a,i)=>{const card=node('article',undefined,'card'),articleUrl=`article.html?id=${encodeURIComponent(a.id)}`;const warm=()=>prefetchArticle(a);card.addEventListener('pointerenter',warm,{passive:true,once:true});card.addEventListener('touchstart',warm,{passive:true,once:true});const art=node('a',undefined,'card-art');art.href=articleUrl;art.target='_blank';art.rel='noopener noreferrer';art.setAttribute('aria-label',a.title);if(a.coverImage){art.classList.add('has-cover');const img=document.createElement('img');img.src=a.coverImage;img.alt=a.title;img.loading=i<3?'eager':'lazy';img.decoding='async';img.width=600;img.height=370;art.append(img,node('span',a.category,'art-label'));}else{art.style.background=['#e5ecdf','#e8e7db','#dfe9e8'][i%3];art.append(node('span',['⌘','◎','⚙'][i%3],'glyph'),node('span',a.category,'art-label'));}const body=node('div',undefined,'card-body');const titleLink=node('a',a.title);titleLink.href=articleUrl;titleLink.target='_blank';titleLink.rel='noopener noreferrer';titleLink.addEventListener('focus',warm,{passive:true,once:true});const h3=node('h3');h3.append(titleLink);body.append(node('span',a.category,'tag'),h3,node('p',a.summary));const meta=node('div',undefined,'card-meta');meta.append(node('span',a.sourceName||'Bài biên tập'),node('span','✓ Đã duyệt','status-badge'));const b=node('a','Đọc bài ↗','read');b.href=articleUrl;b.target='_blank';b.rel='noopener noreferrer';b.addEventListener('focus',warm,{passive:true,once:true});meta.append(b);body.append(meta);card.append(art,body);return card}));
 const more=$('loadMore');more.hidden=list.length<=visibleCount;more.textContent='Xem thêm bài viết ('+Math.max(0,list.length-visibleCount)+')';
}
$('closeReader').onclick=()=>$('reader').close();$('loadMore').onclick=()=>{visibleCount+=18;render()};$('search').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{visibleCount=18;render()},120)};$('year').textContent=new Date().getFullYear();render();
async function load(){
 const api=window.NEWS_CONFIG?.apiUrl;if(!api){$('status').textContent='Thư viện đang được thiết lập. Kết nối Google Apps Script trong config.js để hiển thị những bài đã được duyệt.';return}
 const cached=readPublishedCache();
 if(cached){articles=cached;indexArticles(articles);$('status').textContent='';render();}
 try{
  const url=new URL(api);if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!url.pathname.endsWith('/exec'))throw Error('URL Google Apps Script không hợp lệ.');
  const response=await fetch(api+'?action=published',{redirect:'follow'});if(!response.ok)throw Error('Không tải được dữ liệu.');
  const data=await response.json();if(!data.ok||!Array.isArray(data.articles))throw Error(data.error||'Dữ liệu không hợp lệ.');
  articles=data.articles;indexArticles(articles);writePublishedCache(articles);
  $('status').textContent=articles.length?'':'Chưa có bài được công khai. Bài đang chờ duyệt sẽ không xuất hiện ở đây.';
  render();
 }catch(e){
  if(!cached){articles=[];render();$('status').textContent='Không thể kết nối thư viện. '+e.message;}
 }
}
load();
