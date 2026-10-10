/* Animate engine.js
   1) every stroke/fill is logged per frame; export re-renders those strokes at the export resolution (true 4K)
   2) undo stores only the changed region (much less memory, deeper history)
   3) exports save to the phone (Gallery folders / Documents) with Share as an option */
(()=>{
'use strict';
let REC=0,HQ=0,HC={};
const AN=window.AN={bg:'',exp:0};
const R1=v=>Math.round(v*10)/10,R2=v=>Math.round(v*100)/100,full=e=>e.w===undefined;
const _begin=begin,_move=move,_end=end,_cancel=cancel,_fill=fill,_stamp=stamp,_setSize=setSize,_save=saveProject,_openO=openProject,_exp=exportPage;
const _open=(...a)=>(window.openSeq||_openO)(...a);
const SP=[],dirty=f=>{f.ver=(f.ver||0)+1;f.pbOK=0;f.rle=null;f.pbP=null};
const gsnap=c=>{let k=SP.pop();if(!k||k.width!==c.width||k.height!==c.height){k=document.createElement('canvas');k.width=c.width;k.height=c.height}const x=k.getContext('2d');x.globalCompositeOperation='source-over';x.clearRect(0,0,k.width,k.height);x.drawImage(c,0,0);return k};
const recycle=k=>{if(k&&SP.length<2&&!HQ&&k.width===S.W&&k.height===S.H)SP.push(k)};
const prep=f=>{if(f.lg===undefined){f.bs=AN.enc?AN.enc(f.c):snap(f.c);f.lg=[];f.rl=[]}};
const nfull=f=>f.undo.reduce((n,e)=>n+full(e),0);

/* ---- undo: region snapshots, deeper history ---- */
window.push=function(f){
  f.undo.push(gsnap(f.c));dirty(f);
  while(f.undo.length>80||nfull(f)>UMAX())f.undo.shift();
  f.redo.length=0;ur();
  if(HQ)return;
  if(REC)f.undo[f.undo.length-1].rec=1;else f.lg=undefined; /* unknown edit: log restarts at next stroke */
  f.rl=[];
};
function swap(f,e){let r;
  if(full(e)){r=snap(f.c);put(f,e)}
  else{const c=document.createElement('canvas');c.width=e.w;c.height=e.h;c.getContext('2d').drawImage(f.c,e.x,e.y,e.w,e.h,0,0,e.w,e.h);
    f.x.clearRect(e.x,e.y,e.w,e.h);f.x.drawImage(e.c,e.x,e.y);r={x:e.x,y:e.y,w:e.w,h:e.h,c}}
  r.rec=e.rec;return r}
window.undo=function(){const f=F();if(K||!f.undo.length)return;const e=f.undo.pop();f.redo.push(swap(f,e));dirty(f);
  if(e.rec&&f.lg&&f.lg.length)f.rl.push(f.lg.pop());else f.lg=undefined;thumb(S.cur);ur();saveSoon()};
window.redo=function(){const f=F();if(K||!f.redo.length)return;const e=f.redo.pop();f.undo.push(swap(f,e));dirty(f);
  if(e.rec&&f.lg&&f.rl&&f.rl.length)f.lg.push(f.rl.pop());else f.lg=undefined;thumb(S.cur);ur();saveSoon()};
$('#bUndo').onclick=()=>undo();$('#bRedo').onclick=()=>redo();

/* ---- stroke logging ---- */
window.begin=function(e){
  if(HQ)return _begin(e);
  const f=F();if(!br().eye)prep(f);
  REC=1;try{_begin(e)}finally{REC=0}
  const k=K;
  if(k&&!k.eye&&k.f===f){const p=toC(e.clientX,e.clientY);
    k.op={t:'s',tool:S.tool,col:S.col,size:S.size,op:S.op,sm:S.sm,bl:S.blend,mir:S.mir,p:[R1(p.x),R1(p.y),R2(pr(e))]};f.lg.push(k.op)}};
window.move=function(q){_move(q);
  if(HQ||!K||K.eye||!K.op)return;const p=toC(q.clientX,q.clientY);K.op.p.push(R1(p.x),R1(p.y),R2(pr(q)))};
window.fill=function(p){
  if(HQ)return _fill(p);
  const f=F();prep(f);const t=f.undo[f.undo.length-1];REC=1;try{_fill(p)}finally{REC=0}
  if(f.undo[f.undo.length-1]!==t)f.lg.push({t:'f',tool:'fill',col:S.col,size:1,op:1,sm:0,bl:'normal',mir:0,p:[R1(p.x),R1(p.y),1]})};
window.cancel=function(){const k=K;_cancel();
  if(!HQ&&k&&!k.eye&&k.op&&k.f.lg){const i=k.f.lg.lastIndexOf(k.op);if(i>=0)k.f.lg.splice(i,1)}
  if(!HQ&&k&&!k.eye)recycle(k.base)};
window.stamp=function(x,y,sz,a){_stamp(x,y,sz,a);
  if(HQ||!K||!K.f)return;const m=sz*2+8,b=K.bb||(K.bb=[1e9,1e9,-1e9,-1e9]);
  for(const[px,py]of(K.b.nm?[[x,y]]:mir(x,y,a))){b[0]=Math.min(b[0],px-m);b[1]=Math.min(b[1],py-m);b[2]=Math.max(b[2],px+m);b[3]=Math.max(b[3],py+m)}};
window.end=function(){const k=K;_end();
  if(HQ||!k||k.eye||!k.bb)return;const u=k.f.undo,i=u.lastIndexOf(k.base);if(i<0)return;
  const b=k.bb,x0=Math.max(0,Math.floor(b[0])),y0=Math.max(0,Math.floor(b[1])),x1=Math.min(S.W,Math.ceil(b[2])),y1=Math.min(S.H,Math.ceil(b[3])),w=x1-x0,h=y1-y0;
  if(w<=0||h<=0)return;const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(k.base,x0,y0,w,h,0,0,w,h);
  u[i]={x:x0,y:y0,w,h,c,rec:k.base.rec};recycle(k.base)};
window.setSize=function(w,h,fr,sh){SP.length=0;_setSize(w,h,fr,sh);if(!fr)S.fr.forEach(f=>{f.lg=[];f.rl=[]})};
$('#bAdd').onclick=()=>{const n=S.fr.length;addF();if(S.fr.length>n){const f=F();f.lg=[];f.rl=[]}};

/* ---- true-resolution re-render of one frame (used by export) ---- */
function hq(f,sc){
  const W2=Math.round(S.W*sc),H2=Math.round(S.H*sc),sv={W:S.W,H:S.H,fr:S.fr,cur:S.cur,tool:S.tool,col:S.col,size:S.size,op:S.op,sm:S.sm,bl:S.blend,mir:S.mir,SL,SLx,d:S.dirtyF,toC:window.toC,th:window.thumb};
  HQ=1;S.W=W2;S.H=H2;TMP.width=W2;TMP.height=H2;
  if(!HC.s){HC.s=document.createElement('canvas');HC.s.width=W2;HC.s.height=H2;HC.x=HC.s.getContext('2d');HC.r=nf(1)}
  SL=HC.s;SLx=HC.x;GP=TX.createPattern(tile,'repeat');try{GP.setTransform(new DOMMatrix([sc,0,0,sc,0,0]))}catch(e){}
  const rf=HC.r;rf.x.clearRect(0,0,W2,H2);rf.undo.length=0;if(f.bs){let b=f.bs;if(b.o){b=document.createElement('canvas');AN.dec(f.bs,b)}rf.x.drawImage(b,0,0,W2,H2)}
  S.fr=[rf];S.cur=0;window.thumb=()=>{};let pt;window.toC=()=>pt;
  const ev=p=>({pointerId:1,pointerType:'pen',pressure:Math.max(.001,(p-.3)/.7),clientX:0,clientY:0});
  try{
    for(const o of f.lg){const p=o.p;
      S.tool=o.tool;S.col=o.col;S.size=o.size*sc;S.op=o.op;S.sm=o.sm;S.blend=o.bl;S.mir=o.mir;
      pt={x:p[0]*sc,y:p[1]*sc};begin(ev(p[2]));
      if(K){for(let i=3;i<p.length;i+=3){pt={x:p[i]*sc,y:p[i+1]*sc};move(ev(p[i+2]));if(K.tgt)stepDir()}end()}
      rf.undo.length=0}
  }finally{K=null;HQ=0;S.W=sv.W;S.H=sv.H;S.fr=sv.fr;S.cur=sv.cur;S.tool=sv.tool;S.col=sv.col;S.size=sv.size;S.op=sv.op;S.sm=sv.sm;S.blend=sv.bl;S.mir=sv.mir;S.dirtyF=sv.d;
    TMP.width=sv.W;TMP.height=sv.H;SL=sv.SL;SLx=sv.SLx;GP=TX.createPattern(tile,'repeat');window.toC=sv.toC;window.thumb=sv.th}
  return rf.c}
window.exportPage=function(){
  _exp();const api=stack[stack.length-1],g=api&&api.q('#xG');if(!g)return;const o=g.onclick;
  g.onclick=async()=>{
    const m=/^(\d+)/.exec(api.q('#xI').textContent||''),sc=m?(+m[1])/S.W:1,bg=AN.bg,
      fs=S.fr.filter(f=>bg||(sc>1.01&&f.lg&&f.lg.length)),orig=new Map(fs.map(f=>[f,Object.getOwnPropertyDescriptor(f,'c')])),og=f=>{const d=orig.get(f);return d.get?d.get.call(f):d.value};
    const outF=f=>{const hqOn=sc>1.01&&f.lg&&f.lg.length,src=hqOn?hq(f,sc):og(f);if(!bg)return src;
      const W2=Math.round(S.W*(hqOn?sc:1)),H2=Math.round(S.H*(hqOn?sc:1));
      if(!HC.o||HC.o.width!==W2){HC.o=document.createElement('canvas');HC.o.width=W2;HC.o.height=H2}
      const x=HC.o.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,W2,H2);x.drawImage(src,0,0,W2,H2);return HC.o};
    fs.forEach(f=>Object.defineProperty(f,'c',{configurable:true,enumerable:true,get:()=>outF(f)}));
    AN.exp=1;
    try{await o()}finally{AN.exp=0;AN.stop&&AN.stop();fs.forEach(f=>Object.defineProperty(f,'c',orig.get(f)));HC={}}}};
$('#bExp').onclick=()=>window.exportPage();

/* ---- keep stroke logs between sessions ---- */
const LDB=new Promise((res,rej)=>{const r=indexedDB.open('animate_logs',1);r.onupgradeneeded=()=>r.result.createObjectStore('l');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const lput=(id,v)=>LDB.then(d=>new Promise((res,rej)=>{const t=d.transaction('l','readwrite');t.objectStore('l').put(v,id);t.oncomplete=res;t.onerror=()=>rej(t.error)}));
const lget=id=>LDB.then(d=>new Promise(res=>{const q=d.transaction('l').objectStore('l').get(id);q.onsuccess=()=>res(q.result);q.onerror=()=>res()}));
window.saveProject=async function(m){const id=S.pid,l=S.fr.map(f=>f.lg&&!f.bs?f.lg:null);await _save(m);try{if(id)await lput(id,{n:l.length,f:l})}catch(e){}};
window.openProject=async function(id){await _open(id);try{const d=await lget(id);if(d&&d.n===S.fr.length)S.fr.forEach((f,i)=>{if(d.f[i]){f.lg=d.f[i];f.rl=[]}})}catch(e){}};

AN.put=lput;AN.get=lget;
/* ---- save exports to the phone ---- */
const CH=3*1048576,b64=b=>new Promise((r,j)=>{const f=new FileReader();f.onload=()=>r(f.result.split(',')[1]);f.onerror=j;f.readAsDataURL(b)});
async function write(FS,blob,path,dir){for(let o=0,first=true;o<blob.size;o+=CH,first=false){const data=await b64(blob.slice(o,o+CH));
  if(first)await FS.writeFile({path,data,directory:dir,recursive:true});else await FS.appendFile({path,data,directory:dir})}}
Plat.save=async function(blob,name){
  const FS=Plat.P('Filesystem'),SH=Plat.P('Share');
  if(!(Plat.native()&&FS)){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4e3);return true}
  const vid=/\.(webm|mp4)$/i.test(name),img=/\.png$/i.test(name),save=await ask({title:'Export ready',msg:name,ok:'Save to phone',cancel:'Share\u2026'});
  try{
    if(save){try{await FS.requestPermissions()}catch(e){}
      const t=[];if(vid)t.push(['EXTERNAL_STORAGE','Movies/Animate/'+name]);else if(img)t.push(['EXTERNAL_STORAGE','Pictures/Animate/'+name]);t.push(['DOCUMENTS','Animate/'+name]);
      let err,where;for(const[d,p]of t){try{await write(FS,blob,p,d);where=d==='DOCUMENTS'?'Documents/'+p:p;break}catch(e){err=e}}
      if(!where)throw err;
      await ask({title:'Saved',msg:where+(/^(Movies|Pictures)/.test(where)?' (should appear in your Gallery)':' (Files app > Documents > Animate)'),ok:'OK',nocancel:1});return true}
    if(!SH){toast('Sharing not available');return false}
    await write(FS,blob,name,'CACHE');const u=await FS.getUri({path:name,directory:'CACHE'});await SH.share({title:name,url:u.uri,dialogTitle:'Share'});return true;
  }catch(e){if(/cancel/i.test(e&&e.message||''))return false;toast('Could not save: '+(e&&e.message||e));return false}};
})();

