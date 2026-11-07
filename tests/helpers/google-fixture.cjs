const fs=require('node:fs');const {JSDOM}=require('jsdom');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(options={}){
 const user=options.user||{email:'owner@example.com',name:'Owner',role:'admin',active:true,version:1};
 const article={id:'pending-1',title:'Bài chờ duyệt',category:'Cơ khí',summary:'Tóm tắt',html:'<p>Nội dung</p>',status:'pending',version:1,updatedAt:'2026-11-07T00:00:00Z'};
 const dom=new JSDOM(options.admin===false?'<!doctype html><div id="account"></div>':fs.readFileSync('admin.html','utf8'),{url:'https://datahub-shark.github.io/news/'+(options.admin===false?'links/':'admin.html')+(options.query||''),runScripts:'outside-only'}),w=dom.window,d=w.document;
 w.confirm=()=>true;w.HTMLDialogElement.prototype.close=function(){this.open=false};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 w.NEWS_CONFIG={apiUrl:'https://script.google.com/macros/s/test/exec',googleClientId:'test-client.apps.googleusercontent.com'};
 if(options.saved!==undefined)w.localStorage.setItem('robot_ideas_user_session',typeof options.saved==='string'?options.saved:JSON.stringify(options.saved));
 const calls=[],configurations=[];let challenges=0,disabledAutoSelect=false;
 w.google={accounts:{id:{initialize(config){configurations.push(config)},renderButton(target){const button=d.createElement('button');button.textContent='Google test sign-in';target.append(button)},disableAutoSelect(){disabledAutoSelect=true}}},script:{run:{withSuccessHandler(success){return {withFailureHandler(failure){return {adminApi(action,payload){calls.push({action,payload});let result={ok:true};
  if(action==='googleChallenge')result.nonce='nonce-'+(++challenges);
  if(action==='googleLogin')result={ok:true,token:'server-session-token',expiresAt:Date.now()+600000,user};
  if(action==='session')result=options.valid===false?{ok:false,code:'AUTH_REQUIRED',error:'Phiên bị thu hồi'}:{ok:true,expiresAt:Date.now()+600000,user};
  if(action==='list')result={ok:true,apiVersion:2,articles:[article]};
  if(action==='get')result=payload.id===article.id?{ok:true,article}:{ok:false,error:'Bài không tồn tại.'};
  try{result=options.handle?.(action,payload,result)??result;queueMicrotask(()=>success(result));}catch(error){failure(error)}
 }}}}}}}};
 const gasRun=w.google.script.run;
 if(!options.appsScript){w.fetch=async(url,init)=>{const body=JSON.parse(init.body),result=await new Promise((resolve,reject)=>gasRun.withSuccessHandler(resolve).withFailureHandler(reject).adminApi(body.action,body.payload));return {ok:true,json:async()=>result}};delete w.google.script;}
 w.eval(fs.readFileSync('account.js','utf8'));if(options.admin!==false)w.eval(fs.readFileSync('admin.js','utf8'));
 return {dom,w,d,calls,configurations,user,async signIn(){await tick();const config=configurations.at(-1);if(!config)throw Error('Google button not initialized');await config.callback({credential:'google-ID-token'});await tick()},get disabledAutoSelect(){return disabledAutoSelect}};
}
module.exports={fixture,tick};
