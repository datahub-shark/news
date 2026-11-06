/** Robot Ideas. Set ADMIN_EMAIL in Script Properties, then run setup_(). */
const CATEGORIES_ = ['Robot di động','Thị giác máy','Điều khiển','Cơ khí','AI & ROS','Khác'];
function properties_(){return PropertiesService.getScriptProperties();}
function adminEmail_(){const value=String(properties_().getProperty('ADMIN_EMAIL')||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw Error('Chưa cấu hình ADMIN_EMAIL.');return value;}
function setup_(){
 adminEmail_();const props=properties_();let id=props.getProperty('SHEET_ID');
 if(!id){const ss=SpreadsheetApp.create('Robot Ideas · Private database');id=ss.getId();props.setProperty('SHEET_ID',id);}
 const ss=SpreadsheetApp.openById(id);
 [['Articles',['id','json']],['Sources',['id','name','feedUrl','enabled']],['Audit',['time','action','articleId']]].forEach(([name,headers])=>{let sh=ss.getSheetByName(name);if(!sh){sh=ss.insertSheet(name);sh.appendRow(headers);sh.setFrozenRows(1);}});
 // Do not enable sharing on this spreadsheet or its Drive folder.
 console.log('Database: '+ss.getUrl());
}
function sheet_(name){const id=properties_().getProperty('SHEET_ID');if(!id)throw Error('Chạy setup() trước.');const sh=SpreadsheetApp.openById(id).getSheetByName(name);if(!sh)throw Error('Thiếu bảng '+name);return sh;}
function text_(value){const s=String(value==null?'':value);return /^[\s\u0000-\u001f]*[=+@-]/.test(s)||s.startsWith("'")?"'"+s:s;}
function rows_(){const sh=sheet_('Articles');return sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,2).getValues().map((r,i)=>({row:i+2,article:JSON.parse(r[1])}));}
function json_(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
function doGet(e){if(e&&e.parameter&&e.parameter.view==='admin')return HtmlService.createHtmlOutputFromFile('Admin').setTitle('Robot Ideas · Biên tập');try{return json_({ok:true,articles:rows_().map(r=>r.article).filter(a=>a.status==='published').map(a=>({id:a.id,title:a.title,summary:a.summary,content:a.content,category:a.category,tags:a.tags,robotIdea:a.robotIdea,sourceName:a.sourceName,sourceUrl:a.sourceUrl,publishedAt:a.publishedAt})).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt))});}catch(e){console.error(e);return json_({ok:false,error:'Thư viện chưa sẵn sàng.'});}}
function digest_(value){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value));}
function random_(){return Utilities.getUuid()+Utilities.getUuid();}
function locked_(fn){const lock=LockService.getScriptLock();lock.waitLock(10000);try{return fn();}finally{lock.releaseLock();}}
function requireSession_(token){if(typeof token!=='string'||token.length>200||!CacheService.getScriptCache().get('session:'+digest_(token)))throw Error('Phiên đăng nhập hết hạn. Đăng nhập lại.');}
/** Only public admin entry point; every data operation requires a server session. */
function adminApi(action,payload){payload=payload||{};try{
 if(action==='requestCode')return locked_(()=>{
  const email=adminEmail_();const cache=CacheService.getScriptCache();if(cache.get('otpCooldown'))throw Error('Vui lòng chờ 60 giây trước khi gửi lại.');
  const raw=random_();const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,raw);const code=String(((bytes[0]&255)*65536+(bytes[1]&255)*256+(bytes[2]&255))%1000000).padStart(6,'0');
  const day=new Date().toISOString().slice(0,10);const dailyKey='otpSent:'+day;const sent=Number(properties_().getProperty(dailyKey)||0);if(sent>=20)throw Error('Đã đạt giới hạn 20 email đăng nhập hôm nay.');
  const salt=random_();cache.put('otp',JSON.stringify({hash:digest_(salt+code),salt,attempts:0,expiresAt:Date.now()+600000}),600);cache.put('otpCooldown','1',60);properties_().setProperty(dailyKey,String(sent+1));
  MailApp.sendEmail(email,'Robot Ideas · Mã đăng nhập','Mã đăng nhập: '+code+'\nCó hiệu lực 10 phút. Không chia sẻ mã này.');return {ok:true};
 });
 if(action==='login')return locked_(()=>{const cache=CacheService.getScriptCache();const raw=cache.get('otp');if(!raw)throw Error('Mã hết hạn. Yêu cầu mã mới.');const otp=JSON.parse(raw);if(Date.now()>otp.expiresAt){cache.remove('otp');throw Error('Mã hết hạn. Yêu cầu mã mới.');}otp.attempts++;if(otp.attempts>5){cache.remove('otp');throw Error('Vượt số lần thử. Yêu cầu mã mới.');}cache.put('otp',JSON.stringify(otp),Math.max(1,Math.ceil((otp.expiresAt-Date.now())/1000)));if(digest_(otp.salt+String(payload.code||''))!==otp.hash)throw Error('Mã không đúng.');cache.remove('otp');const token=random_();cache.put('session:'+digest_(token),'admin',3600);return {ok:true,token};});
 requireSession_(payload.token);
 if(action==='logout'){CacheService.getScriptCache().remove('session:'+digest_(payload.token));return {ok:true};}
 if(action==='list')return {ok:true,articles:rows_().map(r=>r.article).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))};
 if(action==='save')return locked_(()=>save_(payload));
 if(action==='importFeeds'){const count=importFeeds_();return {ok:true,count};}
 throw Error('Thao tác không hợp lệ.');
 }catch(e){return {ok:false,error:e.message};}}