/* ===== part 2: finite smudge/blur/soft-erase, bristle brushes, onion tint, audio, background colour ===== */
(()=>{
'use strict';
const AN=window.AN,mi=id=>B.find(b=>b.id===id),q=s=>document.querySelector(s);

/* smudge / blur / soft erase: always read the picture from before the stroke, and fade out with distance travelled */
const trav=(x,y)=>{if(K.tx===undefined){K.tx=x;K.ty=y;K.tr=0}K.tr+=Math.hypot(x-K.tx,y-K.ty);K.tx=x;K.ty=y};
const lim=(s,m)=>Math.max(0,1-K.tr/(s*m+40));
mi('smudge').f=(c,x,y,s)=>{const r=Math.max(3,s/2|0);
  if(!K.pk){const v=document.createElement('canvas');v.width=v.height=r*2;v.getContext('2d').drawImage(K.base,x-r,y-r,r*2,r*2,0,0,r*2,r*2);K.pk=v;K.pr=r;trav(x,y);return}
  trav(x,y);const k=lim(s,3);if(k<=0)return;
  c.save();clipC(c,x,y,r);c.globalAlpha=S.op*k*.35;c.drawImage(K.pk,x-K.pr,y-K.pr);c.restore()};
mi('blur').f=(c,x,y,s)=>{const r=Math.max(4,s/2|0);trav(x,y);const a=S.op*lim(s,5);if(a<=0)return;
  const e=r*2|0,n=Math.max(2,r/2|0);c.save();clipC(c,x,y,r);c.clearRect(x-e,y-e,e*2,e*2);c.globalCompositeOperation='lighter';
  c.globalAlpha=1-a;c.drawImage(K.base,x-e,y-e,e*2,e*2,x-e,y-e,e*2,e*2);c.globalAlpha=a;
  if(hasF){c.filter=`blur(${Math.max(1,r/5)}px)`;c.drawImage(K.base,x-e,y-e,e*2,e*2,x-e,y-e,e*2,e*2)}
  else{BCx.clearRect(0,0,n,n);BCx.drawImage(K.base,x-r,y-r,r*2,r*2,0,0,n,n);c.drawImage(BC,0,0,n,n,x-r,y-r,r*2,r*2)}
  c.restore()};
mi('seraser').f=(c,x,y,s)=>{c.save();c.globalCompositeOperation='destination-out';soft(c,x,y,s,'#000','a0');c.restore();
  c.save();c.beginPath();c.rect(x-s/2,y-s/2,s,s);c.clip();c.globalCompositeOperation='destination-over';c.globalAlpha=1-Math.min(1,S.op);c.drawImage(K.base,0,0);c.restore()}; /* never erases more than the Opacity setting in one stroke */

/* bristle brushes: bristles persist along the stroke, paint runs dry */
const shade=(h,l)=>`rgb(${[1,3,5].map(i=>clamp(parseInt(h.slice(i,i+2),16)+l*255,0,255)|0)})`;
const bristle=o=>(c,x,y,s,k,a)=>{
  if(!K.bh){const n=Math.max(8,s/o.d|0);K.bh=Array.from({length:n},(_,i)=>({o:(i+.5)/n-.5+(rnd()-.5)/n*.8,a:o.a0+rnd()*(1-o.a0),w:.7+rnd()*.6,l:(rnd()-.5)*o.l,g:rnd()<o.gap}));K.tv=0;K.lx=x;K.ly=y}
  K.tv+=Math.hypot(x-K.lx,y-K.ly);K.lx=x;K.ly=y;
  const dry=Math.max(o.min,1-K.tv/(s*o.dry)),an=o.fix!==undefined?o.fix:a+1.5708,ca=Math.cos(an),sa=Math.sin(an),n=K.bh.length;
  for(const b of K.bh){if(b.g&&dry<.8)continue;c.globalAlpha=b.a*dry;c.fillStyle=shade(k,b.l);P(c,x+ca*b.o*s,y+sa*b.o*s,Math.max(.8,s/n*b.w))}c.globalAlpha=1};
mi('oil').f=bristle({d:1.6,a0:.55,l:.3,gap:0,min:.4,dry:16});
B.push({id:'flat',grp:'Paint',n:'Flat brush',s:34,o:.95,sp:.05,d:'M5 4h14l-2 9H7zM9 13v7M15 13v7',f:bristle({d:1.4,a0:.5,l:.35,gap:.1,min:.35,dry:12,fix:-.7})},
 {id:'dry',grp:'Paint',n:'Dry brush',s:40,o:.9,sp:.06,d:'M6 3h12v7H6zM9 10v10M12 10v11M15 10v10',f:bristle({d:1.2,a0:.35,l:.4,gap:.35,min:.15,dry:7})});

/* onion skin tint: previous = red, next = green */
let TINT=1;const TT=document.createElement('canvas');
window.onionR=function(){const x=oc.getContext('2d');x.clearRect(0,0,S.W,S.H);if(!S.onion||S.play)return;
  if(TT.width!==S.W||TT.height!==S.H){TT.width=S.W;TT.height=S.H}
  const t=TT.getContext('2d'),dr=(f,col)=>{t.globalCompositeOperation='source-over';t.clearRect(0,0,S.W,S.H);t.drawImage(f.c,0,0);
    if(TINT){t.globalCompositeOperation='source-in';t.fillStyle=col;t.fillRect(0,0,S.W,S.H)}x.globalAlpha=S.oOp;x.drawImage(TT,0,0);x.globalAlpha=1};
  if(S.oP&&S.cur>0)dr(S.fr[S.cur-1],'#ff3b30');if(S.oN&&S.cur<S.fr.length-1)dr(S.fr[S.cur+1],'#34c759')};

/* audio: waveform strip, scrubbing, synced playback, mixed into video export */
let AU=null,AC=null,src=null,xs=null,PK=[];const AUD={sc:1};
const ac=()=>AC||(AC=new(window.AudioContext||window.webkitAudioContext)()),tot=()=>Math.max(AU?AU.duration:0,S.fr.length/S.fps);
const stopA=()=>{try{src&&src.stop()}catch(e){}src=null};
function startA(t,d){if(!AU)return;stopA();const a=ac();a.resume();src=a.createBufferSource();src.buffer=AU;src.connect(a.destination);src.start(0,clamp(t,0,AU.duration-.01),d)}
const wv=document.createElement('canvas');wv.width=1000;wv.height=64;wv.style.cssText='width:100%;height:2.6rem;display:none;touch-action:none;background:var(--bg);border-top:1px solid var(--ln)';q('#reel').before(wv);
function drawW(){if(!AU){wv.style.display='none';return}wv.style.display='block';const c=wv.getContext('2d'),W=wv.width,H=wv.height,T=tot(),cs=getComputedStyle(document.documentElement);c.clearRect(0,0,W,H);
  c.fillStyle='rgba(255,255,255,.07)';c.fillRect(0,0,W*S.fr.length/S.fps/T,H);c.fillStyle=cs.getPropertyValue('--mu');
  const bw=W*AU.duration/T;for(let x=0;x<bw;x++){const p=PK[Math.floor(x/bw*PK.length)]||0;c.fillRect(x,H/2-p*H/2,1,Math.max(1,p*H))}
  c.fillStyle=cs.getPropertyValue('--ac');c.fillRect(Math.round(S.cur/S.fps/T*W),0,3,H)}
async function setAudio(blob){AU=null;PK=[];if(blob){try{AU=await ac().decodeAudioData(await blob.arrayBuffer())}catch(e){toast('Could not read that audio file')}}
  if(AU){const d=AU.getChannelData(0),n=1000,bs=Math.max(1,Math.floor(d.length/n));PK=Array.from({length:n},(_,i)=>{let m=0;for(let j=0;j<bs;j+=Math.max(1,bs/50|0))m=Math.max(m,Math.abs(d[i*bs+j]||0));return m})}drawW()}
const _go=go;window.go=function(i){const p=S.cur;_go(i);drawW();
  if(AU&&S.cur!==p){if(S.play){if(S.cur<p)startA(S.cur/S.fps)}else if(AUD.sc&&!AUD.sk)startA(S.cur/S.fps,.12)}};
let sd=0;const scrub=e=>{const r=wv.getBoundingClientRect(),t=clamp((e.clientX-r.left)/r.width,0,1)*tot();AUD.sk=1;go(clamp(Math.round(t*S.fps),0,S.fr.length-1));AUD.sk=0;startA(t,.15)};
wv.onpointerdown=e=>{sd=1;wv.setPointerCapture(e.pointerId);scrub(e)};wv.onpointermove=e=>{if(sd)scrub(e)};wv.onpointerup=wv.onpointercancel=()=>{sd=0};
const _tg=toggle;window.toggle=function(){_tg();if(S.play&&AU)startA(S.cur/S.fps);else stopA()};$('#bPlay').onclick=()=>toggle();
const fi=document.createElement('input');fi.type='file';fi.accept='audio/*';fi.hidden=true;document.body.append(fi);
fi.onchange=async()=>{const f=fi.files[0];fi.value='';if(!f)return;await setAudio(f);if(AU){try{await AN.put('aud_'+S.pid,{b:f})}catch(e){}toast('Audio added · tap the wave to scrub')}};
const HTMLc=HTMLCanvasElement.prototype,_cs=HTMLc.captureStream;
HTMLc.captureStream=function(f){const s=_cs.call(this,f);if(AN.exp&&AU){try{const a=ac(),d=a.createMediaStreamDestination();xs=a.createBufferSource();xs.buffer=AU;xs.connect(d);xs.start();d.stream.getAudioTracks().forEach(t=>s.addTrack(t))}catch(e){}}return s};
AN.stop=()=>{try{xs&&xs.stop()}catch(e){}xs=null};

/* project background colour (behind every frame, included in export) */
function setBG(c){AN.bg=c;stage.style.background=c||'#fff';try{localStorage.setItem('animate_bg_'+S.pid,c)}catch(e){}}
const _op=openProject;window.openProject=async function(id){await _op(id);
  try{setBG(localStorage.getItem('animate_bg_'+id)||'');const d=await AN.get('aud_'+id);await setAudio(d&&d.b)}catch(e){}};
const add=(k,fn)=>{const o=menus[k];menus[k]=()=>[...o(),...fn()]};
add('mFile',()=>[{h:'Audio'},T('Import audio (MP3/WAV)…',()=>fi.click()),...(AU?[T('Remove audio',()=>{setAudio(null);AN.put('aud_'+S.pid,null)}),C('Play snippet when changing frame',AUD.sc,()=>AUD.sc=!AUD.sc)]:[])]);
add('mView',()=>[{h:'Background layer'},T('Background = current colour',()=>setBG(S.col)),T('Clear background',()=>setBG(''))]);
add('cnt',()=>[C('Tint onion skin (red before, green after)',TINT,()=>{TINT=!TINT;onionR()})]);
onionR();
})();

