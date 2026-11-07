/* Runs before the workbench starts. A direct web visit uses memory, never shared browser drafts. */
(() => {
  'use strict';
  let storage;
  if(window.parent!==window){try{storage=window.parent.LinkSWorkspaceStorage.connect(window);}catch{}}
  if(!storage){
    const memory=new Map();
    storage={getItem:key=>memory.get(String(key))??null,setItem:(key,value)=>memory.set(String(key),String(value)),removeItem:key=>memory.delete(String(key)),clear:()=>memory.clear(),key:index=>[...memory.keys()][index]??null,get length(){return memory.size;}};
  }
  window.LinkSDraftStorage=storage;
})();
