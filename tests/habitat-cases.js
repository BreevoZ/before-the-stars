import { Q } from '../src/quantity.js';
import { ORBITAL_TALENTS as T } from '../src/orbital-config.js';
import { getOrbitalTalentState, purchaseOrbitalTalent } from '../src/orbital-game.js';
import { orbitalYieldMultiplier } from '../src/celestial-economy.js';
import { HABITAT, habitatPoint, elevatorEndpoints, drawHabitatLayer } from '../src/habitat-render.js';
import { lunarSurfacePoint, lunarSurfaceRadius, drawLunarSphere } from '../src/lunar-render.js';
import { drawLunarColony, drawOrbitalColony } from '../src/orbital-render.js';
import { serializeSession, parseSession, mapSessionQuantities, DEBUG_SAVE_KEY } from '../src/save.js';
import { fromV34Record } from '../src/save-record.js';
import { v34Orbital } from './fixtures/v34-orbital.js';
import { colonyFixture, lunarFixture } from './orbital-colony-cases.js';
import { mountFixture } from './progression-cases.js';
export function registerHabitatTests(test,assert,near){
  test('Habitat: VI lift gates the first ring, charges once, and preserves seven income upgrades',()=>{
    const s=colonyFixture({legacy:1000}),base=orbitalYieldMultiplier(s.orbital);
    assert(T.elevator.costs[0]===128&&getOrbitalTalentState(s,'recovery')==='prerequisite');
    const raw=serializeSession(s);assert(!purchaseOrbitalTalent(s,'recovery')&&serializeSession(s)===raw);
    assert(purchaseOrbitalTalent(s,'elevator')&&Q.eq(s.permanent.legacy,872));assert(orbitalYieldMultiplier(s.orbital)===base);
    assert(!purchaseOrbitalTalent(s,'elevator')&&purchaseOrbitalTalent(s,'recovery'));
    assert(Q.eq(s.permanent.legacy,616)&&orbitalYieldMultiplier(s.orbital)===base*2&&T.recovery.costs.length===7);
    assert(serializeSession(parseSession(serializeSession(s)))===serializeSession(s));
    const poor=colonyFixture({legacy:127});assert(!purchaseOrbitalTalent(poor,'elevator')&&!purchaseOrbitalTalent(poor,'recovery'));
  });
  test('Habitat v35: captured v34 VI/VII saves keep wallet, purchases and wars; only existing rings receive a free lift',()=>{
    for(const old of v34Orbital){const original=JSON.stringify(old),before=fromV34Record(mapSessionQuantities(structuredClone(old),Q.decode)),next=parseSession(original),o=next.orbital;
      assert(next.version===35&&o.version===21&&Q.eq(next.permanent.legacy,before.permanent.legacy));
      assert(Q.eq(next.permanent.totalLegacy,before.permanent.totalLegacy)&&o.talents.recovery===old.orbital.talents.recovery);
      assert(o.talents.elevator===Number(o.talents.recovery>0));
      const wire=JSON.parse(serializeSession(next)),{elevator,...paid}=wire.orbital.payments;
      assert(JSON.stringify(paid)===JSON.stringify(old.orbital.payments));
      assert(o.talents.recovery?JSON.stringify(elevator)==='["0"]':elevator===undefined);
      assert(JSON.stringify(wire.orbital.wars)===JSON.stringify(old.orbital.wars));
      assert(serializeSession(parseSession(serializeSession(next)))===serializeSession(next)&&JSON.stringify(old)===original);
    }
  });
  test('Habitat v35: missing lift prerequisites, invalid prices and invented free grants are rejected',()=>{
    const s=colonyFixture({legacy:1000,talents:['elevator','recovery']}),raw=serializeSession(s);
    const reject=r=>{let caught=false;try{parseSession(JSON.stringify(r));}catch{caught=true;}assert(caught);};
    for(const edit of [r=>{r.orbital.talents.elevator=0;delete r.orbital.payments.elevator;},r=>{r.orbital.payments.elevator=['127'];},r=>{r.orbital.talents.elevator=2;},r=>{r.orbital.talents.recovery=0;delete r.orbital.payments.recovery;r.orbital.payments.elevator=['0'];}]){const r=JSON.parse(raw);edit(r);reject(r);}
  });
  test('Habitat geometry: both worlds share the collar, radial lift endpoints and a closed seven-section orbit',()=>{
    for(let rotation=0;rotation<Math.PI*2;rotation+=.19){const {surface,port}=elevatorEndpoints(rotation),a=habitatPoint(0,{rotation}),b=habitatPoint(Math.PI*2,{rotation});
      near(Math.hypot(surface.x,surface.y,surface.z),1);near(Math.hypot(port.x,port.y,port.z),HABITAT.radius);
      for(const k of ['x','y','z']){near(port[k],a[k]);near(a[k],b[k]);near(surface[k]*HABITAT.radius,port[k]);}
      assert((surface.z>=0)===(port.z>=0));
    }
    const a=lunarSurfacePoint(.22,-.12,0),b=lunarSurfacePoint(.22,-.12,Math.PI);near(a.x,-b.x);near(a.z,-b.z);near(a.y,b.y);
    const heights=[];for(let i=0;i<50;i++)heights.push(lunarSurfaceRadius(i*.17,Math.sin(i)*.7));assert(Math.max(...heights)-Math.min(...heights)>.001,'Craters deform vertices');
  });
  test.browser('Habitat visual: seven real sections, growing ends, near/far occlusion and moon light are distinct at phone size',()=>{
    const c=document.createElement('canvas');c.width=320;c.height=280;const x=c.getContext('2d'),g={x:160,y:140,r:90};
    const paint=(sections,building=0,rotation=0)=>{x.clearRect(0,0,320,280);const opt={sections,building,elevator:true,rotation,reducedMotion:true};drawHabitatLayer(x,g,opt,false);x.fillStyle='#284c51';x.beginPath();x.arc(g.x,g.y,g.r,0,Math.PI*2);x.fill();drawHabitatLayer(x,g,opt,true);return c.toDataURL();};
    const images=new Set();for(let i=0;i<=7;i++)images.add(paint(i));assert(images.size===8);
    assert(paint(2,.25)!==paint(2,.75)&&paint(2,0,Math.PI)!==paint(2));
    const moon=(rotation,sun)=>{x.clearRect(0,0,320,280);drawLunarSphere(x,160,140,90,{rotation,sun});return c.toDataURL();};
    const initial=moon(0,[1,0,.3]);assert(initial===moon(0,[1,0,.3]));assert(initial!==moon(.5,[1,0,.3])&&initial!==moon(0,[-1,0,.3]));
    const s=lunarFixture(),raw=serializeSession(s);
    for(const draw of [drawLunarColony,drawOrbitalColony]){draw(x,320,280,s.orbital,{reducedMotion:true});const first=c.toDataURL();draw(x,320,280,{...s.orbital,elapsed:101},{reducedMotion:true,ambientTime:40});assert(c.toDataURL()===first);}
    assert(serializeSession(s)===raw);
  });
  test.browser('Habitat UI: the home button opens the lift first; mobile keyboard buying, ring link and saved reload agree',async()=>{
    const s=colonyFixture({legacy:1000}),frame=await mountFixture(serializeSession(s),false,'debug',{reducedMotion:true});let raw;
    try{frame.style.width='390px';await new Promise(r=>setTimeout(r,35));const d=frame.contentDocument,w=frame.contentWindow,el=id=>d.getElementById(id);
      el('colony-build-habitat').click();assert(el('orbit-detail').textContent.includes('太空电梯')&&!el('orbit-buy').disabled);
      assert(el('orbit-edge-protocol-elevator')&&el('orbit-edge-elevator-recovery')&&!el('orbit-edge-protocol-recovery'));
      el('orbit-node-elevator').focus();el('orbit-node-elevator').dispatchEvent(new w.KeyboardEvent('keydown',{code:'ArrowUp',bubbles:true}));assert(d.activeElement.id==='orbit-node-recovery');
      assert(el('orbit-buy').disabled);el('orbit-node-elevator').click();el('orbit-buy').click();
      assert(el('orbit-node-elevator').dataset.state==='max');el('orbit-node-recovery').click();assert(!el('orbit-buy').disabled);el('orbit-buy').click();
      assert(el('orbit-buy').getBoundingClientRect().right<=391);el('close-orbit-talents').click();el('colony-save').click();el('manual-save').click();
      raw=w.__storage.getItem(DEBUG_SAVE_KEY);const saved=parseSession(raw);assert(saved.orbital.talents.elevator===1&&saved.orbital.talents.recovery===1&&Q.eq(saved.permanent.legacy,616));
    }finally{frame.remove();}
    const restored=await mountFixture(raw,false,'debug',{reducedMotion:true});try{const d=restored.contentDocument;d.getElementById('colony-build-habitat').click();assert(d.getElementById('orbit-detail').textContent.includes('环地球生存空间'));}finally{restored.remove();}
  });
}
