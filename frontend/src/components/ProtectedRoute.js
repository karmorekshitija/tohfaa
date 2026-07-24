// ProtectedRoute.js — Client-side route guarding
(function() {
  const path = window.location.pathname;
  
  // Inject responsive stylesheet early to avoid FOUC
  const respLink = document.createElement('link');
  respLink.rel = 'stylesheet';
  respLink.href = '/src/responsive.css';
  document.head.appendChild(respLink);
  
  // Define a helper to show access restricted toast/alert
  function showRestrictedAlert(msg = 'Access restricted.') {
    if (window.showToast) {
      window.showToast(msg, 'error');
    } else {
      alert(msg);
    }
  }

  window.addEventListener('storage', function(event) {
    if (event.key === 'tohfa_request_session' && event.newValue) {
      const sessionData = {
        tohfa_access_token: sessionStorage.getItem('tohfa_access_token'),
        tohfa_refresh_token: sessionStorage.getItem('tohfa_refresh_token'),
        tohfa_user: sessionStorage.getItem('tohfa_user'),
        tohfa_admin_token: sessionStorage.getItem('tohfa_admin_token'),
        tohfa_admin_refresh_token: sessionStorage.getItem('tohfa_admin_refresh_token')
      };
      if (sessionData.tohfa_access_token || sessionData.tohfa_admin_token) {
        try {
          localStorage.setItem('tohfa_share_session', JSON.stringify(sessionData));
          localStorage.removeItem('tohfa_share_session');
        } catch (e) {}
      }
    } else if (event.key === 'tohfa_share_session' && event.newValue) {
      try {
        const data = JSON.parse(event.newValue);
        if (data.tohfa_access_token) sessionStorage.setItem('tohfa_access_token', data.tohfa_access_token);
        if (data.tohfa_refresh_token) sessionStorage.setItem('tohfa_refresh_token', data.tohfa_refresh_token);
        if (data.tohfa_user) sessionStorage.setItem('tohfa_user', data.tohfa_user);
        if (data.tohfa_admin_token) sessionStorage.setItem('tohfa_admin_token', data.tohfa_admin_token);
        if (data.tohfa_admin_refresh_token) sessionStorage.setItem('tohfa_admin_refresh_token', data.tohfa_admin_refresh_token);
        
        window.dispatchEvent(new Event('tohfa-session-sync'));
      } catch (e) {
        console.error("Error parsing shared session:", e);
      }
    }
  });

  // Tab session synchronization logic using localStorage bridge
  if (!sessionStorage.getItem('tohfa_access_token') && !sessionStorage.getItem('tohfa_admin_token')) {
    try {
      localStorage.setItem('tohfa_request_session', Date.now().toString());
    } catch (e) {
      console.warn("Storage sync failed:", e);
    }
  }

  let guardsRun = false;
  function runGuards() {
    if (guardsRun) return;
    guardsRun = true;

    // Admin routes guard
    if (path.startsWith('/admin/') && !path.includes('/admin/login.html')) {
      const adminToken = sessionStorage.getItem('tohfa_admin_token');
      if (!adminToken) {
        window.location.replace('/admin/login.html');
        return;
      }
    }
    
    // Seller routes guard
    if (path.startsWith('/seller/')) {
      const token = sessionStorage.getItem('tohfa_access_token');
      if (!token) {
        window.location.replace('/auth/login.html');
        return;
      }
      const userStr = sessionStorage.getItem('tohfa_user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.role !== 'seller' && user.role !== 'admin') {
            sessionStorage.setItem('access_denied_reason', 'Access restricted to sellers only.');
            window.location.replace('/buyer/home.html');
            return;
          }
        } catch (e) {
          window.location.replace('/auth/login.html');
          return;
        }
      }
    }

    // Buyer routes guard
    if (path.startsWith('/buyer/') || path.startsWith('/mobile-buyer/')) {
      const pageSegment = path.split('/').pop() || '';
      const cleanSegment = pageSegment.replace('.html', '');
      const isPublic = [
        '',
        'home',
        'categories',
        'category',
        'product',
        'our-story',
        'seller-profile',
        'search',
        'zipgift'
      ].includes(cleanSegment);

      if (!isPublic) {
        const token = sessionStorage.getItem('tohfa_access_token');
        if (!token) {
          window.location.replace(`/auth/login.html?redirect=${encodeURIComponent(window.location.href)}`);
          return;
        }
      }
    }
  }

  const hasToken = sessionStorage.getItem('tohfa_access_token') || sessionStorage.getItem('tohfa_admin_token');
  if (hasToken) {
    runGuards();
  } else {
    window.addEventListener('tohfa-session-sync', runGuards);
    setTimeout(runGuards, 150);
  }
  function setupAuthAndBadges() {
    const token = sessionStorage.getItem('tohfa_access_token');
    const authContainer = document.getElementById('auth-buttons-container');
    if (!authContainer) return;

    if (token) {
      const isMobile = window.location.pathname.includes('/mobile-buyer/');
      if (isMobile) {
        if (!authContainer.innerHTML.trim()) {
          const userStr = sessionStorage.getItem('tohfa_user');
          let initial = 'A';
          if (userStr) {
            try {
              const user = JSON.parse(userStr);
              if (user.full_name) {
                initial = user.full_name.charAt(0).toUpperCase();
              } else if (user.name) {
                initial = user.name.charAt(0).toUpperCase();
              } else if (user.email) {
                initial = user.email.charAt(0).toUpperCase();
              }
            } catch(e) {}
          }
          authContainer.innerHTML = `
            <a href="/mobile-buyer/profile.html" class="w-10 h-10 rounded-full bg-[#3D6B4F] flex items-center justify-center text-white font-bold border border-[#8FAF82] text-sm overflow-hidden flex-shrink-0 cursor-pointer select-none">
              ${initial}
            </a>
          `;
        }
      } else {
        // On desktop, render the avatar link to /buyer/profile.html
        if (!authContainer.innerHTML.trim() || authContainer.innerHTML === '') {
          const userStr = sessionStorage.getItem('tohfa_user');
          let initial = 'A';
          let avatarUrl = '';
          if (userStr) {
            try {
              const user = JSON.parse(userStr);
              avatarUrl = user.avatar_url || '';
              if (user.display_name) {
                initial = user.display_name.charAt(0).toUpperCase();
              } else if (user.full_name) {
                initial = user.full_name.charAt(0).toUpperCase();
              } else if (user.name) {
                initial = user.name.charAt(0).toUpperCase();
              } else if (user.email) {
                initial = user.email.charAt(0).toUpperCase();
              }
            } catch(e) {}
          }
          
          let avatarHtml = '';
          if (avatarUrl) {
            avatarHtml = `
              <a href="/buyer/profile.html" id="nav-avatar" class="w-10 h-10 rounded-full border border-[#8FAF82] overflow-hidden flex-shrink-0 cursor-pointer block select-none">
                <img src="${avatarUrl}" alt="Profile" class="w-full h-full object-cover" loading="lazy" />
              </a>
            `;
          } else {
            avatarHtml = `
              <a href="/buyer/profile.html" id="nav-avatar" class="w-10 h-10 rounded-full bg-[#3D6B4F] flex items-center justify-center text-white font-bold border border-[#8FAF82] text-sm overflow-hidden flex-shrink-0 cursor-pointer select-none">
                ${initial}
              </a>
            `;
          }
          authContainer.innerHTML = avatarHtml;
        }
      }
    } else {
      if (!authContainer.innerHTML.trim()) {
        authContainer.innerHTML = `
          <div class="flex items-center gap-md">
            <a href="/auth/login.html" class="text-[#3D6B4F] hover:underline text-sm font-semibold">Login</a>
            <a href="/auth/signup-buyer.html" class="bg-[#3D6B4F] text-white px-md py-sm rounded-lg text-sm font-semibold hover:opacity-90 transition-all">Register</a>
          </div>
        `;
      }
    }
  }

  function setupBuyerNavbar() {
    const path = window.location.pathname;
    if (!path.includes('/buyer/') && !path.includes('/mobile-buyer/')) {
      return;
    }

    const isMobilePage = path.includes('/mobile-buyer/');
    const isHome = path.endsWith('/home.html') || path.endsWith('/home') || path.endsWith('/buyer/') || path.endsWith('/mobile-buyer/');
    const isCategory = path.includes('/categories.html') || path.includes('/category.html');
    const isZipGift = path.includes('/zipgift.html');
    const isProfile = !isHome && !isCategory && !isZipGift;

    let wishlistCount = '0';
    let wishlistHidden = true;
    let cartCount = '0';
    let cartHidden = true;
    let notifHidden = true;
    let notifBadgeHidden = true;
    let authHTML = '';

    const oldWishlistBadge = document.getElementById('nav-wishlist-badge');
    if (oldWishlistBadge) {
      wishlistCount = oldWishlistBadge.innerText || '0';
    }
    wishlistHidden = false; // Always show wishlist badge
    const oldCartBadge = document.getElementById('nav-cart-badge');
    if (oldCartBadge) {
      cartCount = oldCartBadge.innerText || '0';
      cartHidden = oldCartBadge.classList.contains('hidden') || oldCartBadge.style.display === 'none';
    }
    const oldNotifBadge = document.getElementById('nav-notifications-badge');
    if (oldNotifBadge) {
      notifHidden = oldNotifBadge.classList.contains('hidden') || oldNotifBadge.style.display === 'none';
    }
    const oldNotifBadgeAlt = document.getElementById('nav-notif-badge');
    if (oldNotifBadgeAlt) {
      notifBadgeHidden = oldNotifBadgeAlt.classList.contains('hidden') || oldNotifBadgeAlt.style.display === 'none';
    }
    const oldAuthContainer = document.getElementById('auth-buttons-container');
    if (oldAuthContainer) {
      authHTML = oldAuthContainer.innerHTML;
    }

    const headers = document.querySelectorAll('body > header, body > nav');
    headers.forEach(el => {
      if (el.id !== 'tohfa-desktop-header' && el.id !== 'mbt-topbar') {
        // Only remove if it represents a top navigation bar (has sticky class, h-20 class, or contains the logo)
        if (el.classList.contains('sticky') || el.classList.contains('h-20') || el.classList.contains('h-16') || el.querySelector('a[href*="home.html"]')) {
          el.remove();
        }
      }
    });

    if (isMobilePage) {
      const mobileTopBarDiv = document.querySelector('body > div.flex-grow > div.flex-shrink-0.sticky.top-0');
      if (mobileTopBarDiv) {
        mobileTopBarDiv.remove();
      }
    }

    if (!document.getElementById('tohfa-dynamic-styles')) {
      const style = document.createElement('style');
      style.id = 'tohfa-dynamic-styles';
      style.innerHTML = `
        #tohfa-desktop-header, #mbt-topbar {
          background-color: #F7F3EC !important;
          border-bottom: 1px solid #8FAF82 !important;
          box-shadow: 0 2px 12px rgba(61, 107, 79, 0.08) !important;
        }
        #auth-buttons-container a[href*="profile.html"],
        #auth-buttons-container img {
          display: none !important;
        }
        #auth-buttons-container:has(a[href*="profile.html"]),
        #auth-buttons-container:has(img) {
          margin-left: 0 !important;
          padding: 0 !important;
        }
        #mobile-bottom-nav {
          background-color: #F7F3EC !important;
          border-top: 1px solid #8FAF82 !important;
          box-shadow: 0 -2px 10px rgba(61, 107, 79, 0.08) !important;
        }
        #mobile-bottom-nav a {
          text-decoration: none !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
        }
        #mobile-bottom-nav .material-symbols-outlined {
          font-size: 24px !important;
        }
        #mobile-bottom-nav span:not(.material-symbols-outlined) {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 9px !important;
          font-weight: 700 !important;
          letter-spacing: 0.05em !important;
        }
        .mbt-icon-btn {
          color: #3D6B4F;
          padding: 8px;
          border-radius: 9999px;
          transition: all 0.2s ease;
          outline: none;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .mbt-icon-btn:hover {
          background-color: rgba(143, 175, 130, 0.15) !important;
        }
        .mbt-icon-btn:focus {
          background-color: rgba(143, 175, 130, 0.25) !important;
          box-shadow: 0 0 0 2px #8FAF82 !important;
        }
        .mbt-icon-btn:active {
          transform: scale(0.9) !important;
        }
        .mbb-tab-link {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.2s ease;
          outline: none;
          border-radius: 8px;
          padding: 4px 8px;
        }
        .mbb-tab-link:hover {
          background-color: rgba(143, 175, 130, 0.1) !important;
        }
        .mbb-tab-link:focus {
          background-color: rgba(143, 175, 130, 0.15) !important;
          box-shadow: 0 0 0 2px rgba(143, 175, 130, 0.5) !important;
        }
        .mbb-tab-link:active {
          transform: scale(0.95) !important;
        }
        #mbt-topbar {
          display: ${isMobilePage ? 'flex' : 'none'} !important;
        }
        #mobile-bottom-nav {
          display: ${isMobilePage ? 'flex' : 'none'} !important;
        }
        #tohfa-desktop-header {
          display: ${isMobilePage ? 'none' : 'flex'} !important;
        }
        @media (max-width: 768px) {
          #tohfa-desktop-header {
            display: none !important;
          }
          #mbt-topbar {
            display: flex !important;
          }
          #mobile-bottom-nav {
            display: flex !important;
          }
          body {
            padding-bottom: 80px !important;
          }
        }
        @media (min-width: 769px) {
          ${!isMobilePage ? `
          #mbt-topbar, #mobile-bottom-nav {
            display: none !important;
          }
          ` : `
          #tohfa-desktop-header {
            display: none !important;
          }
          `}
          body {
            padding-bottom: ${isMobilePage ? '80px' : '0'} !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    if (isMobilePage) {
      let mobileHeader = document.getElementById('mbt-topbar');
      if (!mobileHeader) {
        mobileHeader = document.createElement('header');
        mobileHeader.id = 'mbt-topbar';
        mobileHeader.className = "w-full sticky top-0 z-50 bg-[#F7F3EC] border-b border-[#8FAF82] flex justify-between items-center px-4 h-16";
        document.body.insertBefore(mobileHeader, document.body.firstChild);
      }

      mobileHeader.innerHTML = `
        <div class="flex items-center flex-1">
          <a class="font-['Playfair_Display'] text-[24px] font-bold italic text-[#3D6B4F] tracking-wide select-none" href="/mobile-buyer/home.html" style="font-family: 'Playfair Display', serif !important;">
            Tohfa<span class="text-[#C8973A]">.</span>
          </a>
        </div>
        
        <div class="flex items-center justify-end flex-grow-0 gap-3">
          <a href="/mobile-buyer/search.html" id="header-search-btn" class="mbt-icon-btn">
            <span class="material-symbols-outlined text-[22px]">search</span>
          </a>
          <a href="/mobile-buyer/saved-makes.html" class="mbt-icon-btn">
            <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">favorite</span>
            <span id="nav-wishlist-badge" class="absolute -top-0.5 -right-0.5 bg-[#C8973A] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">0</span>
          </a>
          <a href="/mobile-buyer/cart.html" class="mbt-icon-btn">
            <span class="material-symbols-outlined text-[22px]">shopping_cart</span>
            <span id="nav-cart-badge" class="absolute -top-0.5 -right-0.5 bg-[#C8973A] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold ${cartHidden ? 'hidden' : ''}">${cartCount}</span>
          </a>
          <a href="/mobile-buyer/notifications.html" class="mbt-icon-btn">
            <span class="material-symbols-outlined text-[22px]">notifications</span>
            <span id="nav-notifications-badge" class="absolute -top-0.5 -right-0.5 bg-[#C8973A] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold ${notifHidden && notifBadgeHidden ? 'hidden' : ''}">0</span>
          </a>
        </div>
      `;

      let bottomNav = document.getElementById('mobile-bottom-nav');
      if (!bottomNav) {
        bottomNav = document.createElement('div');
        bottomNav.id = 'mobile-bottom-nav';
        bottomNav.className = "fixed bottom-0 left-0 right-0 h-16 bg-[#F7F3EC] border-t border-[#8FAF82] flex justify-around items-center z-50 px-2";
        document.body.appendChild(bottomNav);
      }

      bottomNav.innerHTML = `
        <a href="/mobile-buyer/home.html" class="mbb-tab-link ${isHome ? 'text-[#3D6B4F]' : 'text-[#8FAF82] hover:text-[#3D6B4F]'}">
          <span class="material-symbols-outlined text-[24px]">home</span>
          <span class="text-[9px] font-bold tracking-wider">HOME</span>
        </a>
        <a href="/mobile-buyer/categories.html" class="mbb-tab-link ${isCategory ? 'text-[#3D6B4F]' : 'text-[#8FAF82] hover:text-[#3D6B4F]'}">
          <span class="material-symbols-outlined text-[24px]">category</span>
          <span class="text-[9px] font-bold tracking-wider">CATEGORY</span>
        </a>
        <a href="/mobile-buyer/zipgift.html" class="mbb-tab-link ${isZipGift ? 'text-[#3D6B4F]' : 'text-[#8FAF82] hover:text-[#3D6B4F]'}">
          <span class="material-symbols-outlined text-[24px]">bolt</span>
          <span class="text-[9px] font-bold tracking-wider">ZIPGIFT</span>
        </a>
        <a href="/mobile-buyer/profile.html" class="mbb-tab-link ${isProfile ? 'text-[#3D6B4F]' : 'text-[#8FAF82] hover:text-[#3D6B4F]'}">
          <span class="material-symbols-outlined text-[24px]">person</span>
          <span class="text-[9px] font-bold tracking-wider">PROFILE</span>
        </a>
      `;

      // Exempt chat page from body padding bottom since it uses its own full height layout
      if (!window.location.pathname.includes('/chat.html')) {
        document.body.style.paddingBottom = '80px';
      }

    } else {
      let desktopHeader = document.getElementById('tohfa-desktop-header');
      if (!desktopHeader) {
        desktopHeader = document.createElement('header');
        desktopHeader.id = 'tohfa-desktop-header';
        desktopHeader.className = "w-full sticky top-0 z-50 bg-[#F7F3EC] border-b border-[#8FAF82] flex justify-between items-center px-margin-desktop h-20";
        document.body.insertBefore(desktopHeader, document.body.firstChild);
      }

      desktopHeader.innerHTML = `
        <div class="flex items-center flex-1">
          <a class="font-['Playfair_Display'] text-[32px] italic text-[#3D6B4F] select-none" href="/buyer/home.html">
            Tohfa<span class="text-[#C8973A]">.</span>
          </a>
        </div>
        
        <nav class="hidden md:flex items-center justify-center gap-xl h-full">
          <a href="/buyer/home.html" class="flex items-center gap-xs transition-colors h-full px-1 font-['DM_Sans'] text-[16px] uppercase ${isHome ? 'text-[#3D6B4F] border-b-2 border-[#3D6B4F] font-bold' : 'text-[#414942] hover:text-[#3D6B4F] font-normal'}">
            <span class="material-symbols-outlined text-[20px]">home</span>
            <span>HOME</span>
          </a>
          <a href="/buyer/categories.html" class="flex items-center gap-xs transition-colors h-full px-1 font-['DM_Sans'] text-[16px] uppercase ${isCategory ? 'text-[#3D6B4F] border-b-2 border-[#3D6B4F] font-bold' : 'text-[#414942] hover:text-[#3D6B4F] font-normal'}">
            <span class="material-symbols-outlined text-[20px]">category</span>
            <span>CATEGORY</span>
          </a>
          <a href="/buyer/zipgift.html" class="flex items-center gap-xs transition-colors h-full px-1 font-['DM_Sans'] text-[16px] uppercase ${isZipGift ? 'text-[#3D6B4F] border-b-2 border-[#3D6B4F] font-bold' : 'text-[#414942] hover:text-[#3D6B4F] font-normal'}">
            <span class="material-symbols-outlined text-[20px]">bolt</span>
            <span>ZIPGIFT</span>
          </a>
          <a href="/buyer/profile.html" class="flex items-center gap-xs transition-colors h-full px-1 font-['DM_Sans'] text-[16px] uppercase ${isProfile ? 'text-[#3D6B4F] border-b-2 border-[#3D6B4F] font-bold' : 'text-[#414942] hover:text-[#3D6B4F] font-normal'}">
            <span class="material-symbols-outlined text-[20px]">person</span>
            <span>PROFILE</span>
          </a>
        </nav>
        
        <div class="flex items-center justify-end flex-1 gap-lg ml-xl">
          <div class="flex items-center gap-md">
            <a href="/buyer/categories.html" id="header-search-btn" class="text-[#3D6B4F] p-2 hover:bg-[#8FAF82]/20 rounded-full active:scale-95 duration-200 transition-all flex items-center justify-center">
              <span class="material-symbols-outlined">search</span>
            </a>
            <a href="/buyer/saved-makes.html" class="text-[#3D6B4F] p-2 hover:bg-[#8FAF82]/20 rounded-full active:scale-95 duration-200 transition-all flex items-center justify-center relative">
              <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">favorite</span>
              <span id="nav-wishlist-badge" class="absolute -top-1 -right-1 bg-[#C8973A] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">0</span>
            </a>
            <a href="/buyer/cart.html" class="text-[#3D6B4F] p-2 hover:bg-[#8FAF82]/20 rounded-full active:scale-95 duration-200 transition-all flex items-center justify-center relative">
              <span class="material-symbols-outlined">shopping_cart</span>
              <span id="nav-cart-badge" class="absolute -top-1 -right-1 bg-[#C8973A] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold ${cartHidden ? 'hidden' : ''}">${cartCount}</span>
            </a>
            <a href="/buyer/notifications.html" class="text-[#3D6B4F] p-2 hover:bg-[#8FAF82]/20 rounded-full active:scale-95 duration-200 transition-all flex items-center justify-center relative">
              <span class="material-symbols-outlined">notifications</span>
              <span id="nav-notifications-badge" class="absolute -top-1 -right-1 bg-[#C8973A] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold ${notifHidden && notifBadgeHidden ? 'hidden' : ''}">0</span>
            </a>
          </div>
          <div id="auth-buttons-container" class="flex items-center gap-md ml-4">${authHTML}</div>
        </div>
      `;

      const bottomNav = document.getElementById('mobile-bottom-nav');
      if (bottomNav) {
        bottomNav.remove();
      }
      document.body.style.paddingBottom = '';
    }

    setupAuthAndBadges();
  }

  async function updateGlobalCartBadge() {
    const token = sessionStorage.getItem('tohfa_access_token');
    if (!token) {
      const badge = document.getElementById('nav-cart-badge');
      if (badge) badge.classList.add('hidden');
      return;
    }
    try {
      const res = await fetch(`${window.location.origin}/api/cart`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const count = json.data.item_count || 0;
          const badge = document.getElementById('nav-cart-badge');
          if (badge) {
            if (count > 0) {
              badge.innerText = count;
              badge.classList.remove('hidden');
            } else {
              badge.classList.add('hidden');
            }
          }
        }
      }
    } catch(e) {}
  }
  window.updateCartBadge = updateGlobalCartBadge;
  window.addEventListener('tohfa-cart-updated', updateGlobalCartBadge);

  async function updateGlobalWishlistBadge() {
    const token = sessionStorage.getItem('tohfa_access_token');
    const badge = document.getElementById('nav-wishlist-badge');
    if (!badge) return;
    if (!token) {
      badge.classList.add('hidden');
      return;
    }
    try {
      const res = await fetch(`${window.location.origin}/api/wishlist`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const items = json.data?.items || json.data || [];
          badge.innerText = items.length || 0;
          badge.classList.remove('hidden');
        }
      }
    } catch(e) {}
  }
  window.updateWishlistBadge = updateGlobalWishlistBadge;
  window.addEventListener('tohfa-wishlist-updated', updateGlobalWishlistBadge);

  // ─────────────────────────────────────────────────────────────────
  // Global Contact Us Modal — injected once into every page that loads
  // ProtectedRoute.js, so it works even on pages with hardcoded footers.
  // ─────────────────────────────────────────────────────────────────
  function injectContactModal() {
    if (document.getElementById('tohfa-contact-modal')) return;

    // -- Styles --
    if (!document.getElementById('tohfa-contact-modal-styles')) {
      const s = document.createElement('style');
      s.id = 'tohfa-contact-modal-styles';
      s.textContent = [
        '.tohfa-contact-modal{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:99999;display:none;align-items:center;justify-content:center;padding:24px;}',
        '.tohfa-contact-modal.is-open{display:flex!important;}',
        '.tohfa-contact-card{background:#1E3D0F;color:#F7F2E8;border:1px solid rgba(255,255,255,.15);border-radius:16px;padding:40px 32px 32px;width:100%;max-width:440px;position:relative;box-shadow:0 20px 40px rgba(0,0,0,.4);text-align:center;transform:scale(.9);transition:transform .3s cubic-bezier(.34,1.56,.64,1);}',
        '.tohfa-contact-modal.is-open .tohfa-contact-card{transform:scale(1);}',
        '.tohfa-contact-close-btn{position:absolute;top:16px;right:16px;background:none;border:none;color:#F7F2E8;font-size:22px;cursor:pointer;opacity:.7;transition:all .2s ease;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;}',
        '.tohfa-contact-close-btn:hover{opacity:1;background:rgba(255,255,255,.1);transform:scale(1.05);}',
        '.tohfa-contact-close-btn:active{transform:scale(.95);}',
        '.tohfa-contact-card h3{font-family:\'Playfair Display\',serif;font-size:28px;margin:0 0 12px;color:#FFFFFF;}',
        '.tohfa-contact-card p{font-family:\'DM Sans\',sans-serif;font-size:16px;line-height:1.5;margin-bottom:24px;color:#A8B89A;}',
        '.tohfa-contact-email-link{display:inline-flex;align-items:center;gap:8px;font-family:\'Space Mono\',monospace;font-size:16px;color:#C9972C;text-decoration:none;border:1px solid rgba(201,151,44,.3);padding:12px 24px;border-radius:8px;background:rgba(201,151,44,.05);transition:all .2s ease;}',
        '.tohfa-contact-email-link:hover{background:rgba(201,151,44,.15);border-color:rgba(201,151,44,.6);color:#F7F2E8;transform:translateY(-2px);}',
        '.tohfa-contact-email-link:active{transform:translateY(0);}'
      ].join('');
      document.head.appendChild(s);
    }

    // -- Modal HTML --
    const modal = document.createElement('div');
    modal.id = 'tohfa-contact-modal';
    modal.className = 'tohfa-contact-modal';
    modal.addEventListener('click', function(e) {
      if (e.target === modal) window.closeContactModal();
    });
    modal.innerHTML = `
      <div class="tohfa-contact-card" onclick="event.stopPropagation()">
        <button class="tohfa-contact-close-btn" onclick="window.closeContactModal()" aria-label="Close contact modal">&times;</button>
        <h3>Get in Touch</h3>
        <p>Reach us at</p>
        <a href="mailto:tohfa126@gmail.com" class="tohfa-contact-email-link">
          <span class="material-symbols-outlined" style="font-size:20px;vertical-align:middle;">mail</span>
          <span>tohfa126@gmail.com</span>
        </a>
      </div>`;
    document.body.appendChild(modal);

    // -- Global functions --
    window.openContactModal = function(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      const m = document.getElementById('tohfa-contact-modal');
      if (m) { m.classList.add('is-open'); document.body.style.overflow = 'hidden'; }
    };
    window.closeContactModal = function() {
      const m = document.getElementById('tohfa-contact-modal');
      if (m) { m.classList.remove('is-open'); document.body.style.overflow = ''; }
    };

    // -- Universal click interceptor for any "Contact Us" anchor on any page --
    if (!window._tohfaContactClickListenerAdded) {
      window._tohfaContactClickListenerAdded = true;
      document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.textContent.trim().toLowerCase() === 'contact us') {
          e.preventDefault();
          window.openContactModal(e);
        }
      }, true); // capture phase so it fires before href navigation
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') window.closeContactModal();
      });
    }
  }

  // -- Dynamic injection of Refunds & Disputes Modal --
  function injectRefundsModal() {
    if (document.getElementById('tohfa-refunds-modal')) return;

    // -- Styles --
    if (!document.getElementById('tohfa-refunds-modal-styles')) {
      const s = document.createElement('style');
      s.id = 'tohfa-refunds-modal-styles';
      s.textContent = [
        '.tohfa-refunds-modal{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:99999;display:none;align-items:center;justify-content:center;padding:24px;}',
        '.tohfa-refunds-modal.is-open{display:flex!important;}',
        '.tohfa-refunds-card{background:#1E3D0F;color:#F7F2E8;border:1px solid rgba(255,255,255,.15);border-radius:16px;padding:40px 32px 32px;width:100%;max-width:520px;position:relative;box-shadow:0 20px 40px rgba(0,0,0,.4);text-align:left;transform:scale(.9);transition:transform .3s cubic-bezier(.34,1.56,.64,1);}',
        '.tohfa-refunds-modal.is-open .tohfa-refunds-card{transform:scale(1);}',
        '.tohfa-refunds-close-btn{position:absolute;top:16px;right:16px;background:none;border:none;color:#F7F2E8;font-size:22px;cursor:pointer;opacity:.7;transition:all .2s ease;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;}',
        '.tohfa-refunds-close-btn:hover{opacity:1;background:rgba(255,255,255,.1);transform:scale(1.05);}',
        '.tohfa-refunds-close-btn:active{transform:scale(.95);}',
        '.tohfa-refunds-card h3{font-family:\'Playfair Display\',serif;font-size:28px;margin:0 0 20px;color:#FFFFFF;text-align:center;}',
        '.tohfa-refunds-card p{font-family:\'DM Sans\',sans-serif;font-size:14px;line-height:1.6;margin-bottom:16px;color:#A8B89A;}',
        '.tohfa-refunds-card p:last-child{margin-bottom:0;}'
      ].join('');
      document.head.appendChild(s);
    }

    // -- Modal HTML --
    const modal = document.createElement('div');
    modal.id = 'tohfa-refunds-modal';
    modal.className = 'tohfa-refunds-modal';
    modal.addEventListener('click', function(e) {
      if (e.target === modal) window.closeRefundsModal();
    });
    modal.innerHTML = `
      <div class="tohfa-refunds-card" onclick="event.stopPropagation()">
        <button class="tohfa-refunds-close-btn" onclick="window.closeRefundsModal()" aria-label="Close refunds modal">&times;</button>
        <h3>Refunds & Disputes</h3>
        <p>Most Tohfa products are handmade or customized just for you, so we're unable to accept returns or offer refunds once an order is placed.</p>
        <p>If your order arrives damaged, we'll gladly offer a replacement or refund — provided you share an unedited unboxing video (starting before the package is opened) within 48 hours of delivery. As we're now in an age where images can be easily edited or AI-generated, we're only able to accept video proof, not photos, to verify a claim.</p>
        <p>Please note: refunds aren't available for change of mind, customization changes after production starts, or minor handmade variations — these are natural, since every piece is made by hand.</p>
      </div>`;
    document.body.appendChild(modal);

    // -- Global functions --
    window.openRefundsModal = function(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      const m = document.getElementById('tohfa-refunds-modal');
      if (m) { m.classList.add('is-open'); document.body.style.overflow = 'hidden'; }
    };
    window.closeRefundsModal = function() {
      const m = document.getElementById('tohfa-refunds-modal');
      if (m) { m.classList.remove('is-open'); document.body.style.overflow = ''; }
    };

    // -- Universal click interceptor for any "Refunds & Disputes" anchor on any page --
    if (!window._tohfaRefundsClickListenerAdded) {
      window._tohfaRefundsClickListenerAdded = true;
      document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.textContent.trim().toLowerCase() === 'refunds & disputes') {
          e.preventDefault();
          window.openRefundsModal(e);
        }
      }, true); // capture phase so it fires before href navigation
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') window.closeRefundsModal();
      });
    }
  }

  // Let's run a check when page loads to show any toast from redirection
  function init() {
    setupBuyerNavbar();
    injectContactModal();
    injectRefundsModal();
    updateGlobalCartBadge();

    updateGlobalWishlistBadge();

    const deniedReason = sessionStorage.getItem('access_denied_reason');
    if (deniedReason) {
      sessionStorage.removeItem('access_denied_reason');
      setTimeout(() => {
        showRestrictedAlert(deniedReason);
      }, 500);
    }

    // Inject Persona Switcher Links
    const userStr = sessionStorage.getItem('tohfa_user');
    let user = null;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
        
        if (user.role === 'seller' || user.role === 'admin') {
          if (path.startsWith('/buyer/')) {
            const nav = document.querySelector('header nav');
            if (nav) {
              const link = document.createElement('a');
              link.href = '/seller/dashboard.html';
              link.className = "flex items-center gap-xs text-[#7B5EA7] hover:text-[#3D6B4F] transition-colors h-full px-1 font-['DM_Sans'] text-[16px] font-bold";
              link.innerHTML = `
                <span class="material-symbols-outlined text-[20px]">store</span>
                <span>Switch to Seller Studio</span>
              `;
              nav.appendChild(link);
            }
          }
          
          if (path.startsWith('/seller/')) {
            const headerRight = document.querySelector('header .flex.items-center.gap-lg');
            if (headerRight) {
              const link = document.createElement('a');
              link.href = '/buyer/home.html';
              link.className = "px-lg py-sm bg-secondary-container text-on-secondary-container rounded-full font-body-md shadow-sm hover:opacity-90 transition-all flex items-center gap-xs font-bold border border-outline-variant/30";
              link.innerHTML = `
                <span class="material-symbols-outlined text-[18px]">shopping_bag</span>
                <span>Browse as Buyer</span>
              `;
              headerRight.insertBefore(link, headerRight.firstChild);
            }
          }
        }
      } catch (e) {
        console.error("Error setting up persona switcher:", e);
      }
    }

    initMobileLayouts(user);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('tohfa-navbar-loaded', () => {
    setupBuyerNavbar();
    updateGlobalCartBadge();

    const userStr = sessionStorage.getItem('tohfa_user');
    let user = null;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch (e) {}
    }
    initMobileLayouts(user);
  });

  // Helper to initialize Mobile Hamburger, Drawer and Admin controls
  function initMobileLayouts(user) {
    const isMobile = window.innerWidth < 1024;
    
    // 1. Setup Buyer Mobile Navbar Hamburger and Drawer
    const buyerHeader = document.querySelector('header:not(.seller-topbar-header)');
    // ONLY setup if NOT on a buyer/mobile-buyer page
    if (buyerHeader && path.includes('/auth/') && !path.includes('/buyer/') && !path.includes('/mobile-buyer/') && !document.getElementById('mobile-hamburger')) {
      const hamburger = document.createElement('button');
      hamburger.id = 'mobile-hamburger';
      hamburger.className = 'text-[#3D6B4F] p-2 hover:bg-[#8FAF82]/20 rounded-full focus:outline-none flex items-center justify-center mr-2 lg:hidden';
      hamburger.style.cursor = 'pointer';
      hamburger.innerHTML = '<span class="material-symbols-outlined text-[28px]">menu</span>';
      
      buyerHeader.insertBefore(hamburger, buyerHeader.firstChild);
      
      const drawer = document.createElement('div');
      drawer.id = 'mobile-menu-drawer';
      
      const isLoggedIn = !!sessionStorage.getItem('tohfa_access_token');
      
      drawer.innerHTML = `
        <div class="p-6 border-b border-[#8FAF82] flex justify-between items-center bg-[#FCFAF5]">
          <div>
            <h3 class="font-['Playfair_Display'] text-2xl italic text-[#3D6B4F] select-none">Tohfa<span class="text-[#C8973A]">.</span></h3>
            <p class="text-[10px] text-[#6B6B6B] tracking-wider uppercase mt-1">Menu</p>
          </div>
          <button id="close-mobile-menu" class="text-[#6B6B6B] hover:text-[#3D6B4F] p-2 rounded-full hover:bg-[#8FAF82]/20 flex items-center justify-center border-none bg-transparent" style="cursor:pointer;">
            <span class="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <div class="flex-grow overflow-y-auto p-6 space-y-4 font-['DM_Sans']">
          <a href="/buyer/home.html" class="flex items-center gap-4 text-lg text-[#6B6B6B] hover:text-[#3D6B4F] py-2 font-medium">
            <span class="material-symbols-outlined">home</span>
            <span>Home</span>
          </a>
          <a href="/buyer/categories.html" class="flex items-center gap-4 text-lg text-[#6B6B6B] hover:text-[#3D6B4F] py-2 font-medium">
            <span class="material-symbols-outlined">category</span>
            <span>Category</span>
          </a>
          <a href="/buyer/zipgift.html" class="flex items-center gap-4 text-lg text-[#6B6B6B] hover:text-[#3D6B4F] py-2 font-medium">
            <span class="material-symbols-outlined">bolt</span>
            <span>ZipGift</span>
          </a>
          <a href="/buyer/profile.html" class="flex items-center gap-4 text-lg text-[#6B6B6B] hover:text-[#3D6B4F] py-2 font-medium">
            <span class="material-symbols-outlined">person</span>
            <span>Profile</span>
          </a>
          <a href="/buyer/cart.html" class="flex items-center gap-4 text-lg text-[#6B6B6B] hover:text-[#3D6B4F] py-2 font-medium">
            <span class="material-symbols-outlined">shopping_cart</span>
            <span>Shopping Cart</span>
          </a>
          <a href="/buyer/saved-makes.html" class="flex items-center gap-4 text-lg text-[#6B6B6B] hover:text-[#3D6B4F] py-2 font-medium">
            <span class="material-symbols-outlined">favorite</span>
            <span>Wishlist</span>
          </a>
          ${user && (user.role === 'seller' || user.role === 'admin') ? `
          <a href="/seller/dashboard.html" class="flex items-center gap-4 text-lg text-[#7B5EA7] hover:text-[#3D6B4F] py-2 font-bold">
            <span class="material-symbols-outlined">store</span>
            <span>Seller Studio</span>
          </a>` : ''}
        </div>
        <div class="p-6 border-t border-[#E8E2D9] bg-[#FCFAF5]">
          ${isLoggedIn ? `
          <button id="mobile-logout-btn" class="w-full py-3 bg-[#3D6B4F] text-white rounded-full text-sm font-bold shadow hover:bg-[#2a4d38] transition-all border-none" style="cursor:pointer;">
            Logout
          </button>` : `
          <a href="/auth/login.html" class="w-full py-3 bg-[#3D6B4F] text-white rounded-full text-sm font-bold shadow hover:bg-[#2a4d38] transition-all flex items-center justify-center">
            Login
          </a>`}
        </div>
      `;
      
      const backdrop = document.createElement('div');
      backdrop.id = 'mobile-menu-backdrop';
      
      document.body.appendChild(drawer);
      document.body.appendChild(backdrop);
      
      const openMenu = () => {
        drawer.classList.add('active');
        backdrop.classList.add('active');
      };
      
      const closeMenu = () => {
        drawer.classList.remove('active');
        backdrop.classList.remove('active');
      };
      
      hamburger.addEventListener('click', openMenu);
      backdrop.addEventListener('click', closeMenu);
      drawer.querySelector('#close-mobile-menu').addEventListener('click', closeMenu);
      
      const logoutBtn = drawer.querySelector('#mobile-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          sessionStorage.clear();
          window.location.href = '/auth/login.html';
        });
      }
    }

    // 2. Setup Admin Sidebar Hamburger
    const adminHeader = document.querySelector('header.fixed.top-0.right-0');
    const aside = document.querySelector('aside');
    if (adminHeader && aside && !document.getElementById('admin-hamburger')) {
      const toggleBtn = document.createElement('button');
      toggleBtn.id = 'admin-hamburger';
      toggleBtn.className = 'admin-menu-toggle mr-4 flex items-center justify-center text-white bg-[#3D6B4F] p-2 rounded-lg lg:hidden border-none';
      toggleBtn.style.cursor = 'pointer';
      toggleBtn.innerHTML = '<span class="material-symbols-outlined text-[20px]">menu</span>';
      
      adminHeader.insertBefore(toggleBtn, adminHeader.firstChild);
      
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        aside.classList.toggle('active');
      });
      
      document.addEventListener('click', (e) => {
        if (aside.classList.contains('active') && !aside.contains(e.target) && e.target !== toggleBtn) {
          aside.classList.remove('active');
        }
      });
    }
  }

  function startNotifPoll() {
    const token = sessionStorage.getItem('tohfa_access_token');
    if (!token) return;
    async function pollNotif() {
      try {
        const res = await fetch(`${window.location.origin}/api/notifications?unread_only=true&limit=1`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const count = data.unread_count || 0;
          ['nav-notifications-badge', 'nav-notif-badge'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
              el.innerText = count;
              el.classList.toggle('hidden', count === 0);
            }
          });
        }
      } catch(e) {}
    }
    pollNotif();
    setInterval(pollNotif, 10000);
  }
  startNotifPoll();
})();


