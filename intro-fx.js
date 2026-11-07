/* Hiệu ứng mở màn bậc 2 (Hỏa Long) và bậc 3 (Thiên Nữ) vẽ bằng canvas.
   Tải SAU overlay.js: tệp này thay thế playTierIntro() của overlay.js. */
(function(global){
'use strict';
const TAU=Math.PI*2,PI=Math.PI,sin=Math.sin,cos=Math.cos,pow=Math.pow,min=Math.min,max=Math.max;
const rnd=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const easeOut=t=>1-pow(1-clamp(t),3);
const easeOutBack=t=>{t=clamp(t);return 1+2.4*pow(t-1,3)+1.4*pow(t-1,2)};
const seg=(t,a,b)=>clamp((t-a)/(b-a));

/* ---------- quầng sáng + hạt ---------- */
const sprites={};
function sprite(color){
  if(sprites[color])return sprites[color];
  const c=document.createElement('canvas');c.width=c.height=128;
  const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba('+color+',1)');g.addColorStop(.25,'rgba('+color+',.55)');g.addColorStop(1,'rgba('+color+',0)');
  x.fillStyle=g;x.fillRect(0,0,128,128);return sprites[color]=c;
}
function glow(ctx,color,x,y,r,a){
  if(a<=0||r<=0)return;
  ctx.globalAlpha=min(1,a);ctx.drawImage(sprite(color),x-r,y-r,r*2,r*2);ctx.globalAlpha=1;
}
const PETAL_COLORS=['255,224,234','255,172,202','255,240,214','255,205,225'];
class Particles{
  constructor(){this.list=[]}
  add(p){if(this.list.length>1800)return;p.age=0;p.rot=p.rot||0;this.list.push(p)}
  update(dt){
    const l=this.list;
    for(let i=l.length-1;i>=0;i--){
      const p=l[i];p.age+=dt;
      if(p.age>=p.life){l[i]=l[l.length-1];l.pop();continue}
      const d=1-min(.95,(p.drag||0)*dt);
      p.vx*=d;p.vy=p.vy*d+(p.g||0)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(p.vr)p.rot+=p.vr*dt;
    }
  }
  draw(ctx){
    ctx.globalCompositeOperation='lighter';
    for(const p of this.list){
      if(p.kind==='petal')continue;
      const k=p.age/p.life;let col=p.color,a,sz;
      if(p.kind==='fire'){col=k<.22?'255,240,175':k<.55?'255,145,38':'196,40,12';a=.55*(1-k);sz=p.size*(1+k*p.grow)}
      else{a=(1-k)*(p.twinkle?.6+.4*sin(p.age*30+p.x):1);sz=p.size*(1-k*.4)}
      glow(ctx,col,p.x,p.y,sz,a);
    }
    ctx.globalCompositeOperation='source-over';
    for(const p of this.list){
      if(p.kind!=='petal')continue;
      const k=p.age/p.life,s=p.size;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.scale(1,cos(p.age*p.flip));
      ctx.globalAlpha=clamp((1-pow(k,3))*.92);ctx.fillStyle='rgba('+p.color+',1)';
      ctx.beginPath();ctx.moveTo(-s,0);ctx.quadraticCurveTo(0,-s*.75,s,0);ctx.quadraticCurveTo(0,s*.75,-s,0);ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha=1;
  }
}
function petal(parts,x,y,vx,vy,size,life,extra){
  parts.add(Object.assign({kind:'petal',x,y,vx,vy,size,life,g:90,drag:1.2,vr:rnd(-3,3),rot:rnd(0,TAU),flip:rnd(3,7),
    color:PETAL_COLORS[(Math.random()*PETAL_COLORS.length)|0]},extra||{}));
}
function strand(ctx,pts,w0,col,alpha){
  ctx.strokeStyle=col;ctx.globalAlpha=alpha;
  for(let i=1;i<pts.length;i++){
    ctx.lineWidth=w0*(1-i/pts.length);ctx.beginPath();ctx.moveTo(pts[i-1][0],pts[i-1][1]);ctx.lineTo(pts[i][0],pts[i][1]);ctx.stroke();
  }
  ctx.globalAlpha=1;
}
function backdrop(ctx,W,H,dim,flat,edge){
  ctx.fillStyle='rgba('+flat+','+(.3*dim)+')';ctx.fillRect(0,0,W,H);
  const g=ctx.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,W*.62);
  g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba('+edge+','+(.72*dim)+')');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}

/* ---------- BẬC 2: RỒNG LỬA ---------- */
function drawHead(ctx,q,ang,S,t,open,ro){
  ctx.save();ctx.translate(q.x,q.y);ctx.rotate(ang);ctx.scale(S,S);ctx.lineJoin='round';ctx.lineCap='round';
  ctx.globalCompositeOperation='lighter';
  for(let k=0;k<7;k++){ // bờm lửa
    const pts=[];
    for(let j=0;j<=10;j++){const f=j/10;pts.push([-.15-.07*k-1.9*f,-.42+.05*k-.25*f+.28*sin(f*6-t*9+k*.8)*f])}
    strand(ctx,pts,.09,'rgb(255,'+(120+k*14)+',50)',.75);
  }
  ctx.globalCompositeOperation='source-over';
  for(let w=0;w<2;w++){ // râu
    const pts=[];
    for(let j=0;j<=24;j++){const f=j/24;pts.push([1.1-2.4*f,-.1+(.45+.5*w)*f+.18*sin(f*9-t*8+w)*f])}
    strand(ctx,pts,.035,'#ffd98a',.9);
  }
  ctx.strokeStyle='#f6dfb0';ctx.lineWidth=.09;ctx.beginPath();ctx.moveTo(-.15,-.5);ctx.bezierCurveTo(-.5,-.95,-.95,-.85,-1.35,-1.28);ctx.stroke();
  ctx.lineWidth=.07;ctx.beginPath();ctx.moveTo(.02,-.56);ctx.bezierCurveTo(-.2,-1.05,-.55,-1.12,-.9,-1.55);ctx.stroke();
  ctx.save();ctx.translate(.05,.12);ctx.rotate(open); // hàm dưới
  ctx.beginPath();ctx.moveTo(-.05,-.02);ctx.bezierCurveTo(.3,.24,.8,.27,1.04,.07);ctx.quadraticCurveTo(.7,.09,.3,-.01);ctx.closePath();
  ctx.fillStyle='#7a1a0e';ctx.fill();ctx.strokeStyle='#ffc46b';ctx.lineWidth=.025;ctx.stroke();ctx.restore();
  if(ro>.05){ctx.globalCompositeOperation='lighter';glow(ctx,'255,170,60',1,.12,.6,ro*.9);ctx.globalCompositeOperation='source-over'}
  const hg=ctx.createLinearGradient(-.5,-.6,1.2,.1);hg.addColorStop(0,'#e8622e');hg.addColorStop(1,'#8f2512');
  ctx.beginPath();ctx.moveTo(-.55,-.1);ctx.bezierCurveTo(-.45,-.62,.05,-.72,.45,-.5);ctx.bezierCurveTo(.8,-.38,1.1,-.42,1.28,-.3);
  ctx.quadraticCurveTo(1.38,-.22,1.3,-.1);ctx.bezierCurveTo(1.1,-.02,.6,.02,.1,.1);ctx.bezierCurveTo(-.2,.2,-.5,.2,-.55,-.1);ctx.closePath();
  ctx.fillStyle=hg;ctx.fill();ctx.strokeStyle='#ffc46b';ctx.lineWidth=.03;ctx.stroke();
  ctx.fillStyle='#fff6dc';
  for(let i=0;i<3;i++){const x=.55+i*.2;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+.07,0);ctx.lineTo(x+.035,.11);ctx.closePath();ctx.fill()}
  ctx.strokeStyle='#ffd98a';ctx.lineWidth=.05;ctx.beginPath();ctx.moveTo(.08,-.42);ctx.quadraticCurveTo(.3,-.56,.5,-.48);ctx.stroke();
  ctx.globalCompositeOperation='lighter';glow(ctx,'255,235,150',.33,-.28,.26,.9);ctx.globalCompositeOperation='source-over';
  ctx.fillStyle='#fffbd0';ctx.beginPath();ctx.ellipse(.33,-.28,.09,.06,-.3,0,TAU);ctx.fill();
  ctx.fillStyle='#2a0a05';ctx.beginPath();ctx.ellipse(.34,-.28,.018,.05,-.3,0,TAU);ctx.fill();
  ctx.fillStyle='#3a0d06';ctx.beginPath();ctx.ellipse(1.2,-.24,.035,.02,.4,0,TAU);ctx.fill();
  ctx.restore();
}
function dragonScene(W,H){
  const parts=new Particles(),rings=[],S=H*.095,N=96,L=.46,TOTAL=1.12+L;
  let roared=false,s1=false,s2=false;
  const P=(s,t)=>[W*(-.12+s),H*.46+H*(.17+.05*sin(s*3))*sin(s*8.5+.9-t*2.2)+H*.05*sin(s*3.1+t)];
  return {frame(ctx,t,u,dt){
    const dim=smooth(seg(u,0,.14))*(1-smooth(seg(u,.86,1)));
    backdrop(ctx,W,H,dim,'12,4,2','10,2,1');
    const slam=x=>{const d=t-x;return d>0&&d<.45?Math.exp(-d*9):0};
    const shk=slam(1)*14+slam(1.28)*10+sin(PI*seg(u,.36,.66))*4;
    ctx.save();if(shk>.1)ctx.translate(rnd(-shk,shk),rnd(-shk,shk));
    const sh=TOTAL*(u+.1*sin(TAU*u)),e=.004,pts=[];
    for(let i=0;i<=N;i++){
      const s=sh-i*L/N,a=P(s-e,t),b=P(s+e,t),p=P(s,t);
      let hx=b[0]-a[0],hy=b[1]-a[1];const m=Math.hypot(hx,hy)||1;hx/=m;hy/=m;
      const k=i/N;pts.push({x:p[0],y:p[1],hx,hy,nx:-hy,ny:hx,th:S*(.06+.8*pow(1-k,.9)),k});
    }
    const head=pts[0],tail=pts[N],ang=Math.atan2(head.hy,head.hx);
    ctx.globalCompositeOperation='lighter';
    for(let i=0;i<=N;i+=5)glow(ctx,'255,110,30',pts[i].x,pts[i].y,pts[i].th*2.4,.2*dim);
    ctx.globalCompositeOperation='source-over';
    ctx.lineCap='round';ctx.lineJoin='round';
    const leg=(idx,side,near)=>{
      const q=pts[idx],bx=q.x+q.nx*q.th*.4,by=q.y+q.ny*q.th*.4,an=Math.atan2(q.ny,q.nx);
      const sw=sin(t*8+idx*.7+(near?0:2))*.45,a1=an+.6*side+sw,a2=a1-.8*side+.3*sw;
      const kx=bx+cos(a1)*S*.55,ky=by+sin(a1)*S*.55,fx=kx+cos(a2)*S*.5,fy=ky+sin(a2)*S*.5;
      ctx.strokeStyle=near?'#b03a1c':'#5a140c';
      ctx.lineWidth=q.th*.34;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(kx,ky);ctx.stroke();
      ctx.lineWidth=q.th*.24;ctx.beginPath();ctx.moveTo(kx,ky);ctx.lineTo(fx,fy);ctx.stroke();
      ctx.strokeStyle=near?'#ffe3a8':'#a8793d';ctx.lineWidth=3;
      for(let c=-1;c<=1;c++){ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx+cos(a2+c*.5)*S*.2,fy+sin(a2+c*.5)*S*.2);ctx.stroke()}
    };
    leg(14,-1,false);leg(36,-1,false);
    ctx.beginPath(); // thân
    pts.forEach((q,i)=>{const x=q.x-q.nx*q.th/2,y=q.y-q.ny*q.th/2;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
    for(let i=N;i>=0;i--){const q=pts[i];ctx.lineTo(q.x+q.nx*q.th/2,q.y+q.ny*q.th/2)}
    ctx.closePath();
    const bg=ctx.createLinearGradient(head.x,head.y,tail.x,tail.y);
    bg.addColorStop(0,'#c8401e');bg.addColorStop(.5,'#7d1a10');bg.addColorStop(1,'#3a0c08');
    ctx.fillStyle=bg;ctx.fill();ctx.strokeStyle='rgba(255,190,90,.9)';ctx.lineWidth=2.5;ctx.stroke();
    ctx.beginPath(); // bụng vàng
    for(let i=0;i<=N;i++){const q=pts[i],x=q.x+q.nx*q.th*.5,y=q.y+q.ny*q.th*.5;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}
    for(let i=N;i>=0;i--){const q=pts[i];ctx.lineTo(q.x+q.nx*q.th*.12,q.y+q.ny*q.th*.12)}
    ctx.closePath();ctx.fillStyle='rgba(255,214,140,.5)';ctx.fill();
    ctx.beginPath(); // vảy
    for(let i=3;i<N-4;i+=3){
      const q=pts[i];ctx.moveTo(q.x-q.nx*q.th*.5,q.y-q.ny*q.th*.5);
      ctx.quadraticCurveTo(q.x-q.hx*q.th*.5,q.y-q.hy*q.th*.5,q.x+q.nx*q.th*.5,q.y+q.ny*q.th*.5);
    }
    ctx.strokeStyle='rgba(255,200,110,.3)';ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle='#ffb347'; // gai lưng
    for(let i=1;i<66;i+=2){
      const q=pts[i],r=pts[i+1],sp=q.th*(.62-.3*q.k)*(1+.18*sin(t*13+i));
      const x1=q.x-q.nx*q.th/2,y1=q.y-q.ny*q.th/2,x2=r.x-r.nx*r.th/2,y2=r.y-r.ny*r.th/2;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
      ctx.lineTo((x1+x2)/2-q.nx*sp-q.hx*sp*.8,(y1+y2)/2-q.ny*sp-q.hy*sp*.8);ctx.closePath();ctx.fill();
    }
    leg(14,1,true);leg(36,1,true);
    const ro=sin(PI*seg(u,.36,.66));
    drawHead(ctx,head,ang,S,t,.12+.5*ro,ro);
    const mx=head.x+(cos(ang)*1.2+sin(ang)*.1)*S,my=head.y+(sin(ang)*1.2-cos(ang)*.1)*S;
    if(!s1&&t>=1){s1=true;rings.push({x:head.x,y:head.y,t0:t})}
    if(!s2&&t>=1.28){s2=true;rings.push({x:head.x,y:head.y,t0:t})}
    if(!roared&&u>=.38){roared=true;rings.push({x:mx,y:my,t0:t})}
    if(ro>.05){
      const n=Math.ceil(dt*1000*ro);
      for(let i=0;i<n;i++){
        const a=ang+rnd(-.14,.14),sp=rnd(700,1400);
        parts.add({kind:'fire',x:mx,y:my,vx:cos(a)*sp,vy:sin(a)*sp,life:rnd(.45,.95),size:S*rnd(.35,.7),grow:2.4,drag:1.8,g:-60});
      }
      for(let i=0;i<3;i++)parts.add({kind:'spark',color:'255,190,80',x:mx,y:my,vx:cos(ang)*rnd(300,900)+rnd(-200,200),
        vy:sin(ang)*rnd(300,900)+rnd(-200,200),life:rnd(.6,1.4),size:rnd(6,14),g:80,drag:.8,twinkle:true});
    }
    if(dim>.2)for(let j=0;j<3;j++){
      const q=pts[(rnd(2,N*.9))|0];
      parts.add({kind:'spark',color:'255,214,130',x:q.x+rnd(-.3,.3)*q.th,y:q.y+rnd(-.3,.3)*q.th,vx:rnd(-30,30),vy:rnd(-60,-10),
        life:rnd(.9,1.8),size:rnd(5,12),g:-15,drag:.5,twinkle:true});
    }
    parts.update(dt);parts.draw(ctx);
    ctx.globalCompositeOperation='lighter';
    if(ro>.05)glow(ctx,'255,150,50',mx,my,S*3,.35*ro);
    for(const r of rings){
      const k=(t-r.t0)/.75;if(k<0||k>1)continue;
      ctx.strokeStyle='rgba(255,170,70,'+(.8*(1-k))+')';ctx.lineWidth=7*(1-k)+1;
      ctx.beginPath();ctx.arc(r.x,r.y,k*H*.9,0,TAU);ctx.stroke();
    }
    ctx.globalCompositeOperation='source-over';
    ctx.restore();
  }};
}

/* ---------- BẬC 3: THIÊN NỮ GIÁNG LÂM ---------- */
function lotus(ctx,x,y,R,b,t){
  const layers=[
    {n:9,span:2.9,L:1,w:.42,d:0,c0:'255,238,225',c1:'255,120,170'},
    {n:7,span:2.2,L:.82,w:.4,d:.12,c0:'255,244,214',c1:'255,160,196'},
    {n:5,span:1.5,L:.62,w:.38,d:.24,c0:'255,250,225',c1:'255,200,150'}];
  ctx.save();ctx.translate(x,y+R*.38);ctx.lineJoin='round';
  for(const ly of layers){
    const pb=easeOutBack(seg(b,ly.d,ly.d+.62));
    for(let k=0;k<ly.n;k++){
      const f=k/(ly.n-1),ang=-PI/2+(f-.5)*ly.span*pb,len=R*ly.L*pb*(1+.02*sin(t*3+k));
      if(len<=1)continue;
      ctx.save();ctx.rotate(ang+PI/2);
      const g=ctx.createLinearGradient(0,0,0,-len);g.addColorStop(0,'rgba('+ly.c0+',.96)');g.addColorStop(1,'rgba('+ly.c1+',.9)');
      ctx.beginPath();ctx.moveTo(0,0);
      ctx.bezierCurveTo(len*ly.w,-len*.2,len*ly.w*.8,-len*.8,0,-len);
      ctx.bezierCurveTo(-len*ly.w*.8,-len*.8,-len*ly.w,-len*.2,0,0);
      ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='rgba(255,255,255,.65)';ctx.lineWidth=1.5;ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}
function celestialScene(W,H){
  const parts=new Particles(),rings=[],cx=W/2,cy=H*.5,R=min(W,H)*.19;
  const cols=['255,214,140','255,150,190','190,150,255','150,230,255','255,242,205','255,180,120','210,170,255'];
  const rib=cols.map((c,i)=>({c,ph:i*TAU/7,sp:(.9+.25*(i%3))*(i%2?1:-1),ry:.45+.08*(i%4),w:R*(.16+.03*(i%3)),hist:[]}));
  let burst=false,flash=0;
  return {frame(ctx,t,u,dt){
    const dim=smooth(seg(u,0,.12))*(1-smooth(seg(u,.88,1)));
    backdrop(ctx,W,H,dim,'14,6,34','8,2,24');
    const bloom=easeOut(seg(u,.14,.44)),env=easeOut(seg(u,.1,.5)),pf=1-smooth(seg(u,.55,.8))*.75;
    ctx.globalCompositeOperation='lighter';
    glow(ctx,'255,225,170',cx,cy,R*(3.5+bloom*2),.28*bloom*(.85+.15*sin(t*6)));
    glow(ctx,'170,120,255',cx,cy,R*6,.2*dim);
    const ph=easeOut(seg(u,0,.24));
    if(ph>0){
      const g=ctx.createLinearGradient(0,0,0,cy+R*.5);
      g.addColorStop(0,'rgba(255,240,205,0)');g.addColorStop(.7,'rgba(255,240,205,.55)');g.addColorStop(1,'rgba(255,240,205,.9)');
      ctx.fillStyle=g;
      for(let i=0;i<8;i++){const w=R*(1.9-.2*i)*(.35+.65*ph);ctx.globalAlpha=.07*pf;ctx.fillRect(cx-w/2,0,w,(cy+R*.5)*ph)}
      ctx.globalAlpha=1;
    }
    const rayA=.12*bloom*pf;
    if(rayA>0){
      ctx.save();ctx.translate(cx,cy-R*.2);ctx.rotate(t*.18);ctx.fillStyle='rgba(255,240,200,'+rayA+')';
      for(let i=0;i<18;i++){ctx.rotate(TAU/18);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(R*5,-R*.12);ctx.lineTo(R*5,R*.12);ctx.closePath();ctx.fill()}
      ctx.restore();
    }
    for(let i=0;i<3;i++){ // vòng mạn-đà-la
      const a=smooth(seg(u,.28+i*.05,.5+i*.05))*dim;if(a<=0)continue;
      const r=R*(1.55+.5*i);
      ctx.save();ctx.translate(cx,cy+R*.1);ctx.rotate(t*(i%2?-.35:.28)+i);
      ctx.strokeStyle='rgba(255,226,160,'+(.75*a)+')';ctx.lineWidth=2;ctx.setLineDash(i===1?[2,12]:i===2?[14,8,2,8]:[]);
      ctx.beginPath();ctx.ellipse(0,0,r,r*.42,0,0,TAU);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='rgba(255,236,190,'+(.9*a)+')';
      for(let k=0;k<8;k++){const an=k*TAU/8,px=cos(an)*r,py=sin(an)*r*.42;
        ctx.beginPath();ctx.moveTo(px,py-7);ctx.lineTo(px+4,py);ctx.lineTo(px,py+7);ctx.lineTo(px-4,py);ctx.closePath();ctx.fill()}
      ctx.restore();
    }
    const vis=smooth(seg(u,.1,.3))*(1-smooth(seg(u,.8,.95)));
    for(const r of rib){ // dải lụa
      const a=r.ph+t*r.sp*1.5,rad=R*(1+env*1.6+.35*sin(t*1.7+r.ph*2));
      r.hist.push({x:cx+cos(a)*rad*1.25,y:cy-R*.15+sin(a)*rad*r.ry+sin(t*2+r.ph)*R*.12*env,z:sin(a)});
      if(r.hist.length>46)r.hist.shift();
      const h=r.hist;if(vis<=0)continue;
      ctx.lineCap='round';ctx.strokeStyle='rgb('+r.c+')';
      for(let i=1;i<h.length;i++){
        const f=i/h.length,w=r.w*pow(f,.9)*(.55+.45*(h[i].z+1)/2);
        ctx.beginPath();ctx.moveTo(h[i-1].x,h[i-1].y);ctx.lineTo(h[i].x,h[i].y);
        ctx.globalAlpha=f*.2*vis;ctx.lineWidth=w*3;ctx.stroke();
        ctx.globalAlpha=f*.9*vis;ctx.lineWidth=w;ctx.stroke();
      }
      ctx.globalAlpha=1;
    }
    ctx.globalCompositeOperation='source-over';
    if(bloom>0)lotus(ctx,cx,cy,R,bloom,t);
    const kx=cx,ky=cy-R*.22,cr=R*.28*easeOut(seg(u,.2,.5))*(1+.06*sin(t*8));
    ctx.globalCompositeOperation='lighter';
    if(cr>0){
      glow(ctx,'255,246,215',kx,ky,cr*3.4,.95);glow(ctx,'255,255,255',kx,ky,cr*1.3,1);
      ctx.globalAlpha=.8;ctx.drawImage(sprite('255,246,215'),kx-cr*5,ky-cr*.28,cr*10,cr*.56);
      ctx.drawImage(sprite('255,246,215'),kx-cr*.28,ky-cr*4.5,cr*.56,cr*9);ctx.globalAlpha=1;
      const ha=smooth(seg(u,.3,.5))*dim;
      ctx.strokeStyle='rgba(255,226,160,'+(.85*ha)+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(kx,ky,R*.62,0,TAU);ctx.stroke();
      ctx.save();ctx.translate(kx,ky);ctx.rotate(t*.7);ctx.setLineDash([3,9]);ctx.lineWidth=2;
      ctx.strokeStyle='rgba(255,246,215,'+(.7*ha)+')';ctx.beginPath();ctx.arc(0,0,R*.74,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.restore();
    }
    ctx.globalCompositeOperation='source-over';
    if(!burst&&u>=.5){
      burst=true;flash=.5;
      for(let i=0;i<3;i++)rings.push({t0:t+i*.16,c:i===1?'190,150,255':'255,236,190'});
      for(let i=0;i<110;i++){const a=rnd(0,TAU),sp=rnd(200,700);
        petal(parts,kx,ky,cos(a)*sp,sin(a)*sp-120,rnd(9,18),rnd(2.5,4.2),{g:130,drag:1.5})}
      for(let i=0;i<140;i++){const a=rnd(0,TAU),sp=rnd(150,900);
        parts.add({kind:'spark',color:i%3?'255,226,150':'230,200,255',x:kx,y:ky,vx:cos(a)*sp,vy:sin(a)*sp,life:rnd(.8,1.9),size:rnd(5,13),g:60,drag:1.4,twinkle:true})}
    }
    if(u<.5&&dim>.1)for(let i=0;i<2;i++)parts.add({kind:'spark',color:'255,226,160',x:cx+rnd(-R*1.5,R*1.5),y:cy+rnd(0,R),
      vx:rnd(-15,15),vy:-rnd(40,120),life:rnd(1.5,2.5),size:rnd(5,12),g:0,drag:.2,twinkle:true});
    if(burst&&u<.88&&Math.random()<dt*70)petal(parts,rnd(0,W),-20,rnd(-40,40),rnd(80,160),rnd(8,15),rnd(4,6),{g:30,drag:.3});
    parts.update(dt);parts.draw(ctx);
    ctx.globalCompositeOperation='lighter';
    for(const r of rings){
      const k=(t-r.t0)/1.1;if(k<0||k>1)continue;
      ctx.strokeStyle='rgba('+r.c+','+(.85*(1-k))+')';ctx.lineWidth=5*(1-k)+1;
      ctx.beginPath();ctx.ellipse(kx,ky+R*.4,k*H*.9,k*H*.38,0,0,TAU);ctx.stroke();
    }
    ctx.globalCompositeOperation='source-over';
    if(flash>0){ctx.fillStyle='rgba(255,250,235,'+flash+')';ctx.fillRect(0,0,W,H);flash=max(0,flash-dt*1.4)}
  }};
}

/* ---------- chạy hiệu ứng ---------- */
function run(tier,ms,signal,canvas){
  return new Promise((resolve,reject)=>{
    const abort=()=>new DOMException('Lease lost','AbortError');
    if(signal&&signal.aborted)return reject(abort());
    if(ms<600){canvas.style.opacity='0';canvas.getContext('2d')?.clearRect(0,0,canvas.width,canvas.height);
      const finish=()=>{signal?.removeEventListener('abort',cancel);resolve()},timer=setTimeout(finish,ms);const cancel=()=>{clearTimeout(timer);reject(abort())};
      if(signal)signal.addEventListener('abort',cancel,{once:true});return}
    const W=global.innerWidth||1920,H=global.innerHeight||1080,dpr=min(global.devicePixelRatio||1,1.5);
    canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
    const ctx=canvas.getContext('2d'),cinematic=tier===2&&global.CungDragon?.ready;
    const scene=tier===2?(cinematic?global.CungDragon.scene(W,H):dragonScene(W,H)):celestialScene(W,H);
    if(!ctx){resolve();return}
    let raf=0,finished=false,start=0,last=0;
    function done(){if(finished)return;finished=true;cleanup();resolve()}
    function cancel(){if(finished)return;finished=true;cleanup();reject(abort())}
    function cleanup(){cancelAnimationFrame(raf);if(signal)signal.removeEventListener('abort',cancel);ctx&&ctx.clearRect(0,0,canvas.width,canvas.height);canvas.style.opacity='0'}
    if(signal)signal.addEventListener('abort',cancel,{once:true});
    function tick(now){
      if(finished)return;
      if(!start){start=last=now;if(tier===2)global.CungSFX?.dragon({signal,legacy:!cinematic})}
      const t=(now-start)/1000,dt=min(.05,(now-last)/1000);last=now;
      const u=clamp(t/(ms/1000));
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
      canvas.style.opacity=String(smooth(seg(u,0,.04))*(1-smooth(seg(u,.92,1))));
      scene.frame(ctx,t,u,dt);
      if(u>=1)done();else raf=requestAnimationFrame(tick);
    }
    raf=requestAnimationFrame(tick);
  });
}
global.CungFX={run,dragonScene,celestialScene};
if(typeof module!=='undefined')module.exports=global.CungFX;

/* Thay thế playTierIntro của overlay.js (hàm này được gọi theo tên toàn cục lúc phát). */
if(global.document&&typeof global.playTierIntro==='function'){
  global.playTierIntro=async function(d,signal){
    const tier=Math.max(1,Math.min(3,Number(d.tier)||1)),intro=document.getElementById('tierIntro'),canvas=document.getElementById('fxCanvas');
    intro.hidden=true;intro.className='tier-intro';
    if(tier<2||!canvas)return;
    if(tier===2&&global.CungDragon){
      await global.CungDragon.preload();
      if(signal?.aborted)throw new DOMException('Lease lost','AbortError');
    }
    document.getElementById('introKicker').textContent=tier===2?'HỎA LONG KHAI LỄ':'ĐẠI LỄ TỐI THƯỢNG';
    document.getElementById('introTitle').textContent=tier===2?'RỒNG LỬA GIÁNG LÂM':'THIÊN NỮ GIÁNG LÂM';
    const reduced=!document.body.classList.contains('force-motion')&&typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ms=reduced?120:(tier===2?(global.CungDragon?.ready?global.CungDragon.duration:4200):5400);
    intro.style.setProperty('--fx-d',ms+'ms');void intro.offsetWidth;
    intro.hidden=false;intro.className='tier-intro tier-'+tier;
    try{await CungFX.run(tier,ms,signal,canvas)}
    finally{intro.hidden=true;intro.className='tier-intro'}
  };
}
})(globalThis);