function clean_(value,max){if(typeof value!=='string')return '';return value.trim().slice(0,max);}
function https_(value){const s=clean_(value,2000);if(s&&!/^https:\/\/[^\s/@]+(?:[/?#][^\s]*)?$/i.test(s))throw Error('Nguồn phải là URL HTTPS hợp lệ.');return s;}
function save_(payload){
 const input=payload.article||{};const existing=input.id?rows_().find(r=>r.article.id===input.id):null;if(input.id&&!existing)throw Error('Bài không tồn tại.');
 if(existing&&input.version!==existing.article.version)throw Error('Bài đã thay đổi ở phiên khác. Tải lại trước khi sửa.');
 const status=input.status;if(!['draft','pending','published','rejected'].includes(status))throw Error('Trạng thái không hợp lệ.');
 const title=clean_(input.title,240),content=clean_(input.content,40000),summary=clean_(input.summary,1000);if(!title)throw Error('Nhập tiêu đề.');if(status==='published'&&(!content||!summary))throw Error('Bài công khai cần nội dung và tóm tắt.');
 const now=new Date().toISOString();const article={id:existing?input.id:Utilities.getUuid(),title,summary,content,category:CATEGORIES_.includes(input.category)?input.category:'Khác',tags:clean_(input.tags,500),robotIdea:clean_(input.robotIdea,5000),sourceName:clean_(input.sourceName,200),sourceUrl:https_(input.sourceUrl),status,version:existing?existing.article.version+1:1,createdAt:existing?existing.article.createdAt:now,updatedAt:now,publishedAt:status==='published'?(existing&&existing.article.publishedAt||now):null};
 if(article.sourceUrl&&rows_().some(r=>r.article.id!==article.id&&r.article.sourceUrl===article.sourceUrl))throw Error('URL nguồn đã có trong thư viện.');
 if(existing)sheet_('Articles').getRange(existing.row,1,1,2).setValues([[text_(article.id),JSON.stringify(article)]]);else sheet_('Articles').appendRow([text_(article.id),JSON.stringify(article)]);
 sheet_('Audit').appendRow([now,status,text_(article.id)]);return {ok:true,article};
}
function strip_(html){return String(html||'').replace(/<[^>]*>/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();}
/** Reads only configured feeds. Imports are always drafts, never auto-published. */
function importFeeds_(){return locked_(()=>{
 const sh=sheet_('Sources');if(sh.getLastRow()<2)return 0;const feeds=sh.getRange(2,1,sh.getLastRow()-1,4).getValues().filter(r=>String(r[3]).toLowerCase()==='true').slice(0,5);let count=0;
 for(const row of feeds){try{const url=https_(row[2]);if(!url)continue;const response=UrlFetchApp.fetch(url,{muteHttpExceptions:true,followRedirects:false});if(response.getResponseCode()!==200)continue;const xml=response.getContentText();if(xml.length>1000000)continue;const root=XmlService.parse(xml).getRootElement();const ns=root.getNamespace();const channel=root.getChild('channel');const entries=channel?channel.getChildren('item'):root.getChildren('entry',ns);
 for(const item of entries.slice(0,5)){const n=channel?undefined:ns;const get=name=>{const child=item.getChild(name,n);return child?child.getText():''};const links=item.getChildren('link',n);const link=channel?get('link'):(links.find(l=>!l.getAttribute('rel')||l.getAttribute('rel').getValue()==='alternate')?.getAttribute('href')?.getValue()||'');if(!link||rows_().some(r=>r.article.sourceUrl===link))continue;
 save_({article:{title:strip_(get('title'))||'Chưa có tiêu đề',summary:strip_(get('description')||get('summary')).slice(0,1000),content:'',sourceName:String(row[1]),sourceUrl:link,category:'Khác',status:'draft'}});count++;
 }}catch(e){console.warn('Không nhập được nguồn '+String(row[0])+': '+e.message);}}
 return count;
});}
function scheduledImport_(){return importFeeds_();}
function installImportTrigger_(){ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='scheduledImport_').forEach(t=>ScriptApp.deleteTrigger(t));ScriptApp.newTrigger('scheduledImport_').timeBased().everyHours(6).create();}
