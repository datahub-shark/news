/* Familiar navigation and contextual edits over native, undoable editor commands. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),app=()=>window.LinkSharkUI;
  let scene=null,menu=null,origin=null,context=null,mounted=false;
  const collection={joint:'joints',link:'links',gear:'gears',chain:'chains',obstacle:'obstacles'};
  const typeNames={joint:'Khớp',link:'Khâu',gear:'Bánh răng',chain:'Xích',tracer:'Điểm theo dõi',obstacle:'Vật cản'};
  function find(model,target){
    if(!target)return null;
    if(target.type==='tracer')return model.links.flatMap(l=>l.tracers||[]).find(t=>t.id===target.id);
    return (model[collection[target.type]]||[]).find(x=>x.id===target.id);
  }
  function activeKey(){return app()?.getWorkspace()?.activeId;}
  function editing(){return !!document.querySelector('dialog[open],[role="dialog"],.transmission-workbench');}
  function hide(restore=false){if(menu)menu.hidden=true;context=null;if(restore&&origin?.isConnected)origin.focus({preventScroll:true});}
  function editable(){
    const e=app()?.getEditor();
    if(!e||!context||activeKey()!==context.key||!find(e.model,context.target))return null;
    return e;
  }
  function selected(e){const s=e?.selection;return s?.id?{type:s.type,id:s.id}:null;}
  function update(target,patch){
    const e=app()?.getEditor();if(!e||!find(e.model,target))return;
    e.pause();
    if(target.type==='joint')e.updateJoint(target.id,patch);
    else if(target.type==='link')e.updateLink(target.id,patch);
    else e.updateModel(m=>target.type==='tracer'?{...m,links:m.links.map(l=>({...l,tracers:(l.tracers||[]).map(t=>t.id===target.id?{...t,...patch}:t)}))}:{...m,[collection[target.type]]:m[collection[target.type]].map(x=>x.id===target.id?{...x,...patch}:x)});
  }
  function rename(target){
    const e=app()?.getEditor(),item=e&&find(e.model,target);if(!item)return;
    e.pause();const value=prompt('Tên '+(typeNames[target.type]||'đối tượng').toLowerCase(),item.name||'');
    if(value!==null&&value.trim()&&value.trim()!==item.name)update(target,{name:value.trim().slice(0,160)});
  }
  function segmentDistance(p,a,b){const dx=b.sx-a.sx,dy=b.sy-a.sy,t=Math.max(0,Math.min(1,((p.sx-a.sx)*dx+(p.sy-a.sy)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.sx-a.sx-t*dx,p.sy-a.sy-t*dy);}
  function hit(point){
    if(!scene)return null;
    const {model,joints,links,project,scale}=scene;
    const nearest=joints.map(j=>({j,d:Math.hypot(project(j.x,j.y).sx-point.sx,project(j.x,j.y).sy-point.sy)})).sort((a,b)=>a.d-b.d)[0];
    if(nearest?.d<=12)return {type:'joint',id:nearest.j.id};
    for(const l of links)for(const t of l.tracers||[]){if(!Number.isFinite(t.x)||!Number.isFinite(t.y))continue;const p=project(t.x,t.y);if(Math.hypot(p.sx-point.sx,p.sy-point.sy)<10)return {type:'tracer',id:t.id};}
    for(const [kind,items] of [['gear',model.gears||[]],['chain',model.chains||[]]])for(const item of items)for(const side of ['A','B']){
      const j=joints.find(j=>j.id===item['joint'+side]),r=item['radius'+side]||item['pitchRadius'+side];if(!j||!r)continue;
      const p=project(j.x,j.y);if(Math.abs(Math.hypot(p.sx-point.sx,p.sy-point.sy)-r*scale)<9)return {type:kind,id:item.id};
    }
    const hits=[];
    for(const l of model.links){
      const a=joints.find(j=>j.id===l.jointA),b=joints.find(j=>j.id===l.jointB);if(!a||!b)continue;
      let distance=segmentDistance(point,project(a.x,a.y),project(b.x,b.y));
      if(l.cadProfile?.paths&&window.LinkSharkCAD?.worldPoint){
        distance=Infinity;
        for(const path of l.cadProfile.paths){const pts=path.points.map(p=>{const w=window.LinkSharkCAD.worldPoint(p,l,joints);return project(w.x,w.y);});
          let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){
            if(i||path.closed)distance=Math.min(distance,segmentDistance(point,pts[j],pts[i]));
            if(path.closed&&(pts[i].sy>point.sy)!==(pts[j].sy>point.sy)&&point.sx<(pts[j].sx-pts[i].sx)*(point.sy-pts[i].sy)/(pts[j].sy-pts[i].sy)+pts[i].sx)inside=!inside;
          }if(inside)distance=0;
        }
      }
      if(distance<=10)hits.push({id:l.id,d:distance});
    }
    hits.sort((a,b)=>a.d-b.d);if(hits.length)return {type:'link',id:hits[0].id};
    const o=project(0,0),u=project(1,1),obstacle=app()?.getEditor()?.obstacleAt((point.sx-o.sx)/(u.sx-o.sx),(point.sy-o.sy)/(u.sy-o.sy),5/scale);
    return obstacle?{type:'obstacle',id:obstacle}:null;
  }
  function open(canvas,x,y,target){
    const e=app()?.getEditor();if(!e||editing())return;
    hide();origin=canvas;canvas.tabIndex=0;e.pause();
    window.LinkSharkCADUI?.cancelPick?.();window.LinkSharkTraceUI?.cancel?.();window.LinkSharkForceUI?.cancel?.();
    if(target)e.selectObject(target);
    context={key:activeKey(),target};
    menu.replaceChildren();
    const title=document.createElement('div');title.className='links-context-title';title.textContent=target?(typeNames[target.type]+' · '+(find(e.model,target)?.name||target.id)):'Không gian làm việc';menu.append(title);
    function action(label,key,run,disabled=false,danger=false){
      const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');b.dataset.shortcut=key;b.disabled=disabled;if(danger)b.className='links-danger';
      const text=document.createElement('span');text.textContent=label;b.append(text);if(key){const k=document.createElement('kbd');k.textContent=key;b.append(k);}
      b.onclick=()=>{const current=app()?.getEditor(),valid=context&&activeKey()===context.key&&(!target||editable());if(!valid){hide(true);return;}hide(true);try{run(current);}catch(error){app().tell(error.message);}};menu.append(b);
    }
    const divider=()=>menu.append(document.createElement('hr'));
    if(target){
      const item=find(e.model,target);
      action('Thuộc tính','Alt+Enter',ed=>ed.properties());action('Đổi tên','F2',()=>rename(target));
      if(target.type==='joint'){
        action(item.isGround?'Bỏ cố định':'Cố định khớp','',()=>update(target,{isGround:!item.isGround,...(item.isGround?{isDriver:false}:{})}));
        const connected=e.model.links.some(l=>l.jointA===item.id||l.jointB===item.id);
        action(item.isDriver?'Tắt nguồn dẫn động':'Đặt làm nguồn dẫn động','',()=>update(target,{isDriver:!item.isDriver,...(!item.isDriver&&item.type!=='prismatic'?{isGround:true}:{})}),!connected&&item.type!=='prismatic');
      }
      if(target.type==='link'){
        action('Đổi màu khâu…','',()=>{const value=prompt('Màu khâu (#RRGGBB)',item.color||'#168477');if(value===null)return;if(!/^#[0-9a-f]{6}$/i.test(value.trim()))throw Error('Nhập màu dạng #RRGGBB, ví dụ #168477.');update(target,{color:value.trim()});});
        const locked=!!item.cadProfile||e.model.rigidBodies?.some(r=>r.linkIds.includes(item.id));
        action(locked?'Chiều dài đã khóa (DXF / vật rắn)':'Đổi chiều dài…','',()=>{const value=prompt('Chiều dài khâu (mm)',String(item.length*1000));if(value===null)return;const mm=Number(value.replace(',','.'));if(!Number.isFinite(mm)||mm<=0||mm>1000000)throw Error('Chiều dài phải lớn hơn 0 và không quá 1.000.000 mm.');update(target,{length:mm/1000});},locked);
        action('Gắn điểm theo dõi','T',()=>window.LinkSharkTraceUI.show());
      }
      if(target.type==='gear'||target.type==='chain')action('Thông số bộ truyền','',ed=>ed.openSection('transmission'));
      divider();
      action('Nhân bản','Ctrl+D',ed=>ed.selectionAction('copy'));
      action('Xóa','Delete',ed=>ed.selectionAction('delete'),false,true);
    }else{
      action('Chọn / kéo','V',ed=>ed.setTool('select'));action('Vẽ khâu','L',ed=>ed.setTool('add_link'));action('Thêm khớp quay','J',ed=>ed.setTool('add_joint'));action('Thêm gối cố định','G',ed=>ed.setTool('add_ground'));divider();
      action('Vừa khung nhìn','F',ed=>ed.fit());action('Lớp hiển thị','',ed=>ed.view());action(e.gridSnap?'Tắt bắt lưới':'Bật bắt lưới','',ed=>ed.setGridSnap(!ed.gridSnap));
    }
    divider();action('Hoàn tác','Ctrl+Z',ed=>ed.undo(),!e.canUndo);action('Làm lại','Ctrl+Shift+Z',ed=>ed.redo(),!e.canRedo);
    menu.hidden=false;menu.style.left='0px';menu.style.top='0px';
    menu.style.left=Math.max(8,Math.min(x,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-menu.offsetHeight-8))+'px';
    menu.querySelector('button:not(:disabled)')?.focus();
  }
  function mount(){
    if(mounted)return;mounted=true;
    menu=document.createElement('div');menu.id='links-context-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Thay đổi nhanh');menu.hidden=true;document.body.append(menu);
    const originalDraw=window.LinkSharkCADUI.draw;
    window.LinkSharkCADUI.draw=function(ctx,model,joints,links,project,scale){
      const e=app()?.getEditor();if(e?.model.id===model.id&&ctx.canvas?.closest('[role="tabpanel"]')?.style.display!=='none')scene={canvas:ctx.canvas,model,joints,links,project,scale};
      return originalDraw.apply(this,arguments);
    };
    const sync=()=>{
      const select=$('links-language');if(select&&select.value!==window.LinkGoI18n.language)select.value=window.LinkGoI18n.language;
      const theme=$('links-theme'),dark=app()?.getWorkspace()?.theme==='dark';if(theme){theme.textContent=dark?'☀':'☾';theme.title=dark?'Chuyển sang giao diện sáng':'Chuyển sang giao diện tối';theme.setAttribute('aria-label',theme.title);}
      if(context&&activeKey()!==context.key)hide();
    };
    for(const name of ['bindWorkspace','bindEditor']){const original=app()[name];app()[name]=function(value){original(value);sync();};}
    document.addEventListener('change',event=>{if(event.target.id==='links-language')window.LinkGoI18n.setLanguage(event.target.value);});
    window.addEventListener('linkgo-language-change',sync);
    // Stop right-button presses from drawing/deleting or starting a native drag.
    document.addEventListener('pointerdown',event=>{
      if(event.button===2&&event.target.matches('[data-testid="canvas-scene"] canvas')){event.preventDefault();event.stopImmediatePropagation();return;}
      if(menu&&!menu.hidden&&!menu.contains(event.target))hide();
    },true);
    document.addEventListener('contextmenu',event=>{
      if(!event.target.matches('[data-testid="canvas-scene"] canvas')||event.target!==scene?.canvas||editing())return;
      const rect=event.target.getBoundingClientRect();event.preventDefault();event.stopPropagation();open(event.target,event.clientX,event.clientY,hit({sx:event.clientX-rect.left,sy:event.clientY-rect.top}));
    });
    document.addEventListener('keydown',event=>{
      if(menu&&!menu.hidden){
        if(event.key==='Escape'||event.key==='Tab'){event.preventDefault();event.stopImmediatePropagation();hide(true);return;}
        const buttons=[...menu.querySelectorAll('button:not(:disabled)')],i=buttons.indexOf(document.activeElement);
        const mod=event.ctrlKey||event.metaKey,key=event.key.toLowerCase();
        const shortcut=mod?(key==='d'?'Ctrl+D':key==='z'?(event.shiftKey?'Ctrl+Shift+Z':'Ctrl+Z'):key==='y'?'Ctrl+Shift+Z':null):event.altKey&&key==='enter'?'Alt+Enter':event.key==='F2'?'F2':event.key==='Delete'||event.key==='Backspace'?'Delete':null;
        if(shortcut){event.preventDefault();event.stopImmediatePropagation();buttons.find(b=>b.dataset.shortcut===shortcut)?.click();return;}
        if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(i+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus();}
        event.stopPropagation();return;
      }
      if(event.target.closest('input,textarea,select,[contenteditable="true"]')||editing())return;
      const e=app()?.getEditor();if(!e)return;
      if((event.shiftKey&&event.key==='F10')||event.key==='ContextMenu'){
        const canvas=document.querySelector('[role="tabpanel"]:not([style*="display: none"]) [data-testid="canvas-scene"] canvas');if(!canvas)return;
        const rect=canvas.getBoundingClientRect();event.preventDefault();event.stopImmediatePropagation();open(canvas,rect.left+rect.width/2,rect.top+rect.height/2,selected(e));
      }else if(event.key==='F2'&&selected(e)){event.preventDefault();event.stopImmediatePropagation();rename(selected(e));}
      else if(event.altKey&&event.key==='Enter'){event.preventDefault();event.stopImmediatePropagation();e.properties();}
    },true);
    menu.addEventListener('click',event=>event.stopPropagation());
    window.addEventListener('resize',()=>hide());window.addEventListener('blur',()=>hide());document.addEventListener('wheel',()=>hide(),{passive:true});
    // The native header mounts on DOMContentLoaded, after this script is parsed.
    new MutationObserver(sync).observe(document.getElementById('root'),{childList:true,subtree:true});
    sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
