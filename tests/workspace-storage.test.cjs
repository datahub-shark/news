const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
function page(){
 const dom=new JSDOM('<main></main>',{url:'https://example.com/news/links/',runScripts:'outside-only'}),w=dom.window;
 let session=null;
 w.RobotAccount={get session(){return session;}};
 w.eval(fs.readFileSync('links/workspace-storage.js','utf8'));
 function activate(id){session=id?{token:'token-'+id,user:{id}}:null;if(session)w.localStorage.setItem('robot_ideas_user_session',JSON.stringify(session));else w.localStorage.removeItem('robot_ideas_user_session');const frame=w.document.createElement('iframe');w.document.querySelector('main').replaceChildren(frame);w.LinkSWorkspaceStorage.activate(frame,session);return w.LinkSWorkspaceStorage.connect(frame.contentWindow);}
 return{dom,w,activate};
}
test('drafts, backups and legacy recovery are isolated across account A, logout and account B',()=>{
 const f=page(),key='link-shark.full.workspace-draft.v1';
 f.w.localStorage.setItem(key,'unowned legacy mechanism');f.w.localStorage.setItem('link-shark.project.v1','old prototype');
 const a=f.activate('a');assert.equal(a.getItem(key),null);assert.equal(a.getItem('link-shark.project.v1'),null);
 a.setItem(key,'private A');a.setItem(key+'.backup','backup A');
 const guest=f.activate(null);assert.equal(guest.getItem(key),null);assert.equal(a.getItem(key),null);assert.throws(()=>a.setItem(key,'late autosave A'),/Tài khoản/);
 const b=f.activate('b');assert.equal(b.getItem(key),null);assert.equal(b.getItem(key+'.backup'),null);b.setItem(key,'private B');
 const restored=f.activate('a');assert.equal(restored.getItem(key),'private A');assert.equal(restored.getItem(key+'.backup'),'backup A');restored.clear();assert.equal(restored.length,0);
 assert.equal(f.activate('b').getItem(key),'private B');assert.equal(f.w.localStorage.getItem(key),'unowned legacy mechanism');assert.equal(f.w.localStorage.getItem('link-shark.project.v1'),'old prototype');f.dom.window.close();
});
test('guest drafts are memory only and old sessions stop writing before a cross-tab account event arrives',()=>{
 const f=page(),guest=f.activate(null);guest.setItem('draft','guest');assert.equal(f.w.localStorage.getItem('links.account..draft'),null);assert.equal(f.activate(null).getItem('draft'),null);
 const a=f.activate('a');a.setItem('draft','A');f.w.localStorage.setItem('robot_ideas_user_session',JSON.stringify({token:'token-b',user:{id:'b'}}));assert.equal(a.getItem('draft'),null);assert.throws(()=>a.setItem('draft','stale'),/Tài khoản/);f.dom.window.close();
});
test('an unrelated frame cannot obtain account storage, and direct app visits never read unowned local data',()=>{
 const f=page();f.activate('a');assert.throws(()=>f.w.LinkSWorkspaceStorage.connect({}),/phiên hiện tại/);f.dom.window.close();
 const direct=new JSDOM('',{url:'https://example.com/news/links/linkS.html',runScripts:'outside-only'});direct.window.localStorage.setItem('link-shark.full.workspace-draft.v1','private shared legacy');direct.window.eval(fs.readFileSync('links/workbench-storage.js','utf8'));assert.equal(direct.window.LinkSDraftStorage.getItem('link-shark.full.workspace-draft.v1'),null);direct.window.LinkSDraftStorage.setItem('draft','memory');assert.equal(direct.window.localStorage.getItem('draft'),null);direct.window.close();
});
test('the shipped workbench installs the account storage adapter before all inherited scripts',()=>{
 const html=fs.readFileSync('links/linkS.html','utf8');assert.match(html.match(/<script[^>]*>/)[0],/links-draft-storage/);assert.ok(!/\blocalStorage\b/.test(html));assert.ok(html.includes('loadWorkspace(LinkSDraftStorage,nm,lg)'));assert.ok(html.includes('saveWorkspace(LinkSDraftStorage,nm,'));
 const index=fs.readFileSync('links/index.html','utf8');assert.ok(!/<iframe[^>]*\ssrc=/.test(index));
});
