(function() {
  function checkAndRedirect() {
    const path = window.location.pathname;
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    
    let needsRedirect = false;
    let newPath = '';
    
    if (isMobile) {
      if (path.includes('/buyer/') && !path.includes('/mobile-buyer/')) {
        needsRedirect = true;
        newPath = path.replace('/buyer/', '/mobile-buyer/');
      } else if (path.includes('/seller/') && !path.includes('/mobile-seller/')) {
        needsRedirect = true;
        newPath = path.replace('/seller/', '/mobile-seller/');
      }
    } else {
      if (path.includes('/mobile-buyer/')) {
        needsRedirect = true;
        newPath = path.replace('/mobile-buyer/', '/buyer/');
      } else if (path.includes('/mobile-seller/')) {
        needsRedirect = true;
        newPath = path.replace('/mobile-seller/', '/seller/');
      }
    }
    
    if (needsRedirect) {
      const now = Date.now();
      const lastRedirect = sessionStorage.getItem('last_redirect_time');
      if (lastRedirect && (now - parseInt(lastRedirect, 10)) < 2000) {
        console.warn('Redirect loop/consecutive redirects blocked by guard.');
        return;
      }
      sessionStorage.setItem('last_redirect_time', now.toString());
      window.location.replace(newPath + window.location.search + window.location.hash);
    }
  }
  
  checkAndRedirect();
  
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(checkAndRedirect, 200);
  });
})();
