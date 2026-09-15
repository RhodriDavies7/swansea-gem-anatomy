const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./image-viewer.css',import.meta.url);document.head.append(style);
const dialog=document.createElement('dialog');dialog.className='image-viewer';dialog.setAttribute('aria-label','Image viewer');dialog.innerHTML='<div class="viewer-toolbar"><button data-zoom="out" aria-label="Zoom out">−</button><button data-zoom="reset">Reset</button><button data-zoom="in" aria-label="Zoom in">+</button><button data-zoom="close" aria-label="Close image viewer">Close ×</button></div><div class="viewer-stage"><div class="viewer-picture"></div></div><p class="viewer-help">Pinch to zoom · Two-finger scroll or drag to pan · Ctrl + scroll to zoom</p>';document.body.append(dialog);
const stage=dialog.querySelector('.viewer-stage'),picture=dialog.querySelector('.viewer-picture');let scale=1,x=0,y=0,origin=null;const pointers=new Map();
function draw(){picture.style.transform=`translate(${x}px,${y}px) scale(${scale})`;}
function reset(){scale=1;x=y=0;draw();}
function zoom(factor,from=null,to=from){
 const rect=picture.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
 const next=Math.min(6,Math.max(1,scale*factor)),ratio=next/scale;
 if(from){x+=(to.x-from.x)+(from.x-cx)*(1-ratio);y+=(to.y-from.y)+(from.y-cy)*(1-ratio);}
 scale=next;if(scale===1){x=0;y=0;}draw();
}
function open(img){origin=img;picture.replaceChildren();const copy=document.createElement('img');copy.src=img.currentSrc||img.src;copy.alt=img.alt;copy.draggable=false;picture.append(copy);const marker=img.parentElement.querySelector('.image-marker');if(marker)picture.append(marker.cloneNode(true));reset();dialog.showModal();document.body.classList.add('viewer-open');}
function eligible(img){return img instanceof HTMLImageElement&&!img.closest('.image-viewer')&&!img.closest('#preview, .structure-thumbnails')&&img.naturalWidth>0;}
function prepare(){document.querySelectorAll('main img').forEach(img=>{if(img.closest('#preview, .structure-thumbnails')||img.dataset.zoomReady)return;img.dataset.zoomReady='true';img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Enlarge image: '+(img.alt||'anatomy image'));img.title='Click to enlarge';});}
new MutationObserver(prepare).observe(document.querySelector('main')||document.body,{childList:true,subtree:true});prepare();
document.addEventListener('click',event=>{if(eligible(event.target)&&event.target.closest('main')){event.preventDefault();event.stopImmediatePropagation();open(event.target);}},true);
document.addEventListener('keydown',event=>{if(eligible(event.target)&&['Enter',' '].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();open(event.target);}},true);
dialog.addEventListener('click',event=>{const action=event.target.closest('[data-zoom]')?.dataset.zoom;if(action==='close')dialog.close();if(action==='reset')reset();if(action==='in')zoom(1.3);if(action==='out')zoom(1/1.3);});
dialog.addEventListener('close',()=>{document.body.classList.remove('viewer-open');pointers.clear();if(origin?.isConnected)origin.focus({preventScroll:true});});
dialog.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='+'||event.key==='=')zoom(1.3);if(event.key==='-')zoom(1/1.3);});
let gestureScale=null;
stage.addEventListener('wheel',event=>{
 event.preventDefault();if(gestureScale!==null)return;
 const unit=event.deltaMode===1?16:event.deltaMode===2?stage.clientHeight:1;
 if(event.ctrlKey||event.metaKey)zoom(Math.exp(-event.deltaY*unit*.01),{x:event.clientX,y:event.clientY});
 else if(scale>1){x-=event.deltaX*unit;y-=event.deltaY*unit;draw();}
},{passive:false});
// WebKit exposes trackpad pinches as gesture events instead of Ctrl+wheel.
let gesturePoint=null;
stage.addEventListener('gesturestart',event=>{event.preventDefault();gestureScale=event.scale||1;gesturePoint={x:event.clientX,y:event.clientY};},{passive:false});
stage.addEventListener('gesturechange',event=>{event.preventDefault();if(gestureScale===null)return;const point={x:event.clientX,y:event.clientY};zoom(event.scale/gestureScale,gesturePoint,point);gestureScale=event.scale;gesturePoint=point;},{passive:false});
stage.addEventListener('gestureend',event=>{event.preventDefault();gestureScale=null;gesturePoint=null;},{passive:false});
dialog.addEventListener('close',()=>{gestureScale=null;gesturePoint=null;});
stage.addEventListener('pointerdown',event=>{stage.setPointerCapture(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});});
stage.addEventListener('pointermove',event=>{if(!pointers.has(event.pointerId))return;const before=[...pointers.values()],previous=pointers.get(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});const after=[...pointers.values()];if(after.length===2){const distance=p=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);const midpoint=p=>({x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2});if(distance(before)>0)zoom(distance(after)/distance(before),midpoint(before),midpoint(after));}else if(scale>1){x+=event.clientX-previous.x;y+=event.clientY-previous.y;draw();}});
for(const name of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(name,event=>pointers.delete(event.pointerId));
