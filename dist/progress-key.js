// Capture before image controls so focused photos cannot swallow progression.
export function bindProgressKey(active,advance){
 window.addEventListener('keydown',event=>{
  if(event.code!=='Space'||!active()||event.altKey||event.ctrlKey||event.metaKey||event.isComposing||event.target.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))return;
  event.preventDefault();event.stopImmediatePropagation();
  if(event.repeat)return;
  const viewer=document.querySelector('dialog.image-viewer[open]');
  if(viewer){viewer.close();document.body.classList.remove('viewer-open');}
  advance();
 },true);
}
