/* Animate engine.js
   1) every stroke/fill is logged per frame; export re-renders those strokes at the export resolution (true 4K)
   2) undo stores only the changed region (much less memory, deeper history)
   3) exports save to the phone (Gallery folders / Documents) with Share as an option */
(()=>{
'use strict';
let REC=0,HQ=0,HC={};
const R1=v=>Math.round(v*10)/10,R2=v=>Math.round(v*100)/100,full=e=>e.w===undefined;
const _begin=begin,_move=move,_end=end,_cancel=cancel,_fill=fill,_stamp=stamp,_setSize=setSize,_save=saveProject,_open=openProject,_exp=exportPage;
const prep=f=>{if(f.lg===undefined){f.bs=snap(f.c);f.lg=[];f.rl=[]}};
const nfull=f=>f.undo.reduce((n,e)=>n+full(e),0);

/* ---- undo: region snapshots, deeper history ---- */
window.push=function(f){
  f.undo.push(snap(f.c));
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
window.undo=function(){const f=F();if(K||!f.undo.length)return;const e=f.undo.pop();f.redo.push(swap(f,e));
  if(e.rec&&f.lg&&f.lg.length)f.rl.push(f.lg.pop());else f.lg=undefined;thumb(S.cur);ur();saveSoon()};
window.redo=function(){const f=F();if(K||!f.redo.length)return;const e=f.redo.pop();f.undo.push(swap(f,e));
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
  if(!HQ&&k&&!k.eye&&k.op&&k.f.lg){const i=k.f.lg.lastIndexOf(k.op);if(i>=0)k.f.lg.splice(i,1)}};
window.stamp=function(x,y,sz,a){_stamp(x,y,sz,a);
  if(HQ||!K||!K.f)return;const m=sz*2+8,b=K.bb||(K.bb=[1e9,1e9,-1e9,-1e9]);
  for(const[px,py]of(K.b.nm?[[x,y]]:mir(x,y,a))){b[0]=Math.min(b[0],px-m);b[1]=Math.min(b[1],py-m);b[2]=Math.max(b[2],px+m);b[3]=Math.max(b[3],py+m)}};
window.end=function(){const k=K;_end();
  if(HQ||!k||k.eye||!k.bb)return;const u=k.f.undo,i=u.lastIndexOf(k.base);if(i<0)return;
  const b=k.bb,x0=Math.max(0,Math.floor(b[0])),y0=Math.max(0,Math.floor(b[1])),x1=Math.min(S.W,Math.ceil(b[2])),y1=Math.min(S.H,Math.ceil(b[3])),w=x1-x0,h=y1-y0;
  if(w<=0||h<=0)return;const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(k.base,x0,y0,w,h,0,0,w,h);
  u[i]={x:x0,y:y0,w,h,c,rec:k.base.rec}};
window.setSize=function(w,h,fr,sh){_setSize(w,h,fr,sh);if(!fr)S.fr.forEach(f=>{f.lg=[];f.rl=[]})};
$('#bAdd').onclick=()=>{const n=S.fr.length;addF();if(S.fr.length>n){const f=F();f.lg=[];f.rl=[]}};

/* ---- true-resolution re-render of one frame (used by export) ---- */
function hq(f,sc){
  const W2=Math.round(S.W*sc),H2=Math.round(S.H*sc),sv={W:S.W,H:S.H,fr:S.fr,cur:S.cur,tool:S.tool,col:S.col,size:S.size,op:S.op,sm:S.sm,bl:S.blend,mir:S.mir,SL,SLx,d:S.dirtyF,toC:window.toC,th:window.thumb};
  HQ=1;S.W=W2;S.H=H2;TMP.width=W2;TMP.height=H2;
  if(!HC.s){HC.s=document.createElement('canvas');HC.s.width=W2;HC.s.height=H2;HC.x=HC.s.getContext('2d');HC.r=nf(1)}
  SL=HC.s;SLx=HC.x;GP=TX.createPattern(tile,'repeat');try{GP.setTransform(new DOMMatrix([sc,0,0,sc,0,0]))}catch(e){}
  const rf=HC.r;rf.x.clearRect(0,0,W2,H2);rf.undo.length=0;if(f.bs)rf.x.drawImage(f.bs,0,0,W2,H2);
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
    const m=/^(\d+)/.exec(api.q('#xI').textContent||''),sc=m?(+m[1])/S.W:1,fs=sc>1.01?S.fr.filter(f=>f.lg&&f.lg.length):[],orig=fs.map(f=>f.c);
    fs.forEach(f=>Object.defineProperty(f,'c',{configurable:true,enumerable:true,get:()=>hq(f,sc)}));
    try{await o()}finally{fs.forEach((f,i)=>Object.defineProperty(f,'c',{value:orig[i],writable:true,configurable:true,enumerable:true}));HC={}}}};
$('#bExp').onclick=()=>window.exportPage();

/* ---- keep stroke logs between sessions ---- */
const LDB=new Promise((res,rej)=>{const r=indexedDB.open('animate_logs',1);r.onupgradeneeded=()=>r.result.createObjectStore('l');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const lput=(id,v)=>LDB.then(d=>new Promise((res,rej)=>{const t=d.transaction('l','readwrite');t.objectStore('l').put(v,id);t.oncomplete=res;t.onerror=()=>rej(t.error)}));
const lget=id=>LDB.then(d=>new Promise(res=>{const q=d.transaction('l').objectStore('l').get(id);q.onsuccess=()=>res(q.result);q.onerror=()=>res()}));
window.saveProject=async function(m){const id=S.pid,l=S.fr.map(f=>f.lg&&!f.bs?f.lg:null);await _save(m);try{if(id)await lput(id,{n:l.length,f:l})}catch(e){}};
window.openProject=async function(id){await _open(id);try{const d=await lget(id);if(d&&d.n===S.fr.length)S.fr.forEach((f,i)=>{if(d.f[i]){f.lg=d.f[i];f.rl=[]}})}catch(e){}};

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
