import { drawArkLight } from './ark-lights.js';
import { arksMoored, flightProgress, FACILITIES } from './solar-industry.js';
import { clamp, smooth, line, TAU } from './celestial-structures.js';
// UI-owned, bounded presentation memory. A reload never fabricates arrivals,
// and no event, counter or timestamp is written into the saved simulation.
export function createSolarVisualHistory(){
  let previous=null,owner=null,events=[];
  return{observe(o){
    if(owner!==o||previous&&o.elapsed<previous.time){owner=o;previous=null;events=[];}
    if(previous&&o.elapsed-previous.time<4){
      for(const [key,f]of Object.entries(FACILITIES))if(!previous.ranks[key]&&o.solar.facilities[key])events.push({kind:'arrival',body:f.body,at:o.elapsed});
    }
    events=events.filter(e=>o.elapsed-e.at<2).slice(-16);
    previous={time:o.elapsed,ranks:{...o.solar.facilities}};return events;
  },reset(){owner=null;previous=null;events=[];}};
}
export function arkArc(a,b,t,lift=.15){
  const u=1-t,m={x:(a.x+b.x)/2,y:(a.y+b.y)/2-Math.hypot(b.x-a.x,b.y-a.y)*lift};
  return{x:u*u*a.x+2*u*t*m.x+t*t*b.x,y:u*u*a.y+2*u*t*m.y+t*t*b.y};
}
export function arkWake(c,p,prior,{scale=1,brightness=1,tail=8}={}){
  const dx=p.x-prior.x,dy=p.y-prior.y,length=Math.hypot(dx,dy)||1,tx=p.x-dx/length*tail*scale,ty=p.y-dy/length*tail*scale;
  const g=c.createLinearGradient(tx,ty,p.x,p.y);g.addColorStop(0,'#e6d6a400');g.addColorStop(1,'#e6d6a4aa');line(c,[[tx,ty],[p.x,p.y]],g,.9*scale);
  drawArkLight(c,p.x,p.y,{radius:.85*scale,glow:4*scale,brightness});
}
export function arrivalRing(c,x,y,r,progress){
  const p=clamp(progress);c.save();c.globalAlpha*=Math.sin(p*Math.PI)*.55;c.strokeStyle='#e6d6a4';c.lineWidth=.65;c.beginPath();c.ellipse(x,y,r*(.2+p*.8),r*(.08+p*.3),-.2,0,TAU);c.stroke();c.restore();
}
export function dockPosition(g,index,count,time=0){
  const a=2.9+(index-(count-1)/2)*.12+time*.015;
  return{x:g.x+Math.cos(a)*g.r*1.16,y:g.y+Math.sin(a)*g.r*.38};
}
export function departureDock(g,o,f,time=0){
  const count=arksMoored(o)+o.solar.flights.filter(other=>other.from==='mars'&&other.departAt>=f.departAt).length;
  return dockPosition(g,Math.max(0,count-1),count,time);
}
export function founderPosition(g,time=0){const a=2.7+time*.015;return{x:g.x+Math.cos(a)*g.r*1.12,y:g.y+Math.sin(a)*g.r*.38};}
export function drawMooredArks(c,g,o,time,{reducedMotion=false}={}){
  const count=arksMoored(o),recent=reducedMotion?[]:o.solar.flights.filter(f=>f.from==='mars'&&o.elapsed-f.departAt<3);
  const displayCount=count+recent.reduce((v,f)=>v+1-smooth((o.elapsed-f.departAt)/3),0);
  for(let i=0;i<Math.min(32,count);i++){const p=dockPosition(g,i,displayCount,time);drawArkLight(c,p.x,p.y,{radius:.8,glow:4,brightness:.85});}
}
export function drawWorldTraffic(c,w,h,g,body,o,{time=0,reducedMotion=false,events=[]}={}){
  if(body.id==='mars'){
    drawMooredArks(c,g,o,time,{reducedMotion});
    for(const f of o.solar.flights.filter(f=>f.from==='mars'&&o.elapsed-f.departAt<3)){
      if(reducedMotion)continue;const age=o.elapsed-f.departAt,origin=departureDock(g,o,f,time),end={x:w*.92,y:h*.12};
      const t=smooth((age-.6)/2.4),p=arkArc(origin,end,t,-.1),prior=arkArc(origin,end,Math.max(0,t-.04),-.1);
      arkWake(c,p,prior,{brightness:1+Math.max(0,1-age/.6),tail:9});
    }
  }
  const incoming=o.solar.flights.filter(f=>f.body===body.id);
  for(const f of incoming){
    const p=reducedMotion?.5:smooth(flightProgress(o,f)),start={x:w*.06,y:h*.16},end=founderPosition(g,time);
    const at=arkArc(start,end,p,.2),prev=arkArc(start,end,Math.max(0,p-.04),.2);arkWake(c,at,prev,{brightness:1.1});
    if(!reducedMotion&&f.arriveAt-o.elapsed<2)arrivalRing(c,end.x,end.y,g.r*.16,1-(f.arriveAt-o.elapsed)/2);
    c.fillStyle='#beccb6';c.font='9px ui-monospace,monospace';c.textAlign='left';c.fillText(`${Math.max(0,Math.ceil(f.arriveAt-o.elapsed))}s`,Math.min(w-35,at.x+9),Math.max(20,at.y-10));
  }
  if(!reducedMotion)for(const e of events.filter(e=>e.body===body.id)){const end=founderPosition(g,time);arrivalRing(c,end.x,end.y,g.r*.25,(o.elapsed-e.at)/2);}
}
export function drawTransferDescent(c,x,y,size,age,{reducedMotion=false}={}){
  if(reducedMotion||age<0||age>2)return;const p=clamp(age/2),top=y-size*(1-p);
  const g=c.createLinearGradient(x,top,x,y);g.addColorStop(0,'#e6d6a400');g.addColorStop(1,'#e6d6a4a0');line(c,[[x,top],[x,y]],g,.8);
  c.save();c.globalAlpha*=Math.sin(p*Math.PI)*.35;c.fillStyle='#e6d6a4';c.beginPath();c.ellipse(x,y,Math.max(2,size*.07),Math.max(1,size*.025),0,0,TAU);c.fill();c.restore();
}
