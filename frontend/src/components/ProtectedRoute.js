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
  if (path.startsWith('/buyer/')) {
    const token = sessionStorage.getItem('tohfa_access_token');
    if (!token) {
      window.location.replace('/auth/login.html');
      return;
    }
  }
  function setupAuthAndBadges() {
    const token = sessionStorage.getItem('tohfa_access_token');
    const authContainer = document.getElementById('auth-buttons-container');
    if (!authContainer) return;

    if (token) {
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
          <a href="${window.location.pathname.includes('/mobile-buyer/') ? '/mobile-buyer/profile.html' : '/buyer/profile.html'}" class="w-10 h-10 rounded-full bg-[#3D6B4F] flex items-center justify-center text-white font-bold border border-[#8FAF82] text-sm overflow-hidden flex-shrink-0 cursor-pointer select-none">
            ${initial}
          </a>
        `;
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
    const isReel = path.includes('/reels.html') || path.includes('/saved-reels.html');
    const isProfile = !isHome && !isCategory && !isReel;

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
      wishlistHidden = oldWishlistBadge.classList.contains('hidden') || oldWishlistBadge.style.display === 'none';
    }
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
        el.remove();
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
            <span id="nav-wishlist-badge" class="absolute -top-0.5 -right-0.5 bg-[#C8973A] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold ${wishlistHidden ? 'hidden' : ''}">${wishlistCount}</span>
          </a>
          <a href="/mobile-buyer/cart.html" class="mbt-icon-btn">
            <span class="material-symbols-outlined text-[22px]">shopping_cart</span>
            <span id="nav-cart-badge" class="absolute -top-0.5 -right-0.5 bg-[#C8973A] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold ${cartHidden ? 'hidden' : ''}">${cartCount}</span>
          </a>
          <a href="/mobile-buyer/notifications.html" class="mbt-icon-btn">
            <span class="material-symbols-outlined text-[22px]">notifications</span>
            <span id="nav-notifications-badge" class="absolute -top-1 -right-1 w-2 h-2 bg-[#C8973A] rounded-full ${notifHidden ? 'hidden' : ''}"></span>
            <span id="nav-notif-badge" class="absolute -top-1 -right-1 w-2 h-2 bg-[#C8973A] rounded-full ${notifBadgeHidden ? 'hidden' : ''}"></span>
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
        <a href="/mobile-buyer/reels.html" class="mbb-tab-link ${isReel ? 'text-[#3D6B4F]' : 'text-[#8FAF82] hover:text-[#3D6B4F]'}">
          <span class="material-symbols-outlined text-[24px]">movie</span>
          <span class="text-[9px] font-bold tracking-wider">REEL</span>
        </a>
        <a href="/mobile-buyer/profile.html" class="mbb-tab-link ${isProfile ? 'text-[#3D6B4F]' : 'text-[#8FAF82] hover:text-[#3D6B4F]'}">
          <span class="material-symbols-outlined text-[24px]">person</span>
          <span class="text-[9px] font-bold tracking-wider">PROFILE</span>
        </a>
      `;

      document.body.style.paddingBottom = '80px';

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
        
        <nav class="hidden lg:flex items-center justify-center gap-xl h-full">
          <a href="/buyer/home.html" class="flex items-center gap-xs transition-colors h-full px-1 font-['DM_Sans'] text-[16px] uppercase ${isHome ? 'text-[#3D6B4F] border-b-2 border-[#3D6B4F] font-bold' : 'text-[#414942] hover:text-[#3D6B4F] font-normal'}">
            <span class="material-symbols-outlined text-[20px]">home</span>
            <span>HOME</span>
          </a>
          <a href="/buyer/categories.html" class="flex items-center gap-xs transition-colors h-full px-1 font-['DM_Sans'] text-[16px] uppercase ${isCategory ? 'text-[#3D6B4F] border-b-2 border-[#3D6B4F] font-bold' : 'text-[#414942] hover:text-[#3D6B4F] font-normal'}">
            <span class="material-symbols-outlined text-[20px]">category</span>
            <span>CATEGORY</span>
          </a>
          <a href="/buyer/reels.html" class="flex items-center gap-xs transition-colors h-full px-1 font-['DM_Sans'] text-[16px] uppercase ${isReel ? 'text-[#3D6B4F] border-b-2 border-[#3D6B4F] font-bold' : 'text-[#414942] hover:text-[#3D6B4F] font-normal'}">
            <span class="material-symbols-outlined text-[20px]">movie</span>
            <span>REEL</span>
          </a>
          <a href="/buyer/profile.html" class="flex items-center gap-xs transition-colors h-full px-1 font-['DM_Sans'] text-[16px] uppercase ${isProfile ? 'text-[#3D6B4F] border-b-2 border-[#3D6B4F] font-bold' : 'text-[#414942] hover:text-[#3D6B4F] font-normal'}">
            <span class="material-symbols-outlined text-[20px]">person</span>
            <span>PROFILE</span>
          </a>
        </nav>
        
        <div class="flex items-center justify-end flex-1 gap-lg">
          <a href="/buyer/categories.html" id="header-search-btn" class="text-[#3D6B4F] p-2 hover:bg-[#8FAF82]/20 rounded-full active:scale-95 duration-200 transition-all flex items-center justify-center">
            <span class="material-symbols-outlined">search</span>
          </a>
          <a href="/buyer/saved-makes.html" class="text-[#3D6B4F] p-2 hover:bg-[#8FAF82]/20 rounded-full active:scale-95 duration-200 transition-all flex items-center justify-center relative">
            <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">favorite</span>
            <span id="nav-wishlist-badge" class="absolute -top-1 -right-1 bg-[#C8973A] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold ${wishlistHidden ? 'hidden' : ''}">${wishlistCount}</span>
          </a>
          <a href="/buyer/cart.html" class="text-[#3D6B4F] p-2 hover:bg-[#8FAF82]/20 rounded-full active:scale-95 duration-200 transition-all flex items-center justify-center relative">
            <span class="material-symbols-outlined">shopping_cart</span>
            <span id="nav-cart-badge" class="absolute -top-1 -right-1 bg-[#C8973A] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold ${cartHidden ? 'hidden' : ''}">${cartCount}</span>
          </a>
          <a href="/buyer/notifications.html" class="text-[#3D6B4F] p-2 hover:bg-[#8FAF82]/20 rounded-full active:scale-95 duration-200 transition-all flex items-center justify-center relative">
            <span class="material-symbols-outlined">notifications</span>
            <span id="nav-notifications-badge" class="absolute -top-1.5 -right-1.5 w-2 h-2 bg-[#C8973A] rounded-full ${notifHidden ? 'hidden' : ''}"></span>
            <span id="nav-notif-badge" class="absolute -top-1.5 -right-1.5 w-2 h-2 bg-[#C8973A] rounded-full ${notifBadgeHidden ? 'hidden' : ''}"></span>
          </a>
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

  // Let's run a check when page loads to show any toast from redirection
  function init() {
    setupBuyerNavbar();

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
          <a href="/buyer/reels.html" class="flex items-center gap-4 text-lg text-[#6B6B6B] hover:text-[#3D6B4F] py-2 font-medium">
            <span class="material-symbols-outlined">movie</span>
            <span>Reels</span>
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
})();


