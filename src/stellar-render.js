// A self-luminous photosphere: no planetary day/night shading or lit crescent.
const TAU=Math.PI*2;
const noise=n=>{n=Math.imul(n^(n>>>16),0x21f0aaad);return((n^(n>>>15))>>>0)/4294967296;};
export function drawStar(c,x,y,r,{time=0,reducedMotion=false}={}){
  const t=reducedMotion?0:time;c.save();c.translate(x,y);
  const halo=c.createRadialGradient(0,0,r*.7,0,0,r*4.6);
  for(const [p,color]of [[0,'#f1dcab99'],[.12,'#dfc38d55'],[.4,'#c5ae7420'],[1,'#c5ae7400']])halo.addColorStop(p,color);
  c.fillStyle=halo;c.fillRect(-r*4.6,-r*4.6,r*9.2,r*9.2);
  // Continuous limb light. No radial spikes, rays, flares or star-shaped badge.
  const rim=c.createRadialGradient(0,0,r*.94,0,0,r*1.22);
  rim.addColorStop(0,'#fff1c300');rim.addColorStop(.25,'#f0d49b65');rim.addColorStop(1,'#d7bb7900');
  c.fillStyle=rim;c.fillRect(-r*1.22,-r*1.22,r*2.44,r*2.44);
  const core=c.createRadialGradient(0,0,0,0,0,r);core.addColorStop(0,'#fff7dc');core.addColorStop(.72,'#f8e9bf');core.addColorStop(.94,'#ead099');core.addColorStop(1,'#d0ae72');
  c.fillStyle=core;c.beginPath();c.arc(0,0,r,0,TAU);c.fill();
  c.save();c.clip();
  for(let i=0;i<36;i++){const a=noise(i+111)*TAU+t*.004,d=Math.sqrt(noise(i+82))*r;
    c.fillStyle=i%3?'#c5a47719':'#fff9de45';c.beginPath();c.ellipse(Math.cos(a)*d,Math.sin(a)*d,r*(.03+noise(i)*.04),r*.025,a,0,TAU);c.fill();}
  c.restore();
  c.restore();
}
