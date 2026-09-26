// An airless, faceted sphere with crater bowls/rims in the mesh itself. The
// miniature moon and its colony close-up use these same vertices and light.
const TAU=Math.PI*2;
const clamp=v=>Math.max(0,Math.min(1,v));
const norm=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const noise=n=>{n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);return((n^(n>>>16))>>>0)/4294967296;};
const unit=(lon,lat)=>[Math.sin(lon)*Math.cos(lat),-Math.sin(lat),Math.cos(lon)*Math.cos(lat)];
const CRATERS=Array.from({length:52},(_,i)=>({normal:unit(noise(i*11+21)*TAU,Math.asin(noise(i*7+47)*1.8-.9)),radius:.04+noise(i+97)**2*.17}));
const MARIA=[[-.48,.34,.42],[.13,.51,.3],[.52,.28,.34],[.61,-.08,.24],[-.2,-.13,.31]];
export function lunarSurfaceRadius(lon,lat){
  const p=unit(lon,lat);let h=0;
  for(const crater of CRATERS){const d=Math.sqrt(Math.max(0,2-2*dot(p,crater.normal)))/crater.radius;
    if(d<1.25)h+=crater.radius*(.047*Math.exp(-(((d-.94)/.17)**2))-.047*Math.max(0,1-d*d));}
  return 1+h;
}
function spin(p,rotation){const c=Math.cos(rotation),s=Math.sin(rotation);return[p[0]*c+p[2]*s,p[1],p[2]*c-p[0]*s];}
export function lunarSurfacePoint(lon,lat,rotation=0){const p=spin(unit(lon,lat),rotation),r=lunarSurfaceRadius(lon,lat);return{x:p[0]*r,y:p[1]*r,z:p[2]*r};}
const meshes=new Map();
function mesh(columns){
  if(meshes.has(columns))return meshes.get(columns);
  const rows=columns/2,vertices=[],faces=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
    const lon=i*TAU/columns,lat=-Math.PI/2+j*Math.PI/rows,r=lunarSurfaceRadius(lon,lat),p=unit(lon,lat).map(v=>v*r),e=.002;
    const u=unit(lon+e,lat).map(v=>v*lunarSurfaceRadius(lon+e,lat)),v=unit(lon,Math.min(Math.PI/2,lat+e)).map(v=>v*lunarSurfaceRadius(lon,Math.min(Math.PI/2,lat+e)));
    let normal=Math.abs(lat)>1.56?unit(lon,lat):norm(cross(u.map((x,k)=>x-p[k]),v.map((x,k)=>x-p[k])));
    if(dot(normal,p)<0)normal=normal.map(x=>-x);
    let dark=0;for(const [x,y,radius]of MARIA){const dx=Math.atan2(Math.sin(lon-x),Math.cos(lon-x))*Math.cos(lat),d=Math.hypot(dx,lat-y)/radius;dark=Math.max(dark,clamp((1-d)*2));}
    vertices.push({p,normal,albedo:1-dark*.19});
  }
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
    const a=j*(columns+1)+i,b=a+1,d=(j+1)*(columns+1)+i,c=d+1;faces.push([a,b,c],[a,c,d]);
  }
  const result={vertices,faces};meshes.set(columns,result);return result;
}
// Canvas has no Gouraud triangles. This small software rasterizer interpolates
// vertex normals' light across actual 3D triangles, with a depth buffer. Its
// canvas is only a frame buffer, never a surface decal or an imported texture.
// Smooth light avoids the latitude/longitude checkerboard of flat UV quads.
const frames=new WeakMap();
function rasterize(ctx,size,rotation,sun){
  let slots=frames.get(ctx);if(!slots){slots=new Map();frames.set(ctx,slots);}
  const key=`${size}:${rotation.toFixed(4)}:${sun.map(v=>v.toFixed(4)).join(',')}`;
  const bucket=size<140?'small':'large',cached=slots.get(bucket);if(cached?.key===key)return cached.canvas;
  const canvas=cached?.canvas??ctx.canvas.ownerDocument.createElement('canvas');canvas.width=canvas.height=size;
  const c=canvas.getContext('2d'),image=c.createImageData(size,size),depth=new Float32Array(size*size).fill(-2),half=size/2,scale=half/1.012,light=norm(sun),m=mesh(size<140?48:112);
  const vertices=m.vertices.map(v=>{const p=spin(v.p,rotation),n=spin(v.normal,rotation);return{x:half+p[0]*scale,y:half+p[1]*scale,z:p[2],light:(.3+.67*Math.max(0,dot(n,light))+.06*Math.max(0,n[2]))*v.albedo};});
  for(const ids of m.faces){const [a,b,d]=ids.map(i=>vertices[i]);if(a.z<0&&b.z<0&&d.z<0)continue;
    const area=(b.x-a.x)*(d.y-a.y)-(b.y-a.y)*(d.x-a.x);if(Math.abs(area)<1e-6)continue;
    const minX=Math.max(0,Math.floor(Math.min(a.x,b.x,d.x))),maxX=Math.min(size-1,Math.ceil(Math.max(a.x,b.x,d.x))),minY=Math.max(0,Math.floor(Math.min(a.y,b.y,d.y))),maxY=Math.min(size-1,Math.ceil(Math.max(a.y,b.y,d.y)));
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
      const px=x+.5,py=y+.5,u=((b.x-px)*(d.y-py)-(b.y-py)*(d.x-px))/area,v=((d.x-px)*(a.y-py)-(d.y-py)*(a.x-px))/area,w=1-u-v;if(u<0||v<0||w<0)continue;
      const z=u*a.z+v*b.z+w*d.z,index=y*size+x;if(z<depth[index])continue;depth[index]=z;
      const shade=u*a.light+v*b.light+w*d.light,at=index*4;
      image.data[at]=Math.round(170*shade);image.data[at+1]=Math.round(180*shade);image.data[at+2]=Math.round(162*shade);image.data[at+3]=255;
    }
  }
  c.putImageData(image,0,0);slots.set(bucket,{key,canvas});return canvas;
}
export function drawLunarSphere(c,x,y,r,{rotation=0,sun=[1,0,0]}={}){
  const size=Math.max(80,Math.min(520,Math.ceil(r*2.4))),frame=rasterize(c,size,rotation,sun);
  c.save();c.imageSmoothingEnabled=true;c.drawImage(frame,x-r*1.012,y-r*1.012,r*2.024,r*2.024);c.restore();
}
