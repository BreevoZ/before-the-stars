// The cross-section is a close architectural view, not a second simulation.
import { SOLAR_TALENTS, householdsPerDome, domeCapacity } from './solar-colony.js';
import { upliftedInOrbit, growthHouseholds } from './colony-war.js';
import { drawTransferDescent } from './solar-travel.js';
import { TAU, noise, line, disc, structure } from './celestial-structures.js';
export function domeHouseholds(o){
  const world=o.solar.colonies.mars;
  return[...(upliftedInOrbit(world)?[]:world.uplifted.map(civ=>({civ,kind:'uplifted'}))),...world.civs.map(civ=>({civ,kind:'resident'})),...o.solar.transfers.filter(t=>t.to==='mars').map(t=>({civ:t.civ,kind:'incoming',flight:t}))];
}
function dwelling(c,x,ground,width,height,age,lit,uplifted){
  c.fillStyle=uplifted?'#6d7564':'#384c4b';
  if(age===1){c.beginPath();c.moveTo(x-width*.45,ground);c.lineTo(x-width*.12,ground-height*.5);c.lineTo(x+width*.14,ground-height*.58);c.lineTo(x+width*.45,ground);c.fill();}
  else for(let i=0;i<Math.min(5,age);i++){
    const bw=width/(age+1)*.8,bx=x-width*.42+i*width/age,bh=height*(.45+(i%3)*.2)*(age/5);
    c.fillRect(bx,ground-bh,bw,bh);
    if(age===2){c.fillRect(bx-bw*.1,ground-bh-2,bw*1.2,2);}
    if(age>=4)line(c,[[bx+bw*.5,ground-bh],[bx+bw*.5,ground-bh-4]],'#89978699',.5);
    if(lit)for(let k=0;k<age-1;k++)line(c,[[bx+1,ground-bh+3+k*4],[bx+bw-1,ground-bh+3+k*4]],uplifted?'#e6d6a4bd':'#c7c6a488',.65);
  }
  if(age>=3)line(c,[[x-width*.43,ground],[x+width*.43,ground]],lit?'#c1b99566':'#747b6c44',.6);
}
export function drawDomes(c,w,h,o,{time=0,reducedMotion=false}={}){
  time=reducedMotion?0:time;const world=o.solar.colonies.mars,ranks=o.solar.talents.dome,per=householdsPerDome(o),grand=growthHouseholds(world)>0,orbit=upliftedInOrbit(world),winter=world.phase==='winter';
  c.save();c.clearRect(0,0,w,h);const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#101b1e');sky.addColorStop(1,winter?'#333c3b':'#40392f');c.fillStyle=sky;c.fillRect(0,0,w,h);
  for(let i=0;i<32;i++)disc(c,noise(i+3)*w,noise(i+90)*h*.5,.5,'#d6cdb455');
  const ground=h*.79;c.fillStyle=winter?'#53605a':'#655c49';c.beginPath();c.moveTo(0,ground);
  for(let x=0;x<=w+16;x+=16)c.lineTo(x,ground-2*Math.sin(x*.03)-2*noise(x));c.lineTo(w,h);c.lineTo(0,h);c.closePath();c.fill();
  const homes=domeHouseholds(o),capacity=domeCapacity(o),vacant=orbit&&homes.length<capacity?1:0;
  const rows=grand?1:SOLAR_TALENTS.dome.costs.length,span=w/rows,rx=span*.44,ry=Math.min(rx,h*.60),positions=new Map();
  for(let d=0;d<rows;d++){
    const x=span*(d+.5),built=grand||d<ranks,slots=grand?capacity:per;
    c.save();c.beginPath();c.ellipse(x,ground,rx,ry,0,Math.PI,TAU);
    if(!built){c.setLineDash([2,5]);c.strokeStyle='#9ba89326';c.lineWidth=.65;c.stroke();c.restore();continue;}
    const glass=c.createLinearGradient(x-rx,ground-ry,x+rx,ground);glass.addColorStop(0,winter?'#b3bdae12':'#bad1bf1b');glass.addColorStop(1,'#aebba803');c.fillStyle=glass;c.fill();c.clip();
    for(let k=0;k<slots;k++){
      const i=(grand?0:d*per)+k-vacant,home=homes[i],hx=x+((k+.5)/Math.max(1,slots)-.5)*rx*1.72,bw=rx*1.5/Math.max(1,slots);
      line(c,[[hx-bw*.42,ground+1],[hx+bw*.42,ground+1]],'#a6ad9344',.7);
      if(!home)continue;positions.set(home.civ.id,{x:hx,y:ground-ry*.45});
      if(home.kind==='incoming'){
        c.setLineDash([2,3]);c.strokeStyle='#b6bf9f55';c.strokeRect(hx-bw*.25,ground-ry*.12,bw*.5,ry*.12);c.setLineDash([]);
        const age=o.elapsed-home.flight.arriveAt+2;if(age>0)drawTransferDescent(c,hx,ground-3,ry*.95,age,{reducedMotion});continue;
      }
      const lit=!winter||home.kind==='uplifted';dwelling(c,hx,ground,bw,ry*.88,home.kind==='uplifted'?5:home.civ.age,lit,home.kind==='uplifted');
      drawTransferDescent(c,hx,ground-ry*.2,ry*.85,o.elapsed-home.civ.arrivedAt,{reducedMotion});
      if(home.civ.accord!=null){c.strokeStyle='#d2c49733';c.lineWidth=.65;c.beginPath();c.arc(hx,ground-ry*.63,4,0,TAU);c.stroke();c.strokeStyle='#d2c497aa';c.lineWidth=.7;c.beginPath();c.arc(hx,ground-ry*.63,4,-Math.PI/2,-Math.PI/2+TAU*home.civ.accord);c.stroke();}
    }
    c.restore();c.strokeStyle=winter?'#b9c1b266':'#bbcfb877';c.lineWidth=.85;c.beginPath();c.ellipse(x,ground,rx,ry,0,Math.PI,TAU);c.stroke();
    for(const offset of [-.5,0,.5]){c.strokeStyle='#bbcfb81c';c.lineWidth=.55;c.beginPath();c.ellipse(x,ground,Math.max(.6,rx*Math.abs(offset)),ry,0,Math.PI,TAU);c.stroke();}
    c.strokeStyle='#dbe2c833';c.beginPath();c.ellipse(x,ground,rx*.92,ry*.92,0,Math.PI*1.12,Math.PI*1.36);c.stroke();
    c.fillStyle='#9dad9c';c.font='8px ui-monospace,monospace';c.textAlign='center';c.fillText(grand?'GREAT DOME':`DOME ${String(d+1).padStart(2,'0')} / ${per}`,x,ground+16);
  }
  for(const war of world.wars){const at=war.sides.map(id=>positions.get(id));if(at.some(p=>!p))continue;c.strokeStyle=war.seized?'#d5c79a88':'#c2967788';c.setLineDash([2,4]);c.lineDashOffset=-time*2;c.lineWidth=.7;c.beginPath();c.moveTo(at[0].x,at[0].y);c.quadraticCurveTo((at[0].x+at[1].x)/2,Math.min(at[0].y,at[1].y)-ry*.25,at[1].x,at[1].y);c.stroke();c.setLineDash([]);}
  if(orbit){
    const x=w*.07;line(c,[[x,ground],[x,19]],'#b8c6ac8c',.7);structure(c,x,22,.75,'station');const p=reducedMotion?.65:(time*.08)%1;structure(c,x,ground-(ground-24)*p,.42,'tug',{angle:-Math.PI/2});
    c.fillStyle='#c8caac';c.font='8px system-ui';c.textAlign='left';c.fillText('升格文明 · 轨道家园',x+12,25);
  }
  if(winter){c.fillStyle='#bdc5b6';c.font='9px ui-monospace,monospace';c.textAlign='right';c.fillText(`NUCLEAR WINTER ${Math.ceil(world.remaining)}s`,w-12,16);}
  if(!orbit){c.fillStyle='#93a291';c.font='8px ui-monospace,monospace';c.textAlign='left';c.fillText('MARS / DOME CROSS-SECTION',12,16);}c.restore();
}
