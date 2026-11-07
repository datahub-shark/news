// Editorial tests start with a server-verified administrator; account.test.cjs
// and session-ui.test.cjs exercise the actual Google/session boundary.
module.exports=function installAdminAccount(w){
 let session={token:'test-admin-session',expiresAt:Date.now()+600000,user:{email:'owner@example.com',name:'Owner',role:'admin',active:true}};
 const listeners=new Set();
 const call=(action,payload={})=>new Promise((resolve,reject)=>w.google.script.run.withSuccessHandler(result=>result.ok?resolve(result):reject(Object.assign(Error(result.error),{code:result.code}))).withFailureHandler(reject).adminApi(action,{...payload,token:session?.token}));
 w.RobotAccount={ready:async()=>session,mount:async()=>{},get session(){return session},call,subscribe(fn){listeners.add(fn);fn(session);return ()=>listeners.delete(fn)},async logout(){try{await call('logout')}finally{session=null;listeners.forEach(fn=>fn(null))}}};
};
