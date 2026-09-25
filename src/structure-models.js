// Tiny orthographic models, shaded by the same upper-right sun as the globes.
// Geometry is built once. No textures, screen-facing icons or contour strokes.
const TAU=Math.PI*2;
const normalize=v=>{const m=Math.hypot(...v)||1;return v.map(x=>x/m);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0);
const add=(a,b)=>a.map((x,i)=>x+b[i]);
export const STRUCTURE_SUN=Object.freeze(normalize([.88,-.34,.36]));
const HALF=normalize(add(STRUCTURE_SUN,[0,0,1]));
const HULL=[136,152,142],DARK=[71,98,99],PANEL=[67,94,96],STONE=[124,134,114],GLASS=[155,180,169],FABRIC=[172,170,140];
const models=new Map();
export function colonyLayout(count=2){
  count=Math.max(1,Math.min(24,count));const columns=Math.min(count,Math.ceil(Math.sqrt(count*1.6))),rows=Math.ceil(count/columns);
  return{rx:columns*.88+.8,ry:rows*.82+.8,height:2.8,slots:Array.from({length:count},(_,i)=>[(i%columns-(columns-1)/2)*1.65,(Math.floor(i/columns)-(rows-1)/2)*1.5,.25])};
}
function model(kind,detail={}){
  const key=kind==='colony'?`${kind}:${detail.slots??2}:${(detail.ages??[]).join(',')}`:kind;
  if(models.has(key))return models.get(key);
  const faces=[];
  const face=(points,color=HULL,{alpha=1,emission=0,glass=false}={})=>{
    const a=points[1].map((v,i)=>v-points[0][i]),b=points[2].map((v,i)=>v-points[0][i]);
    faces.push({points,color,alpha,emission,glass,normal:normalize(cross(a,b))});
  };
  const box=(x,y,z,w,d,h,color=HULL,options)=>{
    const v=[[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z],[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]];
    for(const f of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])face(f.map(i=>v[i]),color,options);
  };
  const ellipsoid=(x,y,z,rx,ry,rz,color=HULL,{half=false,...options}={})=>{
    const sectors=options.glass?24:12,rows=half?(options.glass?8:4):6,start=half?0:-Math.PI/2;
    const p=(a,b)=>[x+Math.cos(a)*Math.cos(b)*rx,y+Math.sin(a)*Math.cos(b)*ry,z+Math.sin(b)*rz];
    for(let j=0;j<rows;j++)for(let i=0;i<sectors;i++){
      const a=i*TAU/sectors,b=start+j*(Math.PI/2-start)/rows,nb=start+(j+1)*(Math.PI/2-start)/rows;
      face([p(a,b),p(a+TAU/sectors,b),p(a+TAU/sectors,nb),p(a,nb)],color,options);
    }
  };
  const pod=(x,y,z,len=4,width=1.7)=>ellipsoid(x,y,z,len/2,width/2,width/2,HULL);
  const panel=(x,y,z,w,d,tilt=0)=>{
    // Real thin plates; the rim is an unlit side face rather than an outline.
    const p=[[x,y,z],[x+w,y,z+tilt],[x+w,y+d,z+tilt],[x,y+d,z]];
    face(p,PANEL);face([...p].reverse(),DARK);
    face([p[0],p[3],add(p[3],[0,0,-.16]),add(p[0],[0,0,-.16])],DARK);
  };
  const windows=(x,y,z,len=2)=>box(x,y,z,len,.1,.18,[217,203,158],{emission:.7});
  if(kind==='colony'){
    const layout=colonyLayout(detail.slots??2);
    ellipsoid(0,0,.12,layout.rx,layout.ry,.18,STONE);
    layout.slots.forEach(([x,y],i)=>{const age=detail.ages?.[i]??0;
      // Vacant plots are quiet foundation markers, not a checkerboard floor.
      if(!age){box(x-.3,y-.25,.22,.6,.06,.015,STONE);return;}
      box(x-.55,y-.5,.2,1.1,1,.08,DARK);
      if(age===1){face([[x-.5,y-.4,.25],[x+.5,y-.4,.25],[x,y-.4,1.05]],STONE);face([[x-.5,y-.4,.25],[x,y-.4,1.05],[x,y+.4,1.05],[x-.5,y+.4,.25]],HULL);face([[x,y-.4,1.05],[x+.5,y-.4,.25],[x+.5,y+.4,.25],[x,y+.4,1.05]],DARK);}
      else {const height=.55+age*.16;box(x-.5,y-.4,.25,.6,.7,height,HULL);box(x+.16,y-.35,.25,.38,.8,height*.7,DARK);
        if(age===2)box(x-.55,y-.45,height+.25,.7,.8,.13,STONE);
        if(age>=3)windows(x-.43,y-.51,.6,.38);
        if(age>=4){box(x+.2,y-.25,height*.7+.25,.12,.12,.6,HULL);windows(x+.2,y-.46,.45,.2);}
        if(age===5)panel(x-.45,y-.2,height+.34,.5,.35,.2);
      }
    });
    ellipsoid(0,0,.2,layout.rx,layout.ry,layout.height,GLASS,{half:true,glass:true});
    pod(layout.rx-.2,0,.5,1.8,.85);
  }else if(kind==='dome'){
    box(-3.7,-2.3,0,7.4,4.6,.22,STONE);
    box(-1.5,-.65,.22,2.7,1.3,.8,DARK);windows(-1,-.76,.5,1.6);
    ellipsoid(0,0,.2,3.8,2.5,2.2,GLASS,{half:true,glass:true});
    pod(4,0,.7,2.2,1.2);
  }else if(kind==='city'||kind==='outpost'||kind==='archive'){
    box(-4,-2.5,0,8,5,.24,STONE);
    if(kind==='archive'){box(-2,-1.8,.24,4,3.6,2.6,HULL);box(-1.8,-1.6,2.84,3.6,3.2,.18,DARK);windows(-1.3,-1.91,1.5,2.6);}
    else if(kind==='city')for(let i=0;i<5;i++){const h=1.3+i%3;box(-3.5+i*1.4,-1+(i%2),.25,1,1.3,h,HULL);windows(-3.4+i*1.4,-1.1+(i%2),.5, .6);}
    else {pod(-.6,0,1,5,1.8);pod(.6,1.5,.8,3.8,1.5);box(-.8,-.3,.3,1.6,2,.7,DARK);panel(-3.7,-2.1,.7,3,.8,.25);windows(-2,-1,1,2.7);}
  }else if(kind==='rail'){
    for(const y of [-.6,.45])box(-7,y,.3,14,.15,.3,HULL);
    for(let i=0;i<7;i++)box(-6+i*2,-.9,0,.35,1.8,.35,DARK);
  }else if(kind==='array'){
    box(-.22,-2.8,.2,.44,5.6,.3,STONE);
    for(let i=0;i<3;i++){box(-4+i*3,-.2,0,.22,.4,1,STONE);panel(-4.3+i*3,-2,1,2.4,4,.35);}
  }else if(kind==='balloon'){
    box(-1.8,-.7,0,3.6,1.4,.7,DARK);
    for(const x of [-2,2])box(x,-.12,.6,.12,.24,2,HULL);
    ellipsoid(0,0,3.3,5.7,2.2,2.4,FABRIC);windows(-1,-.8,.3,2);
  }else if(kind==='tug'){
    box(-3,-1.2,0,4,2.4,1.4,DARK);pod(.5,0,1,5,1.6);
    for(const y of [-1.9,1.4]){box(-3,y,0,5.7,.45,.55,HULL);box(2.1,y,0,.4,.45,1.3,HULL);}
    box(-3.4,-.8,.3,.4,1.6,.8,DARK);windows(1,-.8,.7,.8);
  }else if(kind==='probe'){
    box(-.8,-.75,0,1.6,1.5,1.8,HULL);box(-.12,-.1,1.8,.24,.2,2,HULL);
    for(const sign of [-1,1]){box(sign<0?-5:.8,-.1,.7,4.2,.2,.2,DARK);panel(sign<0?-5:2,-1.3,.9,3,2.6,.45);}
  }else if(kind==='kite'){
    face([[-4,0,.2],[0,-3,.7],[0,0,1.4]],FABRIC);face([[0,-3,.7],[4,0,.2],[0,0,1.4]],HULL);
    face([[4,0,.2],[0,3,.7],[0,0,1.4]],DARK);face([[0,3,.7],[-4,0,.2],[0,0,1.4]],FABRIC);
    box(-.08,-.08,-3,.16,.16,4,HULL);
  }else if(kind==='dock'){
    for(const y of [-2.4,2])box(-6,y,0,12,.4,.65,HULL);
    for(const x of [-5.5,0,5])box(x,-2,0,.4,4,.45,DARK);
    pod(-4,0,.6,3,1.2);box(4,-1.2,0,1.5,2.4,1.2,HULL);panel(-2,2.4,.2,4,1.5,.2);
  }else if(kind==='collector'){
    pod(0,0,2.5,7,2);box(-.2,-2,.7,.4,4,1.8,DARK);
    panel(-3,-4,2,6,1.6,-.4);panel(-3,2.4,2,6,1.6,.4);
    box(-.28,-.28,-3,.56,.56,5,HULL);
    ellipsoid(0,0,-3,1.6,1.6,.45,DARK);
  }else{
    // A habitat spine and staggered radiators, not the old square + cross icon.
    pod(0,0,1,7.6,2);pod(-2,1.5,.9,2.4,1.4);
    for(const sign of [-1,1]){box(-1,sign<0?-3.3:0,.8,.3,3.3,.3,DARK);panel(-3,sign<0?-4:2.3,1,5,1.7,sign*.35);}
    windows(-2,-1,1,2.8);
  }
  if(models.size>=48)models.delete(models.keys().next().value);models.set(key,faces);return faces;
}
// The two ground axes and outward normal. A surface building is never a
// screen-facing symbol: its roof, walls and footprint turn with the globe.
export function structureFrame({normal=null,angle=0,yaw=.55,pitch=.62}={}){
  let axes;
  if(normal){const n=normalize([normal.x,normal.y,normal.z]),e=Math.hypot(n[0],n[2])<1e-6?[1,0,0]:normalize([n[2],0,-n[0]]),north=normalize(cross(n,e));
    // Local y points south. Local z is the surface normal.
    axes=[e,north,n];
    const [a,b]=axes;axes=[a.map((v,i)=>v*Math.cos(angle)+b[i]*Math.sin(angle)),b.map((v,i)=>v*Math.cos(angle)-a[i]*Math.sin(angle)),n];
  }else{
    axes=[[Math.cos(yaw),Math.sin(yaw)*Math.sin(pitch),Math.sin(yaw)*Math.cos(pitch)],[-Math.sin(yaw),Math.cos(yaw)*Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)],[0,-Math.cos(pitch),Math.sin(pitch)]];
    axes=axes.map(([x,y,z])=>[x*Math.cos(angle)-y*Math.sin(angle),x*Math.sin(angle)+y*Math.cos(angle),z]);
  }
  return axes;
}
export function projectStructure(point,axes){return[0,1,2].map(i=>point.reduce((v,p,k)=>v+p*axes[k][i],0));}
function hull(points){
  const p=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const lower=[],upper=[];for(const v of p){while(lower.length>1&&turn(lower.at(-2),lower.at(-1),v)<=0)lower.pop();lower.push(v);}
  for(const v of p.reverse()){while(upper.length>1&&turn(upper.at(-2),upper.at(-1),v)<=0)upper.pop();upper.push(v);}
  return lower.slice(0,-1).concat(upper.slice(0,-1));
}
function path(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
export function drawStructure(c,x,y,size,kind='station',options={}){
  const {normal=null,lit=1,shadow=false}=options,axes=structureFrame(options),mesh=model(kind,options.detail);
  const groundLight=Math.max(0,dot(axes[2],STRUCTURE_SUN)),direct=normal?groundLight:1;
  c.save();c.translate(x,y);c.scale(size,size);
  if(shadow&&dot(axes[2],STRUCTURE_SUN)>.06){
    const points=mesh.flatMap(f=>f.points).map(v=>{const p=projectStructure(v,axes),height=Math.max(0,v[2]);return p.map((q,i)=>q-STRUCTURE_SUN[i]*height/Math.max(.2,groundLight));});
    path(c,hull(points));c.fillStyle='#14242535';c.fill();
  }
  const faces=mesh.map(f=>{const n=projectStructure(f.normal,axes);return{...f,n,points:f.points.map(p=>projectStructure(p,axes))};})
    .filter(f=>f.n[2]>.005).sort((a,b)=>a.points.reduce((n,p)=>n+p[2],0)/a.points.length-b.points.reduce((n,p)=>n+p[2],0)/b.points.length);
  for(const f of faces){
    const sun=Math.max(0,dot(f.n,STRUCTURE_SUN)),light=.24+sun*.69*(normal?Math.min(1,direct*2):1),emission=f.emission*lit;
    const rgb=f.color.map(v=>Math.round(Math.min(255,v*(f.glass?.6+sun*.4:light+emission))));
    const sheen=f.glass?Math.max(0,dot(f.n,HALF))**20:0;
    const alpha=f.glass?.065+(1-f.n[2])**3*.32+sheen*.3:f.alpha;
    path(c,f.points);c.fillStyle=`rgba(${rgb.join(',')},${alpha})`;c.fill();
  }c.restore();
}

export function surfaceStructure(c,g,p,size,kind,options={}){
  if(p.z<=0)return;
  c.save();c.beginPath();c.arc(g.x,g.y,g.r,0,TAU);c.clip();c.globalAlpha*=Math.min(1,p.z*12);
  drawStructure(c,g.x+p.x*g.r,g.y+p.y*g.r,size,kind,{normal:p,shadow:true,...options});c.restore();
}
