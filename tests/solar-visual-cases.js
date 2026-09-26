import { visualFixture, WORLD_EFFECTS } from './solar-visual-fixture.js';
import { voyageFixture } from './orbital-colony-cases.js';
import { serializeSession } from '../src/save.js';
import { destination, SATELLITES } from '../src/solar-bodies.js';
import { drawWorldScene } from '../src/solar-world-render.js';
import { drawSolarSystem, atlasPosition, atlasOrbit } from '../src/solar-render.js';
import { drawDomes, domeHouseholds } from '../src/dome-render.js';
import { drawOrbitalColony, drawLunarColony } from '../src/orbital-render.js';
import { drawShipyard } from '../src/shipyard-render.js';
import { drawStar } from '../src/stellar-render.js';
import { createSolarVisualHistory, arkArc, dockPosition } from '../src/solar-travel.js';
import { marsDevelopment } from '../src/solar-world-effects.js';
import { drawBattleScene, drawLandscape, MARS_PALETTE } from '../src/render.js';
import { createGame } from '../src/game.js';
import { drawStructure, structureFrame, projectStructure, surfaceStructure, colonyLayout, STRUCTURE_KINDS, worldStructureSize } from '../src/structure-models.js';
import { drawPlanetSphere } from '../src/planet-render.js';
import { BODIES } from '../src/solar-config.js';
import { mountFixture } from './progression-cases.js';
import { purchaseSolarTalent } from '../src/solar-colony.js';
import { updateOrbital } from '../src/orbital-game.js';
import { setDebugLegacy } from '../src/debug.js';