/* ===== part 3: frame paging (only a few frames live in memory; the rest are stored compressed) ===== */
(()=>{
'use strict';
const AN=window.AN,PG={lru:[],pool:[],t:0,SC:null,look:[]};let SAVE=0;
const cap=()=>Math.max(4,Math.min(40,Math.floor(2.4e8/(S.W*S.H*4))));
/* lossless sparse codec: [transparent run, literal count, literal pixels...] - decodes synchronously */
function enc32(d){const n=d.length;let o=new Uint32Array(1<<16),p=0,i=0;
  while(i<n){const z=i;while(i<n&&d[i]===0)i++;const zl=i-z,s=i;while(i<n&&d[i]!==0)i++;const l=i-s;
    if(p+2+l>o.length){const g=new Uint32Array(Math.max(o.length*2,p+2+l));g.set(o);o=g}
    o[p++]=zl;o[p++]=l;if(l){o.set(d.subarray(s,i),p);p+=l}}
  return o.slice(0,p)}
function dec32(o,d){d.fill(0);let p=0,i=0;while(p<o.length){i+=o[p++];const l=o[p++];if(l){d.set(o.subarray(p,p+l),i);p+=l;i+=l}}}
function rleEnc(cv){const w=cv.width,h=cv.height;return{w,h,o:enc32(new Uint32Array(cv.getContext('2d').getImageData(0,0,w,h).data.buffer))}}
function rleDec(r,cv){if(cv.width!==r.w||cv.height!==r.h){cv.width=r.w;cv.height=r.h}
  const im=PG.SC&&PG.SC.width===r.w&&PG.SC.height===r.h?PG.SC:(PG.SC=new ImageData(r.w,r.h));dec32(r.o,new Uint32Array(im.data.buffer));cv.getContext('2d').putImageData(im,0,0)}
AN.enc=rleEnc;AN.dec=rleDec;window.__codec={enc32,dec32};

function resident(f){if(!f._c){const c=PG.pool.pop()||document.createElement('canvas');
    if(f.rle)rleDec(f.rle,c);else{c.width=S.W;c.height=S.H}f._c=c}
  touch(f);return f._c}
function touch(f){const L=PG.lru;if(L[L.length-1]===f)return;const i=L.indexOf(f);if(i>=0)L.splice(i,1);L.push(f);
  if(!PG.t)PG.t=setTimeout(()=>{PG.t=0;evict()},150)}
function mkTc(f,c){const t=f.tc||(f.tc=document.createElement('canvas'));t.width=96;t.height=Math.round(96*S.H/S.W);
  const y=t.getContext('2d');y.fillStyle='#fff';y.fillRect(0,0,t.width,t.height);y.drawImage(c,0,0,t.width,t.height)}
function pageOut(f){const c=f._c;if(!c)return;if(!f.rle)f.rle=rleEnc(c);if(!f.tc)mkTc(f,c);
  if(!f.pbOK&&!f.pbP){const v=f.ver;f.pbP=new Promise(r=>c.toBlob(b=>{if(f.ver===v){f.pb=b;f.pbOK=1}f.pbP=null;r(b)},'image/png'))}
  const i=PG.lru.indexOf(f);if(i>=0)PG.lru.splice(i,1);f._c=null;if(PG.pool.length<2)PG.pool.push(c);else c.width=c.height=0}
function evict(){PG.lru=PG.lru.filter(f=>S.fr.includes(f));
  const keep=new Set([S.fr[S.cur],S.fr[S.cur-1],S.fr[S.cur+1],K&&K.f,...PG.look]);
  while(PG.lru.length>cap()){const v=PG.lru.find(f=>!keep.has(f));if(!v)break;pageOut(v)}}
const px=f=>({toBlob(cb){if(f.pbOK)return cb(f.pb);if(!f._c&&f.pbP)return void f.pbP.then(cb);
  const v=f.ver,c=resident(f);c.toBlob(b=>{if(f.ver===v){f.pb=b;f.pbOK=1}cb(b)},'image/png')}});
function adopt(f){const d=Object.getOwnPropertyDescriptor(f,'c');if(!d||d.get)return;f._c=d.value;
  Object.defineProperty(f,'c',{configurable:true,enumerable:true,get(){return SAVE?px(f):resident(f)},set(v){f._c=v}});
  Object.defineProperty(f,'x',{configurable:true,enumerable:true,get(){return resident(f).getContext('2d')}});
  if(!PG.lru.includes(f))PG.lru.push(f)}

/* thumbnails come from a small cache, so idle frames never need decoding */
window.thumb=function(i){const f=S.fr[i],c=cards()[i]&&cards()[i].firstChild;if(!f||!c)return;adopt(f);
  if(f._c||!f.tc)mkTc(f,f.c);c.getContext('2d').drawImage(f.tc,0,0,c.width,c.height)};
/* navigation / playback: look-ahead decode, no scroll thrash while playing */
const _g=window.go;window.go=function(i){S.fr.forEach(adopt);PG.n=(PG.n||0)+1;
  if(S.play&&PG.n%8){const s=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(){};try{_g(i)}finally{Element.prototype.scrollIntoView=s}}else _g(i);
  const n=S.fr.length;PG.look=S.play?[1,2,3].map(k=>S.fr[(S.cur+k)%n]):[S.fr[S.cur-1],S.fr[S.cur+1]];
  clearTimeout(PG.pf);PG.pf=setTimeout(()=>PG.look.forEach(f=>f&&resident(f)),S.play?0:80)};
/* duplicates share their compressed data until edited (copy on write) and cost almost no memory */
function cloneF(f){if(!f.rle)f.rle=rleEnc(f.c);if(!f.tc)mkTc(f,f.c);const d=nf(f.s);adopt(d);const c=d._c;c.width=c.height=0;d._c=null;PG.lru=PG.lru.filter(x=>x!==d);
  d.rle=f.rle;d.tc=f.tc;if(f.pbOK){d.pb=f.pb;d.pbOK=1}d.ver=0;return d}
window.dupF=function(i){insF([cloneF(S.fr[i])],i+1)};
window.doubleAll=function(){if(S.play)return;const o=S.fr,n=[];o.forEach(f=>{n.push(f);n.push(cloneF(f));evict()});
  S.fr=n;S.cur=Math.min(S.cur*2,n.length-1);S.ins=S.cur+1;build();saveSoon();toast(`${o.length} \u2192 ${n.length} frames`)};
$('#bDbl').onclick=()=>doubleAll();
/* sequential project loading (one frame at a time) */
window.openSeq=async function(id){if(S.play)toggle();if(S.dirtyF&&S.pid)await saveProject();
  const[m,d]=await Promise.all([getM(id),getD(id)]);if(!m||!d)return toast('Project not found');
  S.W=m.w;S.H=m.h;S.fps=d.fps||12;PG.lru=[];PG.pool.length=0;const fr=[];
  for(let i=0;i<d.frames.length;i++){const o=d.frames[i],f=nf(o.s||1),bm=await createImageBitmap(o.b);f.x.drawImage(bm,0,0);adopt(f);
    mkTc(f,bm);bm.close&&bm.close();f.pb=o.b;f.pbOK=1;f.ver=0;if(i>1)pageOut(f);fr.push(f);if(i%8===7)toast(`Loading ${i+1}/${d.frames.length}`)}
  S.pid=id;S.pname=m.name;S.dirtyF=0;setSize(m.w,m.h,fr,d.shots);localStorage.setItem('animate_last',id);toast('Opened '+m.name)};
/* incremental saving: unchanged frames reuse their stored PNG */
const _s3=window.saveProject;window.saveProject=function(m){SAVE=1;try{return _s3(m)}finally{SAVE=0}};
const _ss=window.setSize;window.setSize=function(...a){PG.lru=[];PG.pool.length=0;return _ss(...a)};
const o=menus.cnt;menus.cnt=()=>[{h:`Memory: ${PG.lru.length} of ${S.fr.length} frames loaded (limit ${cap()})`},
  T('Free memory now',()=>{PG.lru.slice().forEach(f=>{if(f!==F())pageOut(f)});toast('Memory freed')}),...o()];
S.fr.forEach(adopt);
})();
