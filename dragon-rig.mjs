import * as T from './vendor/three.module.min.js';
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)},phase=(t,a,b)=>ease((t-a)/(b-a)),mix=(a,b,u)=>a+(b-a)*u;
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
let renderer;
function getRenderer(W,H){
  if(!renderer){renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.setClearColor(0x000000,0)}
  renderer.setSize(W,H,false);return renderer;
}
function scaleTexture(){
  const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.fillStyle='#14352c';x.fillRect(0,0,512,512);
  for(let row=-1;row<17;row++)for(let col=-1;col<9;col++){
    const px=col*64+(row%2)*32,py=row*32,g=x.createLinearGradient(px,py,px,py+49);g.addColorStop(0,'#536146');g.addColorStop(.35,'#244a3c');g.addColorStop(1,'#071e19');
    x.beginPath();x.moveTo(px-32,py);x.quadraticCurveTo(px-29,py+32,px,py+47);x.quadraticCurveTo(px+29,py+32,px+32,py);x.closePath();x.fillStyle=g;x.fill();x.strokeStyle='#a4864a';x.lineWidth=1.8;x.stroke();
  }
  const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(2,2);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
}
function taper(points,radius,mat,parent,segments=24){
  const curve=new T.CatmullRomCurve3(points.map(p=>V(...p))),geo=new T.BufferGeometry(),pos=[],norm=[],uv=[],indices=[],n=8,frames=curve.computeFrenetFrames(segments,false);
  for(let i=0;i<=segments;i++){
    const u=i/segments,p=curve.getPointAt(u),r=radius*Math.pow(1-u,.7)+.003;
    for(let j=0;j<=n;j++){const a=j/n*Math.PI*2,normal=frames.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i],Math.sin(a)),q=p.clone().addScaledVector(normal,r);pos.push(q.x,q.y,q.z);norm.push(normal.x,normal.y,normal.z);uv.push(j/n,u)}
  }
  for(let i=0;i<segments;i++)for(let j=0;j<n;j++){const a=i*(n+1)+j,b=a+n+1;indices.push(a,a+1,b,b,a+1,b+1)}
  geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(norm,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);
  const mesh=new T.Mesh(geo,mat);parent.add(mesh);return mesh;
}
function particleTexture(isFire){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  if(isFire){
    const hash=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n)};
    const noise=(a,b)=>{const ix=Math.floor(a),iy=Math.floor(b),u=ease(a-ix),v=ease(b-iy);return mix(mix(hash(ix,iy),hash(ix+1,iy),u),mix(hash(ix,iy+1),hash(ix+1,iy+1),u),v)};
    const data=x.createImageData(128,128);
    for(let py=0;py<128;py++)for(let px=0;px<128;px++){
      const dx=(px-64)/64,dy=(py-64)/64,r=Math.hypot(dx,dy),n=noise(px*.06,py*.06)*.55+noise(px*.15,py*.15)*.3+noise(px*.37,py*.37)*.15,d=clamp((1-r)*1.8-n*.95),at=(py*128+px)*4;
      data.data[at]=255;data.data[at+1]=Math.round(45+d*190);data.data[at+2]=Math.round(3+d*d*130);data.data[at+3]=Math.round(Math.pow(d,1.2)*235);
    }x.putImageData(data,0,0);
  }
  else for(let i=0;i<21;i++){const a=i*2.4,cx=64+Math.cos(a)*(i%6)*6,cy=64+Math.sin(a)*(i%7)*5,r=22+i%5*5,g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(184,205,197,.1)');g.addColorStop(1,'rgba(50,66,62,0)');x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2)}
  return new T.CanvasTexture(c);
}
export function createDragonScene(W=1920,H=1080){
  const render=getRenderer(W,H),scene=new T.Scene(),camera=new T.PerspectiveCamera(39,16/9,.1,150);camera.position.set(0,.8,19);camera.lookAt(0,.2,0);
  const root=new T.Group();scene.add(root);root.scale.setScalar(1.3);
  const tex=scaleTexture(),skin=new T.MeshStandardMaterial({color:0x78967b,map:tex,bumpMap:tex,bumpScale:.09,roughness:.6,metalness:.32});
  const gold=new T.MeshStandardMaterial({color:0xb0914e,roughness:.42,metalness:.65}),ivory=new T.MeshStandardMaterial({color:0xc5b58c,roughness:.43,metalness:.05}),maneMat=new T.MeshStandardMaterial({color:0x33241b,roughness:.82,metalness:.07});
  const dark=new T.MeshStandardMaterial({color:0x100b08,roughness:.9}),gum=new T.MeshStandardMaterial({color:0x4e2016,roughness:.55}),eyeMat=new T.MeshStandardMaterial({color:0xffb736,emissive:0xff7809,emissiveIntensity:2.4,roughness:.22}),black=new T.MeshBasicMaterial({color:0x070501}),sphere=new T.SphereGeometry(1,32,24);
  function ell(parent,mat,pos,size){const mesh=new T.Mesh(sphere,mat);mesh.position.set(...pos);mesh.scale.set(...size);parent.add(mesh);return mesh}
  const head=new T.Group();root.add(head);
  ell(head,skin,[0,.45,0],[1.24,.79,1.08]);ell(head,dark,[0,-.31,.88],[.88,.51,.45]);ell(head,skin,[0,.03,1.08],[.98,.31,.71]);ell(head,skin,[0,.24,1.27],[.65,.25,.53]);ell(head,skin,[0,.09,1.77],[.48,.15,.20]);
  [-1,1].forEach(side=>{
    ell(head,dark,[side*.27,.17,1.92],[.12,.07,.055]);ell(head,skin,[side*.91,-.02,.57],[.47,.58,.55]);
    const socket=ell(head,dark,[side*.83,.48,.86],[.31,.15,.23]);socket.rotation.z=side*.27;
    const eye=ell(head,eyeMat,[side*.83,.47,1.035],[.16,.063,.06]);eye.rotation.z=side*.24;ell(head,black,[side*.83,.475,1.095],[.016,.059,.012]);
    taper([[side*.41,.65,1.05],[side*.73,.72,1.15],[side*1.17,.88,.76],[side*1.45,1,.38]],.20,skin,head);
    taper([[side*.6,1,.0],[side*.9,1.68,-.3],[side*1.5,2.1,-.53],[side*1.8,2.65,-.82]],.22,ivory,head);
    taper([[side*1.14,1.86,-.38],[side*1.9,2,-.45],[side*2.15,2.37,-.58]],.13,ivory,head);taper([[side*.85,1.55,-.22],[side*.75,2.13,-.35],[side*1,2.48,-.65]],.11,ivory,head);
    taper([[side*.77,-.02,1.55],[side*1.55,-.07,1.72],[side*2.4,.23,1.25],[side*3.45,-.23,.8],[side*3.8,.35,.5]],.045,gold,head,44);
    taper([[side*1,.13,.86],[side*1.63,.22,.36],[side*1.85,.65,-.32]],.14,gold,head);taper([[side*1,-.22,.5],[side*1.5,-.35,.16],[side*1.9,-.15,-.35]],.13,skin,head);
  });
  for(let row=0;row<4;row++)for(let col=-2;col<=2;col++){const p=ell(head,skin,[col*(.25-row*.018),.62+row*.16,1.02-row*.24],[.19,.11,.16]);p.rotation.z=col*.15}
  for(let i=0;i<130;i++){const a=i/130*Math.PI*2,x=Math.cos(a)*1.08,y=Math.sin(a)*.9+.05,flow=Math.sin(i*2.399);taper([[x,y,-.14],[x*1.2,y*1.16,-.57],[x*(1.35+flow*.12),y*1.32+flow*.12,-1.1],[x*(1.5+flow*.1),y*1.2,-1.55-(i%7)*.08]],.035+(i%4)*.012,maneMat,head,14)}
  const jaw=new T.Group();jaw.position.set(0,-.41,.38);head.add(jaw);ell(jaw,skin,[0,-.18,.79],[.82,.25,.96]);ell(jaw,gum,[0,-.012,.93],[.72,.09,.77]);taper([[-.72,-.1,1.3],[0,-.23,1.73],[.72,-.1,1.3]],.06,gold,jaw);
  for(const side of [-1,1]){
    for(let i=0;i<7;i++){const x=side*(.16+i*.11),z=1.84-i*.065,long=i===5;taper([[x,-.14,z],[x*.96,long?-.46:-.23,z+.03],[x*.94,long?-.79:-.32-(i%2)*.025,z+.08]],long?.095:.046,ivory,head,12);taper([[x*.92,.015,z-.22],[x*.93,.10,z-.16],[x*.96,.18,z-.12]],.043,ivory,jaw,12)}
    taper([[side*.35,-.4,1],[side*.45,-.9,.86],[side*.2,-1.25,.45]],.1,maneMat,jaw);
  }
  // One deforming mesh continues from the neck through the complete tail.
  const rings=132,sides=20,bodyGeo=new T.BufferGeometry(),positions=new Float32Array((rings+1)*(sides+1)*3),normals=positions.slice(),uv=new Float32Array((rings+1)*(sides+1)*2),colors=positions.slice(),indices=[];
  for(let i=0;i<=rings;i++)for(let j=0;j<=sides;j++){
    const at=i*(sides+1)+j,a=j/sides*Math.PI*2;uv[at*2]=j/sides*3;uv[at*2+1]=i/rings*16;const c=new T.Color(Math.sin(a)<-.48?0xb29358:0x719472);colors[at*3]=c.r;colors[at*3+1]=c.g;colors[at*3+2]=c.b;
    if(i<rings&&j<sides){const b=at+sides+1;indices.push(at,at+1,b,b,at+1,b+1)}
  }
  bodyGeo.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));bodyGeo.setAttribute('normal',new T.BufferAttribute(normals,3).setUsage(T.DynamicDrawUsage));bodyGeo.setAttribute('uv',new T.BufferAttribute(uv,2));bodyGeo.setAttribute('color',new T.BufferAttribute(colors,3));bodyGeo.setIndex(indices);
  const bodyMat=skin.clone();bodyMat.vertexColors=true;const bodyMesh=new T.Mesh(bodyGeo,bodyMat);bodyMesh.frustumCulled=false;root.add(bodyMesh);
  const spine=new T.InstancedMesh(new T.ConeGeometry(.13,.6,7),gold,53);root.add(spine);spine.frustumCulled=false;const dummy=new T.Object3D();
  function point(s,t){const curl=phase(t,5.05,6.3),wave=Math.sin(s*9-t*2.3)-Math.sin(-t*2.3);return V(wave*2.2*s+curl*Math.sin(s*7)*4*s,Math.sin(s*11-t*2.8)*s*(1.1+curl*3.3),-s*22+curl*Math.sin(s*5)*3)}
  function sample(s,t){const p=point(s,t),a=point(Math.max(0,s-.002),t),b=point(Math.min(1,s+.002),t),tangent=b.sub(a).normalize(),normal=V(1,0,0).addScaledVector(tangent,-tangent.x).normalize(),binormal=new T.Vector3().crossVectors(tangent,normal).normalize();return {p,normal,binormal}}
  const limbs=[];
  for(let i=0;i<4;i++){
    const limb=new T.Group(),arm=new T.Group(),palm=new T.Group(),side=i%2?1:-1;root.add(limb);limb.add(arm);arm.add(palm);
    ell(arm,skin,[side*.42,-.38,.25],[.3,.65,.32]).rotation.z=side*.65;ell(arm,skin,[side*.73,-.93,.6],[.24,.53,.27]).rotation.x=.6;palm.position.set(side*.83,-1.25,1);ell(palm,skin,[0,0,0],[.38,.27,.4]);
    for(let j=0;j<4;j++){const x=(j-1.5)*.24,spread=(j-1.5)*.16;taper([[x,0,.11],[x+spread,-.13,.53],[x+spread*1.2,-.36,.85]],.13,skin,palm,16);taper([[x+spread*1.2,-.36,.85],[x+spread*1.25,-.57,1.11],[x+spread,-.77,1.13]],.12,ivory,palm,16)}
    const link=ell(limb,skin,[0,0,0],[.24,.6,.24]);limbs.push({limb,arm,palm,link,side,s:i<2?.10:.49});
  }
  scene.add(new T.HemisphereLight(0x99c7b8,0x13120b,2.2));const key=new T.DirectionalLight(0xffd09b,5);key.position.set(-5,8,12);scene.add(key);const rim=new T.DirectionalLight(0x44b2a9,4.5);rim.position.set(7,4,-8);scene.add(rim);const fill=new T.DirectionalLight(0xe7752c,2.5);fill.position.set(-9,-3,3);scene.add(fill);
  const mouthLight=new T.PointLight(0xff6c14,0,28,1.6);head.add(mouthLight);mouthLight.position.set(0,-.35,2.5);
  const mist=particleTexture(false),fire=particleTexture(true),clouds=[],flames=[];
  for(let i=0;i<35;i++){const sp=new T.Sprite(new T.SpriteMaterial({map:mist,color:i%2?0x68796f:0x929d8c,transparent:true,opacity:0,depthWrite:false}));scene.add(sp);clouds.push({sp,seed:i*2.399})}
  for(let i=0;i<95;i++){const sp=new T.Sprite(new T.SpriteMaterial({map:fire,color:0xffad45,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false}));scene.add(sp);flames.push({sp,seed:i*.61803398875%1,angle:i*2.399})}
  const particleGeo=new T.BufferGeometry(),particlePos=new Float32Array(180*3);particleGeo.setAttribute('position',new T.BufferAttribute(particlePos,3));const sparkMat=new T.PointsMaterial({color:0xffb554,size:.04,transparent:true,opacity:.6,blending:T.AdditiveBlending,depthWrite:false});scene.add(new T.Points(particleGeo,sparkMat));
  const mouthPos=V(),direction=V(),q=new T.Quaternion();let disposed=false;
  function update(t){
    const arrive=phase(t,.7,2.25),exit=phase(t,5.45,7.9),turn=phase(t,5.25,6.8),firePower=phase(t,4.15,4.4)*(1-phase(t,5.2,5.6));
    root.position.set(exit*18,Math.sin(t*1.2)*.06+exit*5,mix(-2.5,4.2,arrive)-exit*17);root.rotation.set(.04*Math.sin(t*1.1)+exit*.15,turn*1.23,turn*.25);head.rotation.set(Math.sin(t*1.5)*.018,Math.sin(t*.9)*.035*(1-exit),Math.sin(t*.8)*.02);
    jaw.rotation.x=.03+phase(t,2.8,3.45)*.2+phase(t,3.85,4.25)*.3-phase(t,5.3,5.9)*.43;eyeMat.emissiveIntensity=1.7+phase(t,2.6,3.6)*1.4+firePower;mouthLight.intensity=firePower*80;
    for(let i=0;i<=rings;i++){
      const s=i/rings,{p,normal,binormal}=sample(s,t),radius=(.68*Math.pow(1-s,.9)+.025)*(1+.08*Math.sin(s*5));
      for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,n=normal.clone().multiplyScalar(Math.cos(a)).addScaledVector(binormal,Math.sin(a)),at=(i*(sides+1)+j)*3;positions[at]=p.x+n.x*radius;positions[at+1]=p.y+n.y*radius;positions[at+2]=p.z+n.z*radius;normals[at]=n.x;normals[at+1]=n.y;normals[at+2]=n.z}
    }
    bodyGeo.attributes.position.needsUpdate=true;bodyGeo.attributes.normal.needsUpdate=true;
    for(let i=0;i<53;i++){const s=i/57+.02,p=point(s,t),r=.68*Math.pow(1-s,.9);dummy.position.copy(p).add(V(0,r+.2,0));dummy.rotation.set(-.3,0,Math.sin(t*2+i)*.06);dummy.scale.setScalar(1-s*.75);dummy.updateMatrix();spine.setMatrixAt(i,dummy.matrix)}spine.instanceMatrix.needsUpdate=true;
    for(let i=0;i<limbs.length;i++){const {limb,arm,palm,link,side,s}=limbs[i],p=point(s,t);limb.position.copy(p);limb.position.x+=side*.38;limb.rotation.z=side*.3;const lunge=i===0?Math.sin(Math.PI*phase(t,0,1.75)):0;arm.rotation.x=-lunge*.48;arm.rotation.y=side*(.22+Math.sin(t*2+i)*.1);arm.position.set(lunge*1.3,lunge*1.2,lunge*11.8);palm.rotation.x=lunge*.48;const end=arm.position.clone().add(V(side*.25,-.3,.1)),length=end.length();link.position.copy(end).multiplyScalar(.5);link.quaternion.setFromUnitVectors(V(0,1,0),end.normalize());link.scale.set(.24,length*.5,.24)}
    root.updateMatrixWorld(true);head.getWorldQuaternion(q);direction.set(0,-.05,1).applyQuaternion(q).normalize();mouthPos.set(0,-.32,2).applyMatrix4(head.matrixWorld);
    const fogAmount=phase(t,.65,1.3)*(1-phase(t,6.4,7.8));
    clouds.forEach(({sp,seed},i)=>{const a=seed+t*.11,front=i%3===0,spread=3.7+phase(t,.7,2)*2;sp.position.set(Math.sin(a)*spread+(i%2?2:-2),Math.cos(a*1.3)*2.8-1,front?6.5:-2-(i%4)*3);sp.scale.setScalar(4+(i%4)*1.6);sp.material.rotation=seed+t*.08;sp.material.opacity=fogAmount*(front?.20:.4)*(1-firePower*.5)});
    flames.forEach(({sp,seed,angle},i)=>{const age=(t*1.9+seed)%1,travel=age*age*14,spread=age*age*2.6;sp.position.copy(mouthPos).addScaledVector(direction,travel);sp.position.x+=Math.cos(angle+age*4)*spread;sp.position.y+=Math.sin(angle)*spread-age*.8;sp.scale.setScalar(.22+age*3.3);sp.material.rotation=angle+t*(i%2?2:-2);sp.material.opacity=firePower*(1-age)*.23;sp.material.color.setHSL(.075-age*.055,1,.7-age*.3)});
    for(let i=0;i<180;i++){const a=i*2.399,age=(t*.19+i*.618)%1;particlePos[i*3]=Math.sin(a)*12+Math.sin(t+i)*.3;particlePos[i*3+1]=-5+age*11;particlePos[i*3+2]=Math.cos(a)*8}particleGeo.attributes.position.needsUpdate=true;sparkMat.opacity=.55*(1-exit);
    const shake=(t>.68?Math.exp(-(t-.68)*15)*.10:0)+firePower*.012;camera.position.x=Math.sin(t*87)*shake;camera.position.y=.8+Math.cos(t*91)*shake;camera.lookAt(0,.2,0);render.render(scene,camera);
  }
  return {mode:'continuous-3d',frame(ctx,t,u,dt){if(disposed)return;update(t);const fade=phase(t,0,.3)*(1-phase(t,7.5,8));ctx.fillStyle='rgba(3,10,9,'+fade*.82+')';ctx.fillRect(0,0,W,H);ctx.drawImage(render.domElement,0,0,W,H)},dispose(){if(disposed)return;disposed=true;const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material)});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());tex.dispose();mist.dispose();fire.dispose();render.renderLists.dispose()}};
}
