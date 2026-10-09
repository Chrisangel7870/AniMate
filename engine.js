/* FlipAnim engine.js: stroke-based frames, 1080p preview, 4K export.
   Loaded after the main script; overrides its functions. */
(()=>{
'use strict';
const W=1920,H=1080,MAX=8;
state.width=W;state.height=H;state.dpr=1;

const q=id=>document.getElementById(id);
const mkc=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const r1=v=>Math.round(v*10)/10;
const rng=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const enc=p=>{const o=[];let a=0,b=0;for(let i=0;i<p.length;i+=2){const x=Math.round(p[i]*10),y=Math.round(p[i+1]*10);o.push(x-a,y-b);a=x;b=y}return o};
const dec=o=>{const p=[];let a=0,b=0;for(let i=0;i<o.length;i+=2){a+=o[i];b+=o[i+1];p.push(a/10,b/10)}return p};
const toBlob=c=>new Promise(r=>c.toBlob(r,'image/png'));
const dl=(b,n)=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=n;a.click()};

let uid=0,live=null,liveR=null,ready=false,L=null,O=null,st=0;
const lru=[],pool=[];
const cf=()=>state.frames[state.currentFrameIndex];

/* ---------- frames ---------- */
function mk(){const th=mkc(160,90),t=th.getContext('2d');t.fillStyle='#fff';t.fillRect(0,0,160,90);
  return{id:++uid,strokes:[],redo:[],cv:null,stale:false,sh:false,th}}
function thumb(f,src){const t=f.th.getContext('2d');t.fillStyle='#fff';t.fillRect(0,0,160,90);t.drawImage(src,0,0,160,90)}
function getCv(){return pool.pop()||mkc(W,H)}
function freeCv(f){if(!f.cv)return;if(pool.length<3)pool.push(f.cv);f.cv=null;const i=lru.indexOf(f);if(i>=0)lru.splice(i,1)}
function touch(f){const i=lru.indexOf(f);if(i>=0)lru.splice(i,1);lru.push(f);
  while(lru.length>MAX){const v=lru.find(x=>x!==cf());if(!v)break;freeCv(v)}}
function own(f){if(f.sh){f.strokes=f.strokes.slice();f.sh=false}}
function bmp(f){
  if(!f.cv)f.cv=getCv();else if(!f.stale){touch(f);return f.cv}
  const c=f.cv.getContext('2d');c.clearRect(0,0,W,H);replay(c,f.strokes,1);f.stale=false;touch(f);return f.cv}

/* ---------- stroke renderer (seeded, resolution independent) ---------- */
function prep(c,s){const e=s.t==='eraser';
  c.globalCompositeOperation=e?'destination-out':'source-over';
  c.fillStyle=c.strokeStyle=e?'#000':s.c;c.globalAlpha=e?1:s.o;c.lineWidth=s.s;c.lineCap=c.lineJoin='round'}
function seg(c,s,R,x1,y1,x2,y2){
  const dx=x2-x1,dy=y2-y1,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx),z=s.s,x=s.x,co=Math.cos(a),si=Math.sin(a);
  if(s.t==='eraser'||!x||x==='solid'){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
  else if(x==='pencil'){const k=Math.max(1,z/4);
    for(let i=0;i<d;i+=k){const X=x1+co*i,Y=y1+si*i;
      for(let j=0;j<6;j++){const ox=(R()-.5)*z,oy=(R()-.5)*z;c.globalAlpha=s.o*(R()*.5+.3);c.fillRect(X+ox,Y+oy,1.5,1.5)}}}
  else if(x==='crayon'){const k=Math.max(2,z/3);
    for(let i=0;i<d;i+=k){c.beginPath();c.arc(x1+co*i+(R()-.5)*3,y1+si*i+(R()-.5)*3,z/2,0,6.2832);c.fill()}}
  else{const k=Math.max(3,z/2),n=z*2,h=z/2;
    for(let i=0;i<d;i+=k){const X=x1+co*i,Y=y1+si*i;
      for(let j=0;j<n;j++){const r=R()*h,t=R()*6.2832;c.globalAlpha=s.o*(1-r/h)*.2;c.fillRect(X+r*Math.cos(t),Y+r*Math.sin(t),1.5,1.5)}}}
}
function drawStroke(c,s,sc){const p=s.p;if(!p.length)return;const R=rng(s.r);
  c.save();if(sc!==1)c.scale(sc,sc);prep(c,s);
  seg(c,s,R,p[0],p[1],p[0]+.1,p[1]+.1);
  for(let i=2;i<p.length;i+=2)seg(c,s,R,p[i-2],p[i-1],p[i],p[i+1]);
  c.restore()}
function replay(c,S,sc){let a=0;for(let i=S.length-1;i>=0;i--)if(S[i].k){a=i+1;break}
  for(let i=a;i<S.length;i++)drawStroke(c,S[i],sc)}

/* ---------- live drawing hooks (called by original pointer code) ---------- */
function pushUndoState(){const f=cf();if(!f)return;own(f);f.redo.length=0;
  const b=state.brushes.find(b=>b.id===state.currentTool)||{},r=(Math.random()*4294967296)>>>0;
  live={t:state.currentTool,c:state.currentColor,s:state.brushSize,o:state.brushOpacity,x:b.texture||'solid',r,p:[]};
  liveR=rng(r);f.strokes.push(live);f.stale=true;upd()}
function drawPoint(pos){if(!live)return;const x=r1(pos.x),y=r1(pos.y);live.p.push(x,y);
  const c=elements.drawingCtx;c.save();prep(c,live);seg(c,live,liveR,x,y,x+.1,y+.1);c.restore()}
function renderBrushLine(a,b){if(!live)return;const p=live.p,n=p.length,x=r1(b.x),y=r1(b.y);
  if(!n||Math.hypot(x-p[n-2],y-p[n-1])<.3)return;
  const c=elements.drawingCtx;c.save();prep(c,live);seg(c,live,liveR,p[n-2],p[n-1],x,y);c.restore();p.push(x,y)}
function endStroke(){if(!state.isDrawing)return;state.isDrawing=false;state.strokePoints=[];live=null;
  const f=cf();f.stale=true;thumb(f,elements.drawingCanvas);triggerAutoSave()}

/* ---------- undo / redo (per frame, stroke based) ---------- */
function upd(){const f=cf();elements.undoBtn.disabled=!f||!f.strokes.length;elements.redoBtn.disabled=!f||!f.redo.length}
function redraw(){const f=cf(),c=elements.drawingCtx;c.clearRect(0,0,W,H);replay(c,f.strokes,1);
  f.stale=true;thumb(f,elements.drawingCanvas);upd();triggerAutoSave()}
function undo(){const f=cf();if(!f||!f.strokes.length||state.isDrawing)return;own(f);f.redo.push(f.strokes.pop());redraw()}
function redo(){const f=cf();if(!f||!f.redo.length||state.isDrawing)return;own(f);f.strokes.push(f.redo.pop());redraw()}

/* ---------- frame ops ---------- */
function saveCurrentCanvasToFrame(){const f=cf();if(!f)return;
  if(!f.cv)f.cv=getCv();
  const c=f.cv.getContext('2d');c.globalCompositeOperation='source-over';c.clearRect(0,0,W,H);c.drawImage(elements.drawingCanvas,0,0);
  f.stale=false;touch(f);thumb(f,elements.drawingCanvas)}
function loadCurrentFrameToCanvas(){const f=cf(),c=elements.drawingCtx;c.clearRect(0,0,W,H);
  if(f){if(f.cv&&!f.stale){c.drawImage(f.cv,0,0);touch(f)}else replay(c,f.strokes,1)}
  renderOnionSkin();updateFrameCounters();upd()}
function goTo(i){if(i<0||i>=state.frames.length||i===state.currentFrameIndex)return;
  saveCurrentCanvasToFrame();state.currentFrameIndex=i;loadCurrentFrameToCanvas();renderTimeline()}
function addNewFrame(at=null){if(state.frames.length)saveCurrentCanvasToFrame();
  const f=mk(),i=at!==null?at:state.frames.length;state.frames.splice(i,0,f);state.currentFrameIndex=i;
  loadCurrentFrameToCanvas();renderTimeline();triggerAutoSave()}
function duplicateCurrentFrame(){saveCurrentCanvasToFrame();const a=cf(),b=mk();
  b.strokes=a.strokes;a.sh=b.sh=true; /* copy-on-write: shared until edited */
  b.cv=getCv();const c=b.cv.getContext('2d');c.clearRect(0,0,W,H);c.drawImage(a.cv,0,0);thumb(b,a.cv);
  const i=state.currentFrameIndex+1;state.frames.splice(i,0,b);state.currentFrameIndex=i;touch(b);
  loadCurrentFrameToCanvas();renderTimeline();triggerAutoSave()}
function deleteCurrentFrame(){const F=state.frames,f=cf();
  if(F.length<=1){f.strokes=[];f.redo=[];f.sh=false;redraw();return}
  freeCv(f);F.splice(state.currentFrameIndex,1);
  if(state.currentFrameIndex>=F.length)state.currentFrameIndex=F.length-1;
  loadCurrentFrameToCanvas();renderTimeline();triggerAutoSave()}

/* ---------- onion skin (neighbors only, skipped during playback) ---------- */
function renderOnionSkin(){const c=elements.onionCtx;c.globalAlpha=1;c.clearRect(0,0,W,H);
  if(!state.onionEnabled||state.isPlaying)return;
  const F=state.frames,i=state.currentFrameIndex;c.globalAlpha=state.onionOpacity;
  if(state.onionShowPrev&&i>0)c.drawImage(bmp(F[i-1]),0,0);
  if(state.onionShowNext&&i<F.length-1)c.drawImage(bmp(F[i+1]),0,0);
  c.globalAlpha=1}

/* ---------- timeline (cached thumbs, DOM reused) ---------- */
function renderTimeline(){const R=elements.timelineReel,F=state.frames,sig=F.map(f=>f.id).join();
  if(R._s!==sig){R.innerHTML='';
    F.forEach(f=>{const c=document.createElement('div'),l=document.createElement('span');
      f.th.className='w-full h-12 sm:h-14 bg-white rounded-md object-contain border border-slate-700';
      c.append(f.th,l);c.onclick=()=>goTo(state.frames.indexOf(f));f.card=c;f.sel=null;R.appendChild(c)});
    R._s=sig}
  F.forEach((f,i)=>{const s=i===state.currentFrameIndex,l=f.card.lastChild,t='Frame '+(i+1);
    if(l.textContent!==t)l.textContent=t;
    if(f.sel!==s){f.sel=s;
      f.card.className='relative flex-shrink-0 w-16 sm:w-20 h-20 sm:h-24 bg-slate-900 border-2 rounded-xl flex flex-col items-center justify-between p-1 cursor-pointer transition-all '+(s?'border-indigo-500 bg-indigo-950/40 shadow-lg shadow-indigo-500/20 scale-105':'border-slate-800 hover:border-slate-700');
      l.className='text-[9px] sm:text-[10px] font-bold '+(s?'text-indigo-400':'text-slate-400')}});
  const a=F[state.currentFrameIndex];
  if(a&&a.sel)a.card.scrollIntoView({behavior:state.isPlaying?'auto':'smooth',block:'nearest',inline:'center'})}

/* ---------- playback with look-ahead preloading ---------- */
function startPlayback(){if(state.frames.length<=1)return;saveCurrentCanvasToFrame();state.isPlaying=true;
  elements.playIcon.className='fa-solid fa-pause';elements.playBtn.classList.replace('bg-indigo-600','bg-amber-600');
  renderOnionSkin();
  state.playInterval=setInterval(()=>{const F=state.frames;let i=state.currentFrameIndex+1;
    if(i>=F.length){if(state.isLooping)i=0;else{stopPlayback();return}}
    state.currentFrameIndex=i;loadCurrentFrameToCanvas();renderTimeline();
    setTimeout(()=>{for(let k=1;k<=3;k++){const g=state.frames[(i+k)%state.frames.length];
      if(g&&g!==cf()&&(!g.cv||g.stale))bmp(g)}},0)},1000/state.fps)}
function stopPlayback(){state.isPlaying=false;elements.playIcon.className='fa-solid fa-play ml-0.5';
  elements.playBtn.classList.replace('bg-amber-600','bg-indigo-600');
  if(state.playInterval)clearInterval(state.playInterval);renderOnionSkin()}

/* ---------- project file + autosave (IndexedDB) ---------- */
function pack(){return{version:2,w:W,h:H,fps:state.fps,cur:state.currentFrameIndex,brushes:state.brushes,
  frames:state.frames.map(f=>f.strokes.map(s=>s.k?s:{...s,p:enc(s.p)}))}}
function apply(d){state.fps=d.fps||12;elements.fpsInput.value=state.fps;if(d.brushes)state.brushes=d.brushes;
  state.frames.forEach(freeCv);lru.length=0;
  state.frames=d.frames.map(S=>{const f=mk();f.strokes=S.map(s=>s.k?s:{...s,p:dec(s.p)});return f});
  if(!state.frames.length)state.frames=[mk()];
  state.currentFrameIndex=Math.min(d.cur||0,state.frames.length-1);
  renderBrushList();loadCurrentFrameToCanvas();renderTimeline();thumbsAsync()}
function thumbsAsync(i=0){const f=state.frames[i];if(!f)return;
  thumb(f,i===state.currentFrameIndex?elements.drawingCanvas:bmp(f));setTimeout(()=>thumbsAsync(i+1),0)}
function saveProjectFile(){dl(new Blob([JSON.stringify(pack())],{type:'application/json'}),'FlipAnim_Project_'+Date.now()+'.anim')}
function loadProjectFile(file){const r=new FileReader();
  r.onload=e=>{try{const d=JSON.parse(e.target.result);
    if(d.version!==2)return alert('This project uses the old bitmap format and cannot be opened.');apply(d)}
    catch(err){alert('Could not read project file')}};r.readAsText(file)}
const IDB=()=>new Promise((res,rej)=>{const r=indexedDB.open('flipanim',1);r.onupgradeneeded=()=>r.result.createObjectStore('k');r.onsuccess=()=>res(r.result);r.onerror=rej});
async function idbSet(v){const d=await IDB();d.transaction('k','readwrite').objectStore('k').put(v,'auto')}
async function idbGet(){const d=await IDB();return new Promise(r=>{const g=d.transaction('k').objectStore('k').get('auto');g.onsuccess=()=>r(g.result);g.onerror=()=>r()})}
function triggerAutoSave(){if(!ready)return;clearTimeout(st);
  st=setTimeout(async()=>{try{await idbSet(pack());const b=elements.autoSaveBadge;b.classList.remove('opacity-0');setTimeout(()=>b.classList.add('opacity-0'),1500)}catch(e){}},1500)}
async function restoreAutoSave(){try{const d=await idbGet();if(d&&d.version===2&&d.frames.length)apply(d)}catch(e){}ready=true}

/* ---------- export: replays strokes at 1080p or 4K, one frame at a time ---------- */
function renderFrame(f,sc,white){const w=W*sc,h=H*sc;
  if(!L||L.width!==w){L=mkc(w,h);O=mkc(w,h)}
  const l=L.getContext('2d');l.clearRect(0,0,w,h);replay(l,f.strokes,sc);
  if(!white)return L;
  const o=O.getContext('2d');o.fillStyle='#fff';o.fillRect(0,0,w,h);o.drawImage(L,0,0);return O}
function prog(p,t){q('renderProgressBar').style.width=p+'%';q('renderPercentText').textContent=p+'%';if(t)q('renderStatusText').textContent=t}
async function startRenderExport(){
  const fmt=q('exportFormatSelect').value,white=document.querySelector('input[name="exportBg"]:checked').value==='white',
    sc=fmt.includes('4k')?2:1,w=W*sc,h=H*sc,n=state.frames.length,tag=sc>1?'4k':'1080p',sl=ms=>new Promise(r=>setTimeout(r,ms));
  q('renderProgressContainer').classList.remove('hidden');prog(0,'Rendering '+tag+'...');
  try{
    if(fmt==='current-png'||fmt==='cur4k'){dl(await toBlob(renderFrame(cf(),sc,white)),'frame_'+(state.currentFrameIndex+1)+'_'+tag+'.png')}
    else if(fmt.startsWith('png')){
      if(typeof JSZip==='undefined')throw new Error('JSZip not loaded (needs internet)');
      const z=new JSZip();
      for(let i=0;i<n;i++){z.file('frame_'+String(i+1).padStart(4,'0')+'.png',await toBlob(renderFrame(state.frames[i],sc,white)));prog(Math.round((i+1)/n*90));await sl(0)}
      prog(95,'Zipping...');dl(await z.generateAsync({type:'blob',compression:'STORE'}),'FlipAnim_'+tag+'_frames.zip')}
    else{
      if(typeof MediaRecorder==='undefined')throw new Error('Video recording not supported');
      const EC=mkc(w,h),c=EC.getContext('2d'),ms=1000/state.fps,ch=[],
        rec=new MediaRecorder(EC.captureStream(state.fps),{mimeType:'video/webm',videoBitsPerSecond:sc>1?40e6:16e6});
      rec.ondataavailable=e=>{if(e.data.size)ch.push(e.data)};
      const done=new Promise(r=>rec.onstop=r);rec.start();
      for(let i=0;i<n;i++){const t=performance.now();c.clearRect(0,0,w,h);c.drawImage(renderFrame(state.frames[i],sc,white),0,0);
        prog(Math.round((i+1)/n*100));await sl(Math.max(0,ms-(performance.now()-t)))}
      rec.stop();await done;dl(new Blob(ch,{type:'video/webm'}),'animation_'+tag+'_'+Date.now()+'.webm')}
    q('renderModal').classList.add('hidden')
  }catch(e){alert('Export failed: '+e.message)}
  L=O=null;q('renderProgressContainer').classList.add('hidden')}

/* ---------- view ---------- */
function fit(){const v=elements.canvasViewport;
  state.zoom=Math.min(5,Math.min(v.clientWidth/W,v.clientHeight/H)*.9);state.panX=state.panY=0;state.rotation=0;updateZoomTransform()}

Object.assign(window,{pushUndoState,drawPoint,renderBrushLine,endStroke,undo,redo,clearUndoRedo:upd,updateUndoRedoButtons:upd,
  saveCurrentCanvasToFrame,loadCurrentFrameToCanvas,addNewFrame,duplicateCurrentFrame,deleteCurrentFrame,renderOnionSkin,
  renderTimeline,startPlayback,stopPlayback,saveProjectFile,loadProjectFile,triggerAutoSave,restoreAutoSave,startRenderExport});

addEventListener('DOMContentLoaded',()=>{
  elements.canvasContainer.style.flexShrink='0';
  q('canvasDimInfo').textContent='1920 \u00d7 1080 px';
  /* clear-frame becomes an undoable stroke marker */
  const cb=q('clearFrameBtn'),nb=cb.cloneNode(true);cb.replaceWith(nb);
  nb.addEventListener('click',()=>{const f=cf();own(f);f.redo.length=0;f.strokes.push({k:1});redraw()});
  /* export options */
  q('exportFormatSelect').innerHTML='<option value="webm">WebM video 1080p</option><option value="webm4k">WebM video 4K</option><option value="png4k">PNG sequence 4K (ZIP)</option><option value="png1080">PNG sequence 1080p (ZIP)</option><option value="cur4k">Current frame 4K PNG</option><option value="current-png">Current frame 1080p PNG</option>';
  const sb=q('startRenderBtn'),sn=sb.cloneNode(true);sb.replaceWith(sn);sn.addEventListener('click',startRenderExport);
  q('resetViewBtn').addEventListener('click',fit);
  requestAnimationFrame(fit);
});
})();
