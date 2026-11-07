/* Account storage is outside the simulation; no Drive file is shared publicly. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),account=window.RobotAccount;
  const associations=new Map(),projectModelCache=new Map();
  let pendingSave=null,busy=false,accountId=null,accountToken=null,generation=0,previewObserver=null,cachedProjectsList=null;
  const controlIds=['cloudSave','cloudSaveCopy','cloudProjects','submitProject','refreshProjects'];
  function identity(){const s=account.session;return s?.user?.id||s?.user?.sub||s?.user?.email||'';}
  function wbDoc(){try{return $('workbench')?.contentDocument||null;}catch{return null;}}
  function ui(){try{return $('workbench')?.contentWindow?.LinkSharkUI;}catch{return null;}}
  function syncEmbeddedHeader(){
    const doc=wbDoc();if(!doc)return;
    const s=account.session,acctLabel=s?s.user.email+' · '+s.user.role:'Đăng nhập Google';
    const acctBtn=doc.getElementById('ls-account-open');if(acctBtn){acctBtn.textContent=acctLabel;acctBtn.title=acctLabel;}
    for(const id of ['ls-cloud-projects','ls-cloud-save','ls-cloud-save-copy']){
      const btn=doc.getElementById(id);if(btn)btn.disabled=busy;
    }
  }
  function status(text,error=false,notifyWorkbench=true){
    $('cloudStatus').textContent=text;$('cloudStatus').dataset.error=String(error);
    if(notifyWorkbench&&text)try{ui()?.tell?.(text);}catch{}
  }
  function resetWorkbench(session){
    const previous=$('workbench'),frame=document.createElement('iframe');
    frame.id='workbench';frame.title=previous.title;frame.allow='fullscreen';
    frame.dataset.workbenchSrc=previous.dataset.workbenchSrc;
    frame.addEventListener('load',()=>syncEmbeddedHeader());
    previous.replaceWith(frame);
    window.LinkSWorkspaceStorage.activate(frame,session);
    frame.src=frame.dataset.workbenchSrc;
  }
  function current(){const app=ui(),workspace=app?.getWorkspace(),editor=app?.getEditor();if(!workspace||workspace.home||!editor)throw Error('Mở một cơ cấu hoặc tạo thiết kế trống trước khi lưu.');return {workspace,editor,key:workspace.activeId};}
  function requireAccount(){if(!account.session){$('accountDialog').showModal();throw Error('Đăng nhập Google để lưu và mở dự án trên tài khoản.');}}
  async function task(fn){if(busy)return;busy=true;for(const id of controlIds)$(id).disabled=true;syncEmbeddedHeader();try{await fn();}catch(e){status(e.message,true);}finally{busy=false;for(const id of controlIds)$(id).disabled=false;syncEmbeddedHeader();}}
  function beginSave(copy){requireAccount();const snapshot=current();const linked=copy?null:associations.get(snapshot.key);pendingSave={key:snapshot.key,model:JSON.parse(JSON.stringify(snapshot.editor.model)),linked,identity:identity()};$('projectName').value=linked?.name||snapshot.editor.model.name||'Cơ cấu mới';$('saveTitle').textContent=copy?'Lưu thành dự án mới':'Lưu dự án';$('saveDescription').textContent=linked?'Cập nhật dự án trên tài khoản. Hệ thống giữ phiên bản trước và kiểm tra xung đột.':'Tạo dự án riêng trên tài khoản với đầy đủ thông số của thiết kế đang mở.';$('saveDialog').showModal();$('projectName').focus();}
  async function save(event){event.preventDefault();await task(async()=>{requireAccount();const snapshot=pendingSave;if(!snapshot||snapshot.identity!==identity())throw Error('Tài khoản đã thay đổi. Mở lại thao tác lưu.');const name=$('projectName').value.trim();if(!name)throw Error('Nhập tên dự án.');const r=await account.call('saveProject',{project:{...(snapshot.linked?{id:snapshot.linked.id,version:snapshot.linked.version}:{}),name,model:snapshot.model}});if(snapshot.identity!==identity())return;associations.set(snapshot.key,{id:r.project.id,version:r.project.version,name:r.project.name});projectModelCache.set(r.project.id,{version:r.project.version,project:r.project});cachedProjectsList=null;$('saveDialog').close();pendingSave=null;status('Đã lưu “'+r.project.name+'” lên tài khoản · phiên bản '+r.project.version+'.');});}
  async function fetchProjectWithCache(project){
    const hit=projectModelCache.get(project.id);
    if(hit&&hit.version===project.version&&hit.project?.model)return {project:hit.project};
    const r=await account.call('getProject',{id:project.id});
    if(r?.project?.model)projectModelCache.set(project.id,{version:r.project.version,project:r.project});
    return r;
  }
  async function openProject(project){requireAccount();const who=identity(),r=await fetchProjectWithCache(project);if(who!==identity())return;const app=ui(),workspace=app?.getWorkspace();if(!workspace)throw Error('Bàn thiết kế đang khởi động. Thử mở lại.');const model=JSON.parse(JSON.stringify(r.project.model));if(!model||!Array.isArray(model.joints)||!Array.isArray(model.links))throw Error('Dữ liệu dự án không hợp lệ.');const before=new Set(workspace.documents.map(d=>d.id));workspace.create(model);const key=await new Promise((resolve,reject)=>{let count=0;const check=()=>{const w=ui()?.getWorkspace();if(w&&!w.home&&!before.has(w.activeId))return resolve(w.activeId);if(++count>100)return reject(Error('Chưa xác nhận được thẻ dự án đã mở. Thiết kế trên máy vẫn được giữ.'));setTimeout(check,50);};check();});if(who!==identity())return;associations.set(key,{id:r.project.id,version:r.project.version,name:r.project.name});$('projectsDialog').close();status('Đã mở “'+r.project.name+'” trong thẻ mới. Bấm Lưu lên tài khoản sau khi chỉnh sửa.');}
  function previews(items,who,epoch){
    const token=account.session?.token,queue=[];let running=0;
    const valid=()=>who===identity()&&epoch===generation&&token===account.session?.token;
    async function pump(){
      if(!valid())return;
      while(running<2&&queue.length){
        const {host,project}=queue.shift();running++;
        (async()=>{try{
          const result=await fetchProjectWithCache(project);
          if(valid()&&host.isConnected)window.LinkSProjectPreview.render(host,result.project.model,project.name);
        }catch{if(valid()&&host.isConnected)host.textContent='Chưa tải được ảnh xem trước';}
        finally{running--;pump();}})();
      }
    }
    const deferred=[];
    for(const item of items){
      const hit=projectModelCache.get(item.project.id);
      if(hit&&hit.version===item.project.version&&hit.project?.model){
        try{window.LinkSProjectPreview.render(item.host,hit.project.model,item.project.name);}catch{item.host.textContent='Chưa tải được ảnh xem trước';}
      }else deferred.push(item);
    }
    if(!deferred.length)return;
    if(window.IntersectionObserver){
      const pending=new Map(deferred.map(item=>[item.host,item]));
      previewObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){const item=pending.get(entry.target);if(item){pending.delete(entry.target);previewObserver?.unobserve(entry.target);queue.push(item);}}pump();},{root:$('projectsDialog'),rootMargin:'180px'});
      for(const {host} of deferred)previewObserver.observe(host);
    }else{queue.push(...deferred);pump();}
  }
  function renderProjectRows(projectsList,who,epoch){
    previewObserver?.disconnect();previewObserver=null;const previewItems=[];$('projectList').replaceChildren();
    $('projectsStatus').textContent=projectsList.length?projectsList.length+' dự án riêng của bạn.':'Chưa có dự án. Mở hoặc tạo cơ cấu, rồi bấm Lưu lên tài khoản.';
    for(const project of projectsList){const row=document.createElement('article');row.className='saved-project';const preview=document.createElement('div');preview.className='project-preview';preview.textContent='Đang tải ảnh xem trước…';previewItems.push({host:preview,project});const name=document.createElement('h3');name.textContent=project.name;const meta=document.createElement('p');const date=new Date(project.updatedAt);meta.textContent='Phiên bản '+project.version+(Number.isNaN(date.getTime())?'':' · '+date.toLocaleString('vi-VN'));const actions=document.createElement('div');actions.className='saved-project-actions';const open=document.createElement('button');open.textContent='Mở thiết kế';open.onclick=()=>task(()=>openProject(project));const rename=document.createElement('button');rename.textContent='Đổi tên';rename.onclick=()=>task(async()=>{const value=prompt('Tên dự án mới',project.name);if(value===null||!value.trim()||value.trim()===project.name)return;const result=await account.call('getProject',{id:project.id});if(result.project.version!==project.version)throw Error('Dự án đã thay đổi. Tải lại danh sách trước khi đổi tên.');const saved=await account.call('saveProject',{project:{id:project.id,version:project.version,name:value.trim(),model:result.project.model}});projectModelCache.set(saved.project.id,{version:saved.project.version,project:saved.project});for(const [key,link] of associations)if(link.id===project.id)associations.set(key,{...link,name:saved.project.name,version:saved.project.version});await list(true);status('Đã đổi tên dự án.');});const remove=document.createElement('button');remove.className='delete-project';remove.textContent='Xóa';remove.onclick=()=>task(async()=>{if(!confirm('Xóa dự án “'+project.name+'” khỏi danh sách tài khoản? Bản thiết kế đang mở trên máy vẫn được giữ.'))return;await account.call('deleteProject',{id:project.id,version:project.version});projectModelCache.delete(project.id);for(const [key,link] of associations)if(link.id===project.id)associations.delete(key);await list(true);status('Đã xóa dự án khỏi danh sách.');});actions.append(open,rename,remove);row.append(preview,name,meta,actions);$('projectList').append(row);}
    previews(previewItems,who,epoch);
  }
  async function list(forceRefresh=false){requireAccount();const who=identity(),epoch=++generation;if(!forceRefresh&&Array.isArray(cachedProjectsList)){renderProjectRows(cachedProjectsList,who,epoch);}else{previewObserver?.disconnect();previewObserver=null;$('projectsStatus').textContent='Đang tải dự án…';$('projectList').replaceChildren();}const r=await account.call('projects');if(who!==identity()||epoch!==generation)return;cachedProjectsList=r.projects;renderProjectRows(r.projects,who,epoch);}
  $('accountOpen').onclick=()=>$('accountDialog').showModal();
  for(const close of document.querySelectorAll('[data-close]'))close.onclick=()=>$(close.dataset.close).close();
  $('cloudSave').onclick=()=>{try{beginSave(false);}catch(e){status(e.message,true);}};
  $('cloudSaveCopy').onclick=()=>{try{beginSave(true);}catch(e){status(e.message,true);}};
  $('cloudProjects').onclick=()=>task(async()=>{requireAccount();$('projectsDialog').showModal();await list(false);});
  $('refreshProjects').onclick=()=>task(()=>list(true));$('saveProjectForm').onsubmit=save;
  account.subscribe(()=>{const s=account.session,next=identity();if(next!==accountId||(s?.token||null)!==accountToken){accountId=next;accountToken=s?.token||null;associations.clear();projectModelCache.clear();cachedProjectsList=null;pendingSave=null;generation++;previewObserver?.disconnect();previewObserver=null;$('projectList').replaceChildren();$('projectsStatus').textContent='';$('projectName').value='';if($('projectsDialog').open)$('projectsDialog').close();if($('saveDialog').open)$('saveDialog').close();resetWorkbench(s);} $('accountOpen').textContent=s?s.user.email+' · '+s.user.role:'Đăng nhập Google';$('adminDashboard').hidden=s?.user?.role!=='admin';syncEmbeddedHeader();if(s)status('Bản nháp trên trình duyệt được lưu riêng cho '+s.user.email+'. Bấm Lưu lên tài khoản để sao lưu lên Drive.',false,false);else status('Chế độ khách không giữ bản nháp sau khi đổi tài khoản hoặc tải lại trang. Đăng nhập để lưu thiết kế.',false,false);});
  account.mount($('accountMount')).catch(e=>status(e.message,true));
})();
