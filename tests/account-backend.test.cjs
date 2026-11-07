const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');

function fixture(){
 const props=new Map([['SHEET_ID','sheet'],['ADMIN_EMAIL','owner@gmail.com'],['GOOGLE_CLIENT_ID','links-test.apps.googleusercontent.com']]);
 const tables={Articles:[['id','json']],Sources:[['id','name','feedUrl','enabled']],Audit:[['time','action','articleId']]},cache=new Map(),credentials=new Map(),files=new Map(),folders=new Map();
 let fetchStatus=200,fetchCalls=0,driveReads=0,failProjectWrite=false,beforeLock=null;
 const sheet=name=>tables[name]?{
  getLastRow:()=>tables[name].length,
  getRange:(row,col,count=1,width=1)=>({getValues:()=>tables[name].slice(row-1,row-1+count).map(r=>r.slice(col-1,col-1+width)),setValues(values){if(name==='Projects'&&failProjectWrite)throw Error('Sheets unavailable');values.forEach((r,i)=>{tables[name][row-1+i]||=[];r.forEach((v,j)=>tables[name][row-1+i][col-1+j]=v);});}}),
  appendRow(row){if(name==='Projects'&&failProjectWrite)throw Error('Sheets unavailable');tables[name].push(row);},deleteRow:row=>tables[name].splice(row-1,1),setFrozenRows(){}
 }:null;
 function folder(){const id=crypto.randomUUID(),f={id,private:false,editors:[],viewers:[],getId:()=>id,getEditors(){return this.editors;},getViewers(){return this.viewers;},setSharing(access,permission){assert.equal(access,'private');assert.equal(permission,'none');this.private=true;},createFile(blob){const fileId=crypto.randomUUID(),record={...blob,folderId:id,private:false,trashed:false};files.set(fileId,record);return {getId:()=>fileId,setSharing(access,permission){assert.equal(access,'private');assert.equal(permission,'none');record.private=true;},setTrashed:value=>record.trashed=value};}};folders.set(id,f);return f;}
 const ctx={console,Date,PropertiesService:{getScriptProperties:()=>({getProperty:key=>props.get(key),setProperty:(key,value)=>props.set(key,value)})},CacheService:{getScriptCache:()=>({get:key=>cache.get(key)||null,put:(key,value)=>cache.set(key,value),remove:key=>cache.delete(key)})},
  SpreadsheetApp:{openById:()=>({getSheetByName:sheet,insertSheet(name){tables[name]=[];return sheet(name);},getUrl:()=> 'https://docs.google.com/spreadsheets/d/private'})},
  DriveApp:{Access:{PRIVATE:'private'},Permission:{NONE:'none'},createFolder:folder,getFolderById:id=>{if(!folders.has(id))throw Error('Missing folder');return folders.get(id);},getFileById:id=>({getBlob(){driveReads++;if(!files.has(id))throw Error('Missing file');return {getDataAsString:()=>files.get(id).content};}})},
  UrlFetchApp:{fetch(url,options){fetchCalls++;assert.ok(url.startsWith('https://oauth2.googleapis.com/tokeninfo?id_token='));assert.equal(options.followRedirects,false);const token=decodeURIComponent(url.split('id_token=')[1]);return {getResponseCode:()=>fetchStatus,getContentText:()=>JSON.stringify(credentials.get(token)||{})};}},
  LockService:{getScriptLock:()=>({waitLock(){const hook=beforeLock;beforeLock=null;if(hook)hook();},releaseLock(){}})},
  Session:{getActiveUser:()=>({getEmail:()=> 'owner@gmail.com'}),getEffectiveUser:()=>({getEmail:()=> 'owner@gmail.com'})},
  Utilities:{getUuid:()=>crypto.randomUUID(),newBlob:(content,type,name)=>({content,type,name}),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(algorithm,value)=>Array.from(crypto.createHash(algorithm).update(value).digest()),base64EncodeWebSafe:value=>Buffer.from(value).toString('base64url')},
  ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})}
 };
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('google-apps-script/Code.gs','utf8'),ctx);
 const api=(action,payload={})=>ctx.adminApi(action,payload);
 function prepare(email='owner@gmail.com',sub='1000001',overrides={}){const {nonce}=api('googleChallenge'),idToken='google.'+crypto.randomUUID()+'.signed';credentials.set(idToken,{aud:props.get('GOOGLE_CLIENT_ID'),iss:'https://accounts.google.com',exp:Math.floor(Date.now()/1000)+3600,email,email_verified:true,sub,nonce,name:'A user',...overrides});return {nonce,idToken};}
 const login=(email,sub,overrides)=>api('googleLogin',prepare(email,sub,overrides));
 const userRow=id=>tables.Users.find(r=>r[0]===id),projectRow=id=>tables.Projects.find(r=>r[0]===id);
 return {ctx,api,props,tables,cache,credentials,files,folders,prepare,login,userRow,projectRow,getReads:()=>driveReads,getFetchCalls:()=>fetchCalls,setFetchStatus:value=>fetchStatus=value,failProjectWrite:()=>failProjectWrite=true,beforeNextLock:fn=>beforeLock=fn};
}
const mechanism=()=>({joints:[{id:'a',x:0,y:0,grounded:true}],links:[],gears:[],chains:[],obstacles:[],units:'mm',advanced:{solver:{iterations:30},nested:[1,'x',null]}});

