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
})();
