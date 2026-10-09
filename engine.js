/* Animate engine.js
   Stroke-based frames with Multi-Layering, seeded textures, bitmap LRU cache,
   copy-on-write duplicates, stroke undo, audio scrubbing, and fixed video export stream. */
(()=>{
'use strict';
const mul=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const hasSeed=(()=>{window.__R=()=>.5;const ok=rnd()===.5;window.__R=null;return ok})();
const MAXC=8,LRU=[],POOL=[],LY=[null,null],TQ=[];
let SCV=null,BC2=null,HI=null,EXPO=0,tqOn=0,FID=0;
const UK={length:0,splice(){},push(){},shift(){},pop(){}},RK={length:0};
const cur=()=>S.fr[S.cur];
const qp=p=>({x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10});
const canv=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const scratch=(w,h)=>{if(!SCV||SCV.width!==w||SCV.height!==h)SCV=canv(w,h);return SCV};
const layer=(i,w,h)=>{let c=LY[i];if(!c||c.width!==w||c.height!==h)c=LY[i]=canv(w,h);return c};
const getBase=()=>{if(!BC2||BC2.width!==S.W||BC2.height!==S.H)BC2=mk();return BC2};

class Fr{
  constructor(s){
    this.id=++FID;this.s=s||1;
    this.lops={0:[],1:[]};this.lrd={0:[],1:[]};
    this.sh=false;this.base=null;this._c=null;this._x=null;this.th=null;
  }
  get ops(){return this.lops[S.curL||0]||(this.lops[S.curL||0]=[])}
  set ops(v){this.lops[S.curL||0]=v}
  get rd(){return this.lrd[S.curL||0]||(this.lrd[S.curL||0]=[])}
  set rd(v){this.lrd[S.curL||0]=v}
  get c(){return mat(this)}
  get x(){mat(this);return this._x}
  get undo(){UK.length=this.ops.length;return UK}
  get redo(){RK.length=this.rd.length;return RK}
}

function mat(f){if(!f._c){f._c=POOL.pop()||mk();f._c._fr=f;f._x=f._c.getContext('2d');rebuild(f)}touch(f);return f._c}
function touch(f){const i=LRU.indexOf(f);if(i>=0)LRU.splice(i,1);LRU.push(f);
  while(LRU.length>MAXC){const v=LRU.find(o=>o!==f&&o!==cur()&&o!==(K&&K.f));if(!v)break;drop(v)}}
function drop(f){const i=LRU.indexOf(f);if(i>=0)LRU.splice(i,1);if(f._c){if(POOL.length<3)POOL.push(f._c);f._c=null;f._x=null}}
function own(f){if(f.sh){const n={};for(let k in f.lops)n[k]=f.lops[k].slice();f.lops=n;f.sh=false}}

function rebuild(f){const x=f._x,c=f._c;x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.globalCompositeOperation='source-over';x.clearRect(0,0,c.width,c.height);replay(f,x,c,1)}
function cth(a){if(!a.th)return null;const t=canv(a.th.width,a.th.height);t.getContext('2d').drawImage(a.th,0,0);return t}
function share(a,s){const f=new Fr(s===undefined?a.s:s);f.lops=a.lops;f.base=a.base;f.sh=a.sh=true;f.th=cth(a);return f}

function replay(f,x,cv,sc){
  if(f.base)x.drawImage(f.base,0,0,cv.width,cv.height);
  const keys=Object.keys(f.lops).sort((a,b)=>a-b);
  for(let lk of keys){
    const o=f.lops[lk]||[];let a=0;
    for(let i=o.length-1;i>=0;i--)if(o[i].k===1){a=i+1;break}
    for(let i=a;i<o.length;i++)run(o[i],x,cv,sc);
  }
}

function run(op,x,cv,sc){
  if(op.k===0)return stroke(op,x,cv,sc);
  if(op.k===1){x.save();x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,cv.width,cv.height);x.restore();return}
  if(op.k===2)return flood(x,cv.width,cv.height,Math.round(op.x*sc),Math.round(op.y*sc),op.c);
  if(op.k===3){const t=scratch(cv.width,cv.height),tc=t.getContext('2d');tc.setTransform(1,0,0,1,0,0);tc.clearRect(0,0,t.width,t.height);tc.drawImage(cv,0,0);
    x.save();x.setTransform(1,0,0,1,0,0);x.globalCompositeOperation='copy';x.translate(op.h?cv.width:0,op.h?0:cv.height);x.scale(op.h?-1:1,op.h?1:-1);x.drawImage(t,0,0);x.restore()}}

function flood(x,w,h,px,py,col){
  if(px<0||py<0||px>=w||py>=h)return;
  const d=x.getImageData(0,0,w,h).data,i0=(py*w+px)*4,t=[d[i0],d[i0+1],d[i0+2],d[i0+3]],c=hex(col),o=new ImageData(w,h),seen=new Uint8Array(w*h),st=[py*w+px];
  while(st.length){const q=st.pop();if(seen[q])continue;seen[q]=1;const i=q*4;
    if(Math.abs(d[i]-t[0])+Math.abs(d[i+1]-t[1])+Math.abs(d[i+2]-t[2])+Math.abs(d[i+3]-t[3])>200)continue;
    o.data[i]=c[0];o.data[i+1]=c[1];o.data[i+2]=c[2];o.data[i+3]=255;
    const u=q%w;if(u>0)st.push(q-1);if(u<w-1)st.push(q+1);if(q>=w)st.push(q-w);if(q<w*(h-1))st.push(q+w)}
  const m=scratch(w,h),mx=m.getContext('2d');mx.setTransform(1,0,0,1,0,0);mx.globalCompositeOperation='source-over';mx.clearRect(0,0,w,h);mx.putImageData(o,0,0);
  x.save();x.setTransform(1,0,0,1,0,0);x.globalCompositeOperation='destination-over';x.drawImage(m,0,0);x.restore()}

function shape(b,a,r){const Lf=(u,v)=>seg(u,v,1);
  if(b.sh=='l')Lf(a,r);
  else if(b.sh=='r'){const c=[a,{x:r.x,y:a.y},r,{x:a.x,y:r.y},a];for(let i=0;i<4;i++)Lf(c[i],c[i+1])}
  else{const cx=(a.x+r.x)/2,cy=(a.y+r.y)/2,rx=Math.abs(r.x-a.x)/2,ry=Math.abs(r.y-a.y)/2;let u={x:cx+rx,y:cy};
    for(let i=1;i<=72;i++){const t=i/72*6.2832,v={x:cx+rx*Math.cos(t),y:cy+ry*Math.sin(t)};Lf(u,v);u=v}}}

function walk(op,b,m){const p=op.p,P=i=>({x:p[i]/10*m,y:p[i+1]/10*m});
  if(b.sh){K.acc=0;shape(b,P(0),P(3));return}
  let a=P(0);seg(a,a,p[2]/100);
  for(let i=3;i<p.length;i+=3){const n=P(i);seg(a,n,p[i+2]/100);a=n}}

function stroke(op,x,cv,sc){
  const b=B.find(v=>v.id===op.t);if(!b||!op.p||op.p.length<3)return;
  const sv=[S.size,S.col,S.mir,S.op,K,SLx,window.__R],px=b.id==='smudge'||b.id==='blur',m=px?sc:1,s=px?1:sc,W=cv.width,H=cv.height;
  S.size=op.z*m;S.col=op.c;S.mir=op.m;S.op=op.o;window.__R=mul(op.r);
  K={f:{c:cv,x},b,acc:0,ang:0,d:[1e9,1e9,-1e9,-1e9],has:0,cv:null};
  try{
    if(b.dir){x.save();x.scale(s,s);walk(op,b,m);x.restore()}
    else{const L=layer(0,W,H),Lx=L.getContext('2d');Lx.setTransform(1,0,0,1,0,0);Lx.clearRect(0,0,W,H);
      Lx.save();Lx.scale(s,s);SLx=Lx;walk(op,b,1);Lx.restore();comp(op,b,x,L,sc,W,H)}
  }finally{[S.size,S.col,S.mir,S.op,K,SLx,window.__R]=sv}}

function comp(op,b,x,L,sc,W,H){
  const d=K.d,x0=Math.max(0,Math.floor(d[0]*sc)),y0=Math.max(0,Math.floor(d[1]*sc)),x1=Math.min(W,Math.ceil(d[2]*sc)),y1=Math.min(H,Math.ceil(d[3]*sc)),w=x1-x0,h=y1-y0;
  if(w<=0||h<=0)return;
  const T=layer(1,W,H),Tx=T.getContext('2d');Tx.setTransform(1,0,0,1,0,0);Tx.globalCompositeOperation='source-over';Tx.globalAlpha=1;
  Tx.clearRect(x0,y0,w,h);Tx.drawImage(L,x0,y0,w,h,x0,y0,w,h);
  if(b.g){Tx.globalCompositeOperation='destination-out';Tx.globalAlpha=b.g;const pt=Tx.createPattern(tile,'repeat');pt.setTransform(new DOMMatrix([sc,0,0,sc,0,0]));Tx.fillStyle=pt;Tx.fillRect(x0,y0,w,h);Tx.globalAlpha=1;Tx.globalCompositeOperation='source-over'}
  x.save();x.setTransform(1,0,0,1,0,0);x.globalAlpha=op.o;x.globalCompositeOperation=op.b!=='normal'?op.b:(b.bl||'source-over');x.drawImage(T,x0,y0,w,h,x0,y0,w,h);x.restore();
  L.getContext('2d').clearRect(x0,y0,w,h)}

const SEG=(a,b,p)=>{window.__R=K.R;try{seg(a,b,p)}finally{window.__R=null}};
function begin(e){
  const b=br(),p=toC(e.clientX,e.clientY);
  if(b.fill){fill(p);return}
  if(b.eye){K={id:e.pointerId,eye:1};pick(p);return}
  const f=cur();own(f);f.rd.length=0;
  const q=qp(p),pq=Math.round(pr(e)*100)/100,pts=[Math.round(q.x*10),Math.round(q.y*10),Math.round(pq*100)];
  if(b.sh)pts.push(pts[0],pts[1],100);
  const op={k:0,t:b.id,z:S.size,c:S.col,o:S.op,m:S.mir,b:S.blend,r:(Math.random()*4294967296)>>>0,p:pts};
  f.ops.push(op);
  const bc=getBase(),bx=bc.getContext('2d');bx.globalCompositeOperation='copy';bx.drawImage(f.c,0,0);bx.globalCompositeOperation='source-over';
  SLx.clearRect(0,0,S.W,S.H);
  K={id:e.pointerId,f,base:bc,acc:0,b,dirty:0,s:q,last:q,d:[1e9,1e9,-1e9,-1e9],op,pts,R:mul(op.r)};
  SEG(q,q,pq);K.dirty=!b.dir;ur();requestAnimationFrame(loop)}

function stepTo(r,p){
  const l=K.last,k=1-S.sm,n=qp({x:l.x+(r.x-l.x)*k,y:l.y+(r.y-l.y)*k});
  if(n.x===l.x&&n.y===l.y)return;
  const pq=Math.round(p*100)/100;SEG(l,n,pq);K.last=n;K.pts.push(Math.round(n.x*10),Math.round(n.y*10),Math.round(pq*100));
  if(!K.b.dir)K.dirty=1}
function stepDir(){const r=K.tgt;K.tgt=null;stepTo(r,K.pr||1)}
function move(q){
  if(K.eye){pick(toC(q.clientX,q.clientY));return}
  const r=toC(q.clientX,q.clientY),b=K.b;
  if(b.dir){K.tgt=r;K.pr=pr(q);return}
  if(b.sh){const rq=qp(r);K.pts[3]=Math.round(rq.x*10);K.pts[4]=Math.round(rq.y*10);SLx.clearRect(0,0,S.W,S.H);K.acc=0;
    window.__R=K.R;try{shape(b,K.s,rq)}finally{window.__R=null}K.dirty=1;K.full=1;return}
  stepTo(r,pr(q))}

function end(){
  if(K.eye){K=null;return}
  if(K.tgt)stepDir();flush();
  const f=K.f;K.op.p=Int32Array.from(K.pts);K=null;
  mkth(f);saveSoon();ur()}

function cancel(){
  if(!K)return;
  if(!K.eye){const f=K.f,i=f.ops.indexOf(K.op);if(i>=0)f.ops.splice(i,1);put(f,K.base)}
  K=null;ur()}

function apply(f,op){own(f);f.rd.length=0;f.ops.push(op);run(op,f.x,f.c,1);mkth(f);ur();saveSoon()}
function fill(p){const q=qp(p);if(q.x<0||q.y<0||q.x>=S.W||q.y>=S.H)return;apply(cur(),{k:2,x:q.x,y:q.y,c:S.col})}
function flip(h){apply(cur(),{k:3,h:h?1:0})}

function refresh(f){if(f._c){rebuild(f);touch(f)}else mat(f);mkth(f);ur();saveSoon()}
function undo(){const f=cur();if(K||!f.ops.length)return;own(f);f.rd.push(f.ops.pop());refresh(f)}
function redo(){const f=cur();if(K||!f.rd.length)return;own(f);f.ops.push(f.rd.pop());refresh(f)}

function mkth(f){const w=96,h=Math.round(96*S.H/S.W);if(!f.th)f.th=canv(w,h);
  const t=f.th.getContext('2d');t.fillStyle='#fff';t.fillRect(0,0,w,h);t.drawImage(f.c,0,0,w,h);paint(S.fr.indexOf(f))}
function paint(i){const c=cards()[i]&&cards()[i].firstChild,f=S.fr[i];if(c&&f&&f.th)c.getContext('2d').drawImage(f.th,0,0,c.width,c.height)}
function thumb(i){const f=S.fr[i];if(!f)return;if(f.th)paint(i);else{if(!TQ.includes(f))TQ.push(f);if(!tqOn){tqOn=1;setTimeout(tick,0)}}}
function tick(){const f=TQ.shift();if(f&&!f.th&&S.fr.includes(f))mkth(f);if(TQ.length)setTimeout(tick,8);else tqOn=0}

function dupF(i){const a=S.fr[i],f=share(a);if(a._c){f._c=POOL.pop()||mk();f._c._fr=f;f._x=f._c.getContext('2d');f._x.clearRect(0,0,f._c.width,f._c.height);f._x.drawImage(a._c,0,0);touch(f)}insF([f],i+1)}
function copyF(i,cut){const f=S.fr[i];S.clip=[{lops:f.lops,base:f.base}];f.sh=true;toast(cut?'Cut':'Copied');if(cut)delF(i)}
function pasteAt(){if(!S.clip.length)return toast('Nothing copied yet');
  insF(S.clip.map(c=>{const f=new Fr(1);if(c instanceof HTMLCanvasElement)f.base=c;else{f.lops=c.lops;f.base=c.base;f.sh=true}return f}),S.ins)}
function delF(i=S.cur){if(S.play)return;
  if(S.fr.length==1)apply(cur(),{k:1});else{drop(S.fr[i]);S.fr.splice(i,1);S.cur=Math.min(i,S.fr.length-1);S.ins=S.cur+1;build()}saveSoon()}
function doubleAll(){if(S.play)return;const o=S.fr,n=[];o.forEach(f=>{n.push(f);n.push(share(f))});
  S.fr=n;S.cur=Math.min(S.cur*2,n.length-1);S.ins=S.cur+1;build();saveSoon();toast(`${o.length} \u2192 ${n.length} frames`)}
function dupShot(r){const sh=shotOf(r.id),id=newShotId();S.shots.push({id,name:sh.name+' copy'});
  const l=S.fr.slice(r.from,r.to+1).map(f=>share(f,id));S.fr.splice(r.to+1,0,...l);S.cur=r.to+1;S.ins=r.to+1+l.length;build();saveSoon()}

const go0=window.go;
function go(i){go0(i);if(S.play){const n=S.fr.length,c=S.cur;setTimeout(()=>{for(let k=1;k<=3;k++){const g=S.fr[(c+k)%n];if(g&&g!==cur())g.c}},0)}}
const setSize0=window.setSize;
function setSize(w,h,frames,shots){LRU.length=0;POOL.length=0;LY[0]=LY[1]=null;SCV=BC2=HI=null;TQ.length=0;
  setSize0(w,h,(frames&&frames.length?frames:[new Fr(1)]).map(adopt),shots)}
const adopt=f=>f instanceof Fr?f:Object.assign(new Fr(f.s),{base:f.c});

const dI=CanvasRenderingContext2D.prototype.drawImage;
CanvasRenderingContext2D.prototype.drawImage=function(s,...a){
  if(EXPO&&a.length===4&&s&&s._fr&&(a[2]>s.width||a[3]>s.height)){
    const w=a[2],h=a[3];
    if(Math.abs(h/S.H-w/S.W)<=.01){if(!HI||HI.width!==w||HI.height!==h)HI=canv(w,h);
      const x=HI.getContext('2d');x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.globalCompositeOperation='source-over';x.clearRect(0,0,w,h);
      replay(s._fr,x,HI,w/S.W);s=HI}}
  return dI.call(this,s,...a)};

const ep0=window.exportPage;
function exportPage(){ep0();const api=stack[stack.length-1];if(!api)return;EXPO=1;const c=api.close;
  api.close=()=>{EXPO=0;HI=null;LY[0]=LY[1]=null;SCV=null;c()}}

Object.assign(window,{begin,move,end,cancel,stepDir,fill,flip,undo,redo,thumb,dupF,copyF,pasteAt,delF,doubleAll,dupShot,go,setSize,exportPage,push(){}});
if(S.fr.some(f=>!(f instanceof Fr))){S.fr=S.fr.map(adopt);build()}
})();