test('Google config defaults to member signup; only verified server claims determine account identity and role',()=>{
 const f=fixture();assert.equal(f.ctx.doGet({parameter:{action:'authConfig'}}).registrationMode,'member');
 const owner=f.login();assert.equal(owner.user.role,'admin');assert.equal(owner.user.owner,true);assert.equal(f.props.get('OWNER_GOOGLE_SUB'),'1000001');
 const prepared=f.prepare('member@gmail.com','2000001');const member=f.api('googleLogin',{...prepared,email:'owner@gmail.com',sub:'1000001',role:'admin'});
 assert.equal(member.ok,true);assert.equal(member.user.email,'member@gmail.com');assert.equal(member.user.role,'member');assert.equal(member.user.owner,false);
 for(const action of ['list','get','save','users','saveUser','savePlaylist','importFeeds','shareDrive'])assert.equal(f.api(action,{token:member.token}).code,'FORBIDDEN');
 assert.equal(f.api('session',{token:member.token}).user.role,'member');assert.equal(f.api('logout',{token:member.token}).ok,true);assert.equal(f.api('session',{token:member.token}).code,'AUTH_REQUIRED');
});

test('Google verification rejects wrong audience, issuer, expiry, email verification, subject and nonce',()=>{
 const badClaims=[{aud:'other.apps.googleusercontent.com'},{azp:'other.apps.googleusercontent.com'},{iss:'https://attacker.example'},{exp:Math.floor(Date.now()/1000)-1},{exp:'not-a-date'},{email_verified:false},{sub:''},{sub:'not-a-google-sub'},{nonce:'replaced'}];
 for(const invalid of badClaims){const f=fixture(),result=f.login('owner@gmail.com','1000001',invalid);assert.equal(result.code,'AUTH_INVALID',JSON.stringify(invalid));assert.equal(f.tables.UserSessions,undefined);assert.equal(f.tables.Users,undefined);}
 const f=fixture();f.setFetchStatus(503);assert.equal(f.login().code,'AUTH_INVALID');assert.equal(f.tables.UserSessions,undefined);
 f.props.delete('GOOGLE_CLIENT_ID');assert.equal(f.api('googleChallenge').code,'AUTH_CONFIG_REQUIRED');
});

test('a Google challenge is single use, including failed attempts; expired/missing challenges fail before fetch',()=>{
 const f=fixture(),prepared=f.prepare();assert.equal(f.api('googleLogin',prepared).ok,true);const calls=f.getFetchCalls();assert.equal(f.api('googleLogin',prepared).code,'AUTH_INVALID');assert.equal(f.getFetchCalls(),calls);
 const failed=f.prepare('owner@gmail.com','1000001',{aud:'wrong'});assert.equal(f.api('googleLogin',failed).code,'AUTH_INVALID');assert.equal(f.api('googleLogin',failed).code,'AUTH_INVALID');
 const expired=f.prepare();f.cache.clear();assert.equal(f.api('googleLogin',expired).code,'AUTH_INVALID');
});

