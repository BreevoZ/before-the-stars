// Small construction silhouettes shared by the planetary and Earth–Moon views.
// These are hulls, trusses and window bands; only arks use drawArkLight.
export const TAU=Math.PI*2;
export const clamp=v=>Math.max(0,Math.min(1,v));
export const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const noise=n=>{n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);return((n^(n>>>15))>>>0)/4294967296;};
export function line(c,points,color='#a5b4a48a',width=.7){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
export function disc(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
export function structure(c,x,y,s,kind='station',{lit=1,angle=0}={}){
  c.save();c.translate(x,y);c.rotate(angle);c.scale(s,s);
  c.fillStyle='#293e40';c.strokeStyle='#a9b9ac';c.lineWidth=.65;
  if(kind==='city'){
    for(let i=0;i<5;i++){const h=2+i%3;c.fillRect(i*2-5,-h,1.5,h);line(c,[[i*2-5,-h],[i*2-3.5,-h]],'#c5c8ab99',.6);}
    line(c,[[-5,1],[5,1]],`rgba(230,214,164,${lit*.7})`,.6);
  }else if(kind==='dome'){
    c.beginPath();c.ellipse(0,0,4,2.2,0,Math.PI,TAU);c.fillStyle='#b6c9bf33';c.fill();c.stroke();
    line(c,[[-4,0],[4,0]],'#737c6944');line(c,[[-2,-.3],[2,-.3]],`rgba(230,214,164,${lit*.7})`,.7);
  }else if(kind==='array'){
    for(let i=0;i<4;i++){c.fillStyle=i%2?'#819797':'#536e70';c.fillRect(-5+i*2.7,-2,2,4);}line(c,[[-5,0],[5,0]],'#d5cfb855',.5);
  }else if(kind==='balloon'){
    c.fillStyle='#b8ba9a';c.beginPath();c.ellipse(0,-3,5,1.6,0,0,TAU);c.fill();line(c,[[-3,-2],[-2,1],[2,1],[3,-2]],'#727f7699',.5);c.fillStyle='#354b4d';c.fillRect(-2,0,4,2);
  }else if(kind==='tug'){
    c.fillStyle='#82958b';c.beginPath();c.moveTo(4,0);c.lineTo(-3,-2);c.lineTo(-3,2);c.closePath();c.fill();c.fillStyle='#354e50';c.fillRect(-4,-3,2,6);line(c,[[-2,0],[1,0]],'#dccd9c',.7);
  }else if(kind==='probe'){
    c.strokeRect(-1.1,-1.1,2.2,2.2);line(c,[[-5,0],[5,0]],'#adbbb0');line(c,[[0,-4],[0,4]],'#adbbb0');
  }else if(kind==='kite'){
    c.fillStyle='#a6ae9477';c.beginPath();c.moveTo(0,-4);c.lineTo(4,0);c.lineTo(0,4);c.lineTo(-4,0);c.closePath();c.fill();line(c,[[0,0],[0,9]],'#a8b1a45a',.5);
  }else{
    c.fillRect(-2,-2,4,4);c.strokeRect(-2,-2,4,4);line(c,[[-7,0],[7,0]],'#a3b4a5');
    if(kind==='dock'){for(let i=-6;i<=6;i+=3)line(c,[[i,-2],[i+2,2],[i+3,-2]],'#a3b4a580',.6);}
    else{for(const sign of [-1,1]){c.fillStyle='#658184';c.fillRect(sign*5-1.5,-3,3,6);line(c,[[sign*5,-3],[sign*5,3]],'#b3c1b455',.4);}}
    line(c,[[-1,-1],[1,-1]],`rgba(230,214,164,${lit})`,.6);
  }c.restore();
}
export function tether(c,x,y,r,p,{time=0,reducedMotion=false}={}){
  if(p.z<=.04)return;const len=Math.hypot(p.x,p.y)||1,ux=p.x/len,uy=p.y/len;
  const a=[x+p.x*r,y+p.y*r],b=[x+ux*r*1.28,y+uy*r*1.28];
  line(c,[a,b],'#c2c5a999',.65);structure(c,...b,Math.max(.45,r*.009),'station');
  const t=reducedMotion?.6:(time*.06)%1;structure(c,a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,Math.max(.3,r*.006),'tug',{angle:Math.atan2(uy,ux)});
}
export function habitatRing(c,g,count,building,front,time=0){
  if(!count&&!building)return;c.save();c.translate(g.x,g.y);c.rotate(-.16);
  for(let i=0;i<Math.min(7,count+(building>0?1:0));i++){
    const alpha=i<count?1:.2+building*.5,from=i*TAU/7+.025,to=(i+1)*TAU/7-.025;
    c.globalAlpha*=alpha;let points=[];
    const flush=()=>{if(points.length>1){line(c,points,'#9fae9699',Math.max(1,g.r*.013));line(c,points,'#dccda277',.6);}points=[];};
    for(let a=from;a<=to+.01;a+=.018){if((Math.sin(a)>=0)===front)points.push([Math.cos(a)*g.r*1.13,Math.sin(a)*g.r*.19]);else flush();}flush();
    if(i===count&&building){const a=from+(to-from)*building;if((Math.sin(a)>=0)===front)structure(c,Math.cos(a)*g.r*1.13,Math.sin(a)*g.r*.19,Math.max(.35,g.r*.007),'dock');}
    c.globalAlpha/=alpha;
  }c.restore();
}
