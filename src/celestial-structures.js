import { drawStructure } from './structure-models.js';
// Small construction silhouettes shared by the planetary and Earth–Moon views.
// These are hulls, trusses and window bands; only arks use drawArkLight.
export const TAU=Math.PI*2;
export const clamp=v=>Math.max(0,Math.min(1,v));
export const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const noise=n=>{n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);return((n^(n>>>15))>>>0)/4294967296;};
export function line(c,points,color='#a5b4a48a',width=.7){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
export function disc(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
export const structure=drawStructure;
export function tether(c,x,y,r,p,{time=0,reducedMotion=false}={}){
  if(p.z<=.04)return;const len=Math.hypot(p.x,p.y)||1,ux=p.x/len,uy=p.y/len;
  const a=[x+p.x*r,y+p.y*r],b=[x+ux*r*1.28,y+uy*r*1.28];
  line(c,[a,b],'#c2c5a999',.65);structure(c,...b,Math.max(.45,r*.009),'station');
  const t=reducedMotion?.6:(time*.06)%1;structure(c,a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,Math.max(.3,r*.006),'tug',{angle:Math.atan2(uy,ux)});
}
export function habitatRing(c,g,count,building,front,time=0){
  if(!count&&!building)return;c.save();c.translate(g.x,g.y);c.rotate(-.16);
  const r=g.r*1.15,width=Math.max(.55,g.r*.013),height=Math.max(.45,g.r*.009);
  const point=(a,radius,z=0)=>[Math.cos(a)*radius,Math.sin(a)*radius*.2-z];
  const face=(points,color)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();};
  for(let i=0;i<Math.min(7,count+(building>0?1:0));i++){
    c.save();c.globalAlpha*=i<count?1:.16+building*.5;
    const from=i*TAU/7+.025,to=(i+1)*TAU/7-.025;
    for(let a=from;a<to;a+=.04){
      const b=Math.min(to,a+.04),mid=(a+b)/2;if((Math.sin(mid)>=0)!==front)continue;
      const light=.34+.52*Math.max(0,Math.cos(mid)*.8-Math.sin(mid)*.2);
      face([point(a,r-width,height),point(a,r+width,height),point(b,r+width,height),point(b,r-width,height)],'#8f9e8b');
      face([point(a,r+width,height),point(a,r+width,-height),point(b,r+width,-height),point(b,r+width,height)],`rgb(${[144,158,138].map(v=>Math.round(v*light))})`);
      if(front&&Math.floor(a*50)%9===0)line(c,[point(a,r+width),point(b,r+width)],'#d0c49a70',.45);
    }
    if(i===count&&building){const a=from+(to-from)*building;if((Math.sin(a)>=0)===front)structure(c,...point(a,r,height),Math.max(.22,g.r*.004),'dock',{yaw:a,pitch:.4});}
    c.restore();
  }c.restore();
}