export function registerSolarVisualTests(test,assert,near){
  test('VII visual models: ground frames preserve 3D lengths, depth and normals, including the poles',()=>{
    for(const normal of [{x:0,y:0,z:1},{x:.6,y:0,z:.8},{x:0,y:1,z:0},{x:0,y:0,z:-1}]){
      const frame=structureFrame({normal});for(const axis of frame)near(Math.hypot(...axis),1);
      for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)near(frame[i].reduce((sum,v,k)=>sum+v*frame[j][k],0),0);
      const p=projectStructure([2,3,4],frame);near(Math.hypot(...p),Math.sqrt(29));near(projectStructure([0,0,1],frame)[2],normal.z);
    }
    for(const n of [2,3,4,12,22]){const layout=colonyLayout(n);assert(layout.slots.length===n);for(const [x,y]of layout.slots)assert((x/layout.rx)**2+(y/layout.ry)**2<1);}
  });
  test.browser('VII visual models: solid faces replace outlines, turn in depth and disappear behind the globe',()=>{
    const c=canvas(260,220),x=c.getContext('2d'),draw=(kind,options)=>{x.clearRect(0,0,260,220);drawStructure(x,130,130,9,kind,options);return c.toDataURL();};
    x.stroke=()=>{throw Error('A model must not paint a screen-facing contour');};const images=new Set();
    for(const kind of ['collector','outpost','station','dock','tug','colony','array','balloon','probe']){
      const options={yaw:.3,pitch:.6,detail:{slots:4,ages:[1,2,4,5]}},raw=JSON.stringify(options),a=draw(kind,options);images.add(a);
      assert(draw(kind,{...options,yaw:1.1})!==a,kind);assert(draw(kind,options)===a&&JSON.stringify(options)===raw);
    }assert(images.size===9);
    x.clearRect(0,0,260,220);const empty=c.toDataURL(),g={x:130,y:110,r:85};surfaceStructure(x,g,{x:0,y:0,z:-1},3,'outpost');assert(c.toDataURL()===empty);
    surfaceStructure(x,g,{x:0,y:0,z:1},3,'outpost');assert(c.toDataURL()!==empty);
  });
  test.browser('VII visual legibility: every model retains lit surfaces and a distinct footprint at mobile-world size',()=>{
    const c=canvas(80,80),x=c.getContext('2d'),size=worldStructureSize(70),masks=new Set(),issues=[];
    for(const kind of STRUCTURE_KINDS)for(const backlit of [false,true]){
      x.clearRect(0,0,80,80);drawStructure(x,40,40,size,kind,{yaw:.55,pitch:.65,normal:backlit?{x:-.7,y:0,z:Math.sqrt(.51)}:null,detail:{slots:4,ages:[1,2,4,5]}});
      const pixels=x.getImageData(0,0,80,80).data;let count=0,total=0,bright=0;const mask=[];
      for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>=160){const l=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722;count++;total+=l;if(l>110)bright++;mask.push(i/4);}
      if(count<12||total/count<=80||bright<3)issues.push(`${kind} ${backlit?'backlit':'front'}: ${count} pixels, luminance ${total/count}, ${bright} lit pixels`);
      if(!backlit)masks.add(mask.join(','));
    }assert(issues.length===0,issues.join('; '));assert(masks.size===STRUCTURE_KINDS.length,'Small silhouettes collapsed into identical shapes');
  });
  test.browser('VII visual Mars sun: disc and halo shrink with distance; Earth keeps its original radius',()=>{
    const c=canvas(1280,560),x=c.getContext('2d'),arc=x.arc.bind(x),gradient=x.createRadialGradient.bind(x);let disc=0,halos=[];
    x.arc=(...args)=>{if(x.fillStyle==='#ffe3a5')disc=args[2];return arc(...args);};
    x.createRadialGradient=(...args)=>{halos.push(args[5]);return gradient(...args);};
    const paint=palette=>{disc=0;halos=[];drawLandscape(x,560,450,(palette?.daySeconds??120)*.25,0,palette);return{disc,halos};};
    const earth=paint(null),mars=paint(MARS_PALETTE);near(earth.disc,32);near(mars.disc,32/1.52);assert(mars.disc<earth.disc*.7);near(mars.halos.at(-1),earth.halos.at(-1)/1.52);
  });
  test('VII visual history: arrivals are bounded, edge-triggered, read-only and never replayed after reload',()=>{
    const s=voyageFixture(),o=s.orbital,h=createSolarVisualHistory(),raw=serializeSession(s);assert(h.observe(o).length===0&&serializeSession(s)===raw);
    o.elapsed+=1;o.solar.facilities.venus=1;assert(h.observe(o).length===1);assert(h.observe(o).length===1);
    o.elapsed+=2;assert(h.observe(o).length===0);assert(createSolarVisualHistory().observe(o).length===0);
    o.elapsed=0;assert(h.observe(o).length===0);h.reset();assert(h.observe(o).length===0);
  });
  test('VII visual geometry: launch interpolation, eccentric Pluto and Mars development read actual progression',()=>{
    const a={x:1,y:2},b={x:8,y:6};near(arkArc(a,b,0).x,a.x);near(arkArc(a,b,1).y,b.y);
    const g={x:100,y:100,r:20};for(let n=1;n<=8;n++){const a=dockPosition(g,0,n),b=dockPosition(g,0,n+.001);assert(Math.hypot(a.x-b.x,a.y-b.y)<.01);}
    const pluto=BODIES.find(b=>b.id==='pluto');assert(atlasOrbit(pluto).e>0);for(let t=0;t<1000;t+=10){const p=atlasPosition(pluto,t);assert(p.x>0&&p.x<1000&&p.y>0&&p.y<500);}
    const o=visualFixture().orbital,w=o.solar.colonies.mars;w.uplifted=[{id:'u',age:5}];assert(domeHouseholds(o).some(h=>h.kind==='uplifted'));
    w.growth={step:3,progress:30};assert(marsDevelopment(o).elevator&&marsDevelopment(o).building===.5&&!domeHouseholds(o).some(h=>h.kind==='uplifted'));
    w.growth={step:10,progress:150};assert(marsDevelopment(o).rings===7&&marsDevelopment(o).green===.5);
  });
  // These detached canvases are read back after every frame.
  function canvas(w=660,h=420){const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d',{willReadFrequently:true});return c;}
  test.browser('VII visual globe: first frame and cached night shading remain identical across canvas sizes',()=>{
    for(const size of [26,240,420]){const c=canvas(size,size),x=c.getContext('2d'),draw=()=>{x.clearRect(0,0,size,size);drawPlanetSphere(x,destination('mars'),size/2,size/2,size*.42,{reducedMotion:true});return c.toDataURL();};const first=draw();for(let n=0;n<3;n++)assert(draw()===first,`Unstable shading at ${size}px`);}
  });
  function worldFrame(c,body,o,quiet=false,time=0){drawWorldScene(c.getContext('2d'),c.width,c.height,destination(body),{...o,elapsed:time},{ambientTime:time,reducedMotion:quiet});return c.toDataURL();}
  for(const [body,keys]of Object.entries(WORLD_EFFECTS))for(const key of keys)test.browser(`VII visual effect: ${body}/${key} changes the view, stays deterministic and freezes with reduced motion`,()=>{
    const o=visualFixture().orbital,c=canvas();o.solar.facilities[body]=3;const before=JSON.stringify(o);let different=false;
    const active={...o,solar:{...o.solar,talents:{...o.solar.talents,[key]:1}}},activeBefore=JSON.stringify({...o,solar:{...o.solar,talents:{...o.solar.talents,[key]:1}}});
    for(const t of [0,9,30,65]){if(worldFrame(c,body,o,false,t)!==worldFrame(c,body,active,false,t)){different=true;break;}}
    // A moon installation may be on the far hemisphere in the parent view.
    if(!different&&SATELLITES.some(m=>m.id===key))different=worldFrame(c,key,o,false,0)!==worldFrame(c,key,active,false,0);
    assert(different,`${key} has no visible effect`);const quiet=worldFrame(c,body,active,true,0);assert(worldFrame(c,body,active,true,43)===quiet,`${key} reduced motion`);
    assert(JSON.stringify(o)===before&&JSON.stringify(active)===activeBefore);const first=worldFrame(c,body,active,false,17);assert(worldFrame(c,body,active,false,17)===first);
  });
  for(const body of ['mercury','venus','belt','jupiter','saturn','uranus','neptune','pluto'])test.browser(`VII visual rank: ${body} adds structures rather than more founder arks`,()=>{
    const o=visualFixture().orbital,c=canvas();o.solar.facilities[body]=1;const a=worldFrame(c,body,o,true);o.solar.facilities[body]=3;assert(worldFrame(c,body,o,true)!==a);assert(worldFrame(c,body,o,true,50)===worldFrame(c,body,o,true));
  });
  test.browser('VII visual Titan: deeper haze remains spherical and still under reduced motion',()=>{
    const c=canvas(),x=c.getContext('2d'),body=destination('titan'),draw=(haze,time=0)=>{x.clearRect(0,0,660,420);drawPlanetSphere(x,body,330,210,130,{time,reducedMotion:true,appearance:{titan:haze}});return c.toDataURL();};assert(draw(false)!==draw(true));assert(draw(true,40)===draw(true));
  });
  test.browser('VII visual Mars: every development stage, partial greening, winter and atmosphere has a distinct static state',()=>{
    const o=visualFixture().orbital,w=o.solar.colonies.mars,c=canvas(),images=new Set();w.uplifted=[{id:'u',age:5}];
    for(let step=0;step<=11;step++){w.growth={step,progress:0};const a=worldFrame(c,'mars',o,true);images.add(a);assert(worldFrame(c,'mars',o,true,30)===a);}
    assert(images.size===12,`Only ${images.size} distinct growth steps`);
    w.growth={step:10,progress:30};const early=worldFrame(c,'mars',o,true);w.growth.progress=230;assert(worldFrame(c,'mars',o,true)!==early);
    w.phase='winter';w.remaining=30;const winter=worldFrame(c,'mars',o,true);w.phase='living';assert(worldFrame(c,'mars',o,true)!==winter);
    const air=new Set();for(let n=0;n<=3;n++){o.solar.talents.terraform=n;air.add(worldFrame(c,'mars',o,true));}assert(air.size===4);
  });
  test.browser('VII visual domes: 2/3/4 households, all five eras, uplift vacancy and transfers are visible and quiet',()=>{
    const o=visualFixture().orbital,c=canvas(600,200),x=c.getContext('2d'),w=o.solar.colonies.mars,draw=(quiet=true,time=0)=>{drawDomes(x,600,200,o,{time,reducedMotion:quiet});return c.toDataURL();};
    const states=new Set();for(const k of [null,'iceWater','rhea']){if(k)o.solar.talents[k]=1;states.add(draw());}assert(states.size===3);
    const eras=new Set();for(let a=1;a<=5;a++){w.civs[0].age=a;eras.add(draw());}assert(eras.size===5);
    w.uplifted=[{id:'u',age:5}];w.growth={step:2,progress:0};const surface=draw();w.growth.step=3;assert(draw()!==surface);assert(draw(true,0)===draw(true,50));
    o.solar.transfers=[{to:'mars',departAt:-30,arriveAt:1,civ:{id:'t',age:2}}];const arriving=draw(false);o.solar.transfers=[];assert(draw(false)!==arriving);
    w.civs[0].arrivedAt=-1;const arrived=draw(false);w.civs[0].arrivedAt=-3;assert(draw(false)!==arrived);
    const living=draw();w.phase='winter';w.remaining=30;assert(draw()!==living);
  });
  test.browser('VII visual travel: launch, flight, via legs, arrival and descent differ without mutating the save',()=>{
    const o=visualFixture().orbital,c=canvas(),x=c.getContext('2d');o.solar.facilities.venus=0;o.solar.flights=[{from:'mars',body:'venus',via:['earth'],departAt:0,arriveAt:30}];const raw=JSON.stringify(o);
    const frames=new Set();for(const t of [.1,1,15,29,29.9]){drawSolarSystem(x,660,420,{...o,elapsed:t});frames.add(c.toDataURL());}assert(frames.size===5);
    const quiet=worldFrame(c,'venus',o,true,3);assert(worldFrame(c,'venus',o,true,3)===quiet); // Countdown is data, not animation.
    assert(worldFrame(c,'venus',o,false,29)!==worldFrame(c,'venus',o,false,15));
    drawSolarSystem(x,660,420,o,{reducedMotion:true,ambientTime:0});const a=c.toDataURL();drawSolarSystem(x,660,420,o,{reducedMotion:true,ambientTime:50});assert(c.toDataURL()===a);
    assert(JSON.stringify(o)===raw);
    const arrived={...o,solar:{...o.solar,facilities:{...o.solar.facilities,venus:1},flights:[]}};drawWorldScene(x,660,420,destination('venus'),{...arrived,elapsed:1},{events:[{body:'venus',at:0}]});const ring=c.toDataURL();drawWorldScene(x,660,420,destination('venus'),{...arrived,elapsed:1});assert(c.toDataURL()!==ring);
  });
  for(const [name,paint,key]of [['Earth elevator',drawOrbitalColony,'spaceElevator'],['Moon rail',drawLunarColony,'launchRail'],['second berth',drawShipyard,'lunarYard'],['return freight',drawOrbitalColony,'lunarRelay']])test.browser(`VII visual Earth Moon: ${name} is visible only when built and freezes`,()=>{
    const o=visualFixture().orbital,c=canvas(),x=c.getContext('2d'),draw=(quiet=true,time=0)=>{paint(x,660,420,{...o,elapsed:time},{time,ambientTime:time,reducedMotion:quiet});return c.toDataURL();};
    const a=draw();o.solar.talents[key]=1;assert(draw()!==a,key);assert(draw(true,51)===draw());
  });
  test.browser('VII visual star: self luminous core, smooth corona without spikes and static reduced motion',()=>{
    const c=canvas(180,180),x=c.getContext('2d'),draw=(t,q)=>{x.clearRect(0,0,180,180);drawStar(x,90,90,18,{time:t,reducedMotion:q});return c.toDataURL();};
    const a=draw(0,false);assert(draw(40,false)!==a&&draw(40,true)===a);const pixels=x.getImageData(0,0,180,180).data,light=(dx,dy)=>pixels[((90+dy)*180+90+dx)*4];assert(Math.abs(light(-6,0)-light(6,0))<25&&light(0,0)>240);
  });
  test.browser('VII visual atlas: relay, slingshot and Mars ring/greening are distinct and static in reduced motion',()=>{
    const o=visualFixture().orbital,c=canvas(),x=c.getContext('2d'),draw=()=>{drawSolarSystem(x,660,420,o,{reducedMotion:true});return c.toDataURL();};
    const base=draw();o.solar.talents.relay=1;assert(draw()!==base);o.solar.flights=[{from:'mars',body:'neptune',departAt:-10,arriveAt:30}];const path=draw();o.solar.talents.gravAssist=1;assert(draw()!==path);
    o.solar.colonies.mars.uplifted=[{id:'u'}];const red=draw();o.solar.colonies.mars.growth={step:11,progress:0};assert(draw()!==red);
  });
  test.browser('VII visual battle: Mars owns its sky, ground and moons; default Earth remains byte-identical',()=>{
    const c=canvas(1200,560),x=c.getContext('2d'),g=createGame();const draw=options=>{drawBattleScene(x,g,options);return c.toDataURL();};
    const earth=draw({});assert(draw({palette:null})===earth);assert(draw({palette:MARS_PALETTE,reducedMotion:true,skyTime:0})!==earth);
    const mars=draw({palette:MARS_PALETTE,reducedMotion:true,time:0,skyTime:0});assert(draw({palette:MARS_PALETTE,reducedMotion:true,time:50,skyTime:50})===mars);
  });
  test.browser('VII visual read-only: every destination and renderer preserve a valid serialized session',()=>{
    const s=voyageFixture(),raw=serializeSession(s),o=s.orbital,c=canvas(),x=c.getContext('2d');
    for(const b of [...BODIES,...SATELLITES])worldFrame(c,b.id,o,true);
    for(const paint of [drawSolarSystem,drawDomes,drawOrbitalColony,drawLunarColony,drawShipyard])paint(x,660,420,o,{time:2,reducedMotion:true});
    assert(serializeSession(s)===raw);
  });
  test.browser('VII visual tree: axis purchases animate a continuous root path and planets use a single small canvas',async()=>{
    const s=voyageFixture();setDebugLegacy(s,'1e10');for(let i=0;i<1800;i++)updateOrbital(s,1/30);assert(purchaseSolarTalent(s,'harbor'));
    for(const reducedMotion of [false,true]){const frame=await mountFixture(serializeSession(s),false,'debug',{reducedMotion}),doc=frame.contentDocument;try{
      doc.getElementById('colony-talents').click();doc.getElementById('solar-node-heat').dispatchEvent(new frame.contentWindow.MouseEvent('dblclick',{bubbles:true}));
      const path=doc.getElementById('solar-axis-flow');assert(doc.getElementById('solar-node-heat').dataset.state==='max');
      if(reducedMotion)assert(path.getAnimations().length===0);else assert(path.getAttribute('d')?.includes(' L'),'Whole axis path is populated');
      const tiles=[...doc.querySelectorAll('.solar-region-texture')];assert(tiles.length>=10&&tiles.every(c=>c.width===512&&c.height===256));
    }finally{frame.remove();}}
  });
}
