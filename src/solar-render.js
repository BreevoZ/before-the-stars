import { BODIES, SYSTEM, bodyPosition, orbitRadius, bodyById } from './solar-config.js';
import { ARK_COUNT } from './shipyard-render.js';
import { FACILITIES, pioneerProgress, flightLeg, arrived, flightTo } from './solar-industry.js';
import { drawArkLight } from './ark-lights.js';
import { TAU, dayPhase } from './celestial-clock.js';
import { drawStar } from './stellar-render.js';
import { structure, line, smooth } from './celestial-structures.js';
import { planetAppearance, marsDevelopment } from './solar-world-effects.js';
import { arkArc, arkWake, arrivalRing, drawMooredArks, departureDock } from './solar-travel.js';
const noise=n=>{let v=Math.imul(n^(n>>>16),0x21f0aaad);v=Math.imul(v^(v>>>15),0x735a2d97);return((v^(v>>>15))>>>0)/4294967296;};
const disc=(c,x,y,r,fill)=>{c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=fill;c.fill();};
export { bodyKindLabel, MOON, DESTINATIONS, destination } from './solar-bodies.js';
import { drawHabitatLayer } from './habitat-render.js';
import { drawLunarSphere } from './lunar-render.js';
import { drawPlanetSphere, spinOf } from './planet-render.js';
import { drawBeltScene } from './solar-world-render.js';
// Display-only eccentric Pluto orbit: simulation periods and windows stay intact.
export function atlasOrbit(b){const r=orbitRadius(b.au);return{a:b.id==='pluto'?r/1.18:r,e:b.id==='pluto'?.18:0,tilt:b.id==='pluto'?.64:SYSTEM.tilt,rotation:b.id==='pluto'?-.14:0};}
export function atlasPosition(b,time){
  if(b.id!=='pluto')return bodyPosition(b,time);const p=bodyPosition(b,time),g=atlasOrbit(b),x=g.a*(Math.cos(p.angle)-g.e),y=g.a*Math.sqrt(1-g.e*g.e)*Math.sin(p.angle)*g.tilt,co=Math.cos(g.rotation),si=Math.sin(g.rotation);
  return{...p,x:SYSTEM.cx+x*co-y*si,y:SYSTEM.cy+x*si+y*co,depth:Math.sin(p.angle)};
}
// Uniform scaling keeps circles round at every aspect ratio. All hit tests use
// this same transform; the catalogue remains usable even when planets overlap.
export function solarViewport(w,h){const scale=Math.min(w/1000,h/500);return{scale,x:(w-1000*scale)/2,y:(h-500*scale)/2};}
export function drawSolarBody(c,b,x,y,r,{time=0,sunAngle=-.4,ring=0,o=null,reducedMotion=false}={}){
  const mars=b.id==='mars'&&o?marsDevelopment(o):null,g={x,y,r};
  const habitat={sections:mars?mars.rings:ring,building:mars?.building??0,elevator:mars?mars.elevator:b.id==='earth'&&Boolean(o?.talents.elevator),rotation:b.id==='earth'?-dayPhase(time)*TAU:-spinOf(b,time),time,reducedMotion,sun:[Math.cos(sunAngle),Math.sin(sunAngle),.2]};
  drawHabitatLayer(c,g,habitat,false);
  drawPlanetSphere(c,b,x,y,r,{time,sunAngle,reducedMotion,appearance:o?planetAppearance(b,o,{reducedMotion}):{}});
  drawHabitatLayer(c,g,habitat,true);
}
function stars(c,w,h,time){c.fillStyle='#0b141e';c.fillRect(0,0,w,h);const g=c.createRadialGradient(w*.45,h*.47,0,w*.45,h*.47,w*.75);g.addColorStop(0,'#3148532e');g.addColorStop(.5,'#20313a18');g.addColorStop(1,'#101a2600');c.fillStyle=g;c.fillRect(0,0,w,h);
  for(let i=0;i<190;i++){c.globalAlpha=.1+(.5+.5*Math.sin(time*.4+noise(i)*TAU))*.26;disc(c,noise(i+500)*w,noise(i+900)*h,i%13===0?1.1:.55,'#c1d0cb');}c.globalAlpha=1;}
