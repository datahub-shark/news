import {parse} from 'acorn';

const han=/\p{Script=Han}/u;
const punctuation=/[，；：。（）、]/u;
const tidy=s=>s.replace(/，/g,', ').replace(/；/g,'; ').replace(/：/g,': ').replace(/。/g,'.').replace(/（/g,' (').replace(/）/g,')').replace(/、/g,', ').replace(/ {2,}/g,' ');
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function walk(node,visit){if(!node||typeof node!=='object')return;visit(node);for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(n=>walk(n,visit));else if(value&&typeof value==='object')walk(value,visit);}}

/** Translate source defaults rather than editing imported or saved user models. */
export function localizeLinks(html,overrides={}){
 const scriptPattern=/<script([^>]*)>([\s\S]*?)<\/script>/g;
 const scripts=[...html.matchAll(scriptPattern)],i18n=scripts.find(m=>/\bid=["']linkgo-i18n["']/.test(m[1]));
 if(!i18n)throw Error('Missing workbench language dictionary.');
 let dictionaryNode;
 walk(parse(i18n[2],{ecmaVersion:'latest'}),node=>{if(node.type==='VariableDeclarator'&&node.id.name==='dictionary')dictionaryNode=node.init;});
 if(dictionaryNode?.type!=='ObjectExpression')throw Error('Language dictionary format changed.');
 const dictionary={};
 for(const property of dictionaryNode.properties){
  if(property.type!=='Property'||property.key.type!=='Literal'||property.value.type!=='ArrayExpression')throw Error('Language dictionary entry changed.');
  dictionary[property.key.value]=property.value.elements.map(n=>n.value);
 }
 Object.assign(dictionary,overrides);
 for(const [key,pair] of Object.entries(dictionary)){
  if(!Array.isArray(pair)||pair.length!==2||pair.some(v=>typeof v!=='string'))throw Error('Invalid translation: '+key);
  dictionary[key]=pair.map(tidy);
 }
 const pattern=new RegExp(Object.keys(dictionary).sort((a,b)=>b.length-a.length).map(escape).join('|'),'g');
 const convert=(value,language=0)=>tidy(value.replace(pattern,key=>dictionary[key][language]));
 const reverse={};
 for(const [key,[vi,en]] of Object.entries(dictionary))if(vi.trim())reverse[vi]=[en,key];
 let changed=0;
 function translation(value){
  if(!han.test(value)&&!punctuation.test(value))return value;
  const vi=convert(value),en=convert(value,1);
  if(han.test(vi))throw Error('Untranslated default: '+value);
  if(vi.trim())reverse[vi]=[en,value];
  return vi;
 }
 function translateScript(source){
  const edits=[];
  walk(parse(source,{ecmaVersion:'latest',sourceType:'script'}),node=>{
   if(node.type==='Literal'&&typeof node.value==='string'){
    const vi=translation(node.value);if(vi!==node.value)edits.push({start:node.start,end:node.end,text:JSON.stringify(vi)});
   }else if(node.type==='TemplateElement'&&typeof node.value.cooked==='string'){
    const vi=translation(node.value.cooked);if(vi!==node.value.cooked)edits.push({start:node.start,end:node.end,text:vi.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${')});
   }
  });
  changed+=edits.length;
  for(const edit of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,edit.start)+edit.text+source.slice(edit.end);
  return source;
 }
 // Only language dictionaries retain original-language keys. Every executable default is Vietnamese.
 const transformed=scripts.map(match=>({match,source:match===i18n?null:translateScript(match[2])}));
 let languageSource=i18n[2];
 languageSource=languageSource.slice(0,dictionaryNode.start)+JSON.stringify(dictionary)+languageSource.slice(dictionaryNode.end);
 const before="  function translate(value) {\n    if (typeof value !== 'string' || language === 'zh-CN' || !/[\\u3400-\\u9fff]/.test(value)) return value;\n    if (cache.has(value)) return cache.get(value);\n    const result = value.replace(pattern, key => dictionary[key][language === 'vi' ? 0 : 1]);\n    cache.set(value, result);\n    return result;\n  }";
 const after=`  const reverseDictionary=${JSON.stringify(reverse)};
  const reversePattern=new RegExp(${JSON.stringify(Object.keys(reverse).sort((a,b)=>b.length-a.length).map(escape).join('|'))},'g');
  function translate(value) {
    if(typeof value!=='string')return value;
    if(language==='vi'&&!/[\\u3400-\\u9fff]/.test(value))return value;
    if(cache.has(value))return cache.get(value);
    const vi=value.replace(pattern,key=>dictionary[key][0]);
    const exact=Object.hasOwn(reverseDictionary,vi)?reverseDictionary[vi]:null;
    const result=language==='vi'?vi:exact?exact[language==='en'?0:1]:vi.replace(reversePattern,(key,offset,text)=>{
      if(/[\\p{L}\\p{N}]/u.test(key[0])&&/[\\p{L}\\p{N}]/u.test(text[offset-1]||''))return key;
      if(/[\\p{L}\\p{N}]/u.test(key.at(-1))&&/[\\p{L}\\p{N}]/u.test(text[offset+key.length]||''))return key;
      return reverseDictionary[key][language==='en'?0:1];
    });
    if(cache.size>=2000)cache.clear();cache.set(value,result);return result;
  }`;
 if(languageSource.split(before).length!==2)throw Error('Language function anchor changed.');
 languageSource=languageSource.replace(before,()=>after);
 for(const {match,source} of transformed.reverse()){
  const script=match===i18n?languageSource:source;
  html=html.slice(0,match.index)+`<script${match[1]}>${script}</script>`+html.slice(match.index+match[0].length);
 }
 const attributeBefore="if(typeof props[attribute]==='string' && /[\\u3400-\\u9fff]/.test(props[attribute]))";
 if(html.split(attributeBefore).length!==2)throw Error('Language attribute anchor changed.');
 html=html.replace(attributeBefore,"if(typeof props[attribute]==='string')");
 // Translate the loading screen and HTML metadata too, while preserving styles and attribution comments.
 html=html.split(/(<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<!--[\s\S]*?-->)/gi).map((part,index)=>index%2?part:convert(part)).join('');
 return{html,changedDefaults:changed};
}
