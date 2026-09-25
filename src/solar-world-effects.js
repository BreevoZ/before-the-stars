import { surfacePoint, spinOf, terrainOffset } from './planet-render.js';
import { surfaceOf } from './solar-bodies.js';
import { householdsPerDome } from './solar-colony.js';
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
const daylight=p=>clamp((p.x*.94-p.y*.37+p.z*.34)*2+.15);
export function drawSurfaceWorks(c,g,body,o,time,{reducedMotion=false}={}){
  const t=o.solar.talents,rank=o.solar.facilities[body.id]??0,s=Math.max(.35,g.r*.012),at=(lon,lat)=>surfaceSite(body,time,lon,lat);
  c.save();c.beginPath();c.arc(g.x,g.y,g.r,0,TAU);c.clip();
  if(body.parent&&t[body.id]){
    const p=at(.25,.18);mark(c,g,p,()=>{structure(c,0,0,s*1.3,'station');structure(c,-s*7,s*3,s,'dome');});
  }
  if(body.id==='mars'){
    const d=marsDevelopment(o),winter=o.solar.colonies.mars.phase==='winter',count=t.dome,per=householdsPerDome(o),homes=o.solar.colonies.mars.civs;
    for(let i=0;i<(d.grand?Math.min(count,1):count);i++){
      const p=at(.22+i*.18,.13+(i%2)*.13);mark(c,g,p,()=>{
        const size=s*(d.grand?2.4:1),lit=winter?0:1-daylight(p);
        structure(c,0,0,size,'dome',{lit});
        if(!winter){line(c,[[-size*2,-size*1.2],[size,-size*1.65]],`rgba(224,233,210,${.18+daylight(p)*.55})`,.6);
          for(let k=0;k<Math.min(per,homes.length-i*per);k++)line(c,[[size*(-2+k),0],[size*(-1.5+k),0]],`rgba(230,214,164,${.35+lit*.6})`,.6);}
      });
      if(d.survey){const b=at(.55+i*.2,-.05);if(p.z>.04&&b.z>.04){line(c,[[g.x+p.x*g.r,g.y+p.y*g.r],[g.x+b.x*g.r,g.y+b.y*g.r]],'#c4b89844',.65);mark(c,g,b,()=>structure(c,0,0,s*.65,'probe'));}}
    }
    if(d.grand&&d.survey){const a=at(.22,.13);for(let i=0;i<3;i++){const b=at(.45+i*.16,-.07+i*.06);if(a.z>.04&&b.z>.04){line(c,[[g.x+a.x*g.r,g.y+a.y*g.r],[g.x+b.x*g.r,g.y+b.y*g.r]],'#c4b89844',.65);mark(c,g,b,()=>structure(c,0,0,s*.65,'probe'));}}}
  }
  if(body.id==='mercury'){
    for(let i=0;i<rank;i++){const p=at(.2+i*.25,.38-i*.1);mark(c,g,p,()=>{structure(c,0,0,s,'array');if(daylight(p)>.3)line(c,[[-s*5,-s],[s*5,-s]],'#e3dbb780',.65);});}
    if(t.terminator){const p=surfacePoint(-.31,.05,0);mark(c,g,p,()=>structure(c,0,0,s*1.25,'city',{lit:.9}));}
    if(t.mercuryDriver){const p=at(.55,-.35);mark(c,g,p,()=>{line(c,[[-s*8,0],[s*8,0]],'#bcbea788',.7);line(c,[[-s*8,s],[s*8,s]],'#6f868077',.6);});}
    if(t.smelter||t.ironCore){const p=at(.48,.1);mark(c,g,p,()=>{structure(c,0,0,s,'station');line(c,[[-s,-s],[s,-s]],t.ironCore?'#dbb586c0':'#c29b7599',1.1+(t.ironCore?.7:0));});}
  }
  if(body.id==='venus'){
    let last=null;for(let i=0;i<rank;i++){const p=at(.15+i*.48+Math.sin(time*.015+i)*.01,.5-i*.19);if(t.cloudCities&&last&&p.z>.04&&last.z>.04)line(c,[[g.x+last.x*g.r,g.y+last.y*g.r],[g.x+p.x*g.r,g.y+p.y*g.r]],'#c8c5a442',.5);mark(c,g,p,()=>structure(c,0,0,s*1.4,'balloon'));last=p;}
    if(t.lightning){const pulse=reducedMotion?.22:Math.max(0,Math.sin(time*.65+1))**36,p=at(.5,.28);c.globalAlpha=pulse*.7;mark(c,g,p,()=>line(c,[[-s*3,-s],[0,0],[-s,s],[s*3,2*s]],'#d5dac3',.7));c.globalAlpha=1;}
  }
  if(body.id==='jupiter'){
    for(let i=0;i<rank;i++){const p=at(.25+i*.8,.4-(i%3)*.3);mark(c,g,p,()=>{structure(c,0,0,s*1.1,'station');line(c,[[0,s*3],[0,s*10],[s*2,s*12]],'#bcc7b16b',.6);if(t.heliumScoop)line(c,[[s*.5,s*4],[s*.5,s*(6+(time%2)*2)]],'#a9c4c599',.6);});}
    if(t.stormRider)for(let i=0;i<3;i++){const p=at(.15+i*.17,-.39);mark(c,g,p,()=>structure(c,0,0,s*.7,'kite'));}
    if(t.magnetosphere){c.save();for(const sign of [-1,1]){for(const [width,alpha]of [[.036,'13'],[.018,'20'],[.005,'30']]){c.strokeStyle=`#acc9b7${alpha}`;c.lineWidth=Math.max(.5,g.r*width);c.beginPath();c.ellipse(g.x,g.y+sign*g.r*.89,g.r*.35,g.r*.06,0,0,TAU);c.stroke();}}c.restore();}
  }
  if(body.id==='uranus'){
    for(let i=0;i<rank;i++){const p=at(.3+i*.48,.2);mark(c,g,p,()=>structure(c,0,0,s,'station',{angle:-1.64}));}
    if(t.diamondRain)for(let i=0;i<7;i++){const p=at(i*.85,.3*Math.sin(i)),alpha=reducedMotion?.2:Math.max(0,Math.sin(time*.6+i*2))**24;c.globalAlpha=alpha*.55;mark(c,g,p,()=>line(c,[[-s,0],[s,0]],'#dfded0',.7));}c.globalAlpha=1;
  }
  if(body.id==='pluto'){
    const p=at(.15+terrainOffset(body),.08);mark(c,g,p,()=>{if(rank)for(let i=0;i<rank;i++)structure(c,i*s*6,0,s*.85,'dome');if(t.coldArchive){c.fillStyle='#afb5a4';c.fillRect(-s*5,-s*5,s*3,s*3);}});
  }
  c.restore();
}
export function drawOrbitalWorks(c,g,body,o,time,front,{reducedMotion=false}={}){
  const t=o.solar.talents,rank=o.solar.facilities[body.id]??0,s=Math.max(.4,g.r*.012);
  const orbit=(r,a,tilt=0,flatten=.32)=>{const x=Math.cos(a)*g.r*r,y=Math.sin(a)*g.r*r*flatten;return{x:g.x+x*Math.cos(tilt)-y*Math.sin(tilt),y:g.y+x*Math.sin(tilt)+y*Math.cos(tilt),z:Math.sin(a)};};
  const on=(p,draw)=>{if((p.z>=0)===front)draw(p);};
  if(body.id==='mars'){
    const d=marsDevelopment(o);habitatRing(c,g,d.rings,d.building,front,time);
    const p=surfaceSite(body,time,.4,0);if(d.elevator&&(p.z>=0)===front)tether(c,g.x,g.y,g.r,p,{time,reducedMotion});
    if(front){const homes=o.solar.colonies.mars.civs,per=householdsPerDome(o),arrivals=[...homes.map((civ,i)=>({i,age:o.elapsed-civ.arrivedAt})),...o.solar.transfers.filter(tr=>tr.to==='mars').map((tr,i)=>({i:homes.length+i,age:o.elapsed-tr.arriveAt+2}))];
      for(const item of arrivals){const p=surfaceSite(body,time,.22+(d.grand?0:Math.floor(item.i/per)%Math.max(1,t.dome))*.18,.13);if(p.z>.04)drawTransferDescent(c,g.x+p.x*g.r,g.y+p.y*g.r,g.r*1.05,item.age,{reducedMotion});}}
  }
  if(body.id==='venus'&&t.sunshade&&!front){c.save();c.translate(g.x+g.r*.9,g.y-g.r*.2);c.rotate(-.3);c.fillStyle='#b3bfa21e';c.strokeStyle='#c6d0b23e';c.lineWidth=.6;c.beginPath();c.ellipse(0,0,g.r*.17,g.r*.65,0,0,TAU);c.fill();c.stroke();c.restore();}
  if(body.id==='mercury'&&front){
    if(t.coronaProbe)structure(c,g.x+g.r*1.25,g.y-g.r*.42,s,'probe',{angle:time*.03});
    if(t.mercuryDriver){const pulse=reducedMotion?.4:(time*.2)%1;c.save();c.globalAlpha=1-pulse;line(c,[[g.x+g.r,g.y+g.r*.3],[g.x+g.r*(1.12+.25*pulse),g.y+g.r*(.26-.15*pulse)]],'#d9cba48a',.6);c.restore();}
  }
  if(body.id==='saturn'){
    for(let i=0;i<rank;i++){const a=i*1.8+time*.03,p=orbit(1.57,a,-.35);on(p,q=>structure(c,q.x,q.y,s*.8,'tug',{angle:a+.8}));}
    if(t.ringHarvest){c.save();c.translate(g.x,g.y);c.rotate(-.35);c.strokeStyle='#e6d6a469';c.lineWidth=.7;c.beginPath();c.ellipse(0,0,g.r*1.74,g.r*1.74*.32,0,front?0:Math.PI,front?Math.PI:TAU);c.stroke();c.restore();}
    if(t.ringDocks){const p=orbit(1.9,3.6,-.35);on(p,q=>structure(c,q.x,q.y,s*1.7,'dock'));}
  }
  if(body.id==='uranus'&&t.uranusBeacon){const p=orbit(1.28,.9,-1.64);on(p,q=>{structure(c,q.x,q.y,s,'probe');c.strokeStyle='#bdd1c65c';c.lineWidth=.6;c.beginPath();c.arc(q.x,q.y,s*(7+(reducedMotion?0:Math.sin(time*.7))),0,TAU);c.stroke();});}
  if(body.id==='neptune'){
    for(let i=0;i<rank;i++){const p=orbit(1.1,i*1.9+time*.012,-.18);on(p,q=>structure(c,q.x,q.y,s,'station'));}
    if(t.ringArcs){c.save();c.translate(g.x,g.y);c.rotate(-.18);for(let i=0;i<3;i++){const a=i*.54+time*.006;if((Math.sin(a)>=0)!==front)continue;c.strokeStyle='#b4c5b778';c.lineWidth=.8;c.beginPath();c.ellipse(0,0,g.r*1.35,g.r*.28,0,a,a+.22);c.stroke();}c.restore();}
    if(t.heliopause&&front){c.setLineDash([2,5]);line(c,[[g.x+g.r*1.05,g.y-g.r*.22],[g.x+g.r*1.9,g.y-g.r*.65]],'#a0b4aa55',.6);c.setLineDash([]);structure(c,g.x+g.r*1.9,g.y-g.r*.65,s*.8,'probe');}
  }
  if(body.id==='pluto'&&front){
    if(t.kuiperSurvey){const a=reducedMotion?-.7:time*.025-.7;c.save();c.translate(g.x,g.y);c.rotate(a);const gr=c.createRadialGradient(0,0,g.r*1.2,0,0,g.r*2);gr.addColorStop(0,'#a8b8ad00');gr.addColorStop(1,'#a8b8ad14');c.fillStyle=gr;c.beginPath();c.moveTo(0,0);c.arc(0,0,g.r*2,-.1,.1);c.closePath();c.fill();c.restore();}
    if(t.cometCapture){const p=reducedMotion?.5:(time/17)%1,x=g.x+g.r*(1.7-p*.5),y=g.y-g.r*(.8+p*.4);line(c,[[x,y],[x+g.r*.18,y-g.r*.07]],'#bdcbbc44',1);c.fillStyle='#c2ccba';c.beginPath();c.moveTo(x-s*2,y);c.lineTo(x,y-s);c.lineTo(x+s*1.5,y+s);c.closePath();c.fill();}
    if(t.arrokoth){const x=g.x-g.r*1.7,y=g.y+g.r*.8;disc(c,x,y,g.r*.04,'#887b69');disc(c,x+g.r*.045,y-g.r*.025,g.r*.028,'#9e8f77');}
  }
}
