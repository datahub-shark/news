const {test}=require('node:test'),assert=require('node:assert/strict');
const {workspacePage}=require('./helpers/workspace-page.cjs');

test('header preferences control the native language and theme; commands and new shortcuts remain discoverable',async()=>{
 const f=await workspacePage();try{
  const lang=f.d.getElementById('links-language');assert.equal(lang.closest('header').id,'ls-header');assert.equal(lang.value,'vi');
  lang.value='en';lang.dispatchEvent(new f.w.Event('change',{bubbles:true}));await f.tick();assert.equal(f.w.LinkGoI18n.language,'en');
  const old=f.w.LinkSharkUI.getWorkspace().theme;f.d.getElementById('links-theme').click();await f.until(()=>f.w.LinkSharkUI.getWorkspace().theme!==old);
  f.d.getElementById('ls-shortcuts').click();assert.match(f.d.getElementById('ls-dialog-content').textContent,/F2/);assert.match(f.d.getElementById('ls-dialog-content').textContent,/Shift \+ F10/);
  assert.equal(f.d.querySelectorAll('#ls-header [data-ls-command="run"]').length,1);assert.equal(f.errors.length,0);
 }finally{f.dom.window.close();}
});

test('right clicking the actual joint selects it, renames through native history and supports undo/redo',async()=>{
 const f=await workspacePage();try{
  await f.open();const joint=f.editor().evaluation.solvedJoints[0],p=f.scene().project(joint.x,joint.y),old=joint.name;
  const menu=await f.right(p.sx,p.sy);assert.equal(menu.hidden,false);assert.match(menu.textContent,/Cố định|Bỏ cố định/);assert.equal(f.editor().selection.id,joint.id);
  f.w.prompt=()=>'<Khớp thử>';f.action('Đổi tên');await f.until(()=>f.editor().model.joints[0].name==='<Khớp thử>');assert.equal(menu.hidden,true);assert.equal(f.d.querySelector('Khớp'),null);
  f.editor().undo();await f.until(()=>f.editor().model.joints[0].name===old);f.editor().redo();await f.until(()=>f.editor().model.joints[0].name==='<Khớp thử>');assert.equal(f.errors.length,0);
 }finally{f.dom.window.close();}
});

test('context duplication and deletion use the newly clicked object, and deletion restores dependent geometry on undo',async()=>{
 const f=await workspacePage();try{
  await f.open('crank-rocker-4bar');const before=JSON.stringify(f.editor().model),count=f.editor().model.links.length;
  const l=f.editor().model.links[0],a=f.editor().evaluation.solvedJoints.find(j=>j.id===l.jointA),b=f.editor().evaluation.solvedJoints.find(j=>j.id===l.jointB),p=f.scene().project((a.x+b.x)/2,(a.y+b.y)/2);
  await f.right(p.sx,p.sy);assert.equal(f.editor().selection.type,'link');assert.equal(f.editor().selection.id,l.id);f.action('Nhân bản');await f.until(()=>f.editor().model.links.length>count);
  f.editor().undo();await f.until(()=>JSON.stringify(f.editor().model)===before);
  await f.right(p.sx,p.sy);f.action('Xóa');await f.until(()=>f.editor().model.links.length<count);f.editor().undo();await f.until(()=>JSON.stringify(f.editor().model)===before);assert.equal(f.errors.length,0);
 }finally{f.dom.window.close();}
});

test('background menu and keyboard access do not edit geometry; menus cancel on escape and never override text editing',async()=>{
 const f=await workspacePage();try{
  await f.open();const before=JSON.stringify(f.editor().model);const menu=await f.right(900,550);assert.match(menu.textContent,/Vẽ khâu/);assert.equal(JSON.stringify(f.editor().model),before);
  f.key('ArrowDown');assert.equal(f.d.activeElement.closest('[role="menu"]').id,'links-context-menu');f.key('Escape');assert.equal(menu.hidden,true);
  const e=f.editor(),item=e.model.joints[0];e.selectObject({type:'joint',id:item.id});await f.tick();f.key('F10',{shiftKey:true});await f.tick();assert.equal(menu.hidden,false);assert.match(menu.textContent,/Đổi tên/);f.key('Escape');
  const input=f.d.createElement('input');f.d.body.append(input);let prompted=0;f.w.prompt=()=>{prompted++;return 'renamed';};f.key('F2',{},input);assert.equal(prompted,0);
  f.key('F2');await f.until(()=>f.editor().model.joints[0].name==='renamed');assert.equal(prompted,1);assert.equal(f.errors.length,0);
 }finally{f.dom.window.close();}
});

test('joint and link quick changes use native validation and undo; right presses never execute the delete tool',async()=>{
 const f=await workspacePage();try{
  await f.open('crank-rocker-4bar');const e=f.editor(),joint=e.evaluation.solvedJoints.find(j=>!j.isGround),p=f.scene().project(joint.x,joint.y);
  await f.right(p.sx,p.sy);f.action('Cố định khớp');await f.until(()=>f.editor().model.joints.find(j=>j.id===joint.id).isGround);
  f.editor().undo();await f.until(()=>!f.editor().model.joints.find(j=>j.id===joint.id).isGround);
  const l=f.editor().model.links[0],a=f.editor().evaluation.solvedJoints.find(j=>j.id===l.jointA),b=f.editor().evaluation.solvedJoints.find(j=>j.id===l.jointB),mid=f.scene().project((a.x+b.x)/2,(a.y+b.y)/2);
  await f.right(mid.sx,mid.sy);f.w.prompt=()=> '#112233';f.action('Đổi màu');await f.until(()=>f.editor().model.links.find(x=>x.id===l.id).color==='#112233');
  f.editor().setTool('delete');await f.tick();const before=JSON.stringify(f.editor().model),{canvas}=f.scene();
  const press=new f.w.MouseEvent('pointerdown',{button:2,bubbles:true,cancelable:true,clientX:mid.sx,clientY:mid.sy});canvas.dispatchEvent(press);await f.tick();assert.equal(press.defaultPrevented,true);assert.equal(JSON.stringify(f.editor().model),before);assert.equal(f.errors.length,0);
 }finally{f.dom.window.close();}
});

test('attached regions use native geometry hit testing and context menus close when changing documents',async()=>{
 const f=await workspacePage();try{
  const template=f.w.LinkSharkNative.templates.find(m=>m.obstacles.some(o=>o.attachment));await f.open(template.id);
  const e=f.editor(),obstacle=e.model.obstacles[0],link=e.model.links.find(l=>l.id===obstacle.attachment.linkId),a=e.evaluation.solvedJoints.find(j=>j.id===link.jointA),b=e.evaluation.solvedJoints.find(j=>j.id===link.jointB),length=Math.hypot(b.x-a.x,b.y-a.y),r=obstacle.attachment;
  const p=f.scene().project(a.x+(b.x-a.x)*r.ratio-(b.y-a.y)/length*r.normalOffset,a.y+(b.y-a.y)*r.ratio+(b.x-a.x)/length*r.normalOffset);
  const menu=await f.right(p.sx+30,p.sy+25);assert.equal(f.editor().selection.type,'obstacle');assert.equal(f.editor().selection.id,obstacle.id);
  f.w.LinkSharkUI.getWorkspace().newBlank();await f.until(()=>menu.hidden);assert.equal(f.errors.length,0);
 }finally{f.dom.window.close();}
});
