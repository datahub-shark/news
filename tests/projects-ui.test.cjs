const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const model={id:'mechanism',name:'Khâu DXF',joints:[],links:[],gears:[],chains:[],obstacles:[],cadProfiles:{source:'DXF'},sharkForces:{loads:[{fx:10}]}};
const tick=()=>new Promise(resolve=>setTimeout(resolve,15));
function page(){
 const dom=new JSDOM(fs.readFileSync('links/index.html','utf8'),{url:'https://example.com/news/links/',runScripts:'outside-only'}),w=dom.window,d=w.document;
 for(const dialog of d.querySelectorAll('dialog')){dialog.showModal=()=>{dialog.open=true};dialog.close=()=>{dialog.open=false};}
 let session={user:{id:'a',email:'a@gmail.com',role:'member'}},listener,version=0;
 const calls=[],projects=[];
 const workspace={home:false,activeId:'tab-1',documents:[{id:'tab-1'}],create(m){workspace.documents.push({id:'new-tab'});workspace.activeId='new-tab';editor.model=m;}},editor={model:JSON.parse(JSON.stringify(model))};
 function attach(){d.getElementById('workbench').contentWindow.LinkSharkUI={getWorkspace:()=>workspace,getEditor:()=>editor};}
 w.RobotAccount={get session(){return session},ready:async()=>session,mount:async()=>{},subscribe(fn){listener=fn;fn(session);},async call(action,payload){calls.push({action,payload});if(action==='saveProject'){const project={...payload.project,id:payload.project.id||'p-'+(++version),version:(payload.project.version||0)+1,updatedAt:new Date().toISOString()};projects.push(project);return {project};}if(action==='projects')return {projects};if(action==='getProject')return {project:projects.find(p=>p.id===payload.id)};return {ok:true};}};
 w.eval(fs.readFileSync('links/workspace-storage.js','utf8'));
 w.eval(fs.readFileSync('links/project-preview.js','utf8'));
 w.eval(fs.readFileSync('links/projects.js','utf8'));attach();
 const click=id=>d.getElementById(id).click();
 const save=async(name='Cơ cấu của tôi',copy=false)=>{click(copy?'cloudSaveCopy':'cloudSave');d.getElementById('projectName').value=name;d.getElementById('saveProjectForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();};
 return{dom,w,d,calls,projects,workspace,editor,click,save,createDesign(){workspace.home=false;workspace.activeId='tab-1';workspace.documents=[{id:'tab-1'}];editor.model=JSON.parse(JSON.stringify(model));},setSession(value){session=value;listener(value);workspace.home=true;workspace.documents=[];editor.model=null;attach();}};
}
test('cloud save retains full model and tracks project/version separately for each native tab',async()=>{
 const f=page();await f.save();const first=f.calls.find(c=>c.action==='saveProject');assert.deepEqual(JSON.parse(JSON.stringify(first.payload.project.model)),model);assert.equal(first.payload.project.id,undefined);
 await f.save('Cập nhật');assert.equal(f.calls.filter(c=>c.action==='saveProject')[1].payload.project.id,'p-1');assert.equal(f.calls.filter(c=>c.action==='saveProject')[1].payload.project.version,1);
 f.workspace.activeId='tab-2';await f.save('Thẻ khác');assert.equal(f.calls.filter(c=>c.action==='saveProject')[2].payload.project.id,undefined);
 f.workspace.activeId='tab-1';await f.save('Bản sao',true);assert.equal(f.calls.filter(c=>c.action==='saveProject')[3].payload.project.id,undefined);f.dom.window.close();
});
test('guest cloud actions open sign-in without saving and account switches discard cloud associations',async()=>{
 const f=page();await f.save();f.setSession(null);f.click('cloudSave');assert.equal(f.d.getElementById('accountDialog').open,true);assert.equal(f.calls.filter(c=>c.action==='saveProject').length,1);
 f.setSession({user:{id:'b',email:'b@gmail.com',role:'member'}});f.createDesign();await f.save();assert.equal(f.calls.filter(c=>c.action==='saveProject')[1].payload.project.id,undefined);assert.equal(f.d.getElementById('adminDashboard').hidden,true);f.dom.window.close();
});
test('opening a cloud project creates a new native tab, preserves extensions and then updates its original cloud version',async()=>{
 const f=page();await f.save();f.workspace.activeId='other';f.click('cloudProjects');await tick();assert.equal(f.d.querySelector('.saved-project h3').textContent,'Cơ cấu của tôi');f.d.querySelector('.saved-project-actions button').click();await tick();
 assert.equal(f.workspace.activeId,'new-tab');assert.equal(f.workspace.documents[0].id,'tab-1');assert.deepEqual(JSON.parse(JSON.stringify(f.editor.model)),model);await f.save();assert.equal(f.calls.filter(c=>c.action==='saveProject').at(-1).payload.project.id,'p-1');f.dom.window.close();
});
test('logging out while a save form is open clears its snapshot before another account can submit it',async()=>{
 const f=page();f.click('cloudSave');f.setSession({user:{id:'b',email:'b@gmail.com',role:'member'}});assert.equal(f.d.getElementById('saveDialog').open,false);f.d.getElementById('saveProjectForm').dispatchEvent(new f.w.Event('submit',{cancelable:true}));await tick();assert.equal(f.calls.length,0);f.dom.window.close();
});
test('logout removes the old editor document before the next account starts a workspace',()=>{
 const f=page(),old=f.d.getElementById('workbench');old.contentDocument.write('<body>Private mechanism A</body>');assert.match(old.contentDocument.body.textContent,/Private mechanism A/);
 f.setSession(null);assert.equal(old.isConnected,false);assert.equal(f.workspace.home,true);assert.equal(f.d.getElementById('workbench').contentDocument.body?.textContent||'','');
 const guest=f.d.getElementById('workbench');f.setSession({user:{id:'b',email:'b@gmail.com',role:'member'}});assert.equal(guest.isConnected,false);assert.equal(f.editor.model,null);assert.equal(f.d.getElementById('workbench').contentDocument.body?.textContent||'','');f.dom.window.close();
});

test('existing projects receive private geometry previews without rewriting the saved model',async()=>{
 const f=page();const design={joints:[{id:'a',x:0,y:0,isGround:true},{id:'b',x:1,y:1,isDriver:true}],links:[{jointA:'a',jointB:'b',color:'#f59e0b',cadProfile:{paths:[{closed:true,points:[{x:0,y:0},{x:1,y:0},{x:1,y:.1}]}]}}],gears:[{jointA:'a',radiusA:.2}]};
 f.projects.push({id:'old',name:'<img src=x onerror=alert(1)>',version:1,model:design});
 f.click('cloudProjects');await tick();
 const svg=f.d.querySelector('.project-preview svg');assert.ok(svg);assert.equal(svg.getAttribute('role'),'img');assert.equal(svg.querySelectorAll('circle').length,3);assert.ok(svg.querySelector('path'));assert.equal(f.d.querySelector('.saved-project img'),null);assert.equal(f.calls.filter(c=>c.action==='saveProject').length,0);
 f.setSession(null);assert.equal(f.d.querySelector('.project-preview'),null);f.dom.window.close();
});

test('preview failures leave project actions usable and stale account responses cannot draw',async()=>{
 const f=page();f.projects.push({id:'old',name:'Private A',version:1});
 let complete;f.w.RobotAccount.call=async action=>action==='projects'?{projects:f.projects}:new Promise(resolve=>{complete=resolve;});
 f.click('cloudProjects');await tick();const host=f.d.querySelector('.project-preview');assert.ok(host);assert.match(host.textContent,/Đang tải/);
 f.setSession({user:{id:'b',email:'b@gmail.com',role:'member'}});complete({project:{model:{joints:[{id:'a',x:0,y:0}],links:[]}}});await tick();assert.equal(host.querySelector('svg'),null);assert.equal(f.d.querySelector('.project-preview'),null);f.dom.window.close();
 const g=page();g.projects.push({id:'broken',name:'Broken',version:1});g.w.RobotAccount.call=async action=>{if(action==='projects')return {projects:g.projects};throw Error('Offline');};g.click('cloudProjects');await tick();assert.match(g.d.querySelector('.project-preview').textContent,/Chưa tải/);assert.equal(g.d.querySelector('.saved-project-actions button').disabled,false);g.dom.window.close();
});