export function drawSolarSystem(c,w,h,o,{ambientTime=o.elapsed,reducedMotion=false,hover=null,selected='earth',events=[]}={}){
  const clock=reducedMotion?0:o.elapsed;stars(c,w,h,reducedMotion?0:ambientTime);const v=solarViewport(w,h);c.save();c.translate(v.x,v.y);c.scale(v.scale,v.scale);
  const {cx,cy,tilt}=SYSTEM;
  // Continuous orbit lines and a sparse survey grid leave the space between
  // planets quiet. The selected orbit carries the only strong highlight.
  for(const b of BODIES){if(b.belt)continue;const chosen=b.id===selected||b.id===hover,home=b.id==='earth'||arrived(o,b.id);c.strokeStyle=chosen?'#cbb7897a':home?'#bcb78648':'#8fa9ad20';c.lineWidth=chosen?1.15:home?.85:.6;const g=atlasOrbit(b);c.save();c.translate(cx,cy);c.rotate(g.rotation);c.beginPath();c.ellipse(-g.a*g.e,0,g.a,g.a*Math.sqrt(1-g.e*g.e)*g.tilt,0,0,TAU);c.stroke();c.restore();}
  for(let i=0;i<220;i++){const a=noise(i+17)*TAU+clock*.0002,r=orbitRadius(2.2+noise(i+8)*1.1);disc(c,cx+Math.cos(a)*r,cy+Math.sin(a)*r*tilt,.5+noise(i+70),i%4?'#7989824b':'#a4a49367');}
  drawStar(c,cx,cy,18,{time:clock,reducedMotion});
  c.fillStyle='#adbcab';c.font='9px ui-monospace,monospace';c.textAlign='center';c.fillText('SOL',cx,cy+34);
  for(const b of BODIES.filter(b=>!b.belt).sort((a,b)=>atlasPosition(a,clock).depth-atlasPosition(b,clock).depth)){
    const p=atlasPosition(b,clock),r=Math.max(5,b.size)*1.15,active=b.id===selected||b.id===hover;
    const settled=b.id==='earth'||arrived(o,b.id),flying=o.talents.voyage&&(b.id==='mars'&&!settled||flightTo(o,b.id));
    c.save();c.globalAlpha=settled||flying||active?1:.62;drawSolarBody(c,b,p.x,p.y,r,{time:clock,sunAngle:Math.atan2(cy-p.y,cx-p.x),ring:b.id==='earth'?o.talents.recovery:0,o,reducedMotion});c.restore();
    if(active){c.strokeStyle='#d6c596';c.lineWidth=.8;c.beginPath();c.arc(p.x,p.y,r+7,-.3,1.2);c.stroke();c.beginPath();c.arc(p.x,p.y,r+7,Math.PI-.3,Math.PI+1.2);c.stroke();}
    c.textAlign=p.x<cx?'right':'left';const sign=p.x<cx?-1:1;c.fillStyle=active?'#e0d3af':'#a6b8b2';c.font=`${Math.max(active?12:10,(active?10:8)/v.scale)}px system-ui,sans-serif`;if(w>=600||active)c.fillText(b.name,p.x+sign*(r+13),p.y+4);
    if(b.id==='earth')drawLunarSphere(c,p.x+r*2,p.y-r,2.1,{rotation:clock*.01,sun:[Math.cos(Math.atan2(cy-p.y,cx-p.x)),Math.sin(Math.atan2(cy-p.y,cx-p.x)),.2]});
    if(w>=600){c.fillStyle=settled?'#b9ba91':flying?'#a5bca7':'#657f80';c.font='8px system-ui,sans-serif';c.fillText(b.id==='earth'?'母星 · 月面家园':settled?'驻地已建立':flying?'方舟航行中':'待抵达',p.x+sign*(r+13),p.y+18);}
  }
  if(o.talents.voyage){
    const home=atlasPosition(bodyById('earth'),clock),place=id=>id==='moon'?home:id==='belt'?{x:cx+Math.cos(2.2+clock*.004)*orbitRadius(2.7),y:cy+Math.sin(2.2+clock*.004)*orbitRadius(2.7)*tilt}:atlasPosition(bodyById(id),clock);
    const mars=place('mars'),marsR=bodyById('mars').size*1.15,pioneer=pioneerProgress(o),dock={x:mars.x,y:mars.y,r:marsR+3};
    const trail=(at,start=0,end=1,color='#a7b8b12e')=>{c.setLineDash([2,5]);const points=[];for(let i=0;i<=40;i++){const p=at(start+(end-start)*i/40);points.push([p.x,p.y]);}line(c,points,color,.65);c.setLineDash([]);};
    if(pioneer<1){const at=t=>arkArc(home,mars,t,.18);trail(at);for(let i=0;i<ARK_COUNT;i++){const t=reducedMotion?.5:Math.max(0,Math.min(1,pioneer*1.08-i*.012)),p=at(smooth(t));arkWake(c,{x:p.x+(i-3)*1.5,y:p.y+(i-3)*1.2},at(Math.max(0,smooth(t)-.04)),{scale:.8});}}
    else drawMooredArks(c,dock,o,clock,{reducedMotion});
    for(const f of o.solar.flights){
      const leg=flightLeg(o,f),a=place(leg.from),b=place(leg.to),age=o.elapsed-f.departAt,left=f.arriveAt-o.elapsed;
      const final=leg.to===f.body,rr=(bodyById(f.body)?.size??5)*1.15+4,angle=clock*.05;
      const origin=leg.from==='mars'?departureDock(dock,o,f,clock):a;
      const target=final?{x:b.x+Math.cos(angle)*rr,y:b.y+Math.sin(angle)*rr*.6}:b;
      const sling=o.solar.talents.gravAssist&&bodyById(leg.to)?.au>5.2,jupiter=place('jupiter');
      const at=t=>sling?(t<.48?arkArc(origin,{x:jupiter.x+25,y:jupiter.y+6},t/.48,.06):arkArc({x:jupiter.x+25,y:jupiter.y+6},target,(t-.48)/.52,-.10)):arkArc(origin,target,t,.12);
      let t=reducedMotion?.5:leg.t;
      if(!reducedMotion&&age<3&&leg.from===f.from){const end=flightLeg({...o,elapsed:f.departAt+3},f).t;t=smooth((age-.6)/2.4)*end;}
      if(!reducedMotion&&final&&left<2){const start=flightLeg({...o,elapsed:f.arriveAt-2},f).t,q=Math.max(0,Math.min(1,1-left/2));t=start+(1-start)*(q+q*q-q*q*q);}
      // Earlier legs fade; each later leg remains a quiet dashed guide.
      const stops=[f.from,...(f.via??[]),f.body];for(let i=0;i<stops.length-1;i++)if(stops[i]!==leg.from||stops[i+1]!==leg.to){trail(t=>arkArc(place(stops[i]),place(stops[i+1]),t,.12),0,1,i<stops.indexOf(leg.from)?'#a7b8b110':'#a7b8b125');}
      trail(at,0,t,'#a7b8b111');trail(at,t,1);const p=at(t);arkWake(c,p,at(Math.max(0,t-.015)),{brightness:age<.6&&!reducedMotion?1+(1-age/.6):1,tail:8});
      if(final&&left<2&&!reducedMotion)arrivalRing(c,target.x,target.y,12,1-left/2);
    }
    for(const [key,f]of Object.entries(FACILITIES)){const rank=o.solar.facilities[key];if(!rank)continue;const p=place(f.body),r=(bodyById(f.body)?.size||5)*1.15+4,a=clock*.05;
      drawArkLight(c,p.x+Math.cos(a)*r,p.y+Math.sin(a)*r*.6,{radius:.9,glow:4,brightness:.9});
      structure(c,p.x-r-4,p.y+3,.45,f.body==='belt'?'tug':'station');
      for(let k=0;k<rank;k++)line(c,[[p.x-r-7+k*2,p.y+8],[p.x-r-6+k*2,p.y+8]],'#bdc6a65e',.7);
    }
    for(const tr of o.solar.transfers){const t=reducedMotion?.5:smooth(Math.max(0,Math.min(1,(o.elapsed-tr.departAt)/(tr.arriveAt-tr.departAt)))),at=t=>arkArc(home,mars,t,.25);trail(at,0,t,'#e6d6a412');trail(at,t,1,'#e6d6a433');arkWake(c,at(t),at(Math.max(0,t-.025)),{tail:7});}
    if(!reducedMotion)for(const e of events){const p=place(e.body);arrivalRing(c,p.x,p.y,18,(o.elapsed-e.at)/2);}
    if(o.solar.talents.relay){const a=place('neptune'),b=place('pluto');c.setLineDash([1,6]);line(c,[[a.x,a.y],[b.x,b.y]],'#b8c4b52d',.6);c.setLineDash([]);for(const p of [a,b])structure(c,p.x+16,p.y-13,.42,'probe');}
    const world=o.solar.colonies.mars;if(world.phase==='winter'&&w>=600){c.fillStyle='#b8c3c4';c.font='8px ui-monospace,monospace';c.textAlign=mars.x<cx?'right':'left';c.fillText(`WINTER ${Math.ceil(world.remaining)}s`,mars.x+(mars.x<cx?-1:1)*(marsR+13),mars.y+18);}
  }
  c.textAlign='left';c.fillStyle='#5e7a80';c.font='8px ui-monospace,monospace';c.fillText('HELIOCENTRIC SURVEY  /  ORBITS NOT TO SCALE',40,464);c.textAlign='right';c.fillText('40 AU  /  KUIPER BELT',960,464);c.restore();
}
export function bodyAt(o,x,y,{reducedMotion=false,tolerance=15}={}){
  let best=null,distance=Infinity;for(const b of BODIES){if(b.belt)continue;const p=atlasPosition(b,reducedMotion?0:o.elapsed),d=Math.hypot(x-p.x,y-p.y);if(d<Math.max(b.size,6)+tolerance&&d<distance){best=b;distance=d;}}
  if(!best){const r=Math.hypot(x-SYSTEM.cx,(y-SYSTEM.cy)/SYSTEM.tilt);if(r>orbitRadius(2.2)&&r<orbitRadius(3.3))best=bodyById('belt');}return best;
}
export function drawBodyPortrait(c,w,h,b,o){c.clearRect(0,0,w,h);if(b.belt){drawBeltScene(c,w,h,o,0);return;}const r=Math.min(w,h)*(b.rings?.25:.38);drawSolarBody(c,b,w/2,h/2,r,{time:0,ring:b.id==='earth'?o.talents.recovery:0,o,reducedMotion:true});
  if(o.solar?.colonies?.[b.id]?.phase==='winter')disc(c,w/2,h/2,r,'#8a9496b8');}
