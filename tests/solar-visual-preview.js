import { visualFixture } from './solar-visual-fixture.js';
import { drawSolarSystem, DESTINATIONS } from '../src/solar-render.js';
import { drawWorldScene } from '../src/solar-world-render.js';
import { drawDomes } from '../src/dome-render.js';
import { drawLunarColony, drawOrbitalColony } from '../src/orbital-render.js';
import { drawShipyard } from '../src/shipyard-render.js';
import { drawBattleScene, MARS_PALETTE } from '../src/render.js';
import { createGame, RULES } from '../src/game.js';
import { winterSeconds } from '../src/colony-war.js';
const el=id=>document.getElementById(id),canvases=[],game=createGame();let session,time=0,last=0;
const add=(title,paint,short=false)=>{const section=document.createElement('section'),h=document.createElement('h2'),c=document.createElement('canvas');h.textContent=title;section.append(h,c);el('gallery').append(section);canvases.push({c,paint,short});};
add('SOL / 太阳系航图',(c,w,h,o,opt)=>drawSolarSystem(c,w,h,o,opt));
add('MARS / 穹顶剖面',(c,w,h,o,opt)=>drawDomes(c,w,h,o,opt),true);
for(const body of DESTINATIONS.filter(b=>b.id!=='earth'))add(body.name,(c,w,h,o,opt)=>drawWorldScene(c,w,h,body,o,opt));
add('EARTH / 轨道电梯',drawOrbitalColony);add('MOON / 电磁轨道',drawLunarColony);add('MOON / 第二泊位',drawShipyard);
add('MARS / 战场',(c,w,h,o,opt)=>{c.save();c.scale(w/RULES.width,h/560);drawBattleScene(c,game,{...opt,palette:MARS_PALETTE,skyTime:opt.time});c.restore();});
function reset(){session=visualFixture({developed:el('state').value!=='bare'});const o=session.orbital,state=el('state').value,w=o.solar.colonies.mars;
  if(state==='winter'){w.phase='winter';w.remaining=winterSeconds(o,'mars');}
  if(state==='growth')w.growth={step:6,progress:25};
  if(state==='travel'){o.solar.facilities.venus=0;o.solar.flights=[{from:'mars',body:'venus',departAt:0,arriveAt:30}];o.solar.transfers=[{to:'mars',civ:{id:'incoming',age:4},departAt:0,arriveAt:35}];}
  time=0;el('time').value=0;resize();}
function resize(){const w=Number(el('width').value);el('gallery').style.maxWidth=`${w}px`;for(const {c,short}of canvases){c.width=w;c.height=short?190:w<500?340:500;}}
el('width').onchange=resize;el('state').onchange=reset;el('time').oninput=()=>{time=Number(el('time').value);el('play').checked=false;};reset();
function frame(now){if(el('play').checked&&!document.hidden)time=(time+Math.min(.1,(now-last)/1000))%120;last=now;session.orbital.elapsed=time;
  const o=session.orbital,state=el('state').value,mars=o.solar.colonies.mars,events=[];
  if(state==='winter'){mars.remaining=Math.max(0,winterSeconds(o,'mars')-time);mars.phase=mars.remaining>0?'winter':'living';}
  if(state==='travel'){o.solar.facilities.venus=time>=30?1:0;o.solar.flights=time<30?[{from:'mars',body:'venus',departAt:0,arriveAt:30}]:[];
    if(time>=30&&time<32)events.push({body:'venus',at:30});
    const civ={id:'incoming',age:4,arrivedAt:35};o.solar.transfers=time<35?[{to:'mars',civ,departAt:0,arriveAt:35}]:[];mars.civs=mars.civs.filter(c=>c.id!=='incoming');if(time>=35)mars.civs.push(civ);}
  if(state==='growth')mars.growth.progress=time%60;
  el('clock').textContent=`${time.toFixed(1)}s`;el('time').value=time;
  for(const {c,paint}of canvases){const r=c.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)continue;paint(c.getContext('2d'),c.width,c.height,session.orbital,{time,ambientTime:time,events,reducedMotion:el('quiet').checked});}
  requestAnimationFrame(frame);}
requestAnimationFrame(frame);
