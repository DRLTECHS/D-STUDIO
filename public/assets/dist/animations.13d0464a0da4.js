/* animations.13d0464a0da4.js - placeholder built bundle (committed by automation)
   This is a minimal JS bundle to restore the UI until the proper build pipeline runs on CI.
*/
(function(){
  try{
    document.addEventListener('DOMContentLoaded', function(){
      console.log('D-STUDIO placeholder animations bundle loaded');
      // Minimal interaction safe-guards
      var range = document.querySelector('.range');
      if(range){
        range.addEventListener('input', function(e){
          var val = Number(e.target.value);
          var revealAfter = document.querySelector('.reveal-after');
          var revealBefore = document.querySelector('.reveal-before');
          // basic reveal effect (if elements exist)
          if(revealAfter) revealAfter.style.width = val + '%';
          if(revealBefore) revealBefore.style.width = (100-val) + '%';
        });
      }
    });
  }catch(e){ console.error('placeholder bundle error', e); }
})();
