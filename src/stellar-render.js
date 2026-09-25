// A self-luminous photosphere: no planetary day/night shading or lit crescent.
const TAU=Math.PI*2;
const noise=n=>{n=Math.imul(n^(n>>>16),0x21f0aaad);return((n^(n>>>15))>>>0)/4294967296;};
export function drawStar(c,x,y,r,{time=0,reducedMotion=false}={}){
  const t=reducedMotion?0:time;c.save();c.translate(x,y);
  const halo=c.createRadialGradient(0,0,r*.7,0,0,r*4.6);
  for(const [p,color]of [[0,'#f1dcab99'],[.12,'#dfc38d55'],[.4,'#c5ae7420'],[1,'#c5ae7400']])halo.addColorStop(p,color);
  c.fillStyle=halo;c.fillRect(-r*4.6,-r*4.6,r*9.2,r*9.2);
  // Broad coronal streamers fade into space; bounded geometry, no particles.
  for(let i=0;i<18;i++){
    const a=i/18*TAU+noise(i+9)*.18,reach=r*(1.6+noise(i+31)*1.4+Math.sin(t*.18+i)*.08),spread=.04+noise(i+17)*.1;
    const g=c.createRadialGradient(0,0,r*.92,0,0,reach);g.addColorStop(0,'#ecd9aa45');g.addColorStop(1,'#ecd9aa00');
    c.beginPath();c.moveTo(Math.cos(a-spread)*r,Math.sin(a-spread)*r);
    c.quadraticCurveTo(Math.cos(a-.03)*reach,Math.sin(a-.03)*reach,Math.cos(a)*reach,Math.sin(a)*reach);
    c.quadraticCurveTo(Math.cos(a+.06)*r*1.2,Math.sin(a+.06)*r*1.2,Math.cos(a+spread)*r,Math.sin(a+spread)*r);c.closePath();c.fillStyle=g;c.fill();
  }
  const core=c.createRadialGradient(0,0,0,0,0,r);core.addColorStop(0,'#fff7dc');core.addColorStop(.72,'#f8e9bf');core.addColorStop(.94,'#ead099');core.addColorStop(1,'#d0ae72');
  c.fillStyle=core;c.beginPath();c.arc(0,0,r,0,TAU);c.fill();
  c.save();c.clip();
  for(let i=0;i<36;i++){const a=noise(i+111)*TAU+t*.004,d=Math.sqrt(noise(i+82))*r;
    c.fillStyle=i%3?'#c5a47719':'#fff9de45';c.beginPath();c.ellipse(Math.cos(a)*d,Math.sin(a)*d,r*(.03+noise(i)*.04),r*.025,a,0,TAU);c.fill();}
  c.restore();
  for(let i=0;i<3;i++){
    const a=i*2.1+.3,breath=.65+.25*Math.sin(t*.21+i);c.save();c.rotate(a);
    c.strokeStyle=`rgba(231,181,119,${.32*breath})`;c.lineWidth=.7;c.beginPath();c.ellipse(r*.95,0,r*(.19+breath*.08),r*.15,.5,-1.8,1.8);c.stroke();c.restore();
  }c.restore();
}
