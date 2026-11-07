/* Private previews are drawn locally from the authenticated project's model. */
(() => {
  'use strict';
  const ns='http://www.w3.org/2000/svg';
  function render(host,model,name){
    const svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 320 180');svg.setAttribute('role','img');
    svg.setAttribute('aria-label','Xem trước '+name);
    const joints=new Map((model?.joints||[]).filter(j=>Number.isFinite(j.x)&&Number.isFinite(j.y)).map(j=>[j.id,j]));
    if(!joints.size){host.textContent='Thiết kế chưa có khớp';return;}
    const shapes=[],points=[...joints.values()];
    const color=value=>/^#[\da-f]{3,8}$/i.test(value||'')?value:'#168477';
    for(const link of (model.links||[]).slice(0,2000)){
      const a=joints.get(link.jointA),b=joints.get(link.jointB);if(!a||!b)continue;
      const angle=Math.atan2(b.y-a.y,b.x-a.x),cos=Math.cos(angle),sin=Math.sin(angle);
      const paths=link.cadProfile?.paths;
      if(Array.isArray(paths)&&paths.length){
        for(const path of paths.slice(0,200)){
          const local=(path.points||[]).slice(0,5000).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
          const world=local.map(p=>({x:a.x+p.x*cos-p.y*sin,y:a.y+p.x*sin+p.y*cos}));
          if(world.length>1){points.push(...world);shapes.push({type:'path',points:world,closed:path.closed,color:color(link.color)});}
        }
      }else shapes.push({type:'link',points:[a,b],color:color(link.color)});
    }
    for(const gear of (model.gears||[]).slice(0,500))for(const side of ['A','B']){
      const p=joints.get(gear['joint'+side]),r=gear['radius'+side];
      if(p&&Number.isFinite(r)&&r>0){points.push({x:p.x-r,y:p.y-r},{x:p.x+r,y:p.y+r});shapes.push({type:'gear',p,r});}
    }
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const p of points){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}
    const scale=Math.min(280/Math.max(maxX-minX,0.001),140/Math.max(maxY-minY,0.001));
    const xy=p=>[160+(p.x-(minX+maxX)/2)*scale,90-(p.y-(minY+maxY)/2)*scale];
    function add(tag,attrs){const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));svg.append(el);}
    for(const shape of shapes){
      if(shape.type==='gear'){const [cx,cy]=xy(shape.p);add('circle',{cx,cy,r:shape.r*scale,fill:'#e3f0ed',stroke:'#759e95','stroke-width':1.5});}
      else add('path',{d:shape.points.map((p,i)=>(i?'L':'M')+xy(p).join(',')).join(' ')+(shape.closed?' Z':''),fill:shape.closed?shape.color:'none','fill-opacity':0.13,stroke:shape.color,'stroke-width':shape.type==='link'?6:1.5,'stroke-linecap':'round','stroke-linejoin':'round'});
    }
    for(const p of joints.values()){const [cx,cy]=xy(p);if(p.isGround)add('path',{d:`M${cx-7},${cy+9} L${cx},${cy} L${cx+7},${cy+9} Z`,fill:'#c3d6cf',stroke:'#476e64','stroke-width':1});add('circle',{cx,cy,r:p.isDriver?4.5:3,fill:p.isDriver?'#ef9b36':'#fff',stroke:'#245e55','stroke-width':1.5});}
    host.replaceChildren(svg);
  }
  window.LinkSProjectPreview={render};
})();
