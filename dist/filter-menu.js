export function enhanceFilters(root){
 for(const select of root.querySelectorAll('select[data-filter]')){
  if(select.refreshPicker){select.refreshPicker();continue;}
  const label=select.parentElement,caption=label.firstChild.textContent.trim();
  const host=document.createElement('div');host.className='filter-picker';
  const title=document.createElement('span');title.className='filter-caption';title.textContent=caption;
  const trigger=document.createElement('button');trigger.type='button';trigger.className='filter-trigger';trigger.setAttribute('aria-expanded','false');
  const panel=document.createElement('div');panel.className='filter-menu';panel.hidden=true;panel.id='filter-menu-'+select.dataset.filter;trigger.setAttribute('aria-controls',panel.id);
  const search=document.createElement('input');search.type='search';search.placeholder='Search '+caption.toLowerCase()+'…';search.setAttribute('aria-label','Search '+caption.toLowerCase());
  const list=document.createElement('div');list.className='filter-menu-options';list.setAttribute('role','group');list.setAttribute('aria-label',caption+' options');
  const empty=document.createElement('p');empty.textContent='No matching options';empty.hidden=true;empty.setAttribute('role','status');
  const update=()=>{trigger.disabled=select.disabled;trigger.textContent=select.selectedOptions[0]?.textContent||'Choose an option';trigger.setAttribute('aria-label',caption+': '+trigger.textContent);trigger.classList.toggle('is-selected',select.value!==(select.dataset.defaultValue??''));};
  function close(focus=false){panel.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus();}
  function render(){list.replaceChildren();const q=search.value.toLowerCase().trim();for(const option of select.options){if(q&&!option.textContent.toLowerCase().includes(q))continue;const b=document.createElement('button');b.type='button';b.textContent=option.textContent;b.setAttribute('aria-pressed',String(select.value===option.value));b.addEventListener('click',()=>{select.value=option.value;update();close(true);select.dispatchEvent(new Event('change',{bubbles:true}));});list.append(b);}empty.hidden=!!list.children.length;}
  trigger.addEventListener('click',()=>{if(!panel.hidden){close();return;}root.querySelectorAll('.filter-picker').forEach(p=>{p.querySelector('.filter-menu').hidden=true;p.querySelector('.filter-trigger').setAttribute('aria-expanded','false');});search.value='';render();panel.hidden=false;trigger.setAttribute('aria-expanded','true');search.focus();});
  search.addEventListener('input',render);
  host.addEventListener('keydown',event=>{if(event.key==='Escape'){close(true);event.preventDefault();}if(!panel.hidden&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){const buttons=[...list.children];if(!buttons.length)return;if(event.target===search&&!['ArrowDown','ArrowUp'].includes(event.key))return;event.preventDefault();const i=buttons.indexOf(document.activeElement);const n=event.key==='Home'?0:event.key==='End'?buttons.length-1:event.key==='ArrowDown'?(i+1)%buttons.length:(i-1+buttons.length)%buttons.length;buttons[n].focus();}});
  host.addEventListener('focusout',event=>{if(!host.contains(event.relatedTarget))close();});
  panel.append(search,list,empty);label.replaceWith(host);select.hidden=true;host.append(title,trigger,panel,select);update();select.refreshPicker=update;
 }
}
document.addEventListener('pointerdown',event=>{document.querySelectorAll('.filter-picker').forEach(p=>{if(!p.contains(event.target)){p.querySelector('.filter-menu').hidden=true;p.querySelector('.filter-trigger').setAttribute('aria-expanded','false');}});});