test('owner binding cannot be transferred by editing bootstrap email and missing owner records fail closed',()=>{
 const f=fixture(),owner=f.login();f.props.set('ADMIN_EMAIL','replacement@gmail.com');const replacement=f.login('replacement@gmail.com','2000001');assert.equal(replacement.user.role,'member');assert.equal(replacement.user.owner,false);assert.equal(f.api('session',{token:owner.token}).user.owner,true);
 f.tables.Users.splice(f.tables.Users.findIndex(r=>r[0]===owner.user.id),1);assert.equal(f.login('replacement@gmail.com','2000001').code,'OWNER_ACCOUNT_MISSING');assert.equal(f.props.get('OWNER_GOOGLE_SUB'),'1000001');
});

test('invite mode denies unknown accounts and pins invited email to one immutable Google subject',()=>{
 const f=fixture();f.props.set('ALLOW_MEMBER_SIGNUP','false');const owner=f.login();assert.equal(f.api('authConfig').registrationMode,'invite');assert.equal(f.login('unknown@gmail.com','3000001').code,'ACCOUNT_NOT_ALLOWED');
 const invite=f.api('saveUser',{token:owner.token,user:{email:'vip@gmail.com',role:'vip',active:true}});assert.equal(invite.ok,true);
 const vip=f.login('vip@gmail.com','2000001');assert.equal(vip.user.role,'vip');assert.equal(f.login('vip@gmail.com','2000002').code,'ACCOUNT_MISMATCH');
 const blocked=f.api('saveUser',{token:owner.token,user:{email:'former@example.org',role:'admin',active:true}});assert.equal(blocked.ok,true);assert.equal(f.login('former@example.org','4000001').code,'ACCOUNT_EMAIL_UNVERIFIED');
 assert.equal(f.login('former@example.org','4000001',{hd:'example.org'}).user.role,'admin');
});

test('admin account edits enforce concurrency, role validation and live revocation; owner is protected',()=>{
 const f=fixture(),owner=f.login(),member=f.login('member@gmail.com','2000001');
 let promoted=f.api('saveUser',{token:owner.token,user:{...member.user,role:'admin'}});assert.equal(promoted.ok,true);assert.equal(f.api('session',{token:member.token}).code,'AUTH_REQUIRED');
 assert.equal(f.api('saveUser',{token:owner.token,user:{...member.user,role:'vip'}}).code,'CONFLICT');
 let admin=f.login('member@gmail.com','2000001');assert.equal(f.api('users',{token:admin.token}).ok,true);
 assert.equal(f.api('saveUser',{token:admin.token,user:{...owner.user,role:'member'}}).code,'OWNER_PROTECTED');assert.equal(f.api('saveUser',{token:admin.token,user:{...owner.user,active:false}}).code,'OWNER_PROTECTED');
 const disabled=f.api('saveUser',{token:owner.token,user:{...promoted.user,active:false}});assert.equal(disabled.ok,true);assert.equal(f.api('users',{token:admin.token}).code,'AUTH_REQUIRED');assert.equal(f.login('member@gmail.com','2000001').code,'ACCOUNT_DISABLED');
 assert.equal(f.api('saveUser',{token:owner.token,user:{email:'bad@gmail.com',role:'superadmin',active:true}}).ok,false);
});

test('Google sessions are durable hashes, have expiry and a maximum of ten per account, and reject legacy sessions',()=>{
 const f=fixture(),first=f.login();for(let i=0;i<12;i++)assert.equal(f.login().ok,true);assert.equal(f.tables.UserSessions.length,11);assert.equal(f.api('session',{token:first.token}).code,'AUTH_REQUIRED');
 const latest=f.login();f.cache.clear();assert.equal(f.api('session',{token:latest.token}).ok,true);assert.ok(!JSON.stringify(f.tables.UserSessions).includes(latest.token));assert.ok(f.tables.UserSessions.slice(1).every(r=>r[0].startsWith('sha256:')));
 const row=f.tables.UserSessions.find(r=>r[0]===f.ctx.sessionKey_(latest.token)),session=JSON.parse(row[1]);session.expiresAt=Date.now()-1;row[1]=JSON.stringify(session);assert.equal(f.api('session',{token:latest.token}).code,'AUTH_REQUIRED');
 const legacy='legacy-session-token-that-was-valid-before';f.props.set('ADMIN_SESSIONS',JSON.stringify({[f.ctx.digest_(legacy)]:{email:'owner@gmail.com',expiresAt:Date.now()+86400000}}));assert.equal(f.api('session',{token:legacy}).code,'AUTH_REQUIRED');assert.equal(f.api('requestCode').code,'GOOGLE_LOGIN_REQUIRED');assert.equal(f.api('login',{code:'123456'}).code,'GOOGLE_LOGIN_REQUIRED');
});

