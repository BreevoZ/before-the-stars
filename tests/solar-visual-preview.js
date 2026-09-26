import { drawHabitatLayer } from '../src/habitat-render.js';
import { drawPlanetSphere } from '../src/planet-render.js';
import { drawLunarSphere } from '../src/lunar-render.js';
import { destination } from '../src/solar-bodies.js';
import { drawEarthSphere } from '../src/orbital-render.js';
import { visualFixture } from './solar-visual-fixture.js';
import { drawSolarSystem, DESTINATIONS } from '../src/solar-render.js';
import { drawWorldScene } from '../src/solar-world-render.js';
import { drawDomes } from '../src/dome-render.js';
import { drawLunarColony, drawOrbitalColony } from '../src/orbital-render.js';
import { drawShipyard } from '../src/shipyard-render.js';
import { drawBattleScene, drawLandscape, MARS_PALETTE } from '../src/render.js';
import { createGame, RULES } from '../src/game.js';
import { drawStructure, STRUCTURE_KINDS, worldStructureSize } from '../src/structure-models.js';
import { winterSeconds } from '../src/colony-war.js';
const el=id=>document.getElementById(id),canvases=[],game=createGame();let session,time=0,last=0;
const add=(title,paint,short=false,height=null)=>{const section=document.createElement('section'),h=document.createElement('h2'),c=document.createElement('canvas');h.textContent=title;section.append(h,c);el('gallery').append(section);canvases.push({c,paint,short,height});};
add('SOL / 太阳系航图',(c,w,h,o,opt)=>drawSolarSystem(c,w,h,o,opt));
add('WORLDS / 地球 · 月球 · 水星 · 火星',(c,w,h,o,opt)=>{
  c.fillStyle='#142123';c.fillRect(0,0,w,h);const cols=w<500?2:4,cw=w/cols,ch=230;
  ['earth','moon','mercury','mars'].forEach((id,i)=>{const x=(i%cols+.5)*cw,y=Math.floor(i/cols)*ch+106,r=Math.min(cw*.37,85);
    if(id==='moon')drawLunarSphere(c,x,y,r,{rotation:opt.reducedMotion?0:opt.time/180*Math.PI*2,sun:[1,0,0]});
    else drawPlanetSphere(c,destination(id),x,y,r,{time:opt.time,reducedMotion:opt.reducedMotion,sunAngle:0});
    c.fillStyle='#a7b4a0';c.font='11px system-ui';c.textAlign='center';c.fillText(({earth:'地球',moon:'月球',mercury:'水星',mars:'火星'})[id],x,Math.floor(i/cols)*ch+215);
  });
},false,w=>w<500?460:230);
add('HABITAT / 升降枢纽 → 七节家园',(c,w,h,o,opt)=>{
  c.fillStyle='#142123';c.fillRect(0,0,w,h);const cols=w<500?2:4,cw=w/cols,ch=220;
  [0,1,3,7].forEach((sections,i)=>{const g={x:(i%cols+.5)*cw,y:Math.floor(i/cols)*ch+100,r:Math.min(cw*.36,80)},options={sections,elevator:true,time:opt.time,rotation:opt.reducedMotion?0:-opt.time*.025,reducedMotion:opt.reducedMotion};
    drawHabitatLayer(c,g,options,false);drawEarthSphere(c,g.x,g.y,g.r,{time:opt.time,reducedMotion:opt.reducedMotion});drawHabitatLayer(c,g,options,true);
    c.fillStyle='#a7b4a0';c.font='10px system-ui';c.textAlign='center';c.fillText(sections?`${sections} / 7 段`:'升降枢纽',(i%cols+.5)*cw,Math.floor(i/cols)*ch+204);
  });
},false,w=>w<500?440:220);
add('STRUCTURES / 结构近景', (c,w,h,o,opt)=>{
  c.fillStyle='#142123';c.fillRect(0,0,w,h);const kinds=[['collector','气态采集器'],['outpost','卫星驻地'],['colony','玻璃穹顶'],['array','集能阵列'],['dock','环中船坞'],['tug','矿业拖船']],cols=w<500?2:3,rows=Math.ceil(kinds.length/cols),cw=w/cols,ch=h/rows;
  kinds.forEach(([kind,name],i)=>{const x=(i%cols+.5)*cw,y=(Math.floor(i/cols)+.5)*ch,scale=Math.min(cw/17,ch/11,14);
    drawStructure(c,x,y,scale,kind,{yaw:.55+(opt.reducedMotion?0:opt.time*.02),pitch:.6,shadow:['outpost','colony','array'].includes(kind),detail:{slots:4,ages:[1,2,4,5]}});
    c.fillStyle='#a7b4a0';c.font='10px system-ui';c.textAlign='center';c.fillText(name,x,(Math.floor(i/cols)+1)*ch-12);});
});
const names={factory:'月面工厂 · 双罐处理厂',collector:'气态采集器 · 开口漏斗',outpost:'卫星驻地 · 双压力舱',station:'轨道站 · 四翼长脊',dock:'船坞 · 开放门架',tug:'拖船 · 分叉牵引臂',array:'集能阵列 · 三叶板',balloon:'浮空城 · 气囊吊舱',probe:'探测器 · 碟盘双翼',kite:'风筝 · 菱形帆',city:'城市 · 阶梯楼群',archive:'档案库 · 密封台体',colony:'殖民穹顶 · 玻璃骨架',dome:'前哨穹顶 · 单罩气闸',rail:'发射轨道 · 双轨枕木'};
add('STRUCTURES / 远景辨识',(c,w,h,o,opt)=>{
  c.fillStyle='#142123';c.fillRect(0,0,w,h);const cols=w<500?2:4,cw=w/cols,ch=180;
  STRUCTURE_KINDS.forEach((kind,i)=>{const left=i%cols*cw,top=Math.floor(i/cols)*ch,x=left+cw*.5;
    const model={yaw:.55+(opt.reducedMotion?0:opt.time*.02),pitch:.65,detail:{slots:4,ages:[1,2,4,5]}};
    drawStructure(c,x,top+57,Math.min(5,cw/30),kind,model);
    c.fillStyle='#a7b4a0';c.font='10px system-ui';c.textAlign='center';c.fillText(names[kind],x,top+96);
    // Identical geometry at the actual mobile-world size; never enlarge this row.
    drawStructure(c,x-30,top+127,worldStructureSize(70),kind,model);
    drawStructure(c,x+30,top+127,worldStructureSize(70),kind,{...model,normal:{x:-.7,y:0,z:Math.sqrt(.51)},lit:.7});
    c.fillStyle='#81978b';c.font='9px system-ui';c.fillText('远景 / 背光',x,top+160);
  });
},false,w=>Math.ceil(STRUCTURE_KINDS.length/(w<500?2:4))*180);
add('SKY / 同一画幅的地球与火星太阳',(c,w,h)=>{
  const cw=w/2,scale=cw/RULES.width;
  for(const [i,palette]of [null,MARS_PALETTE].entries()){c.save();c.translate(i*cw,24);c.beginPath();c.rect(0,0,cw,h-24);c.clip();c.scale(scale,scale);drawLandscape(c,(h-24)/scale,450,(palette?.daySeconds??120)*.25,0,palette);c.restore();}
  c.fillStyle='#a7b4a0';c.font='10px system-ui';c.textAlign='center';c.fillText('EARTH / 1 AU',cw/2,14);c.fillText('MARS / 1.52 AU',cw*1.5,14);
},true);
add('MARS / 穹顶聚落',(c,w,h,o,opt)=>drawDomes(c,w,h,o,opt),true);
for(const body of DESTINATIONS.filter(b=>b.id!=='earth'))add(body.name,(c,w,h,o,opt)=>drawWorldScene(c,w,h,body,o,opt));
add('EARTH / 轨道电梯',drawOrbitalColony,false,w=>w*620/1000);add('MOON / 电磁轨道',drawLunarColony);add('MOON / 第二泊位',drawShipyard);
add('MARS / 战场',(c,w,h,o,opt)=>{c.save();c.scale(w/RULES.width,h/560);drawBattleScene(c,game,{...opt,palette:MARS_PALETTE,skyTime:opt.time});c.restore();});
function reset(){session=visualFixture({developed:el('state').value!=='bare'});const o=session.orbital,state=el('state').value,w=o.solar.colonies.mars;
  o.phase='living';o.remaining=0;
  if(state==='winter'){w.phase='winter';w.remaining=winterSeconds(o,'mars');}
  if(state==='growth')w.growth={step:6,progress:25};
  if(state==='travel'){o.solar.facilities.venus=0;o.solar.flights=[{from:'mars',body:'venus',departAt:0,arriveAt:30}];o.solar.transfers=[{to:'mars',civ:{id:'incoming',age:4},departAt:0,arriveAt:35}];}
  time=0;el('time').value=0;resize();}
