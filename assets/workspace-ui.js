/* Labels and focus management shared by the member and admin screens. */
(() => {
  document.querySelectorAll('.field').forEach(field => {
    const label=field.querySelector('label'), input=field.querySelector('input:not([type=hidden]),select,textarea');
    if(label&&input?.id)label.htmlFor=input.id;
  });
  document.querySelectorAll('.close').forEach(button=>button.setAttribute('aria-label','Tutup'));
  document.querySelectorAll('[role=status],.msg,.toast').forEach(element=>{element.setAttribute('role','status');element.setAttribute('aria-live','polite')});
  const overlays=[...document.querySelectorAll('.overlay,.firstpass')];
  const backgrounds=[document.querySelector('.shell,.app'),document.querySelector('.bottomnav')].filter(Boolean);
  let trigger=null, active=null;
  function sync(){
    const opened=overlays.find(el=>el.classList.contains('show'))||null;
    if(opened===active)return;
    if(opened&&!active)trigger=document.activeElement;
    active=opened;
    backgrounds.forEach(el=>el.inert=!!active);
    document.body.classList.toggle('modal-open',!!active);
    if(active){
      const title=active.querySelector('h2');
      if(title){if(!title.id)title.id=active.id+'Title';active.setAttribute('aria-labelledby',title.id)}
      active.querySelector('.close,input:not([type=hidden]),button')?.focus({preventScroll:true});
    }else{const target=trigger?.isConnected?trigger:document.getElementById('search')||document.getElementById('promptSearch');target?.focus({preventScroll:true});trigger=null}
  }
  const observer=new MutationObserver(sync);
  overlays.forEach(el=>{el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');if(!el.querySelector('h2'))el.setAttribute('aria-label',el.id==='affiliateOverlay'?'Affiliate':'Detail');observer.observe(el,{attributes:true,attributeFilter:['class']})});
  document.addEventListener('keydown',event=>{
    if(!active)return;
    if(event.key==='Escape'){
      const close=active.querySelector('.close');
      if(close){event.preventDefault();close.click()}
    }
    if(event.key!=='Tab')return;
    const controls=[...active.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,summary')].filter(el=>!el.disabled&&el.getClientRects().length&&!el.closest('[inert]'));
    const first=controls[0], last=controls.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
  });
  sync();
})();
