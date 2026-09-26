import { drawStructure } from './structure-models.js';
// Small construction silhouettes shared by the planetary and Earth–Moon views.
// These are hulls, trusses and window bands; only arks use drawArkLight.
export const TAU=Math.PI*2;
export const clamp=v=>Math.max(0,Math.min(1,v));
export const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const noise=n=>{n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);return((n^(n>>>15))>>>0)/4294967296;};
export function line(c,points,color='#a5b4a48a',width=.7){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
export function disc(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
export const structure=drawStructure;
