(function(){
  var root=document.documentElement;
  var saved='';
  try{saved=localStorage.getItem('nm_public_lang')||'';}catch(e){}
  var lang=saved==='en'?'en':'ta';
  function apply(next){
    lang=next==='en'?'en':'ta';
    root.setAttribute('data-lang',lang);
    root.setAttribute('lang',lang==='en'?'en':'ta');
    document.querySelectorAll('[data-lang-toggle]').forEach(function(b){
      b.setAttribute('aria-label',lang==='en'?'தமிழுக்கு மாற்று':'Switch to English');
      b.setAttribute('title',lang==='en'?'தமிழ்':'English');
    });
    try{localStorage.setItem('nm_public_lang',lang);}catch(e){}
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-lang-toggle]');
    if(b){e.preventDefault();apply(lang==='en'?'ta':'en');}
  });
  apply(lang);
  var y=document.querySelector('[data-year]'); if(y)y.textContent=String(new Date().getFullYear());
  var cfg=window.NAMMAMOI_APK||{},btn=document.querySelector('[data-apk-download]');
  if(btn&&cfg.enabled===true&&/^\/downloads\/[A-Za-z0-9._-]+\.apk$/.test(String(cfg.url||''))&&/^[a-f0-9]{64}$/i.test(String(cfg.sha256||''))){
    btn.href=cfg.url;btn.classList.remove('is-disabled');btn.removeAttribute('aria-disabled');btn.setAttribute('download','');
    btn.querySelectorAll('.ta,.en').forEach(function(n){n.textContent=n.classList.contains('ta')?'Android APK பதிவிறக்கு':'Download Android APK';});
    var v=document.querySelector('[data-apk-version]'),s=document.querySelector('[data-apk-size]'),h=document.querySelector('[data-apk-sha]');if(v)v.textContent=cfg.version||'—';if(s)s.textContent=cfg.size||'—';if(h)h.textContent=cfg.sha256;
  }else if(btn){btn.addEventListener('click',function(e){e.preventDefault();});}
})();
