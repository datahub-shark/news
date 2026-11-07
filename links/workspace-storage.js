/* Browser recovery is scoped to a server-verified account. Unowned legacy keys are never imported. */
(() => {
  'use strict';
  let active=null;
  const prefixFor=id=>'links.account.'+encodeURIComponent(id)+'.';
  function activate(frame,session){
    if(active)active.valid=false;
    const owner=typeof session?.user?.id==='string'?session.user.id:'';
    const context={frame,owner,token:session?.token||'',valid:true,memory:new Map()};
    active=context;
    let native;
    try{native=window.localStorage;}catch{}
    const prefix=prefixFor(owner);
    function allowed(){
      if(!context.valid||active!==context)return false;
      const current=window.RobotAccount.session;
      if((current?.user?.id||'')!==owner||(current?.token||'')!==context.token)return false;
      if(owner&&context.token&&native){
        try{const saved=JSON.parse(native.getItem('robot_ideas_user_session')||'null');if(saved?.token!==context.token)return false;}catch{return false;}
      }
      return true;
    }
    const persistent=Boolean(owner&&native);
    const keys=()=>!allowed()?[]:persistent?Array.from({length:native.length},(_,i)=>native.key(i)).filter(k=>k?.startsWith(prefix)).map(k=>k.slice(prefix.length)):[...context.memory.keys()];
    const storage={
      getItem(key){if(!allowed())return null;key=String(key);return persistent?native.getItem(prefix+key):context.memory.get(key)??null;},
      setItem(key,value){if(!allowed())throw Error('Tài khoản đã thay đổi; không ghi bản nháp của phiên trước.');key=String(key);value=String(value);if(persistent)native.setItem(prefix+key,value);else context.memory.set(key,value);},
      removeItem(key){if(!allowed())return;key=String(key);if(persistent)native.removeItem(prefix+key);else context.memory.delete(key);},
      clear(){for(const key of keys())this.removeItem(key);},
      key(index){return keys()[index]??null;},
      get length(){return keys().length;}
    };
    context.storage=Object.freeze(storage);
  }
  function connect(child){if(!active||!active.valid||active.frame.contentWindow!==child)throw Error('Bàn thiết kế không thuộc phiên hiện tại.');return active.storage;}
  window.LinkSWorkspaceStorage=Object.freeze({activate,connect});
})();
