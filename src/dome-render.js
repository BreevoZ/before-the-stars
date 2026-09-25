// The close view enlarges the same shaded colony model used on the globe.
import { householdsPerDome, domeCapacity } from './solar-colony.js';
import { upliftedInOrbit, growthHouseholds } from './colony-war.js';
import { drawTransferDescent } from './solar-travel.js';
import { TAU, noise, line, structure } from './celestial-structures.js';
import { colonyLayout, structureFrame, projectStructure } from './structure-models.js';
export function domeHouseholds(o){
  const world=o.solar.colonies.mars;
  return[...(upliftedInOrbit(world)?[]:world.uplifted.map(civ=>({civ,kind:'uplifted'}))),...world.civs.map(civ=>({civ,kind:'resident'})),...o.solar.transfers.filter(t=>t.to==='mars').map(t=>({civ:t.civ,kind:'incoming',flight:t}))];
}
export function drawDomes(c,w,h,o,{time=0,reducedMotion=false}={}){
  time=reducedMotion?0:time;
  const world=o.solar.colonies.mars,ranks=o.solar.talents.dome,per=householdsPerDome(o),grand=growthHouseholds(world)>0,orbit=upliftedInOrbit(world),winter=world.phase==='winter';
  c.save();c.clearRect(0,0,w,h);
  const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#121e21');sky.addColorStop(1,winter?'#343c38':'#494136');c.fillStyle=sky;c.fillRect(0,0,w,h);
  // Broad lit terrain, with the colonies standing on it rather than inside an arch diagram.
  c.fillStyle=winter?'#5d645622':'#85765a26';c.beginPath();c.moveTo(0,h*.45);c.bezierCurveTo(w*.3,h*.65,w*.6,h*.36,w,h*.55);c.lineTo(w,h);c.lineTo(0,h);c.fill();
  for(let i=0;i<42;i++){const x=noise(i+18)*w,y=h*(.45+noise(i+73)*.55);line(c,[[x,y],[x+2+noise(i)*3,y-.5]],'#b1ab8912',.6);}
  const homes=domeHouseholds(o),capacity=domeCapacity(o),vacant=orbit&&homes.length<capacity?1:0,positions=new Map();
  const count=grand?1:Math.max(1,ranks),columns=w<500?Math.min(3,count):count,rows=Math.ceil(count/columns),cellW=w/columns,cellH=(h-36)/rows;
  for(let d=0;d<count;d++){
    const slots=grand?capacity:per,layout=colonyLayout(slots),row=Math.floor(d/columns),rowCount=Math.min(columns,count-row*columns);
    const x=w*.5+(d%columns-(rowCount-1)/2)*cellW,y=34+(row+.57)*cellH;
    const scale=Math.min(cellW/(layout.rx*2.8+2),cellH/(layout.ry*1.45+layout.height+1));
    const options={yaw:-.16,pitch:.66,shadow:true,lit:winter?0:1},axes=structureFrame(options),ages=[];
    for(let k=0;k<slots;k++){
      const home=homes[(grand?0:d*per)+k-vacant];ages.push(home&&home.kind!=='incoming'?(home.kind==='uplifted'?5:home.civ.age):0);
    }
    if(ranks||grand)structure(c,x,y,scale,'colony',{...options,detail:{slots,ages}});
    for(let k=0;k<slots;k++){
      const home=homes[(grand?0:d*per)+k-vacant];if(!home)continue;
      const q=projectStructure(layout.slots[k],axes),hx=x+q[0]*scale,hy=y+q[1]*scale;
      positions.set(home.civ.id,{x:hx,y:hy-scale});
      if(home.kind==='incoming'){
        c.strokeStyle='#bdc8ad50';c.lineWidth=.6;c.setLineDash([2,3]);c.beginPath();c.ellipse(hx,hy,scale*.55,scale*.23,-.16,0,TAU);c.stroke();c.setLineDash([]);
        drawTransferDescent(c,hx,hy,scale*3,o.elapsed-home.flight.arriveAt+2,{reducedMotion});
      }else{
        drawTransferDescent(c,hx,hy,scale*3,o.elapsed-home.civ.arrivedAt,{reducedMotion});
        if(home.civ.accord!=null){c.strokeStyle='#d2c49744';c.lineWidth=.7;c.beginPath();c.ellipse(hx,hy,scale*.65,scale*.28,-.16,0,TAU);c.stroke();c.strokeStyle='#d2c497aa';c.beginPath();c.ellipse(hx,hy,scale*.65,scale*.28,-.16,-Math.PI/2,-Math.PI/2+TAU*home.civ.accord);c.stroke();}
      }
    }
    c.fillStyle='#a1ad97';c.font='8px ui-monospace,monospace';c.textAlign='center';c.fillText(grand?'GREAT DOME':`DOME ${String(d+1).padStart(2,'0')} / ${per}`,x,Math.min(h-8,34+(row+1)*cellH-2));
  }
  for(const war of world.wars){const at=war.sides.map(id=>positions.get(id));if(at.some(p=>!p))continue;c.strokeStyle=war.seized?'#d5c79a77':'#c2967777';c.lineWidth=.6;c.setLineDash([2,4]);c.lineDashOffset=-time*2;c.beginPath();c.moveTo(at[0].x,at[0].y);c.quadraticCurveTo((at[0].x+at[1].x)/2,Math.min(at[0].y,at[1].y)-12,at[1].x,at[1].y);c.stroke();c.setLineDash([]);}
  if(orbit){const x=18;line(c,[[x,h-23],[x,20]],'#aabb9766',.6);structure(c,x,22,.65,'station');const p=reducedMotion?.65:(time*.08)%1;structure(c,x,h-23-(h-45)*p,.25,'tug',{pitch:1.1});}
  c.fillStyle='#a3af9b';c.font='8px system-ui';c.textAlign='left';c.fillText(orbit?'升格文明 · 轨道家园':'MARS / HABITAT OBSERVATORY',12,14);
  if(winter){c.textAlign='right';c.fillText(`WINTER ${Math.ceil(world.remaining)}s`,w-12,14);}c.restore();
}
