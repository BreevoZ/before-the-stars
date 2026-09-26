import { surfaceStructure, worldStructureSize } from './structure-models.js';
import { drawPlanetSphere } from './planet-render.js';
import { satellitesOf, destination, surfaceOf, satellitePeriodSeconds } from './solar-bodies.js';
import { drawOrbitStars } from './orbital-render.js';
import { drawArkLight } from './ark-lights.js';
import { facilityAt } from './solar-industry.js';
import { structure, line } from './celestial-structures.js';
import { planetAppearance, surfaceSite, drawSurfaceWorks, drawOrbitalWorks } from './solar-world-effects.js';
import { drawWorldTraffic, founderPosition } from './solar-travel.js';
const TAU=Math.PI*2;
const noise=n=>{n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);return((n^(n>>>15))>>>0)/4294967296;};
export function worldGeometry(body,w,h){
  const moons=satellitesOf(body.id),outer=Math.max(surfaceOf(body).rings?.outer??1.15,...moons.map(m=>m.orbit));
  const tilt=-(surfaceOf(body).tilt??.12),vertical=outer*Math.hypot(Math.sin(tilt),.32*Math.cos(tilt))+.16;
  return{x:w*.5,y:h*.51,r:Math.min(h*.34,w/(outer*2.35),h/(vertical*2.35)),outer};
}
const orbitTilt=moon=>-(surfaceOf(destination(moon.parent)).tilt??.12);
// Real period ratios on the shared satellite clock; retrograde runs backwards.
export function satellitePose(moon,time,g){
  const a=moon.phase+time/satellitePeriodSeconds(moon)*TAU,r=g.r*moon.orbit,tilt=orbitTilt(moon);
  const x=Math.cos(a)*r,y=Math.sin(a)*r*.32;
  return{x:g.x+x*Math.cos(tilt)-y*Math.sin(tilt),y:g.y+x*Math.sin(tilt)+y*Math.cos(tilt),z:Math.sin(a),r:Math.max(2.4,g.r*moon.size)};
}
export function satelliteAt(body,w,h,time,x,y){
  const g=worldGeometry(body,w,h);
  return satellitesOf(body.id).map(m=>({m,p:satellitePose(m,time,g)})).filter(({p})=>!(p.z<0&&Math.hypot(p.x-g.x,p.y-g.y)<g.r+p.r))
    .filter(({p})=>Math.hypot(x-p.x,y-p.y)<Math.max(16,p.r+6)).sort((a,b)=>Math.hypot(x-a.p.x,y-a.p.y)-Math.hypot(x-b.p.x,y-b.p.y))[0]?.m??null;
}
function orbit(c,g,moon){c.save();c.translate(g.x,g.y);c.rotate(orbitTilt(moon));c.strokeStyle='#a9bcb51d';c.lineWidth=.7;c.beginPath();c.ellipse(0,0,g.r*moon.orbit,g.r*moon.orbit*.32,0,0,TAU);c.stroke();c.restore();}
function satellite(c,moon,p,time,hover,o,compact=false){
  drawPlanetSphere(c,moon,p.x,p.y,p.r,{time,appearance:planetAppearance(moon,o)});
  if(o.solar.talents[moon.id])surfaceStructure(c,p,surfaceSite(moon,time,.25,.18),p.r*.018,'outpost');
  if(!compact||hover===moon.id){c.fillStyle=hover===moon.id?'#e5d4a6':'#8fa19b';c.font='9px system-ui,sans-serif';c.textAlign='center';c.fillText(moon.name,p.x,p.y+p.r+15);}
  if(hover===moon.id){c.strokeStyle='#d6c2939c';c.lineWidth=.6;c.beginPath();c.arc(p.x,p.y,p.r+5,0,TAU);c.stroke();}
}
function footholds(c,g,body,o,time){
  // One parked founder ark, regardless of how many structures it built.
  const key=facilityAt(body.id);if(!key||!o.solar.facilities[key])return;
  const p=founderPosition(g,time);drawArkLight(c,p.x,p.y,{radius:.8,glow:4,brightness:.8});
}
// A low-poly rock has actual rotated vertices and depth-sorted lit faces.
const VERTS=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],FACES=[[0,2,4],[4,2,1],[1,2,5],[5,2,0],[4,3,0],[1,3,4],[5,3,1],[0,3,5]];
function rock(c,x,y,r,seed,time){
  const a=time*.025+seed,b=seed*.71,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
  const points=VERTS.map(([x,y,z],i)=>{const k=.75+noise(seed*7+i)*.45;return{x:(x*ca+z*sa)*k,y:(y*cb-(z*ca-x*sa)*sb)*k,z:(y*sb+(z*ca-x*sa)*cb)*k};});
  const faces=FACES.map(f=>f.map(i=>points[i])).sort((a,b)=>a.reduce((n,p)=>n+p.z,0)-b.reduce((n,p)=>n+p.z,0));
  for(const f of faces){const light=.42+Math.max(0,(f[0].x+f[1].x+f[2].x)*.25-(f[0].y+f[1].y+f[2].y)*.15)*.5;c.fillStyle=`rgb(${[128,132,118].map(v=>Math.round(v*light))})`;c.beginPath();f.forEach((p,i)=>i?c.lineTo(x+p.x*r,y+p.y*r):c.moveTo(x+p.x*r,y+p.y*r));c.closePath();c.fill();}
}
export function drawBeltScene(c,w,h,o,time){
  const rank=o.solar.facilities.belt,t=o.solar.talents;
  // Far dust first, near fragments last; the empty space preserves the scale.
  for(let i=0;i<150;i++){
    const depth=noise(i+26),drift=time*(.0004+depth*.0006),x=((noise(i+31)+drift)%1)*w;
    const y=h*(.25+noise(i+52)*.54)+(x-w*.5)*.17,r=1+depth**5*Math.min(w*.035,19);
    rock(c,x,y,r,i,time);
    if(i===0&&rank)drawArkLight(c,x+r+4,y,{radius:.9,glow:6});
  }
  if(t.swarm)for(let i=0;i<18;i++){const x=w*(.12+noise(i+701)*.77)+Math.sin(time*.12+i)*5,y=h*(.28+noise(i+717)*.49);structure(c,x,y,.35,'tug',{angle:i});}
  if(t.redirect){const x=w*.72+Math.sin(time*.018)*w*.03,y=h*.67;rock(c,x,y,12,9,time);structure(c,x-36,y-8,1.4,'tug');line(c,[[x-29,y-8],[x-7,y-2]],'#bac6ac55',.6);}
  if(t.vestaMines){const x=w*.75,y=h*.36,vr=Math.min(w*.065,h*.095);rock(c,x,y,vr,22,time);line(c,[[x-vr*.3,y],[x,y+vr*.25],[x+vr*.2,y]],'#19292e',Math.max(1,vr*.12));structure(c,x-vr*.2,y-vr*.1,1.3,'station');c.fillStyle='#81968b';c.font='9px system-ui';c.fillText('灶神星',x,y+vr+16);}
  const ceres={id:'ceres',name:'谷神星',color:'#9ca799',surface:'rock'},r=Math.min(w*.14,h*.21);
  drawPlanetSphere(c,ceres,w*.37,h*.49,r,{time});
  if(t.ceresDepot)surfaceStructure(c,{x:w*.37,y:h*.49,r},surfaceSite(ceres,time,.25,.18),worldStructureSize(r,.017),'outpost');
  for(let i=0;i<Math.min(rank,5);i++){
    const x=w*(.14+i*.15)+Math.sin(time*.05+i)*6,y=h*(.33+noise(i+3)*.4);
    structure(c,x,y,1.6,'tug',{angle:-.15});
    for(let k=0;k<3;k++){const phase=(time*.7+k/3)%1;c.save();c.globalAlpha=(1-phase)*.5;line(c,[[x+6+phase*4,y+k-1],[x+8+phase*5,y+k-1]],'#c6b99b',.5);c.restore();}
  }
  c.fillStyle='#a8b7a7';c.font='10px system-ui,sans-serif';c.textAlign='center';c.fillText('谷神星',w*.37,h*.49+r+22);
  c.fillStyle='#839b92';c.font='9px ui-monospace,monospace';c.fillText('CERES / MAIN BELT',w*.37,h*.49+r+38);
}
export function drawWorldScene(c,w,h,body,o,{ambientTime=0,reducedMotion=false,hover=null,events=[]}={}){
  const time=reducedMotion?0:o.elapsed;drawOrbitStars(c,w,h,ambientTime,reducedMotion);
  if(body.belt){drawBeltScene(c,w,h,o,time);drawWorldTraffic(c,w,h,{x:w*.37,y:h*.49,r:Math.min(w*.14,h*.21)},body,o,{time,reducedMotion,events});return;}
  const g=worldGeometry(body,w,h),moons=satellitesOf(body.id).map(m=>({m,p:satellitePose(m,time,g)}));
  if(body.parent){const parent=destination(body.parent);c.save();c.globalAlpha=.18;drawPlanetSphere(c,parent,w*.94,h*.12,Math.min(w*.20,h*.30),{time});c.restore();}
  for(const {m} of moons)orbit(c,g,m);
  for(const {m,p} of moons)if(p.z<0)satellite(c,m,p,time,hover,o,w<600);
  drawOrbitalWorks(c,g,body,o,time,false,{reducedMotion});
  drawPlanetSphere(c,body,g.x,g.y,g.r,{time,appearance:planetAppearance(body,o,{reducedMotion})});
  drawSurfaceWorks(c,g,body,o,time,{reducedMotion});drawOrbitalWorks(c,g,body,o,time,true,{reducedMotion});footholds(c,g,body,o,time);
  drawWorldTraffic(c,w,h,g,body,o,{time,reducedMotion,events});
  for(const {m,p} of moons)if(p.z>=0)satellite(c,m,p,time,hover,o,w<600);
  c.fillStyle='#7d968b';c.font='8px ui-monospace,monospace';c.textAlign='left';c.fillText(body.parent?'SATELLITE OBSERVATORY':'PLANETARY OBSERVATORY',22,h-20);
  c.textAlign='right';c.fillText(moons.length?'LOCAL SYSTEM / ORBITS NOT TO SCALE':'SURFACE SURVEY',w-22,h-20);
}
