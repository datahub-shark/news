/** Robot Ideas / linkS. Set ADMIN_EMAIL and GOOGLE_CLIENT_ID in Script Properties, then run setup(). */
const CATEGORIES_ = ['Robot di động','Thị giác máy','Điều khiển','Cơ khí','AI & ROS','Khác'];
// Public wrappers appear in the editor Run menu. Never trust execute-as-owner alone.
function requireOwnerExecution_(){
 const active=String(Session.getActiveUser().getEmail()||'').trim().toLowerCase();
 const effective=String(Session.getEffectiveUser().getEmail()||'').trim().toLowerCase();
 if(!active||!effective||active!==effective)throw Error('Chỉ chạy chức năng này trong Apps Script bằng tài khoản sở hữu dự án.');
}
function setup(){requireOwnerExecution_();return locked_(()=>setup_());}
function installImportTrigger(){requireOwnerExecution_();return locked_(()=>installImportTrigger_());}
function properties_(){return PropertiesService.getScriptProperties();}
function adminEmail_(){const value=String(properties_().getProperty('ADMIN_EMAIL')||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw Error('Chưa cấu hình ADMIN_EMAIL.');return value;}
function setup_(){
 adminEmail_();const props=properties_();let id=props.getProperty('SHEET_ID');
 if(!id){const ss=SpreadsheetApp.create('Robot Ideas · Private database');id=ss.getId();props.setProperty('SHEET_ID',id);}
 const ss=SpreadsheetApp.openById(id);
 ensureFolder_();ensureProjectsFolder_();
 [['Articles',['id','json']],['Playlists',['id','json']],['Users',['id','json']],['UserSessions',['hash','json']],['Projects',['id','json']],['Sources',['id','name','feedUrl','enabled']],['Audit',['time','action','articleId']]].forEach(([name,headers])=>{let sh=ss.getSheetByName(name);if(!sh){sh=ss.insertSheet(name);sh.appendRow(headers);sh.setFrozenRows(1);}});
 bootstrapOwner_();
 // Do not enable sharing on this spreadsheet or its Drive folder.
 console.log('Database: '+ss.getUrl());
}
function sheet_(name){const id=properties_().getProperty('SHEET_ID');if(!id)throw Error('Chạy setup() trước.');const sh=SpreadsheetApp.openById(id).getSheetByName(name);if(!sh)throw Error('Thiếu bảng '+name);return sh;}
function text_(value){const s=String(value==null?'':value);return /^[\s\u0000-\u001f]*[=+@-]/.test(s)||s.startsWith("'")?"'"+s:s;}
function rows_(){const sh=sheet_('Articles');return sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,2).getValues().map((r,i)=>({row:i+2,article:JSON.parse(r[1])}));}
function json_(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
function doGet(e){const p=e&&e.parameter||{};if(p.view==='admin')return HtmlService.createHtmlOutputFromFile('Admin').setTitle('Robot Ideas · Biên tập');try{
 if(p.action==='authConfig')return json_(authConfig_());
 if(p.action==='article'){const entry=rows_().find(r=>r.article.id===p.id&&r.article.status==='published');if(!entry)return json_({ok:false,error:'Bài không tồn tại hoặc chưa công khai.'});return json_({ok:true,apiVersion:2,article:{...publicArticle_(entry.article),html:readHtml_(entry.article)}});}
 return json_({ok:true,apiVersion:2,articles:rows_().map(r=>r.article).filter(a=>a.status==='published').map(publicArticle_).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt))});
 }catch(e){console.error(e);return json_(p.action==='authConfig'?{ok:false,error:e.message,code:e.code||'AUTH_CONFIG_REQUIRED'}:{ok:false,error:'Không đọc được dữ liệu bài viết.'});}}
