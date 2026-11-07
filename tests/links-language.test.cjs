const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parse}=require('acorn');
const {loadWorkbench}=require('./helpers/links-native.cjs');
const html=fs.readFileSync('links/linkS.html','utf8'),scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
const plain=x=>JSON.parse(JSON.stringify(x));
function walk(node,fn){if(!node||typeof node!=='object')return;fn(node);for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(n=>walk(n,fn));else if(value&&typeof value==='object')walk(value,fn);}}
test('all executable defaults outside the original-language dictionary are Vietnamese',()=>{
 const remaining=[];for(const m of scripts){if(m[1].includes('linkgo-i18n'))continue;walk(parse(m[2],{ecmaVersion:'latest'}),n=>{const s=n.type==='Literal'?n.value:n.type==='TemplateElement'?n.value.cooked:null;if(typeof s==='string'&&/\p{Script=Han}/u.test(s))remaining.push(s);});}assert.deepEqual(remaining,[]);
 const info=JSON.parse(fs.readFileSync('links/build-info.json','utf8'));assert.equal(info.defaultLanguage,'vi');assert.ok(info.localizedDefaults>1000);
 const staticHtml=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi,'');assert.ok(!/\p{Script=Han}/u.test(staticHtml),'loading screen and metadata');
});
test('stock models, blank designs and generated transmissions store Vietnamese names in exported JSON',()=>{
 const {api,context}=loadWorkbench();assert.equal(api.templates.length,9);assert.equal(context.LinkSharkNative.templates.length,11);
 for(const model of [...api.templates,api.blank(api.templates[0].environment)]){
  assert.ok(!/\p{Script=Han}/u.test(api.serialize(model)),model.id);assert.deepEqual(plain(api.validate(api.serialize(model))),plain(model));
 }
 for(const kind of ['gear','chain','belt']){const input=api.defaults()[kind];const m=api.generate(api.blank(api.templates[0].environment),input).model;assert.ok(!/\p{Script=Han}/u.test(JSON.stringify(m)),kind);}
 const custom=plain(api.templates[0]);custom.name='项目 của người dùng';custom.joints[0].name='Tên tự đặt 自定义';assert.equal(api.validate(api.serialize(custom)).name,custom.name);assert.equal(api.validate(api.serialize(custom)).joints[0].name,custom.joints[0].name);
});
test('localized gear and chain mechanisms keep the numerical tooth ratio during continuous simulation',()=>{
 const {api,context}=loadWorkbench();for(const kind of ['gear','chain']){const m=context.LinkSharkNative.templates.find(m=>m.id==='shark-'+kind+'-pair');let state={model:plain(m),time:0,driverOverrides:{}};for(let i=0;i<120;i++){const next=api.advance(state,.05);assert.equal(next.stopped,false);assert.equal(next.evaluation.telemetry.converged,true);state=next.state;}const result=api.evaluate(state);assert.ok(Math.abs(result.solvedLinks[1].omega/result.solvedLinks[0].omega-(kind==='gear'?-.5:.5))<.005);}
});
test('English and explicit original-language display still work with Vietnamese source defaults',()=>{
 const script=scripts.find(m=>m[1].includes('linkgo-i18n'))[2];
 const context=vm.createContext({CanvasRenderingContext2D:class{fillText(){}strokeText(){}measureText(){}},LinkSDraftStorage:{getItem:()=>null,setItem(){}},document:{documentElement:{},title:''},Event:class{},Map});
 vm.runInContext('window=globalThis;alert=confirm=prompt=()=>{};dispatchEvent=()=>{};',context);vm.runInContext(script,context);
 const i=context.LinkGoI18n;assert.equal(i.language,'vi');assert.equal(i.translate('连杆 L_'),'Thanh liên kết L_');assert.equal(i.translate('constructor'),'constructor');i.setLanguage('en');
 assert.equal(i.translate('Mở tệp JSON'),'Open JSON file');assert.ok(!i.translate('Gối cố định O_3').includes('Gối cố định'));assert.equal(i.translate('vàng'),'vàng');
 assert.equal(i.translate('constructor'),'constructor');
 i.setLanguage('zh-CN');assert.equal(i.translate('Thanh liên kết L_'),'连杆 L_');i.setLanguage('vi');assert.equal(i.translate('Thanh liên kết L_'),'Thanh liên kết L_');
});
