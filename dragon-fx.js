/* Cinematic Asian dragon. All cue times are seconds on the same visual/audio clock. */
(function(global){
'use strict';
const duration=16000;
const cues=Object.freeze({impact:.78,scrape:1.05,smoke:2.05,emerge:2.65,stare:4.8,growl:5.35,inhale:6.55,fire:7.25,fireEnd:10.05,coil:10.65,flight:12.2,tail:13.65,end:16});
const clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,u)=>a+(b-a)*u;
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)},phase=(t,a,b)=>smooth((t-a)/(b-a));
const assets={},base=new URL('assets/dragon/',document.currentScript.src);
let loading;
function preload(){
  if(loading)return loading;
  loading=Promise.all(['head','claw','flight','fire'].map(name=>new Promise(resolve=>{
    const im=new Image();let settled=false;
    const finish=ok=>{if(settled)return;settled=true;clearTimeout(timer);if(ok)assets[name]=im;resolve(ok)};
    const timer=setTimeout(()=>finish(false),10000);
    im.onload=()=>finish(true);im.onerror=()=>finish(false);im.src=new URL(name+'.png',base).href;
  }))).then(results=>{const ok=results.every(Boolean);if(!ok)loading=null;return ok});
  return loading;
}
// Preload while the overlay connects, so the first claw and its impact start together.
preload();
function fogSprite(seed){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
  // Cache layered turbulence rather than running blur filters at full-screen resolution.
  for(let i=0;i<34;i++){
    const a=i*2.399+seed,r=25+((i*37)%68),cx=128+Math.cos(a)*((i*13)%77),cy=128+Math.sin(a)*((i*17)%70);
    const g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(123,133,129,.105)');g.addColorStop(.4,'rgba(81,93,89,.075)');g.addColorStop(1,'rgba(33,43,41,0)');x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);
  }return c;
}
function scene(W,H){
  const unit=Math.min(W,H),fog=[fogSprite(0),fogSprite(4),fogSprite(8)],embers=[],flames=[];
  const fireLayer=document.createElement('canvas');fireLayer.width=768;fireLayer.height=512;const fireCtx=fireLayer.getContext('2d');
  const portrait=W/H<1,headW=Math.min(W*1.18,H*1.18),headH=headW*2/3;
  const headY=H*(portrait?.39:.43),mouthY=headY+headH*.205;
  function halo(ctx,x,y,r,color,alpha){
    if(alpha<=0||r<=0)return;ctx.save();ctx.globalAlpha=clamp(alpha);
    const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
  }
  function image(ctx,im,x,y,w,h,rotation=0,alpha=1){
    if(!im||alpha<=0)return;ctx.save();ctx.globalAlpha=clamp(alpha);ctx.translate(x,y);ctx.rotate(rotation);ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();
  }
  function smoke(ctx,t,amount,front){
    if(amount<=0)return;
    ctx.save();ctx.globalAlpha=clamp(amount);
    for(let i=0;i<15;i++){
      const side=i%2?1:-1,age=t-cues.smoke,spread=Math.max(0,age)*.11;
      const x=W*.5+side*W*(.03+(i%5)*.10+spread*.15)+Math.sin(t*.53+i*2)*W*.08;
      const y=H*(.36+(i%4)*.16)-Math.max(0,age)*H*.012+Math.cos(i*3+t*.3)*H*.08;
      const size=unit*(.45+(i%3)*.22)*(front?1.1:1.3);
      ctx.drawImage(fog[i%3],x-size/2,y-size/2,size,size);
    }ctx.restore();
  }
  function claw(ctx,t){
    if(t<.14||t>2.4)return;
    const thrust=phase(t,.2,cues.impact),pull=phase(t,1.18,2.4),w=unit*mix(.16,1.5,thrust);
    image(ctx,assets.claw,W*mix(.54,.35,pull),H*mix(.28,.9,pull),w,w*2/3,mix(-.5,.13,thrust)+pull*.35,phase(t,.14,.32)*(1-pull));
  }
  function scratches(ctx,t){
    if(t<cues.impact||t>3.5)return;
    const cut=phase(t,cues.impact,1.42),a=(1-phase(t,1.7,3.5))*.8;
    ctx.save();ctx.globalAlpha=a;ctx.lineCap='round';
    for(let i=0;i<4;i++){
      const x=W*(.32+i*.115),y=H*(.22+(i%2)*.045),dx=-W*.12*cut,dy=H*.46*cut;
      ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+dx*.3,y+dy*.4,x+dx*.65,y+dy*.8,x+dx,y+dy);
      ctx.strokeStyle='#0b0e0b';ctx.lineWidth=unit*.012;ctx.stroke();ctx.strokeStyle='#e7b76d';ctx.lineWidth=unit*.002;ctx.stroke();
    }ctx.restore();
  }
  function face(ctx,t){
    const enter=phase(t,cues.emerge,4.8),leave=phase(t,10.2,11.65),alpha=enter*(1-leave);
    if(alpha<=0||!assets.head)return;
    const breath=1+Math.sin(t*1.8)*.008,scale=mix(.66,1,enter)*breath*(1-leave*.4),w=headW*scale,h=headH*scale;
    const x=W*.5+Math.sin(t*.7)*unit*.008,y=headY+mix(H*.12,0,enter)-leave*H*.1;
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(Math.sin(t*.7)*.012);
    // A contiguous horizontal mesh flexes the jaw while keeping the horns steady.
    const jaw=phase(t,5.2,6.1)*(1-phase(t,10,10.5)),im=assets.head,n=48;
    for(let i=0;i<n;i++){
      const v=i/n,dh=h/n,flex=Math.max(0,(v-.59)/.41);
      const offset=flex*jaw*h*(.035+.008*Math.sin(t*17));
      ctx.drawImage(im,0,im.height*v,im.width,im.height/n,-w/2,-h/2+h*v+offset,w,dh+1+flex*jaw*h*.002);
    }
    ctx.globalCompositeOperation='screen';
    const charge=phase(t,cues.inhale,cues.fire)*(1-phase(t,9.8,10.6));
    halo(ctx,0,h*.205,h*.17,'rgba(255,93,12,.9)',charge*.85);
    // The amber eyes brighten while the dragon holds eye contact.
    const glare=phase(t,4.7,5.8)*(1-leave)*(.4+.1*Math.sin(t*4));
    [-.10,.10].forEach(ex=>halo(ctx,w*ex,-h*.08,w*.028,'rgba(255,159,35,.8)',glare));
    ctx.restore();
  }
  function fire(ctx,t,dt){
    const power=phase(t,cues.fire,cues.fire+.4)*(1-phase(t,9.65,cues.fireEnd));
    if(power>0){
      for(let i=0;i<Math.ceil(dt*210*power);i++){
        const seed=Math.random(),life=.55+Math.random()*.6;
        flames.push({age:0,life,angle:seed*Math.PI*2,spread:.2+Math.random()*.8,twist:Math.random()*8,size:.026+Math.random()*.028});
      }
    }
    ctx.save();ctx.globalCompositeOperation='screen';
    halo(ctx,W/2,mouthY,unit*.8,'rgba(255,66,5,.5)',power*.65);
    if(power>0&&assets.fire){
      const im=assets.fire,n=72,w=unit*(1.8+.12*Math.sin(t*19))*mix(.18,1,phase(t,cues.fire,cues.fire+.6)),h=w*im.height/im.width;
      fireCtx.clearRect(0,0,768,512);
      for(let j=0;j<n;j++){
        const v=j/n,sw=738*(1+Math.sin(v*23-t*28)*.018*v),dx=Math.sin(v*14-t*17)*738*.018*v;
        fireCtx.drawImage(im,0,im.height*v,im.width,im.height/n,384-sw/2+dx,512*v,sw,512/n+1);
      }
      ctx.globalAlpha=power*.83;ctx.drawImage(fireLayer,W*.5-w/2,mouthY-h*.033,w,h);
    }
    for(let i=flames.length-1;i>=0;i--){
      const f=flames[i];f.age+=dt;if(f.age>=f.life){flames.splice(i,1);continue}
      const k=f.age/f.life,e=k*k,reach=unit*(.03+e*1.55),r=unit*(f.size+k*.32)*f.spread;
      const x=W*.5+Math.cos(f.angle+k*1.2)*reach*f.spread,y=mouthY+Math.sin(f.angle)*reach*.65+e*H*.28;
      const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,k<.25?'rgba(255,250,213,.85)':'rgba(255,194,51,.65)');g.addColorStop(.28,'rgba(255,125,9,.65)');g.addColorStop(.63,'rgba(201,34,3,.28)');g.addColorStop(1,'rgba(66,4,0,0)');
      ctx.globalAlpha=(1-k)*.85;ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,r,r*(1+.3*Math.sin(f.twist+t*9)),f.angle,0,Math.PI*2);ctx.fill();
    }
    halo(ctx,W*.5,mouthY,unit*.12,'rgba(255,245,186,1)',power);
    ctx.restore();
  }
  function flight(ctx,t){
    const reveal=phase(t,cues.coil,11.8),depart=phase(t,cues.flight,15.65);
    if(!reveal||!assets.flight)return;
    const im=assets.flight,w=Math.min(W*.94,H*1.55)*mix(.82,1,reveal)*mix(1,.32,depart),h=w*im.height/im.width;
    const x=mix(W*.47,W*1.43,depart),y=mix(H*.47,-H*.3,depart),turn=-.12-.42*depart+.06*Math.sin(t*1.9);
    ctx.save();ctx.translate(x,y);ctx.rotate(turn);ctx.globalAlpha=reveal*(1-phase(t,15,15.8));
    const n=100,whip=Math.exp(-Math.pow((t-cues.tail)/.42,2));
    // Head leads; the deformation grows towards the long tail at the left.
    for(let i=0;i<n;i++){
      const u=i/n,tail=Math.pow(1-u,1.7),sway=Math.sin(u*8-t*3.2)*h*.045*tail+Math.sin(u*6-t*12)*h*.13*tail*whip;
      const coil=Math.sin(u*Math.PI*2+t*1.2)*h*.035*(1-depart);
      ctx.drawImage(im,im.width*u,0,im.width/n,im.height,-w/2+w*u,-h/2+sway+coil,w/n+.65,h);
    }ctx.restore();
  }
  function sparks(ctx,t,dt){
    const active=t>.75&&t<14.8;
    if(active)for(let i=0;i<Math.ceil(dt*(t>7.25&&t<10?95:22));i++)embers.push({x:W*Math.random(),y:H*(.65+Math.random()*.4),vx:(Math.random()-.5)*unit*.12,vy:-unit*(.03+Math.random()*.14),age:0,life:1+Math.random()*2,size:.6+Math.random()*2});
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=embers.length-1;i>=0;i--){const p=embers[i];p.age+=dt;if(p.age>p.life){embers.splice(i,1);continue}p.x+=p.vx*dt;p.y+=p.vy*dt;ctx.globalAlpha=(1-p.age/p.life)*.7;ctx.fillStyle='#ffbe69';ctx.fillRect(p.x,p.y,p.size,p.size*2.5)}ctx.restore();
  }
  return {frame(ctx,t,u,dt){
    const dim=phase(t,0,.65)*(1-phase(t,14.8,16));
    const bg=ctx.createRadialGradient(W*.5,H*.44,unit*.1,W*.5,H*.44,Math.max(W,H)*.8);
    bg.addColorStop(0,'rgba(14,24,22,'+dim*.83+')');bg.addColorStop(1,'rgba(1,5,6,'+dim*.94+')');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    const hit=t>=cues.impact?Math.exp(-(t-cues.impact)*9):0,burn=phase(t,7.25,7.5)*(1-phase(t,9.8,10.2));
    const shake=(hit*unit*.023+burn*unit*.0025);
    ctx.save();ctx.translate(Math.sin(t*92)*shake,Math.cos(t*113)*shake*.7);
    smoke(ctx,t,phase(t,1.5,2.8)*(1-phase(t,11.5,15))*.9,false);
    flight(ctx,t);face(ctx,t);
    const veil=phase(t,1.7,2.5)*(1-phase(t,3.3,5.1))*.95+phase(t,9.9,10.7)*(1-phase(t,11.4,12.4))*.8;
    smoke(ctx,t,veil,true);claw(ctx,t);scratches(ctx,t);fire(ctx,t,dt);sparks(ctx,t,dt);ctx.restore();
    if(hit>.05){ctx.fillStyle='rgba(244,227,191,'+(hit*.19)+')';ctx.fillRect(0,0,W,H)}
  }};
}
global.CungDragon={duration,cues,preload,scene,get ready(){return ['head','claw','flight','fire'].every(name=>!!assets[name])}};
})(globalThis);