function doPost(e){try{const raw=e&&e.postData&&e.postData.contents||'';if(raw.length>800000)throw Error('Yêu cầu quá lớn.');const req=JSON.parse(raw);return json_(adminApi(req.action,req.payload));}catch(e){return json_({ok:false,error:e.message});}}
function publicArticle_(a){return {id:a.id,title:a.title,summary:a.summary,category:a.category,tags:a.tags,coverImage:a.coverImage||'',robotIdea:a.robotIdea,sourceName:a.sourceName,sourceUrl:a.sourceUrl,publishedAt:a.publishedAt};}
function metadata_(a){const {content,html,...meta}=a;return meta;}
function escapeHtml_(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function readHtml_(a){if(a.fileId)return DriveApp.getFileById(a.fileId).getBlob().getDataAsString('UTF-8');return '<p>'+escapeHtml_(a.content).replace(/\n/g,'<br>')+'</p>';}
function ensureFolder_(){const props=properties_();const id=props.getProperty('HTML_FOLDER_ID');if(id)return DriveApp.getFolderById(id);const folder=DriveApp.createFolder('Robot Ideas · Private HTML');folder.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);props.setProperty('HTML_FOLDER_ID',folder.getId());return folder;}
function ensureCoverFolder_(){const props=properties_();const id=props.getProperty('COVER_FOLDER_ID');if(id){try{return DriveApp.getFolderById(id);}catch(e){}}const folder=DriveApp.createFolder('Robot Ideas · Cover Images');try{const access=(DriveApp.Access&&DriveApp.Access.ANYONE_WITH_LINK)?DriveApp.Access.ANYONE_WITH_LINK:DriveApp.Access.PRIVATE;const perm=(DriveApp.Permission&&DriveApp.Permission.VIEW)?DriveApp.Permission.VIEW:DriveApp.Permission.NONE;folder.setSharing(access,perm);}catch(e){}props.setProperty('COVER_FOLDER_ID',folder.getId());return folder;}
function digest_(value){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value));}
function sessionKey_(token){return 'sha256:'+digest_(token);}
function random_(){return Utilities.getUuid()+Utilities.getUuid();}
function locked_(fn){const lock=LockService.getScriptLock();lock.waitLock(10000);try{return fn();}finally{lock.releaseLock();}}
// Accounts and sessions are private server data. Legacy ADMIN_SESSIONS/OTP are never read.
function accountError_(message,code){const e=Error(message);e.code=code;throw e;}
function dataSheet_(name){const id=properties_().getProperty('SHEET_ID');if(!id)throw Error('Chạy setup() trước.');const ss=SpreadsheetApp.openById(id);let sh=ss.getSheetByName(name);if(!sh){sh=ss.insertSheet(name);sh.appendRow([name==='UserSessions'?'hash':'id','json']);sh.setFrozenRows(1);}return sh;}
function dataRows_(name){const sh=dataSheet_(name);return sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,2).getValues().map((r,i)=>({row:i+2,key:String(r[0]),value:JSON.parse(r[1])}));}
function putData_(name,entry,key,value){const row=[text_(key),JSON.stringify(value)],sh=dataSheet_(name);if(entry)sh.getRange(entry.row,1,1,2).setValues([row]);else sh.appendRow(row);}
function email_(value){const email=clean_(value,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Email không hợp lệ.');return email;}
function authConfig_(){const googleClientId=clean_(properties_().getProperty('GOOGLE_CLIENT_ID'),250);if(!/^[a-zA-Z0-9_.-]+\.apps\.googleusercontent\.com$/.test(googleClientId))accountError_('Chưa cấu hình GOOGLE_CLIENT_ID cho đăng nhập Google.','AUTH_CONFIG_REQUIRED');return {ok:true,googleClientId,registrationMode:properties_().getProperty('ALLOW_MEMBER_SIGNUP')==='false'?'invite':'member'};}
function ownerUser_(user){const sub=properties_().getProperty('OWNER_GOOGLE_SUB');return sub?user.sub===sub:user.email===adminEmail_();}
function safeUser_(user){return {id:user.id,email:user.email,name:user.name||'',picture:user.picture||'',role:user.role,active:user.active,version:user.version,owner:ownerUser_(user),createdAt:user.createdAt,lastLoginAt:user.lastLoginAt||''};}
function bootstrapOwner_(){const email=adminEmail_(),entries=dataRows_('Users'),sub=properties_().getProperty('OWNER_GOOGLE_SUB');let entry=sub?entries.find(r=>r.value.sub===sub):entries.find(r=>r.value.email===email);if(entry)return entry;if(sub)accountError_('Không tìm thấy tài khoản chủ sở hữu đã liên kết. Khôi phục bảng Users trước khi đăng nhập.','OWNER_ACCOUNT_MISSING');
 const now=new Date().toISOString(),user={id:Utilities.getUuid(),email,sub:'',name:'',picture:'',role:'admin',active:true,version:1,authVersion:1,createdAt:now,updatedAt:now};putData_('Users',null,user.id,user);return {value:user};}
function googleChallenge_(){authConfig_();const nonce=random_();CacheService.getScriptCache().put('googleNonce:'+digest_(nonce),'1',600);return {ok:true,nonce,expiresAt:Date.now()+600000};}
function verifyGoogleToken_(idToken,nonce){const clientId=authConfig_().googleClientId;if(typeof idToken!=='string'||idToken.length<20||idToken.length>12000)accountError_('Thông tin đăng nhập Google không hợp lệ.','AUTH_INVALID');
 // Google validates the signature. Fail closed on HTTP failures; never decode and trust a browser JWT.
 let response;try{response=UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token='+encodeURIComponent(idToken),{muteHttpExceptions:true,followRedirects:false});}catch(e){accountError_('Dịch vụ xác thực Google tạm thời không phản hồi. Thử lại.','AUTH_UNAVAILABLE');}if(response.getResponseCode()!==200)accountError_('Google không xác nhận được đăng nhập.','AUTH_INVALID');
 let claims;try{claims=JSON.parse(response.getContentText());}catch(e){accountError_('Phản hồi Google không hợp lệ.','AUTH_INVALID');}
 if(claims.aud!==clientId||claims.azp&&claims.azp!==clientId||!['accounts.google.com','https://accounts.google.com'].includes(claims.iss)||!Number.isFinite(Number(claims.exp))||Number(claims.exp)*1000<=Date.now()||!(claims.email_verified===true||claims.email_verified==='true')||typeof claims.sub!=='string'||!/^\d{1,255}$/.test(claims.sub)||claims.nonce!==nonce)accountError_('Thông tin đăng nhập Google không hợp lệ hoặc đã hết hạn.','AUTH_INVALID');
 claims.email=email_(claims.email);return claims;}
function googleLogin_(payload){const nonce=payload.nonce;if(typeof nonce!=='string'||nonce.length<32||nonce.length>200)accountError_('Yêu cầu đăng nhập đã hết hạn.','AUTH_INVALID');
 locked_(()=>{const cache=CacheService.getScriptCache(),key='googleNonce:'+digest_(nonce);if(!cache.get(key))accountError_('Yêu cầu đăng nhập đã dùng hoặc đã hết hạn.','AUTH_INVALID');cache.remove(key);});
 const claims=verifyGoogleToken_(payload.idToken,nonce);return locked_(()=>{
  bootstrapOwner_();const entries=dataRows_('Users');let entry=entries.find(r=>r.value.sub===claims.sub),emailEntry=entries.find(r=>r.value.email===claims.email);
  if(entry&&emailEntry&&entry.value.id!==emailEntry.value.id)accountError_('Email đang gắn với hồ sơ tài khoản khác. Liên hệ quản trị viên.','ACCOUNT_MISMATCH');
  if(emailEntry&&emailEntry.value.sub&&emailEntry.value.sub!==claims.sub)accountError_('Email này đã gắn với một tài khoản Google khác.','ACCOUNT_MISMATCH');
  if(!entry&&emailEntry){
   // An email invitation is bound once to Google's immutable subject. Third-party email claims
   // are not authoritative; use Gmail or a managed Workspace account for invitation binding.
   if(!claims.email.endsWith('@gmail.com')&&!claims.hd)accountError_('Tài khoản được mời cần dùng Gmail hoặc Google Workspace.','ACCOUNT_EMAIL_UNVERIFIED');entry=emailEntry;
  }
  if(!entry&&authConfig_().registrationMode!=='member')accountError_('Tài khoản chưa được quản trị viên cấp quyền.','ACCOUNT_NOT_ALLOWED');
  if(entry&&entry.value.active!==true)accountError_('Tài khoản đã bị vô hiệu hóa.','ACCOUNT_DISABLED');
  const now=new Date().toISOString(),user=entry?{...entry.value}:{id:Utilities.getUuid(),role:'member',active:true,version:1,authVersion:1,createdAt:now};
  user.sub=claims.sub;user.email=claims.email;user.name=clean_(claims.name,150);user.picture=/^https:\/\//.test(claims.picture||'')?clean_(claims.picture,2000):'';user.lastLoginAt=now;user.updatedAt=now;
  if(ownerUser_(user)){user.role='admin';user.active=true;if(!properties_().getProperty('OWNER_GOOGLE_SUB'))properties_().setProperty('OWNER_GOOGLE_SUB',user.sub);}
  putData_('Users',entry,user.id,user);return issueSession_(user);
 });}
function issueSession_(user){if(!user||!user.sub||user.active!==true)throw Error('Tài khoản chưa xác thực.');const now=Date.now(),expiresAt=now+30*86400000,token=random_(),entries=dataRows_('UserSessions'),own=entries.filter(r=>r.value.userId===user.id&&r.value.expiresAt>now).sort((a,b)=>b.value.expiresAt-a.value.expiresAt||b.row-a.row),keep=new Set(own.slice(0,9).map(r=>r.key));
 entries.filter(r=>r.value.expiresAt<=now||r.value.userId===user.id&&!keep.has(r.key)).sort((a,b)=>b.row-a.row).forEach(r=>dataSheet_('UserSessions').deleteRow(r.row));
 putData_('UserSessions',null,sessionKey_(token),{userId:user.id,sub:user.sub,authVersion:user.authVersion,expiresAt});return {ok:true,token,expiresAt,user:safeUser_(user)};}
function requireSession_(token){const session=typeof token==='string'&&token.length>=32&&token.length<=200?dataRows_('UserSessions').find(r=>r.key===sessionKey_(token)):null,user=session&&dataRows_('Users').find(r=>r.value.id===session.value.userId);if(!session||session.value.expiresAt<=Date.now()||!user||user.value.active!==true||!user.value.sub||user.value.sub!==session.value.sub||user.value.authVersion!==session.value.authVersion)accountError_('Phiên đăng nhập hết hạn. Đăng nhập lại.','AUTH_REQUIRED');return {...session.value,user:user.value};}
function requireAdmin_(session){if(!session.user||session.user.role!=='admin')accountError_('Chỉ quản trị viên được thực hiện thao tác này.','FORBIDDEN');}
function adminLocked_(token,fn){return locked_(()=>{requireAdmin_(requireSession_(token));return fn();});}
function saveUser_(input){const entries=dataRows_('Users'),email=email_(input.email),entry=input.id?entries.find(r=>r.value.id===input.id):entries.find(r=>r.value.email===email);if(input.id&&!entry)accountError_('Tài khoản không tồn tại.','NOT_FOUND');if(entry&&entry.value.version!==input.version)accountError_('Tài khoản đã thay đổi. Tải lại danh sách.','CONFLICT');if(entry&&entry.value.email!==email)throw Error('Không đổi email tài khoản đã tạo.');if(!['admin','vip','member'].includes(input.role)||typeof input.active!=='boolean')throw Error('Quyền hoặc trạng thái tài khoản không hợp lệ.');
 if(entry&&ownerUser_(entry.value)&&(input.role!=='admin'||input.active!==true))accountError_('Không thể hạ quyền hoặc khóa chủ sở hữu.','OWNER_PROTECTED');
 const now=new Date().toISOString(),user={...(entry?entry.value:{id:Utilities.getUuid(),email,sub:'',name:'',picture:'',createdAt:now}),role:input.role,active:input.active,version:entry?entry.value.version+1:1,authVersion:entry?(entry.value.authVersion||1)+1:1,updatedAt:now};putData_('Users',entry,user.id,user);return {ok:true,user:safeUser_(user)};}
/** Only public admin entry point; every data operation requires a server session. */
function adminApi(action,payload){payload=payload||{};try{
 if(action==='authConfig')return authConfig_();
 if(action==='googleChallenge')return googleChallenge_();
 if(action==='googleLogin')return googleLogin_(payload);
 if(action==='requestCode'||action==='login')accountError_('Đã chuyển sang đăng nhập bằng tài khoản Google. Tải lại trang.','GOOGLE_LOGIN_REQUIRED');
 // Optional automation credential is explicitly configured, narrowly scoped to article sync.
 // It can never authenticate accounts, projects, users or an interactive admin session.
 const syncKey=properties_().getProperty('SYNC_KEY');if(typeof syncKey==='string'&&syncKey.length>=32&&payload.token===syncKey){if(!['list','get','save'].includes(action))accountError_('Khóa đồng bộ không có quyền này.','FORBIDDEN');if(action==='list')return {ok:true,apiVersion:2,articles:rows_().map(r=>metadata_(r.article))};if(action==='get'){const entry=rows_().find(r=>r.article.id===payload.id);if(!entry)throw Error('Bài không tồn tại.');return {ok:true,article:{...metadata_(entry.article),html:readHtml_(entry.article)}};}return locked_(()=>{if(properties_().getProperty('SYNC_KEY')!==syncKey)accountError_('Khóa đồng bộ đã thay đổi.','AUTH_REQUIRED');const input=payload.article||{},entry=input.id?rows_().find(r=>r.article.id===input.id):null;if(!['draft','pending'].includes(input.status)||entry&&!['draft','pending'].includes(entry.article.status))accountError_('Khóa đồng bộ chỉ lưu bản nháp hoặc bài chờ duyệt.','FORBIDDEN');return save_(payload,null,true);});}
 const session=requireSession_(payload.token);
 if(action==='session')return {ok:true,expiresAt:session.expiresAt,user:safeUser_(session.user)};
 if(action==='logout')return locked_(()=>{const entry=dataRows_('UserSessions').find(r=>r.key===sessionKey_(payload.token));if(entry)dataSheet_('UserSessions').deleteRow(entry.row);return {ok:true};});
 if(action==='projects')return {ok:true,projects:projectRows_().filter(r=>r.value.ownerSub===session.user.sub&&!r.value.deletedAt).map(r=>projectMeta_(r.value)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))};
 if(action==='getProject')return getProject_(payload,session.user);
 if(action==='saveProject')return locked_(()=>saveProject_(payload.project||{},requireSession_(payload.token).user));
 if(action==='deleteProject')return locked_(()=>deleteProject_(payload,requireSession_(payload.token).user));
 requireAdmin_(session);
 if(action==='users')return {ok:true,users:dataRows_('Users').map(r=>safeUser_(r.value)).sort((a,b)=>a.email.localeCompare(b.email))};
 if(action==='saveUser')return adminLocked_(payload.token,()=>saveUser_(payload.user||{}));
 if(action==='list')return {ok:true,apiVersion:2,articles:rows_().map(r=>metadata_(r.article)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),playlists:playlists_().map(r=>r.playlist),playlistVersion:1};
 if(action==='get'){const entry=rows_().find(r=>r.article.id===payload.id);if(!entry)throw Error('Bài không tồn tại.');return {ok:true,article:{...metadata_(entry.article),html:readHtml_(entry.article)}};}
 if(action==='sources')return {ok:true,sources:sources_()};
 if(action==='saveSource')return adminLocked_(payload.token,()=>saveSource_(payload.source||{}));
 if(action==='save')return adminLocked_(payload.token,()=>save_(payload));
 if(action==='savePlaylist')return adminLocked_(payload.token,()=>savePlaylist_(payload.playlist||{}));
 if(action==='deletePlaylist')return adminLocked_(payload.token,()=>deletePlaylist_(payload));
 if(action==='setArticlePlaylists')return adminLocked_(payload.token,()=>setArticlePlaylists_(payload));
 if(action==='importFeeds'){const count=importFeeds_(()=>requireAdmin_(requireSession_(payload.token)));return {ok:true,count};}
 if(action==='shareDrive')return adminLocked_(payload.token,()=>({ok:true,count:shareArticlesFolder_()}));
 throw Error('Thao tác không hợp lệ.');
 }catch(e){return {ok:false,error:e.message,code:e.code||'REQUEST_FAILED'};}}
function ensureProjectsFolder_(){const props=properties_(),id=props.getProperty('PROJECTS_FOLDER_ID'),folder=id?DriveApp.getFolderById(id):DriveApp.createFolder('linkS · Private Projects');folder.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);if(folder.getEditors&&folder.getEditors().length||folder.getViewers&&folder.getViewers().length)throw Error('Thư mục dự án phải riêng tư, không có người được chia sẻ.');if(!id)props.setProperty('PROJECTS_FOLDER_ID',folder.getId());return folder;}
function projectRows_(){return dataRows_('Projects');}
function projectMeta_(p){return {id:p.id,name:p.name,version:p.version,createdAt:p.createdAt,updatedAt:p.updatedAt};}
function ownedProject_(id,user){const entry=projectRows_().find(r=>r.value.id===id&&r.value.ownerSub===user.sub&&!r.value.deletedAt);if(!entry)accountError_('Dự án không tồn tại hoặc bạn không có quyền truy cập.','NOT_FOUND');return entry;}
function projectModel_(input){if(!input||Object.prototype.toString.call(input)!=='[object Object]')throw Error('Mô hình dự án phải là một đối tượng JSON.');let raw;try{raw=JSON.stringify(input);}catch(e){throw Error('Mô hình không phải JSON hợp lệ.');}if(!raw||raw.length>500000)throw Error('Mô hình vượt giới hạn 500.000 ký tự.');let nodes=0;function validate(value,depth){if(++nodes>100000||depth>80)throw Error('Mô hình quá phức tạp.');if(value===null||typeof value==='string'||typeof value==='boolean')return;if(typeof value==='number'&&Number.isFinite(value))return;if(Array.isArray(value)){value.forEach(v=>validate(v,depth+1));return;}if(value&&Object.prototype.toString.call(value)==='[object Object]'){Object.keys(value).forEach(k=>validate(value[k],depth+1));return;}throw Error('Mô hình chứa dữ liệu không phải JSON.');}validate(input,0);const model=JSON.parse(raw);for(const key of ['joints','links','gears','chains','obstacles'])if(!Array.isArray(model[key]))throw Error('Mô hình cần danh sách '+key+'.');return model;}
function getProject_(payload,user){const entry=ownedProject_(payload.id,user),p=entry.value,raw=DriveApp.getFileById(p.fileId).getBlob().getDataAsString('UTF-8');if(raw.length>510000)throw Error('Dữ liệu dự án vượt giới hạn.');const revision=JSON.parse(raw);if(revision.projectId!==p.id||revision.version!==p.version||revision.ownerSub!==user.sub)throw Error('Dữ liệu phiên bản dự án không khớp.');return {ok:true,project:{...projectMeta_(p),model:projectModel_(revision.model)}};}
function saveProject_(input,user){const entry=input.id?ownedProject_(input.id,user):null;if(entry&&entry.value.version!==input.version)accountError_('Dự án đã thay đổi ở phiên khác. Tải lại trước khi lưu.','CONFLICT');const name=clean_(input.name,160);if(!name)throw Error('Nhập tên dự án.');const model=projectModel_(input.model),now=new Date().toISOString(),p={id:entry?entry.value.id:Utilities.getUuid(),ownerSub:user.sub,name,version:entry?entry.value.version+1:1,createdAt:entry?entry.value.createdAt:now,updatedAt:now};const revision=JSON.stringify({schemaVersion:1,projectId:p.id,version:p.version,ownerSub:user.sub,model}),file=ensureProjectsFolder_().createFile(Utilities.newBlob(revision,'application/json',p.id+'-v'+p.version+'.json'));try{file.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);p.fileId=file.getId();putData_('Projects',entry,p.id,p);}catch(e){try{file.setTrashed(true);}catch(cleanupError){console.warn('Project cleanup failed.');}throw e;}return {ok:true,project:{...projectMeta_(p),model}};}
function deleteProject_(payload,user){const entry=ownedProject_(payload.id,user);if(entry.value.version!==payload.version)accountError_('Dự án đã thay đổi. Tải lại trước khi xóa.','CONFLICT');const now=new Date().toISOString(),p={...entry.value,version:entry.value.version+1,deletedAt:now,updatedAt:now};putData_('Projects',entry,p.id,p);return {ok:true};}
function clean_(value,max){if(typeof value!=='string')return '';return value.trim().slice(0,max);}
// Playlists organize private editorial metadata; they never publish or rewrite article HTML.
function playlistSheet_(create){
 const id=properties_().getProperty('SHEET_ID');if(!id)throw Error('Chạy setup() trước.');
 const ss=SpreadsheetApp.openById(id);let sh=ss.getSheetByName('Playlists');
 if(!sh&&create){sh=ss.insertSheet('Playlists');sh.appendRow(['id','json']);sh.setFrozenRows(1);}
 return sh;
}
function playlists_(){
 const sh=playlistSheet_(false);if(!sh||sh.getLastRow()<2)return [];
 return sh.getRange(2,1,sh.getLastRow()-1,2).getValues().map((r,i)=>({row:i+2,playlist:JSON.parse(r[1])}));
}
function playlistConflict_(entry,version){
 if(!entry||entry.playlist.version!==version)throw Error('Playlist đã thay đổi ở phiên khác hoặc không còn tồn tại. Tải lại trước khi sửa.');
}
function savePlaylist_(input){
 const entries=playlists_(),existing=input.id?entries.find(r=>r.playlist.id===input.id):null;
 if(input.id)playlistConflict_(existing,input.version);
 const name=clean_(input.name,100),description=clean_(input.description,500);
 if(!name)throw Error('Nhập tên playlist.');
 if(entries.some(r=>r.playlist.id!==input.id&&r.playlist.name.toLocaleLowerCase('vi')===name.toLocaleLowerCase('vi')))throw Error('Tên playlist này đã có.');
 if(!Array.isArray(input.articleIds)||input.articleIds.length>5000)throw Error('Danh sách bài viết không hợp lệ (tối đa 5.000 bài).');
 const valid=new Set(rows_().map(r=>r.article.id));
 if(input.articleIds.some(id=>typeof id!=='string'||!valid.has(id)))throw Error('Có bài viết không còn tồn tại. Tải lại danh sách.');
 const now=new Date().toISOString(),playlist={id:existing?input.id:Utilities.getUuid(),name,description,articleIds:[...new Set(input.articleIds)],version:existing?existing.playlist.version+1:1,createdAt:existing?existing.playlist.createdAt:now,updatedAt:now};
 const row=[text_(playlist.id),JSON.stringify(playlist)],sh=playlistSheet_(true);
 if(existing)sh.getRange(existing.row,1,1,2).setValues([row]);else sh.appendRow(row);
 return {ok:true,playlist};
}
function deletePlaylist_(payload){
 const entry=playlists_().find(r=>r.playlist.id===payload.id);playlistConflict_(entry,payload.version);
 playlistSheet_(false).deleteRow(entry.row);return {ok:true};
}
function setArticlePlaylists_(payload){
 if(!rows_().some(r=>r.article.id===payload.articleId))throw Error('Bài viết không tồn tại.');
 const entries=playlists_();
 if(!Array.isArray(payload.playlistIds)||payload.playlistIds.some(id=>typeof id!=='string'||!entries.some(r=>r.playlist.id===id)))throw Error('Playlist không tồn tại. Tải lại danh sách.');
 const selected=new Set(payload.playlistIds),now=new Date().toISOString();let changed=false;
 const updated=entries.map(entry=>{
  const p=entry.playlist,has=p.articleIds.includes(payload.articleId),wanted=selected.has(p.id);
  if(has===wanted)return p;
  playlistConflict_(entry,payload.versions&&payload.versions[p.id]);changed=true;
  return {...p,articleIds:wanted?[...p.articleIds,payload.articleId]:p.articleIds.filter(id=>id!==payload.articleId),version:p.version+1,updatedAt:now};
 });
 // Validate every change before a single Sheets write, avoiding partial membership updates.
 if(changed)playlistSheet_(false).getRange(2,1,updated.length,2).setValues(updated.map(p=>[text_(p.id),JSON.stringify(p)]));
 return {ok:true,playlists:updated};
}
function sources_(){const sh=sheet_('Sources');return sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,4).getValues().map(r=>({id:String(r[0]),name:String(r[1]),feedUrl:String(r[2]),enabled:String(r[3]).toLowerCase()==='true'}));}
function saveSource_(input){const name=clean_(input.name,200),feedUrl=https_(input.feedUrl);if(!name||!feedUrl)throw Error('Nhập tên nguồn và URL HTTPS RSS/Atom.');const sources=sources_();const index=input.id?sources.findIndex(s=>s.id===input.id):-1;if(input.id&&index<0)throw Error('Nguồn không tồn tại. Tải lại danh sách.');if(sources.some(s=>s.id!==input.id&&s.feedUrl===feedUrl))throw Error('URL nguồn này đã có.');const source={id:input.id||Utilities.getUuid(),name,feedUrl,enabled:input.enabled===true};const row=[source.id,source.name,source.feedUrl,source.enabled?'TRUE':'FALSE'].map(text_);if(index<0)sheet_('Sources').appendRow(row);else sheet_('Sources').getRange(index+2,1,1,4).setValues([row]);return {ok:true,source};}
function https_(value){const s=clean_(value,2000);if(s&&!/^https:\/\/[^\s/@]+(?:[/?#][^\s]*)?$/i.test(s))throw Error('Nguồn phải là URL HTTPS hợp lệ.');return s;}
function save_(payload,importFileId,privateLinks){
 const input=payload.article||{};const entries=rows_();const existing=input.id?entries.find(r=>r.article.id===input.id):null;if(input.id&&!existing)throw Error('Bài không tồn tại.');
 if(existing&&input.version!==existing.article.version)throw Error('Bài đã thay đổi ở phiên khác. Tải lại trước khi sửa.');
 const status=input.status;if(!['draft','pending','published','rejected'].includes(status))throw Error('Trạng thái không hợp lệ.');
 const title=clean_(input.title,240),summary=clean_(input.summary,1000);if(!title)throw Error('Nhập tiêu đề.');
 let html;if(typeof input.html==='string')html=input.html.trim();else if(typeof input.content==='string')html='<p>'+escapeHtml_(input.content).replace(/\n/g,'<br>')+'</p>';else html=existing?readHtml_(existing.article):'';
 if(html.length>500000)throw Error('HTML vượt giới hạn 500.000 ký tự.');if(status==='published'&&(!strip_(html)||!summary))throw Error('Bài công khai cần nội dung và tóm tắt.');
 const now=new Date().toISOString();const createdAtInput=input.createdAt&&!isNaN(Date.parse(input.createdAt))?new Date(input.createdAt).toISOString():now;const publishedAtInput=input.publishedAt&&!isNaN(Date.parse(input.publishedAt))?new Date(input.publishedAt).toISOString():null;
 let coverImage=clean_(input.coverImage,1500000);
 if(coverImage.startsWith('data:image/')){
  try{
   const comma=coverImage.indexOf(','),mime=coverImage.slice(5,coverImage.indexOf(';'));
   const base64=coverImage.slice(comma+1);const bytes=Utilities.base64Decode(base64);
   const ext=mime.includes('png')?'.png':(mime.includes('webp')?'.webp':(mime.includes('gif')?'.gif':'.jpg'));
   const blob=Utilities.newBlob(bytes,mime,(existing?input.id:(input.id||Utilities.getUuid()))+'-cover'+ext);
   const coverFile=ensureCoverFolder_().createFile(blob);
   try{const access=(DriveApp.Access&&DriveApp.Access.ANYONE_WITH_LINK)?DriveApp.Access.ANYONE_WITH_LINK:DriveApp.Access.PRIVATE;const perm=(DriveApp.Permission&&DriveApp.Permission.VIEW)?DriveApp.Permission.VIEW:DriveApp.Permission.NONE;coverFile.setSharing(access,perm);}catch(e){}
   coverImage='https://drive.google.com/thumbnail?id='+coverFile.getId()+'&sz=w1000';
  }catch(e){console.warn('Cover upload: '+e.message);if(existing&&existing.article.coverImage){coverImage=existing.article.coverImage;}else{coverImage='';}}
 }
 const article={id:existing?input.id:Utilities.getUuid(),title,summary,format:'html',category:CATEGORIES_.includes(input.category)?input.category:'Khác',tags:clean_(input.tags,500),coverImage:clean_(coverImage,2000),robotIdea:clean_(input.robotIdea,5000),sourceName:clean_(input.sourceName,200),sourceUrl:https_(input.sourceUrl),status,version:existing?existing.article.version+1:1,createdAt:existing?existing.article.createdAt:createdAtInput,updatedAt:now,publishedAt:status==='published'?(existing&&existing.article.publishedAt||publishedAtInput||now):publishedAtInput};
 if(article.sourceUrl&&entries.some(r=>r.article.id!==article.id&&r.article.sourceUrl===article.sourceUrl))throw Error('URL nguồn đã có trong thư viện.');
 // New private revision first; never overwrite a file readers may already be using.
 const file=ensureFolder_().createFile(Utilities.newBlob(html,'text/html',article.id+'-v'+article.version+'.html'));
 if(importFileId)article.importFileId=importFileId;
 else if(existing&&existing.article.importFileId)article.importFileId=existing.article.importFileId;
 try{file.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);article.fileId=file.getId();const encoded=JSON.stringify(article);
 if(existing)sheet_('Articles').getRange(existing.row,1,1,2).setValues([[text_(article.id),encoded]]);else sheet_('Articles').appendRow([text_(article.id),encoded]);
 }catch(e){try{file.setTrashed(true);}catch(cleanupError){console.warn(cleanupError);}throw e;}
 try{sheet_('Audit').appendRow([now,status,text_(article.id)]);}catch(e){console.warn('Audit: '+e.message);}
 if(!importFileId&&!privateLinks)try{autoShareDriveLinks_(html+' '+(input.robotIdea||'')+' '+(input.summary||''));}catch(e){console.warn('Auto share: '+e.message);}
 return {ok:true,article:{...article,html}};
}
function strip_(html){return String(html||'').replace(/<[^>]*>/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();}
/** Reads only configured feeds. Imports are always drafts, never auto-published. */
function importFeeds_(authorize){return locked_(()=>{
 if(authorize)authorize();
 const sh=sheet_('Sources');if(sh.getLastRow()<2)return 0;const feeds=sh.getRange(2,1,sh.getLastRow()-1,4).getValues().filter(r=>String(r[3]).toLowerCase()==='true').slice(0,5);let count=0;
 for(const row of feeds){try{const url=https_(row[2]);if(!url)continue;const response=UrlFetchApp.fetch(url,{muteHttpExceptions:true,followRedirects:false});if(response.getResponseCode()!==200)continue;const xml=response.getContentText();if(xml.length>1000000)continue;const root=XmlService.parse(xml).getRootElement();const ns=root.getNamespace();const channel=root.getChild('channel');const entries=channel?channel.getChildren('item'):root.getChildren('entry',ns);
 for(const item of entries.slice(0,5)){const get=name=>{const child=channel?item.getChild(name):item.getChild(name,ns);return child?child.getText():''};const links=channel?item.getChildren('link'):item.getChildren('link',ns);const link=channel?get('link'):(links.find(l=>!l.getAttribute('rel')||l.getAttribute('rel').getValue()==='alternate')?.getAttribute('href')?.getValue()||'');if(!link||rows_().some(r=>r.article.sourceUrl===link))continue;
 save_({article:{title:strip_(get('title'))||'Chưa có tiêu đề',summary:strip_(get('description')||get('summary')).slice(0,1000),content:'',sourceName:String(row[1]),sourceUrl:link,category:'Khác',status:'draft'}});count++;
 }}catch(e){console.warn('Không nhập được nguồn '+String(row[0])+': '+e.message);}}
 return count;
});}
function scheduledImport_(){return importFeeds_();}
function installImportTrigger_(){ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='scheduledImport_').forEach(t=>ScriptApp.deleteTrigger(t));ScriptApp.newTrigger('scheduledImport_').timeBased().everyHours(6).create();}

/** Run once in the Apps Script editor as the owner. Does not publish articles. */
function installDriveImport(){
 requireOwnerExecution_();driveImportRoot_();
 ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='scheduledDriveImport_').forEach(t=>ScriptApp.deleteTrigger(t));
 ScriptApp.newTrigger('scheduledDriveImport_').timeBased().everyMinutes(10).create();
 console.log(JSON.stringify(scheduledDriveImport_()));
}
function importDriveNow(){requireOwnerExecution_();console.log(JSON.stringify(scheduledDriveImport_()));}
function stopDriveImport(){requireOwnerExecution_();ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='scheduledDriveImport_').forEach(t=>ScriptApp.deleteTrigger(t));}
function driveImportRoot_(){
 const props=properties_(),id=props.getProperty('IMPORT_FOLDER_ID');if(id)return DriveApp.getFolderById(id);
 const folders=DriveApp.getFoldersByName('Robot Ideas Articles');
 if(!folders.hasNext())throw Error('Không tìm thấy thư mục Robot Ideas Articles. Đặt IMPORT_FOLDER_ID trong Script properties.');
 const folder=folders.next();if(folders.hasNext())throw Error('Có nhiều thư mục cùng tên. Đặt IMPORT_FOLDER_ID để chọn đúng thư mục.');
 props.setProperty('IMPORT_FOLDER_ID',folder.getId());return folder;
}
function driveArticle_(raw,name){
 const match=raw.match(/<!--\s*METADATA\s*([\s\S]*?)-->/i),meta={};
 if(match)for(const line of match[1].split(/\r?\n/)){const colon=line.indexOf(':');if(colon>0)meta[line.slice(0,colon).trim()]=line.slice(colon+1).trim();}
 const html=match?raw.slice(0,match.index)+raw.slice(match.index+match[0].length):raw;
 const heading=(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)||html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1];
 return {title:clean_(meta['Tiêu đề']||strip_(heading||'')||name.replace(/\.html?$/i,''),240),summary:clean_(strip_(meta['Tóm tắt']||html),1000),category:meta['Chuyên mục']||'Khác',tags:meta['Tags']||'',sourceName:meta['Tên nguồn']||'Google Drive',sourceUrl:meta['Nguồn']||'',robotIdea:meta['Gợi ý ứng dụng']||'',coverImage:/^https:\/\//i.test(meta['Ảnh bìa']||'')?meta['Ảnh bìa']:'',html,status:'pending'};
}
function scheduledDriveImport_(){return locked_(()=>{
 const props=properties_(),root=driveImportRoot_(),rootId=root.getId(),started=Date.now();
 let state;try{state=JSON.parse(props.getProperty('DRIVE_IMPORT_CURSOR')||'null');}catch(e){}
 if(!state||state.root!==rootId)state={root:rootId,queue:[rootId],fileToken:'',folderToken:'',phase:'files'};
 const known=rows_().map(r=>r.article),ids=new Set(known.flatMap(a=>[a.importFileId,a.fileId]).filter(Boolean)),urls=new Set(known.map(a=>a.sourceUrl).filter(Boolean));
 const result={imported:0,skipped:0,errors:0,scanned:0};
 const checkpoint=()=>props.setProperty('DRIVE_IMPORT_CURSOR',JSON.stringify(state));
 // Small, resumable batches keep Drive work within Apps Script execution limits.
 while(state.queue.length&&result.imported<10&&result.scanned<200&&Date.now()-started<120000){
  const folder=DriveApp.getFolderById(state.queue[0]);
  if(state.phase==='files'){
   let files;try{files=state.fileToken?DriveApp.continueFileIterator(state.fileToken):folder.getFiles();}catch(e){state.fileToken='';files=folder.getFiles();}
   while(files.hasNext()&&result.imported<10&&result.scanned<200&&Date.now()-started<120000){
    const file=files.next();result.scanned++;
    try{
     const id=file.getId();
     if(!/\.html?$/i.test(file.getName())||ids.has(id)){result.skipped++;}
     else{
      if(file.getSize()>1500000)throw Error('HTML vượt 1,5 MB.');
      const article=driveArticle_(file.getBlob().getDataAsString('UTF-8'),file.getName());
      if(article.sourceUrl&&urls.has(article.sourceUrl)){result.skipped++;}
      else{save_({article},id);ids.add(id);if(article.sourceUrl)urls.add(article.sourceUrl);result.imported++;}
     }
    }catch(e){result.errors++;console.warn('Drive import '+file.getId()+': '+e.message);}
    state.fileToken=files.getContinuationToken();checkpoint();
   }
   if(files.hasNext())break;
   state.phase='folders';state.fileToken='';checkpoint();
  }
  let folders;try{folders=state.folderToken?DriveApp.continueFolderIterator(state.folderToken):folder.getFolders();}catch(e){state.folderToken='';folders=folder.getFolders();}
  while(folders.hasNext()&&result.scanned<200&&Date.now()-started<120000){
   const sub=folders.next();result.scanned++;
   if(sub.getName()!=='attachments'&&!state.queue.includes(sub.getId()))state.queue.push(sub.getId());
   state.folderToken=folders.getContinuationToken();checkpoint();
  }
  if(folders.hasNext())break;
  state.queue.shift();state.phase='files';state.folderToken='';checkpoint();
 }
 result.cycleComplete=state.queue.length===0;
 if(result.cycleComplete){state={root:rootId,queue:[rootId],fileToken:'',folderToken:'',phase:'files'};checkpoint();}
 props.setProperty('DRIVE_IMPORT_LAST_RESULT',JSON.stringify({...result,time:new Date().toISOString()}));
 return result;
});}
function shareArticlesFolder_(){let count=0;try{const folders=DriveApp.getFoldersByName('Robot Ideas Articles');while(folders.hasNext()){count+=makePublicRecursively_(folders.next());}}catch(e){console.warn('Share articles folder: '+e.message);}return count;}
function makePublicRecursively_(folder){let count=0;try{folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}try{const files=folder.getFiles();while(files.hasNext()){const f=files.next();try{f.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);count++;}catch(e){}}}catch(e){}try{const subs=folder.getFolders();while(subs.hasNext()){count+=makePublicRecursively_(subs.next());}}catch(e){}return count;}
function autoShareDriveLinks_(text){if(!text||typeof text!=='string')return 0;let count=0;const fileMatches=[...text.matchAll(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_\-]+)/gi)].map(m=>m[1]);const folderMatches=[...text.matchAll(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_\-]+)/gi)].map(m=>m[1]);const allIds=[...new Set([...fileMatches,...folderMatches])];for(const id of allIds){try{DriveApp.getFileById(id).setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);count++;}catch(e){try{DriveApp.getFolderById(id).setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);count++;}catch(e2){}}}return count;}
