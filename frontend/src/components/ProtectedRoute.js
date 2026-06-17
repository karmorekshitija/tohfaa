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
    // 1. Setup Admin Sidebar Hamburger
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

    // 2. Inject Mobile Buyer Topbar and Bottom Nav dynamically for buyer pages
    if (path.includes('/buyer/') && window.innerWidth <= 768) {
      if (!document.getElementById('mbt-topbar')) {
        import('/components/MobileBuyerTopBar.js')
          .then(module => {
            module.initMobileBuyerTopBar();
          })
          .catch(err => console.error("Error loading MobileBuyerTopBar:", err));
      }
      if (!document.getElementById('mbn-bottomnav')) {
        import('/components/MobileBuyerNav.js')
          .then(module => {
            let activePage = '';
            if (path.endsWith('/home.html') || path === '/buyer/' || path === '/buyer') {
              activePage = 'home';
            } else if (path.endsWith('/categories.html') || path.endsWith('/category.html') || path.endsWith('/search.html')) {
              activePage = 'category';
            } else if (path.endsWith('/reels.html') || path.endsWith('/saved-reels.html')) {
              activePage = 'reels';
            } else if (
              path.endsWith('/profile.html') || 
              path.endsWith('/edit-profile.html') || 
              path.endsWith('/addresses.html') || 
              path.endsWith('/orders.html') || 
              path.endsWith('/become-seller.html')
            ) {
              activePage = 'profile';
            }
            module.initMobileBuyerNav(activePage);
          })
          .catch(err => console.error("Error loading MobileBuyerNav:", err));
      }
    }

    // 3. Inject Mascot FAB chatbot trigger globally for buyer pages (except chat.html itself)
    if (path.includes('/buyer/') && !path.endsWith('/chat.html') && !document.getElementById('tohfa-mascot-fab') && !window.__mascotFabInjected) {
      window.__mascotFabInjected = true;
      const mascotFab = document.createElement('div');
      mascotFab.id = 'tohfa-mascot-fab';
      mascotFab.className = 'mascot-fab';
      mascotFab.setAttribute('role', 'button');
      mascotFab.setAttribute('aria-label', 'Chat with Tohfa assistant');
      mascotFab.setAttribute('tabindex', '0');
      mascotFab.innerHTML = `
        <img src="/src/assets/images/mascot/tohfa-mascot.png" alt="Tohfa mascot" class="mascot-img" />
      `;

      // CSS styles for the Mascot FAB
      const style = document.createElement('style');
      style.textContent = `
        .mascot-fab {
          position: fixed;
          bottom: 80px;
          right: 16px;
          z-index: 1001;
          cursor: pointer;
          width: clamp(56px, 14vw, 80px);
          height: clamp(56px, 14vw, 80px);
          background: transparent !important;
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          overflow: visible !important;
          padding: 0;
          transition: transform 0.2s ease;
        }

        .mascot-fab:hover {
          transform: scale(1.08);
        }

        .mascot-fab:active {
          transform: scale(0.96);
        }

        .mascot-fab .mascot-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: bottom center;
          background: transparent !important;
          background-color: transparent !important;
          border-radius: 0 !important;
          mix-blend-mode: normal;
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
        }

        @media (min-width: 768px) {
          .mascot-fab {
            bottom: 32px;
            right: 32px;
            width: clamp(72px, 8vw, 100px);
            height: clamp(72px, 8vw, 100px);
          }
        }

        @media (min-width: 1200px) {
          .mascot-fab {
            bottom: 40px;
            right: 40px;
            width: clamp(88px, 6vw, 110px);
            height: clamp(88px, 6vw, 110px);
          }
        }
      `;
      document.head.appendChild(style);

      // openChatbot function redirects to the chatbot page
      window.openChatbot = function() {
        window.location.href = '/buyer/chat.html';
      };

      mascotFab.addEventListener('click', window.openChatbot);
      mascotFab.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          window.openChatbot();
        }
      });

      document.body.appendChild(mascotFab);
    }
  }
})();