test('projects store private immutable Drive JSON revisions and only metadata in Sheets and lists',()=>{
 const f=fixture(),member=f.login('member@gmail.com','2000001'),model=mechanism();
 const saved=f.api('saveProject',{token:member.token,project:{name:'Cơ cấu',model,ownerSub:'1000001',ownerId:'spoof',fileId:'arbitrary'}});assert.equal(saved.ok,true);assert.deepEqual(JSON.parse(JSON.stringify(saved.project.model)),model);assert.equal(saved.project.version,1);assert.equal(saved.project.fileId,undefined);assert.equal(saved.project.ownerSub,undefined);
 const meta=JSON.parse(f.projectRow(saved.project.id)[1]),file=f.files.get(meta.fileId);assert.equal(meta.ownerSub,'2000001');assert.equal(meta.model,undefined);assert.notEqual(meta.fileId,'arbitrary');assert.equal(file.private,true);assert.equal(f.folders.get(file.folderId).private,true);assert.equal(f.props.get('PROJECTS_FOLDER_ID'),file.folderId);
 assert.equal(f.api('projects',{token:member.token}).projects[0].model,undefined);assert.equal(f.api('projects',{token:member.token}).projects[0].fileId,undefined);assert.equal(f.getReads(),0);
 assert.deepEqual(JSON.parse(JSON.stringify(f.api('getProject',{token:member.token,id:saved.project.id}).project.model)),model);
 const next=f.api('saveProject',{token:member.token,project:{...saved.project,name:'Version 2',model:{...model,units:'m'}}});assert.equal(next.ok,true);assert.equal(next.project.version,2);assert.equal(f.files.size,2);assert.equal(JSON.parse(file.content).model.units,'mm');assert.notEqual(JSON.parse(f.projectRow(saved.project.id)[1]).fileId,meta.fileId);
});

test('project access is isolated by server verified Google subject, including against admins and ID/file spoofing',()=>{
 const f=fixture(),owner=f.login(),a=f.login('a@gmail.com','2000001'),b=f.login('b@gmail.com','3000001'),p=f.api('saveProject',{token:a.token,project:{name:'Private',model:mechanism()}}).project;
 for(const token of [owner.token,b.token]){assert.equal(f.api('projects',{token}).projects.length,0);for(const [action,payload] of [['getProject',{id:p.id}],['saveProject',{project:{...p,ownerSub:'3000001',fileId:'arbitrary'}}],['deleteProject',{id:p.id,version:p.version}]])assert.equal(f.api(action,{token,...payload}).code,'NOT_FOUND');}
 assert.equal(f.getReads(),0);assert.equal(f.api('getProject',{id:p.id}).code,'AUTH_REQUIRED');assert.equal(f.api('saveProject',{token:a.token,project:{id:'chosen-project-id',name:'Spoof',model:mechanism()}}).code,'NOT_FOUND');
 assert.equal(f.login('a@gmail.com','2000002').code,'ACCOUNT_MISMATCH');
 const renamed=f.login('renamed@gmail.com','2000001');assert.equal(renamed.ok,true);assert.equal(f.api('getProject',{token:renamed.token,id:p.id}).ok,true);
});

test('project writes and soft deletion reject stale versions without creating files or losing revisions',()=>{
 const f=fixture(),member=f.login('member@gmail.com','2000001'),p=f.api('saveProject',{token:member.token,project:{name:'Private',model:mechanism()}}).project;
 const next=f.api('saveProject',{token:member.token,project:{...p,name:'Updated'}}).project,before=JSON.stringify(f.tables.Projects),files=f.files.size;
 assert.equal(f.api('saveProject',{token:member.token,project:p}).code,'CONFLICT');assert.equal(f.api('deleteProject',{token:member.token,id:p.id,version:1}).code,'CONFLICT');assert.equal(JSON.stringify(f.tables.Projects),before);assert.equal(f.files.size,files);
 assert.equal(f.api('deleteProject',{token:member.token,id:p.id,version:next.version}).ok,true);assert.equal(f.api('projects',{token:member.token}).projects.length,0);assert.equal(f.api('getProject',{token:member.token,id:p.id}).code,'NOT_FOUND');assert.ok(JSON.parse(f.projectRow(p.id)[1]).deletedAt);assert.equal(f.files.size,2);assert.ok([...f.files.values()].every(file=>!file.trashed));
});

