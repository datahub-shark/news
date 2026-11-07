const fs=require('node:fs'),{JSDOM,VirtualConsole}=require('jsdom');
async function workspacePage(){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.cause?.stack||e.message));vc.on('error',e=>errors.push(String(e)));
 // Layout and rasterization belong to browser QA; execute the complete production React/editor scripts here.
 const html=fs.readFileSync('links/linkS.html','utf8').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
 const dom=new JSDOM(html,{url:'https://example.com/links/linkS.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  class Context{fillText(){}strokeText(){}measureText(t){return{width:String(t).length*6}}}
  w.CanvasRenderingContext2D=Context;
  w.HTMLCanvasElement.prototype.getContext=function(){if(!this.ctx){const c=new Context();c.canvas=this;this.ctx=new Proxy(c,{get(t,k){return k in t?t[k]:()=>{};}});}return this.ctx;};
  w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:600,right:1000,bottom:600});
  Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return 1000}});Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return 600}});
  w.HTMLElement.prototype.scrollIntoView=function(){};w.structuredClone=structuredClone;w.ResizeObserver=class{observe(){}disconnect(){}};
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
  w.alert=()=>{};w.prompt=()=>null;w.confirm=()=>false;
 }});
 const w=dom.window,d=w.document;
 const tick=()=>new Promise(r=>setTimeout(r,35));
 async function until(fn){for(let i=0;i<100;i++){if(fn())return;await tick();}throw Error('Workspace did not reach expected state. '+errors.join('\n'));}
 await until(()=>d.getElementById('links-language')&&w.LinkSharkUI.getWorkspace());
 const editor=()=>w.LinkSharkUI.getEditor();
 async function open(id='shark-gear-pair'){w.LinkSharkUI.getWorkspace().create(structuredClone(w.LinkSharkNative.templates.find(m=>m.id===id)));await until(()=>editor()?.model.id===id&&d.querySelector('canvas'));await tick();}
 function scene(){const canvas=d.querySelector('[role="tabpanel"]:not([style*="display: none"]) canvas'),e=editor(),project=(x,y)=>({sx:200+x*1000,sy:300-y*1000});w.LinkSharkCADUI.draw(canvas.getContext('2d'),e.model,e.evaluation.solvedJoints,e.evaluation.solvedLinks,project,1000);return {canvas,project};}
 async function right(x,y){const {canvas}=scene();canvas.dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:x,clientY:y,button:2}));await tick();return d.getElementById('links-context-menu');}
 function action(text){const b=[...d.querySelectorAll('#links-context-menu button')].find(b=>b.textContent.startsWith(text));if(!b)throw Error('Missing context action '+text);b.click();}
 function key(key,options={},target=d.body){target.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...options}));}
 return{dom,w,d,errors,until,tick,editor,open,scene,right,action,key};
}
module.exports={workspacePage};
