import {readFile} from 'node:fs/promises';
export async function enhanceLinks(html){
  const [header,js,css]=await Promise.all(['workspace-header.html','workspace-ui.js','workspace-ui.css'].map(name=>readFile('links/'+name,'utf8').then(s=>s.replace(/\r\n/g,'\n'))));
  const replace=(before,after)=>{if(html.split(before).length!==2)throw Error('Workspace integration anchor changed: '+before.slice(0,70));html=html.replace(before,()=>after);};
  const oldHeader=html.match(/<header id="ls-header">[\s\S]*?<\/header>/)?.[0];
  if(!oldHeader)throw Error('Missing workbench header.');
  replace(oldHeader,header.trim());
  // Use native selection, editing and history rather than simulating pointer/key events.
  replace("  selection:typeof je!=='undefined'?je:null,", "  selection:typeof je!=='undefined'?je:null,\n  selectObject:x=>{j(!1);Pe(x,!1)},selectionAction:wi,updateJoint:Mi,updateLink:Ds,\n  obstacleAt:(x,y,pad)=>m.obstacles.slice().reverse().find(item=>I0(zr(item,oe.solvedJoints,oe.solvedLinks),x,y,pad))?.id,\n  setGridSnap:pt,gridSnap:Mt,");
  replace('if(!o||J!=null&&J.isContentEditable||["INPUT","TEXTAREA","SELECT"].includes(J==null?void 0:J.tagName))return;', 'if(C.defaultPrevented||!o||J!=null&&J.isContentEditable||J?.closest?.(\'dialog[open],[role="dialog"],[role="menu"]\')||["INPUT","TEXTAREA","SELECT"].includes(J==null?void 0:J.tagName))return;');
  replace("      ['Ctrl + D','Nhân bản đối tượng đang chọn'],", "      ['Ctrl + D','Nhân bản đối tượng đang chọn'],\n      ['F2','Đổi tên đối tượng đang chọn'],\n      ['Alt + Enter','Mở thuộc tính đối tượng'],\n      ['Chuột phải / Shift + F10','Menu thay đổi nhanh trên bản vẽ'],");
  // Picking overlays run in document capture phase, before the contextual menu listener.
  for(const before of ["if(!pick||event.target.tagName!=='CANVAS'||!scene)return;", "function candidate(event){if(!pick||", "document.addEventListener('pointerdown',event=>{if(!pick||!scene||"]){
    replace(before,before.replace('if(!pick||','if(event.button!==0||!pick||'));
  }
  html=html.replace('</head>',()=>'<style id="links-workspace-ui-css">'+css+'</style></head>');
  html=html.replace('</body>',()=>'<script id="links-workspace-ui">'+js.replace(/<\/script/gi,'<\\/script')+'</script></body>');
  return html;
}
