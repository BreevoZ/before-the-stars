import { sphereBase, sphereNight, surfacePath } from './sphere-material.js';
// The same smooth sphere/material as the other rocky worlds. Craters are
// shallow surface features, never oversized dents in the planet silhouette.
const TAU=Math.PI*2;
const noise=n=>{n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);return((n^(n>>>16))>>>0)/4294967296;};
export const lunarSurfaceRadius=()=>1;
export function lunarSurfacePoint(lon,lat,rotation=0){const a=lon+rotation,c=Math.cos(lat);return{x:Math.sin(a)*c,y:-Math.sin(lat),z:Math.cos(a)*c};}
const MARIA=[[-.48,.34,.36,.27],[.13,.51,.28,.25],[.52,.28,.3,.31],[.61,-.08,.22,.2],[-.2,-.13,.29,.21],[2.5,-.34,.22,.28]];
export function drawLunarSphere(c,x,y,r,{rotation=0,sun=[1,0,0]}={}){
  c.save();c.translate(x,y);sphereBase(c,r,['#bdc2b3','#a0aa9b','#75877e'],sun);
  c.save();c.beginPath();c.arc(0,0,r,0,TAU);c.clip();
  // Nested, overlapping contours are filled as one surface, so the maria
  // blend into each other and fade at the edges instead of looking pasted on.
  for(let layer=0;layer<12;layer++){
    c.beginPath();const spread=1.12-layer*.024;
    MARIA.forEach(([lon,lat,rx,ry],seed)=>{
      const points=Array.from({length:64},(_,i)=>{const a=i/64*TAU,k=spread*(1+.07*Math.sin(a*5+seed)+.04*Math.sin(a*9));return lunarSurfacePoint(lon+Math.cos(a)*rx*k/Math.cos(lat),lat+Math.sin(a)*ry*k,rotation);});
      surfacePath(c,points,r);
    });c.fillStyle='#65776d06';c.fill();
  }
  const count=r<25?18:r<60?36:76;
  for(let i=0;i<count;i++){
    const p=lunarSurfacePoint(noise(i*11+21)*TAU,Math.asin(noise(i*7+47)*1.9-.95),rotation);if(p.z<.02)continue;
    const cr=r*(.007+noise(i+97)**3*.048);
    c.save();c.translate(p.x*r,p.y*r);c.rotate(Math.atan2(p.y,p.x));c.scale(Math.max(.025,p.z),1);
    const g=c.createRadialGradient(-cr*.2,0,0,0,0,cr);g.addColorStop(0,'#35494248');g.addColorStop(1,'#35494206');
    c.fillStyle=g;c.beginPath();c.arc(0,0,cr,0,TAU);c.fill();c.strokeStyle='#edf0d633';c.lineWidth=Math.max(.4,r*.0025);c.beginPath();c.arc(0,0,cr,-.9,.9);c.stroke();c.restore();
  }
  sphereNight(c,r,sun);c.restore();c.strokeStyle='#bfcbb328';c.lineWidth=.65;c.beginPath();c.arc(0,0,r,0,TAU);c.stroke();c.restore();
}
