import { drawStructure } from './structure-models.js';
// One construction family for every planet. All points below are in planet
// radii; roof, glazing, ribs, lift and docking collar share the same frame.
const TAU=Math.PI*2,SECTOR=TAU/7;
export const HABITAT=Object.freeze({sections:7,radius:1.16,halfWidth:.021,halfHeight:.010,inclination:.23,roll:-.12,origin:.48});
const clamp=v=>Math.max(0,Math.min(1,v));
const norm=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function turn([x,y,z]){const a=HABITAT.roll;return[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a),z];}
export function habitatPoint(angle,{rotation=0,radius=HABITAT.radius,height=0}={}){
  const a=angle+rotation+HABITAT.origin,t=HABITAT.inclination;
  const [x,y,z]=turn([Math.cos(a)*radius,Math.sin(a)*Math.sin(t)*radius-Math.cos(t)*height,Math.sin(a)*Math.cos(t)*radius+Math.sin(t)*height]);
  return{x,y,z};
}
export function elevatorEndpoints(rotation=0){return{surface:habitatPoint(0,{rotation,radius:1}),port:habitatPoint(0,{rotation})};}
const xyz=p=>[p.x,p.y,p.z];
const HULL=[188,204,183],DECK=[128,164,158],EDGE=[173,179,145],GLASS=[115,159,162];
function polygon(c,g,points,color){c.beginPath();points.forEach((p,i)=>i?c.lineTo(g.x+p[0]*g.r,g.y+p[1]*g.r):c.moveTo(g.x+p[0]*g.r,g.y+p[1]*g.r));c.closePath();c.fillStyle=color;c.fill();}
function cable(c,g,a,b,color,width){c.beginPath();c.moveTo(g.x+a.x*g.r,g.y+a.y*g.r);c.lineTo(g.x+b.x*g.r,g.y+b.y*g.r);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
export function drawHabitatLayer(c,g,{sections=0,building=0,elevator=false,rotation=0,time=0,reducedMotion=false,expanded=false,sun=[1,-.12,.12]}={},front=true){
  const count=Math.max(0,Math.min(7,sections)),extent=Math.min(7,count+clamp(building));
  if(!extent&&!elevator)return;
  const light=norm(sun),faces=[],p=(a,r=HABITAT.radius,h=0)=>xyz(habitatPoint(a,{rotation,radius:r,height:h}));
  const add=(points,color,emission=0)=>{
    const a=points[1].map((v,i)=>v-points[0][i]),b=points[2].map((v,i)=>v-points[0][i]),n=norm(cross(a,b)),depth=points.reduce((n,p)=>n+p[2]/points.length,0);
    if(n[2]<.001||(depth>=0)!==front)return;
    const shade=.44+.16*n[2]+Math.max(0,dot(n,light))*.48+emission;
    faces.push({points,depth,color:`rgb(${color.map(v=>Math.min(255,Math.round(v*shade))).join(',')})`});
  };
  const wedge=(a,b,w,h,color=HULL,caps=true)=>{
    const r=HABITAT.radius,outer=r+w,inner=r-w;
    add([p(a,inner,h),p(a,outer,h),p(b,outer,h),p(b,inner,h)],color); // roof
    add([p(a,outer,-h),p(b,outer,-h),p(b,outer,h),p(a,outer,h)],color);
    add([p(a,inner,h),p(b,inner,h),p(b,inner,-h),p(a,inner,-h)],color);
    add([p(a,inner,-h),p(b,inner,-h),p(b,outer,-h),p(a,outer,-h)],EDGE);
    if(caps){add([p(a,inner,-h),p(a,outer,-h),p(a,outer,h),p(a,inner,h)],EDGE);
      add([p(b,inner,h),p(b,outer,h),p(b,outer,-h),p(b,inner,-h)],EDGE);}
  };
  const {halfWidth:w,halfHeight:h}=HABITAT;
  for(let section=0;section<Math.ceil(extent);section++){
    const end=section*SECTOR+SECTOR*Math.min(1,extent-section);
    for(let i=0;i<24;i++){
      const a=section*SECTOR+i*SECTOR/24,b=Math.min(end,a+SECTOR/24);if(b<=a)break;
      wedge(a,b,w,h,i%6===0?EDGE:HULL,i===0||b===end);
      // Recessed blue roof between pale structural shoulders.
      add([p(a,HABITAT.radius-w*.65,h+.0003),p(a,HABITAT.radius+w*.65,h+.0003),p(b,HABITAT.radius+w*.65,h+.0003),p(b,HABITAT.radius-w*.65,h+.0003)],DECK);
      // Narrow luminous windows embedded in the inward wall, never a halo.
      const d=(b-a)*.22,r=HABITAT.radius-w-.0003;
      add([p(a+d,r,h*.4),p(b-d,r,h*.4),p(b-d,r,-h*.35),p(a+d,r,-h*.35)],GLASS,.23);
      const outside=HABITAT.radius+w+.0003;
      add([p(a+d,outside,-h*.35),p(b-d,outside,-h*.35),p(b-d,outside,h*.4),p(a+d,outside,h*.4)],GLASS,.3);
      if(i%6===3){ // A narrow maintenance spine and cross ribs.
        wedge(a,a+.004,w*1.12,h*1.2,EDGE);
      }
    }
  }
  // The lift's collar exists before the first section, then one pressure joint
  // marks each purchase. Seven purchased sections close at this same collar.
  for(let i=0;i<=Math.floor(extent);i++)if(i<7&&(i||elevator||extent))wedge(i*SECTOR-.009,i*SECTOR+.009,w*1.45,h*1.8);
  if(building>0)wedge(extent*SECTOR-.008,extent*SECTOR+.008,w*1.55,h*1.6,EDGE);
  faces.sort((a,b)=>a.depth-b.depth);
  c.save();
  // Draw the physical cable before the ring collar, so it terminates inside it.
  if(elevator){
    const {surface:a,port:b}=elevatorEndpoints(rotation);
    if((b.z>=0)===front){
      const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,off=.0017;
      for(const sign of [-1,1]){const shift={x:-dy/len*off*sign,y:dx/len*off*sign};cable(c,g,{x:a.x+shift.x,y:a.y+shift.y},{x:b.x+shift.x,y:b.y+shift.y},'#c2d0bc',Math.max(.4,g.r*.002));}
      if(a.z>0)drawStructure(c,g.x+a.x*g.r,g.y+a.y*g.r,g.r*.0028,'outpost',{normal:a,sun,shadow:true});
      const t=reducedMotion?.55:(time*.028)%1,q={x:a.x+dx*t,y:a.y+dy*t,z:a.z+(b.z-a.z)*t};
      drawStructure(c,g.x+q.x*g.r,g.y+q.y*g.r,g.r*(expanded?.0023:.0017),'tug',{angle:Math.atan2(dy,dx),yaw:0,pitch:.6,sun});
    }
  }
  faces.forEach(f=>polygon(c,g,f.points,f.color));
  if(elevator){const port=habitatPoint(0,{rotation,height:h*1.8});if((port.z>=0)===front)
    drawStructure(c,g.x+port.x*g.r,g.y+port.y*g.r,g.r*(expanded?.005:.0037),'dock',{normal:habitatPoint(0,{rotation,radius:1}),angle:Math.PI/2,sun});}
  if(extent)for(let i=0;i<2;i++){
    const a=extent*SECTOR*(reducedMotion?.28+i*.36:((time*.009+i*.5)%1)),q=habitatPoint(a,{rotation,height:h+.003});
    if((q.z>=0)===front)drawStructure(c,g.x+q.x*g.r,g.y+q.y*g.r,g.r*.0015,'tug',{normal:q,angle:Math.PI/2,sun});
  }
  c.restore();
}
