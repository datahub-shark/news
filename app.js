const categories=['Tất cả','Robot di động','Thị giác máy','Điều khiển','Cơ khí','AI & ROS','Khác'];
let articles=[],selected='Tất cả';
const $=id=>document.getElementById(id);
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el}
function safeLink(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:''}catch{return ''}}
function render(){
 $('filters').replaceChildren(...categories.map(c=>{const b=node('button',c,c===selected?'active':'');b.type='button';b.setAttribute('aria-pressed',String(c===selected));b.onclick=()=>{selected=c;render()};return b}));
 const q=$('search').value.toLocaleLowerCase('vi');const list=articles.filter(a=>(selected==='Tất cả'||a.category===selected)&&`${a.title} ${a.summary} ${a.tags}`.toLocaleLowerCase('vi').includes(q));
 $('count').textContent=`${list.length} bài viết`;if(articles.length)$('status').textContent=list.length?'':'Chưa có bài phù hợp. Thử chủ đề hoặc từ khóa khác.';
 $('articles').replaceChildren(...list.map((a,i)=>{const card=node('article',undefined,'card'),art=node('div',undefined,'card-art');art.style.background=['#e5ecdf','#e8e7db','#dfe9e8'][i%3];art.append(node('span',['⌘','◎','⚙'][i%3],'glyph'),node('span',a.category,'art-label'));const body=node('div',undefined,'card-body');const titleLink=node('a',a.title);titleLink.href=`article.html?id=${encodeURIComponent(a.id)}`;const h3=node('h3');h3.append(titleLink);body.append(node('span',a.category,'tag'),h3,node('p',a.summary));const meta=node('div',undefined,'card-meta');meta.append(node('span',a.sourceName||'Bài biên tập'),node('span','✓ Đã duyệt','status-badge'));const b=node('a','Đọc bài ↗','read');b.href=`article.html?id=${encodeURIComponent(a.id)}`;meta.append(b);body.append(meta);card.append(art,body);return card}));
}
let readerRequest=0;
async function openArticle(a){
 const request=++readerRequest;const content=$('readerContent');content.replaceChildren(node('span',a.category,'tag'),node('h2',a.title),node('p',a.summary));const state=node('p','Đang tải nội dung…');content.append(state);$('reader').showModal();
 try{let html;if(a.content!==undefined){const p=node('p',a.content);html=p.outerHTML;}else{const response=await fetch(window.NEWS_CONFIG.apiUrl+'?action=article&id='+encodeURIComponent(a.id)+'&t='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('Không tải được nội dung.');const data=await response.json();if(!data.ok)throw Error(data.error||'Bài chưa công khai.');html=data.article.html;}
 if(request!==readerRequest||!$('reader').open)return;state.replaceWith(articleFrame(html,a.sourceUrl));if(a.robotIdea)content.append(node('h3','Gợi ý phát triển robot'),node('p',a.robotIdea));const url=safeLink(a.sourceUrl);if(url){const link=node('a','Đọc nguồn gốc · '+(a.sourceName||new URL(url).hostname)+' ↗');link.href=url;link.target='_blank';link.rel='noopener noreferrer';content.append(link);}
 }catch(e){if(request===readerRequest)state.textContent=e.message;}
}
$('closeReader').onclick=()=>$('reader').close();$('search').oninput=render;$('year').textContent=new Date().getFullYear();render();
async function load(){const api=window.NEWS_CONFIG?.apiUrl;if(!api){$('status').textContent='Thư viện đang được thiết lập. Kết nối Google Apps Script trong config.js để hiển thị những bài đã được duyệt.';return}try{const url=new URL(api);if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!url.pathname.endsWith('/exec'))throw Error('URL Google Apps Script không hợp lệ.');const response=await fetch(api+'?action=published',{redirect:'follow'});if(!response.ok)throw Error('Không tải được dữ liệu.');const data=await response.json();if(!data.ok||!Array.isArray(data.articles))throw Error(data.error||'Dữ liệu không hợp lệ.');articles=data.articles;$('status').textContent=articles.length?'':'Chưa có bài được công khai. Bài đang chờ duyệt sẽ không xuất hiện ở đây.';render()}catch(e){articles=[];render();$('status').textContent='Không thể kết nối thư viện. '+e.message}}
load();
