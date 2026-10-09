/* Accessible labels, login isolation and keyboard control for member/admin. */
(() => {
  document.querySelectorAll('.field').forEach(field => {
    const label=field.querySelector('label'), input=field.querySelector('input:not([type=hidden]),select,textarea');
    if(label&&input?.id)label.htmlFor=input.id;
  });
  document.querySelectorAll('.close').forEach(button=>button.setAttribute('aria-label','Tutup'));
  document.querySelectorAll('[role=status],.msg,.toast').forEach(element=>{element.setAttribute('role','status');element.setAttribute('aria-live','polite')});
  document.querySelectorAll('.switchrow input[type=checkbox]').forEach(input=>{
    const text=input.closest('.switchrow').querySelector('b')?.textContent;
    if(text)input.setAttribute('aria-label',text);
  });
  const names={salesSearch:'Cari penjualan atau member',salesStatus:'Filter status pembayaran'};
  document.querySelectorAll('.toolbar input,.toolbar select').forEach(input=>{
    if(!input.hasAttribute('aria-label'))input.setAttribute('aria-label',names[input.id]||input.placeholder||input.options?.[0]?.text||'Filter');
  });

  const gate=document.getElementById('gate');
  const overlays=[...document.querySelectorAll('.overlay,.firstpass')];
  const backgrounds=[document.querySelector('.shell,.app'),document.querySelector('.bottomnav')].filter(Boolean);
  let trigger=null, active=null;
  const controls=container=>[...container.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,summary,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length&&!el.closest('[inert]'));
  overlays.forEach(el=>{
    el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.tabIndex=-1;
    const title=el.querySelector('h2');
    if(title){if(!title.id)title.id=el.id+'Title';el.setAttribute('aria-labelledby',title.id)}
    else el.setAttribute('aria-label',el.id==='affiliateOverlay'?'Affiliate':'Detail');
  });
  if(gate){gate.setAttribute('role','region');gate.setAttribute('aria-label','Login');gate.tabIndex=-1;}
  function sync(){
    const mandatory=overlays.find(el=>el.classList.contains('firstpass')&&el.classList.contains('show'));
    const opened=mandatory||(gate&&!gate.classList.contains('hide')?gate:overlays.filter(el=>el.classList.contains('show')).at(-1))||null;
    backgrounds.forEach(el=>el.inert=!!opened);
    overlays.forEach(el=>{el.inert=!!opened&&el!==opened;el.setAttribute('aria-hidden',String(!el.classList.contains('show')||el.inert));});
    if(gate)gate.inert=!!opened&&opened!==gate;
    document.body.classList.toggle('modal-open',!!opened);
    if(opened===active)return;
    if(opened&&!active)trigger=document.activeElement;
    active=opened;
    if(active){
      if(!active.contains(document.activeElement))(controls(active)[0]||active).focus({preventScroll:true});
    }else{
      const target=trigger?.isConnected&&trigger!==document.body?trigger:document.getElementById('search')||document.getElementById('promptSearch');
      target?.focus({preventScroll:true});trigger=null;
    }
  }
  const observer=new MutationObserver(sync);
  [...overlays,gate].filter(Boolean).forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['class']}));
  document.addEventListener('keydown',event=>{
    if(!active)return;
    if(event.key==='Escape'&&active!==gate){
      const close=active.querySelector('.close');
      if(close){event.preventDefault();close.click()}
    }
    if(event.key!=='Tab')return;
    const targets=controls(active),first=targets[0],last=targets.at(-1);
    if(!first){event.preventDefault();active.focus();return;}
    if(event.shiftKey&&(document.activeElement===first||!active.contains(document.activeElement))){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&(document.activeElement===last||!active.contains(document.activeElement))){event.preventDefault();first.focus()}
  });
  document.addEventListener('focusin',event=>{
    if(active&&!active.contains(event.target))(controls(active)[0]||active).focus({preventScroll:true});
  });

  const nav=document.querySelector('.bottomnav');
  if(nav){
    nav.setAttribute('aria-label',document.body.classList.contains('admin-app')?'Menu admin':'Menu member');
    function syncNav(){nav.querySelectorAll('button').forEach(button=>{
      if(button.classList.contains('on'))button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });}
    new MutationObserver(syncNav).observe(nav,{subtree:true,attributes:true,attributeFilter:['class']});syncNav();
  }
  const tabs=document.getElementById('settingsTabs');
  if(tabs){
    tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Bagian pengaturan');
    const buttons=[...tabs.querySelectorAll('[data-settings-tab]')];
    function syncTabs(){buttons.forEach(button=>{
      const name=button.dataset.settingsTab,selected=button.classList.contains('on');
      button.id='settings-tab-'+name;button.setAttribute('role','tab');button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
      const panel=document.querySelector('[data-settings-panel="'+name+'"]');
      if(panel){if(!panel.id)panel.id='settings-panel-'+name;button.setAttribute('aria-controls',panel.id);panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);}
    });}
    tabs.addEventListener('keydown',event=>{
      const index=buttons.indexOf(document.activeElement);if(index<0)return;
      let next=index;
      if(event.key==='ArrowRight')next=(index+1)%buttons.length;
      else if(event.key==='ArrowLeft')next=(index+buttons.length-1)%buttons.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=buttons.length-1;
      else return;
      event.preventDefault();buttons[next].click();buttons[next].focus();
    });
    new MutationObserver(syncTabs).observe(tabs,{subtree:true,attributes:true,attributeFilter:['class']});syncTabs();
  }
  sync();
})();