function resize(){const w=Number(el('width').value);el('gallery').style.maxWidth=`${w}px`;for(const {c,short,height}of canvases){c.width=w;c.height=height?height(w):short?190:w<500?340:500;}}
el('width').onchange=resize;el('state').onchange=reset;el('time').oninput=()=>{time=Number(el('time').value);el('play').checked=false;};reset();
function frame(now){if(el('play').checked&&!document.hidden)time=(time+Math.min(.1,(now-last)/1000))%120;last=now;session.orbital.elapsed=time;
  const o=session.orbital,state=el('state').value,mars=o.solar.colonies.mars,events=[];
  o.phase='living';o.remaining=0;
  if(state==='winter'){mars.remaining=Math.max(0,winterSeconds(o,'mars')-time);mars.phase=mars.remaining>0?'winter':'living';}
  if(state==='travel'){o.solar.facilities.venus=time>=30?1:0;o.solar.flights=time<30?[{from:'mars',body:'venus',departAt:0,arriveAt:30}]:[];
    if(time>=30&&time<32)events.push({body:'venus',at:30});
    const civ={id:'incoming',age:4,arrivedAt:35};o.solar.transfers=time<35?[{to:'mars',civ,departAt:0,arriveAt:35}]:[];mars.civs=mars.civs.filter(c=>c.id!=='incoming');if(time>=35)mars.civs.push(civ);}
  if(state==='growth')mars.growth.progress=time%60;
  el('clock').textContent=`${time.toFixed(1)}s`;el('time').value=time;
  const started=performance.now();for(const {c,paint}of canvases){const r=c.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)continue;paint(c.getContext('2d'),c.width,c.height,session.orbital,{time,ambientTime:time,events,reducedMotion:el('quiet').checked});}
  el('render-cost').textContent=`${(performance.now()-started).toFixed(1)} ms`;requestAnimationFrame(frame);}
requestAnimationFrame(frame);