test('invalid models fail before Drive writes; failed Sheets writes clean up the new revision',()=>{
 const f=fixture(),member=f.login('member@gmail.com','2000001');
 for(const model of [null,[],{}, {...mechanism(),gears:{}},{...mechanism(),advanced:{invalid:NaN}},{...mechanism(),advanced:{invalid:()=>1}},{...mechanism(),notes:'x'.repeat(500001)}]){assert.equal(f.api('saveProject',{token:member.token,project:{name:'Invalid',model}}).ok,false);}
 assert.equal(f.files.size,0);f.ctx.dataSheet_('Projects');f.failProjectWrite();assert.equal(f.api('saveProject',{token:member.token,project:{name:'Valid',model:mechanism()}}).ok,false);assert.equal(f.files.size,1);assert.equal([...f.files.values()][0].trashed,true);assert.equal(f.tables.Projects.length,1);
});

test('project folder with explicit collaborators is rejected, and setup is additive',()=>{
 const f=fixture();f.ctx.setup();const folder=f.folders.get(f.props.get('PROJECTS_FOLDER_ID'));folder.editors.push('outsider@gmail.com');const member=f.login('member@gmail.com','2000001');assert.equal(f.api('saveProject',{token:member.token,project:{name:'Secret',model:mechanism()}}).ok,false);assert.equal(f.files.size,0);
 folder.editors=[];f.tables.Articles.push(['existing',JSON.stringify({id:'existing',status:'pending'})]);const before=JSON.stringify(f.tables.Articles);f.ctx.setup();assert.equal(JSON.stringify(f.tables.Articles),before);for(const table of ['Users','UserSessions','Projects'])assert.ok(f.tables[table]);
});

test('optional automation key has no account/project/admin privileges and cannot publish or alter reviewed articles',()=>{
 const f=fixture(),key='explicit-sync-key-with-at-least-32-characters';assert.equal(f.api('list',{token:'robot-ideas-sync-secret-2026'}).code,'AUTH_REQUIRED');f.props.set('SYNC_KEY',key);
 for(const action of ['session','logout','projects','getProject','saveProject','deleteProject','users','saveUser','savePlaylist','importFeeds','shareDrive'])assert.equal(f.api(action,{token:key}).code,'FORBIDDEN');
 const pending=f.api('save',{token:key,article:{title:'Imported',status:'pending',html:'<p>Draft</p>'}});assert.equal(pending.ok,true);assert.equal(f.api('get',{token:key,id:pending.article.id}).ok,true);assert.equal(f.api('list',{token:key}).articles.length,1);assert.equal(f.api('save',{token:key,article:{...pending.article,status:'published',summary:'No'}}).code,'FORBIDDEN');
 const owner=f.login(),published=f.api('save',{token:owner.token,article:{title:'Reviewed',status:'published',summary:'Summary',html:'<p>Public</p>'}}).article;assert.equal(f.api('save',{token:key,article:{...published,status:'draft'}}).code,'FORBIDDEN');
});

test('queued mutations recheck authorization after acquiring the write lock',()=>{
 for(const action of ['save','saveSource','savePlaylist','deletePlaylist','setArticlePlaylists','importFeeds','shareDrive','saveUser','saveProject','deleteProject']){
  const f=fixture(),owner=f.login();f.beforeNextLock(()=>{const row=f.userRow(owner.user.id),user=JSON.parse(row[1]);user.authVersion++;row[1]=JSON.stringify(user);});
  assert.equal(f.api(action,{token:owner.token}).code,'AUTH_REQUIRED',action);assert.equal(f.files.size,0);
 }
 const f=fixture(),key='configured-sync-key-with-more-than-32-characters';f.props.set('SYNC_KEY',key);f.beforeNextLock(()=>f.props.set('SYNC_KEY','rotated-sync-key-with-more-than-32-characters'));assert.equal(f.api('save',{token:key,article:{title:'Queued',status:'pending'}}).code,'AUTH_REQUIRED');assert.equal(f.files.size,0);
});
