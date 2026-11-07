const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
function loadWorkbench(html=fs.readFileSync('links/linkS.html','utf8')){
 const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
 const element=()=>({relList:{supports:()=>true},style:{},setAttribute(){},removeAttribute(){},appendChild(){},addEventListener(){},getContext(){return{}}});
 const context=vm.createContext({console,performance,crypto,structuredClone,Blob,URL,TextEncoder,TextDecoder,setTimeout,clearTimeout,setInterval,clearInterval,
  document:{createElement:element,querySelectorAll:()=>[],addEventListener(){},documentElement:{style:{}},body:element()},navigator:{userAgent:'linkS test'},MutationObserver:class{observe(){}},LinkGoI18n:{translate:x=>x,language:'vi'},LinkGoHelp:{flatten:()=>'',describe:()=>''},LinkSharkUI:{toolbarLabel:x=>x,bindEditor(){},bindWorkspace(){}}});
 vm.runInContext('window=globalThis;',context);
 for(const match of scripts)if(/root\.LinkShark(?:CAD|Forces|Transmission|Traces|Compat)=/.test(match[2]))vm.runInContext(match[2],context);
 let script=scripts.find(m=>m[2].includes('const ms=['))[2];const cut=script.indexOf('const linkgoRoot=zh.createRoot');if(cut<0)throw Error('Missing engine boundary.');
 script=script.slice(0,cut)+'\nglobalThis.WorkbenchTest={templates:ms,blank:$m,defaults:wg,generate:Sg,evaluate:ho,advance:ao,serialize:cg,validate:Il};';
 vm.runInContext(script,context,{timeout:10000});return {api:context.WorkbenchTest,context};
}
module.exports={loadWorkbench};
