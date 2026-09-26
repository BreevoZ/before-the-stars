import { surfaceStructure, worldStructureSize } from './structure-models.js';
import { surfacePoint, spinOf, terrainOffset } from './planet-render.js';
import { surfaceOf } from './solar-bodies.js';
import { householdsPerDome, domeCapacity } from './solar-colony.js';
import { growthStep, ringSegments, upliftedInOrbit, winterSeconds } from './colony-war.js';
import { drawTransferDescent } from './solar-travel.js';
import { structure, line, disc, tether, habitatRing, TAU, clamp, smooth } from './celestial-structures.js';
export function marsDevelopment(o){
  const world=o.solar.colonies.mars,step=world.growth?.step??0,current=growthStep(world),p=clamp((world.growth?.progress??0)/(current?.seconds??1));
  return{grand:step>0,survey:step>1,elevator:upliftedInOrbit(world),rings:ringSegments(world),building:world.uplifted.length&&current?.key.startsWith('ring')?Math.max(.02,p):0,
    green:step>10?1:step===10?p:0,step,progress:p};
}
export function planetAppearance(body,o,{reducedMotion=false}={}){
  const t=o.solar.talents,world=o.solar.colonies[body.id],winter=world?.phase==='winter';
  const duration=winter?winterSeconds(o,body.id):1,age=winter?Math.max(0,duration-world.remaining):0;
  return{terraform:body.id==='mars'?t.terraform:0,green:body.id==='mars'?marsDevelopment(o).green:0,
    winter:winter?(reducedMotion?.8:smooth(age/5)*smooth(world.remaining/8)):0,winterSpread:reducedMotion?1:smooth(age/6),
    wind:body.id==='neptune'&&t.windFarm,darkSpot:body.id==='neptune'&&t.darkSpot,titan:body.id==='titan',
    hexagon:body.id==='saturn'&&t.hexagon,tiltPower:body.id==='uranus'&&t.tiltPower};
}
export function surfaceSite(body,time,lon,lat){return surfacePoint(lon,lat,spinOf(body,time),surfaceOf(body).tilt??.12);}
function mark(c,g,p,draw){
  if(p.z<=.04)return;c.save();c.translate(g.x+p.x*g.r,g.y+p.y*g.r);c.rotate(Math.atan2(p.y,p.x));c.scale(Math.max(.15,p.z),1);draw();c.restore();
}
export function drawSurfaceWorks(c,g,body,o,time,{reducedMotion=false}={}){
  const t=o.solar.talents,rank=o.solar.facilities[body.id]??0,s=worldStructureSize(g.r),at=(lon,lat)=>surfaceSite(body,time,lon,lat);
  const place=(p,kind,size=s,options={})=>surfaceStructure(c,g,p,size,kind,options);
  c.save();c.beginPath();c.arc(g.x,g.y,g.r,0,TAU);c.clip();
  if(body.parent&&t[body.id]){
    place(at(.25,.18),'outpost',s);
  }
  if(body.id==='mars'){
    const d=marsDevelopment(o),world=o.solar.colonies.mars,winter=world.phase==='winter',count=t.dome,per=householdsPerDome(o);
    const homes=[...(d.elevator?[]:world.uplifted),...world.civs];
    if(d.grand){
      const capacity=domeCapacity(o),ages=homes.map(c=>c.age);
      if(d.elevator&&homes.length+o.solar.transfers.filter(tr=>tr.to==='mars').length<capacity)ages.unshift(0);
      place(at(.36,.16),'colony',s*1.2,{lit:winter?0:1,detail:{slots:capacity,ages}});
    }else for(let i=0;i<count;i++)place(at(.06+i*.3,.06+(i%2)*.27),'colony',s*.95,{lit:winter?0:1,detail:{slots:per,ages:homes.slice(i*per,(i+1)*per).map(c=>c.age)}});
    if(d.survey){const a=at(.36,.16);for(let i=0;i<3;i++){const b=at(.54+i*.16,-.08+i*.06);if(a.z>.04&&b.z>.04){line(c,[[g.x+a.x*g.r,g.y+a.y*g.r],[g.x+b.x*g.r,g.y+b.y*g.r]],'#67756655',.6);place(b,'tug',s*.32,{angle:.4+i*.5});}}}
  }
  if(body.id==='mercury'){
    for(let i=0;i<rank;i++){const p=at(.2+i*.25,.38-i*.1);place(p,'array',s);}
    if(t.terminator){const p=surfacePoint(-.31,.05,0);place(p,'city',s*1.25,{lit:.9});}
    if(t.mercuryDriver){const p=at(.55,-.35);place(p,'rail',s);}
    if(t.smelter||t.ironCore){const p=at(.48,.1);place(p,'archive',s*(t.ironCore?1.3:1),{lit:t.ironCore?1:.3});}
  }
  if(body.id==='venus'){
    let last=null;for(let i=0;i<rank;i++){const p=at(.15+i*.48+Math.sin(time*.015+i)*.01,.5-i*.19);if(t.cloudCities&&last&&p.z>.04&&last.z>.04)line(c,[[g.x+last.x*g.r,g.y+last.y*g.r],[g.x+p.x*g.r,g.y+p.y*g.r]],'#c8c5a442',.5);place(p,'balloon',s,{shadow:false});last=p;}
    if(t.lightning){const pulse=reducedMotion?.22:Math.max(0,Math.sin(time*.65+1))**36,p=at(.5,.28);c.globalAlpha=pulse*.7;mark(c,g,p,()=>line(c,[[-s*3,-s],[0,0],[-s,s],[s*3,2*s]],'#d5dac3',.7));c.globalAlpha=1;}
  }
  if(body.id==='jupiter'){
    for(let i=0;i<rank;i++){const p=at(.25+i*.8,.4-(i%3)*.3);place(p,'collector',s,{shadow:false,lit:t.heliumScoop?1:.1});if(t.heliumScoop&&p.z>0){const q={x:p.x*.98,y:p.y*.98};line(c,[[g.x+p.x*g.r,g.y+p.y*g.r],[g.x+q.x*g.r,g.y+q.y*g.r]],'#a9c4c53a',.6);}}
    if(t.stormRider)for(let i=0;i<3;i++){const p=at(.15+i*.17,-.39);place(p,'kite',s*.7,{shadow:false});}
    if(t.magnetosphere){c.save();for(const sign of [-1,1]){for(const [width,alpha]of [[.036,'13'],[.018,'20'],[.005,'30']]){c.strokeStyle=`#acc9b7${alpha}`;c.lineWidth=Math.max(.5,g.r*width);c.beginPath();c.ellipse(g.x,g.y+sign*g.r*.89,g.r*.35,g.r*.06,0,0,TAU);c.stroke();}}c.restore();}
  }
  if(body.id==='uranus'){
    for(let i=0;i<rank;i++){const p=at(.3+i*.48,.2);place(p,'collector',s,{angle:-1.64,shadow:false});}
    if(t.diamondRain)for(let i=0;i<7;i++){const p=at(i*.85,.3*Math.sin(i)),alpha=reducedMotion?.2:Math.max(0,Math.sin(time*.6+i*2))**24;c.globalAlpha=alpha*.55;mark(c,g,p,()=>line(c,[[-s,0],[s,0]],'#dfded0',.7));}c.globalAlpha=1;
  }
  if(body.id==='pluto'){
    if(rank)for(let i=0;i<rank;i++)place(at(.15+terrainOffset(body)+i*.09,.08),'outpost',s*.65);if(t.coldArchive)place(at(.03+terrainOffset(body),.15),'archive',s);
  }
  c.restore();
}
export function drawOrbitalWorks(c,g,body,o,time,front,{reducedMotion=false}={}){
  const t=o.solar.talents,rank=o.solar.facilities[body.id]??0,s=worldStructureSize(g.r);
  const orbit=(r,a,tilt=0,flatten=.32)=>{const x=Math.cos(a)*g.r*r,y=Math.sin(a)*g.r*r*flatten;return{x:g.x+x*Math.cos(tilt)-y*Math.sin(tilt),y:g.y+x*Math.sin(tilt)+y*Math.cos(tilt),z:Math.sin(a)};};
  const on=(p,draw)=>{if((p.z>=0)===front)draw(p);};
  if(body.id==='mars'){
    const d=marsDevelopment(o);habitatRing(c,g,d.rings,d.building,front,time);
    const p=surfaceSite(body,time,.4,0);if(d.elevator&&(p.z>=0)===front)tether(c,g.x,g.y,g.r,p,{time,reducedMotion});
    if(front){const homes=o.solar.colonies.mars.civs,per=householdsPerDome(o),arrivals=[...homes.map((civ,i)=>({i,age:o.elapsed-civ.arrivedAt})),...o.solar.transfers.filter(tr=>tr.to==='mars').map((tr,i)=>({i:homes.length+i,age:o.elapsed-tr.arriveAt+2}))];
      for(const item of arrivals){const dome=Math.floor(item.i/per)%Math.max(1,t.dome),p=surfaceSite(body,time,d.grand?.36:.06+dome*.3,d.grand?.16:.06+(dome%2)*.27);if(p.z>.04)drawTransferDescent(c,g.x+p.x*g.r,g.y+p.y*g.r,g.r*1.05,item.age,{reducedMotion});}}
  }
  if(body.id==='venus'&&t.sunshade&&!front){c.save();c.translate(g.x+g.r*.9,g.y-g.r*.2);c.rotate(-.3);c.fillStyle='#b3bfa21e';c.strokeStyle='#c6d0b23e';c.lineWidth=.6;c.beginPath();c.ellipse(0,0,g.r*.17,g.r*.65,0,0,TAU);c.fill();c.stroke();c.restore();}
  if(body.id==='mercury'&&front){
    if(t.coronaProbe)structure(c,g.x+g.r*1.25,g.y-g.r*.42,s,'probe',{angle:time*.03});
    if(t.mercuryDriver){const pulse=reducedMotion?.4:(time*.2)%1;c.save();c.globalAlpha=1-pulse;line(c,[[g.x+g.r,g.y+g.r*.3],[g.x+g.r*(1.12+.25*pulse),g.y+g.r*(.26-.15*pulse)]],'#d9cba48a',.6);c.restore();}
  }
  if(body.id==='saturn'){
    for(let i=0;i<rank;i++){const a=i*1.8+time*.03,p=orbit(1.57,a,-.35);on(p,q=>structure(c,q.x,q.y,s*.8,'tug',{yaw:a,pitch:.4,angle:-.35}));}
    if(t.ringHarvest){c.save();c.translate(g.x,g.y);c.rotate(-.35);c.strokeStyle='#e6d6a469';c.lineWidth=.7;c.beginPath();c.ellipse(0,0,g.r*1.74,g.r*1.74*.32,0,front?0:Math.PI,front?Math.PI:TAU);c.stroke();c.restore();}
    if(t.ringDocks){const p=orbit(1.9,3.6,-.35);on(p,q=>structure(c,q.x,q.y,s*1.7,'dock'));}
  }
  if(body.id==='uranus'&&t.uranusBeacon){const p=orbit(1.28,.9,-1.64);on(p,q=>{structure(c,q.x,q.y,s,'probe');c.strokeStyle='#bdd1c65c';c.lineWidth=.6;c.beginPath();c.arc(q.x,q.y,s*(7+(reducedMotion?0:Math.sin(time*.7))),0,TAU);c.stroke();});}
  if(body.id==='neptune'){
    for(let i=0;i<rank;i++){const p=orbit(1.1,i*1.9+time*.012,-.18);on(p,q=>structure(c,q.x,q.y,s,'station',{yaw:i*1.9+time*.012,pitch:.35,angle:-.18}));}
    if(t.ringArcs){c.save();c.translate(g.x,g.y);c.rotate(-.18);for(let i=0;i<3;i++){const a=i*.54+time*.006;if((Math.sin(a)>=0)!==front)continue;c.strokeStyle='#b4c5b778';c.lineWidth=.8;c.beginPath();c.ellipse(0,0,g.r*1.35,g.r*.28,0,a,a+.22);c.stroke();}c.restore();}
    if(t.heliopause&&front){c.setLineDash([2,5]);line(c,[[g.x+g.r*1.05,g.y-g.r*.22],[g.x+g.r*1.9,g.y-g.r*.65]],'#a0b4aa55',.6);c.setLineDash([]);structure(c,g.x+g.r*1.9,g.y-g.r*.65,s*.8,'probe');}
  }
  if(body.id==='pluto'&&front){
    if(t.kuiperSurvey){const a=reducedMotion?-.7:time*.025-.7;c.save();c.translate(g.x,g.y);c.rotate(a);const gr=c.createRadialGradient(0,0,g.r*1.2,0,0,g.r*2);gr.addColorStop(0,'#a8b8ad00');gr.addColorStop(1,'#a8b8ad14');c.fillStyle=gr;c.beginPath();c.moveTo(0,0);c.arc(0,0,g.r*2,-.1,.1);c.closePath();c.fill();c.restore();}
    if(t.cometCapture){const p=reducedMotion?.5:(time/17)%1,x=g.x+g.r*(1.7-p*.5),y=g.y-g.r*(.8+p*.4);line(c,[[x,y],[x+g.r*.18,y-g.r*.07]],'#bdcbbc44',1);c.fillStyle='#c2ccba';c.beginPath();c.moveTo(x-s*2,y);c.lineTo(x,y-s);c.lineTo(x+s*1.5,y+s);c.closePath();c.fill();}
    if(t.arrokoth){const x=g.x-g.r*1.7,y=g.y+g.r*.8;disc(c,x,y,g.r*.04,'#887b69');disc(c,x+g.r*.045,y-g.r*.025,g.r*.028,'#9e8f77');}
  }
}
