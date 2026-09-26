// Shared planet material: a smooth limb, muted albedo and vector isophotes.
// Surface marks and lighting stay separate; no image textures or faceted light.
const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function sphereGradient(c,r,palette,sun=[.94,0,.34]){
  const angle=Math.atan2(sun[1],sun[0]),g=c.createRadialGradient(Math.cos(angle)*r*.25,Math.sin(angle)*r*.25,r*.1,0,0,r);
  g.addColorStop(0,palette[0]);g.addColorStop(.7,palette[1]);g.addColorStop(1,palette[2]);
  return g;
}
export function sphereBase(c,r,palette,sun=[.94,0,.34]){
  c.fillStyle=sphereGradient(c,r,palette,sun);c.beginPath();c.arc(0,0,r,0,TAU);c.fill();
}
export function surfacePath(c,points,r){
  const visible=[];
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length];if(a.z>=0)visible.push(a);
    if((a.z>=0)!==(b.z>=0)){const t=a.z/(a.z-b.z);visible.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
  }
  if(visible.length<3)return;visible.forEach((p,i)=>i?c.lineTo(p.x*r,p.y*r):c.moveTo(p.x*r,p.y*r));c.closePath();
}
export function surfacePolygon(c,points,r,color){c.beginPath();surfacePath(c,points,r);c.fillStyle=color;c.fill();
}
const caches=new WeakMap();
export function sphereNight(c,r,sun=[.94,0,.34]){
  const length=Math.hypot(...sun)||1,z=Math.round(clamp(sun[2]/length,-1,1)*80)/80,side=Math.sqrt(1-z*z),angle=Math.atan2(sun[1],sun[0]);
  const doc=c.canvas.ownerDocument;let cache=caches.get(doc);if(!cache){cache=new Map();caches.set(doc,cache);}
  let bands=cache.get(z);
  if(!bands){
    bands=[];const Path=doc.defaultView.Path2D,phi=Math.atan2(side,z),steps=32;
    for(let layer=0;layer<steps;layer++){
      const k=(.5-layer/steps)/2.8,left=[],right=[],path=new Path();
      for(let j=0;j<=96;j++){
        const y=-1+j/48,R=Math.sqrt(Math.max(0,1-y*y)),alpha=Math.acos(clamp(k/(R||1e-9),-1,1));
        const lo=clamp(phi-alpha,-Math.PI/2,Math.PI/2),hi=clamp(phi+alpha,-Math.PI/2,Math.PI/2);
        left.push([R*Math.sin(lo),y]);right.push([R*Math.sin(hi),y]);
      }
      for(const [edge,sign]of [[left,-1],[right,1]]){
        edge.forEach(([x,y],i)=>i?path.lineTo(x,y):path.moveTo(x,y));
        for(let j=96;j>=0;j--){const y=-1+j/48;path.lineTo(sign*Math.sqrt(Math.max(0,1-y*y)),y);}path.closePath();
      }
      const step=158/255/steps;bands.push({path,alpha:step/(1-layer*step)});
    }
    if(cache.size>=24)cache.delete(cache.keys().next().value);cache.set(z,bands);
  }
  c.save();c.rotate(angle);c.scale(r,r);
  for(const {path,alpha}of bands){c.fillStyle=`rgba(7,16,23,${alpha})`;c.fill(path);}c.restore();
}
