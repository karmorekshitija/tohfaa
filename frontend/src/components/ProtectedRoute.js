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

  // Let's run a check when page loads to show any toast from redirection
  document.addEventListener('DOMContentLoaded', () => {
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
          // If in buyer studio, inject "Switch to Seller Studio" link in header
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
          
          // If in Seller Studio, inject "Browse as Buyer" link
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

    // Initialize Mobile Layout components
    initMobileLayouts(user);
  });

  document.addEventListener('tohfa-navbar-loaded', () => {
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
    // Check that we are in a buyer/auth page
    const isHomePage = path.endsWith('/home.html') || path === '/buyer/' || path === '/buyer' || path === '/';
    if (buyerHeader && (path.includes('/buyer/') || path.includes('/auth/')) && !isHomePage && !document.getElementById('mobile-hamburger')) {
      // Create Hamburger Toggle Button
      const hamburger = document.createElement('button');
      hamburger.id = 'mobile-hamburger';
      hamburger.className = 'text-[#3D6B4F] p-2 hover:bg-[#8FAF82]/20 rounded-full focus:outline-none flex items-center justify-center mr-2 lg:hidden';
      hamburger.style.cursor = 'pointer';
      hamburger.innerHTML = '<span class="material-symbols-outlined text-[28px]">menu</span>';
      
      // Place it before Logo
      buyerHeader.insertBefore(hamburger, buyerHeader.firstChild);
      
      // Inject Mobile Drawer HTML
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
      
      // Events
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

    // 3. Inject Bottom Navigation Bar for Buyer Panels
    if (path.includes('/buyer/') && !document.getElementById('buyer-bottom-nav')) {
      const bottomNav = document.createElement('div');
      bottomNav.id = 'buyer-bottom-nav';
      bottomNav.className = 'lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#C5D6BC] flex items-center justify-around z-50 pb-[safe-area-inset-bottom]';
      bottomNav.innerHTML = `
        <a href="/buyer/home.html" id="bottom-nav-btn-home" class="flex flex-col items-center justify-center flex-1 h-full relative text-[#6E6453] hover:text-[#3D6B4F] transition-all">
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#3D6B4F] rounded-b-sm hidden" id="bottom-nav-line-home"></div>
          <span class="material-symbols-outlined text-[24px]">home</span>
          <span class="text-[10px] font-['DM_Sans'] mt-0.5 font-medium">Home</span>
        </a>
        <a href="/buyer/categories.html" id="bottom-nav-btn-category" class="flex flex-col items-center justify-center flex-1 h-full relative text-[#6E6453] hover:text-[#3D6B4F] transition-all">
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#3D6B4F] rounded-b-sm hidden" id="bottom-nav-line-category"></div>
          <span class="material-symbols-outlined text-[24px]">category</span>
          <span class="text-[10px] font-['DM_Sans'] mt-0.5 font-medium">Category</span>
        </a>
        <a href="/buyer/reels.html" id="bottom-nav-btn-reels" class="flex flex-col items-center justify-center flex-1 h-full relative text-[#6E6453] hover:text-[#3D6B4F] transition-all">
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#3D6B4F] rounded-b-sm hidden" id="bottom-nav-line-reels"></div>
          <span class="material-symbols-outlined text-[24px]">palette</span>
          <span class="text-[10px] font-['DM_Sans'] mt-0.5 font-medium">Reels</span>
        </a>
        <a href="/buyer/profile.html" id="bottom-nav-btn-profile" class="flex flex-col items-center justify-center flex-1 h-full relative text-[#6E6453] hover:text-[#3D6B4F] transition-all">
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#3D6B4F] rounded-b-sm hidden" id="bottom-nav-line-profile"></div>
          <div class="w-7 h-7 rounded-full bg-[#3D6B4F] flex items-center justify-center text-white mb-0.5" id="bottom-nav-profile-badge">
            <span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1;">flag</span>
          </div>
          <span class="text-[10px] font-['DM_Sans'] mt-0.5 font-medium">Profile</span>
        </a>
      `;
      document.body.appendChild(bottomNav);

      // Add bottom padding to body on mobile
      const addBottomPadding = () => {
        if (window.innerWidth < 1024) {
          document.body.style.paddingBottom = '72px';
        } else {
          document.body.style.paddingBottom = '';
        }
      };
      addBottomPadding();
      window.addEventListener('resize', addBottomPadding);

      // Highlight active tab
      let activeTab = '';
      if (path.endsWith('/home.html') || path === '/buyer/' || path === '/buyer') {
        activeTab = 'home';
      } else if (path.endsWith('/categories.html') || path.endsWith('/category.html') || path.endsWith('/search.html')) {
        activeTab = 'category';
      } else if (path.endsWith('/reels.html') || path.endsWith('/saved-reels.html')) {
        activeTab = 'reels';
      } else if (
        path.endsWith('/profile.html') || 
        path.endsWith('/edit-profile.html') || 
        path.endsWith('/addresses.html') || 
        path.endsWith('/orders.html') || 
        path.endsWith('/become-seller.html')
      ) {
        activeTab = 'profile';
      }

      if (activeTab) {
        const btn = document.getElementById(`bottom-nav-btn-${activeTab}`);
        const line = document.getElementById(`bottom-nav-line-${activeTab}`);
        if (btn) {
          btn.classList.remove('text-[#6E6453]');
          btn.classList.add('text-[#3D6B4F]');
        }
        if (line) {
          line.classList.remove('hidden');
        }
      }
    }
  }
})();


