// Tohfa Seller Studio Unified Components

// Inject design system tokens (font family, colors) programmatically
(function injectGlobalStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Global layout design overrides */
    body, html {
      background-color: #FFFFFF !important;
      font-family: 'DM Sans', sans-serif !important;
      color: #1A1A1A !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    /* Ensure heading typography consistency */
    h1, h2, h3, h4, h5, h6, .font-headline, .font-headline-lg, .font-headline-md, .font-headline-sm {
      font-family: 'Playfair Display', serif !important;
    }

    /* Scrollbar customization */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: #F7F3EC;
      border-radius: 10px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #8FAF82;
    }

    /* Component specific classes */
    .sidebar-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 10px;
      padding-bottom: 10px;
      color: #3D6B4F !important;
      opacity: 0.7;
      font-weight: 500;
      transition: all 0.2s ease;
      outline: none;
    }
    .sidebar-link:hover {
      background-color: rgba(143, 175, 130, 0.15) !important;
      color: #3D6B4F !important;
      opacity: 1 !important;
    }
    .sidebar-link:focus {
      background-color: rgba(143, 175, 130, 0.25) !important;
      box-shadow: 0 0 0 2px #8FAF82 !important;
      opacity: 1 !important;
    }
    .sidebar-link:active {
      transform: scale(0.95) !important;
    }
    .sidebar-link-active {
      background-color: #3D6B4F !important;
      color: #FFFFFF !important;
      font-weight: 700 !important;
      opacity: 1 !important;
    }
    .sidebar-link-active span {
      color: #FFFFFF !important;
    }

    /* CSS layout overrides to prevent vertical white spaces and horizontal offsets */
    seller-layout {
      display: block !important;
      width: 100% !important;
      min-height: 100vh !important;
      background-color: #FFFFFF !important;
    }

    .seller-layout-container {
      display: flex !important;
      min-height: 100vh !important;
      width: 100% !important;
      background-color: #FFFFFF !important;
    }

    seller-sidebar {
      display: block !important;
      width: 130px !important;
      flex-shrink: 0 !important;
      z-index: 50 !important;
      transition: transform 0.3s ease-in-out !important;
    }

    .seller-main-panel {
      flex: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      min-width: 0 !important;
      margin-left: 130px !important;
      position: relative !important;
      background-color: #FFFFFF !important;
      padding: 32px 64px 64px 64px !important;
      height: 100vh !important;
      max-height: 100vh !important;
      overflow-y: auto !important;
    }

    seller-topbar {
      display: block !important;
      height: 64px !important;
      width: 100% !important;
      flex-shrink: 0 !important;
      z-index: 40 !important;
    }

    .seller-topbar-header {
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      left: 130px !important;
      height: 64px !important;
      background-color: #FFFFFF !important;
      border-bottom: 1px solid #E8E2D9 !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding-left: 64px !important;
      padding-right: 64px !important;
      z-index: 40 !important;
    }

    @media (max-width: 1023px) {
      seller-sidebar {
        position: fixed !important;
        left: 0 !important;
        top: 0 !important;
        height: 100vh !important;
        transform: translateX(-100%) !important;
      }
      
      seller-sidebar.active {
        transform: translateX(0) !important;
      }

      .seller-main-panel {
        margin-left: 0 !important;
        padding: 68px 16px 16px 16px !important;
        height: auto !important;
        max-height: none !important;
        overflow-y: visible !important;
      }

      .seller-topbar-header {
        left: 0 !important;
        padding-left: 16px !important;
        padding-right: 16px !important;
      }

      seller-topbar {
        height: 0 !important;
        overflow: hidden !important;
      }
    }
  `;
  document.head.appendChild(style);
})();

class SellerSidebar extends HTMLElement {
  connectedCallback() {
    const activeTab = this.getAttribute('active-tab') || '';
    const isMobilePath = window.location.pathname.includes('/mobile-seller/');
    const prefix = isMobilePath ? '/mobile-seller' : '/seller';
    
    this.innerHTML = `
      <aside class="w-[130px] h-screen fixed left-0 top-0 bg-[#F7F3EC] border-r border-[#8FAF82] shadow-sm flex flex-col py-8 z-50 overflow-y-auto custom-scrollbar font-['DM_Sans'] text-[#3D6B4F]">
        <!-- Brand Logo Header -->
        <div class="px-4 mb-8 flex flex-col items-center">
          <img loading="lazy" alt="TOFA Logo" class="w-12 h-12 mb-3 rounded-full border border-[#8FAF82]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDKjQjmSoJKqFl-kRbAH85_u94nMS-Ok8oPnG2PAsYIPao9rA7dhGe8UxdJrc2ZZAzrwZNabbn59QVEgS7BBnW9tgfg43AOgPPepQuKoNu9Y8LnAgELFnunu7fN4ziKFD3utWMnD1wUchu7IL5DN5S8YIbb4t6eImmC8IYIbyaXgktzANbK3Bp9S-uJUoxNyfKN0-3CdY6CCeB0ICMb4og8ToBCMSoIyIF4u5UejdhA3mwODAny-lA6K9JdMJHT5Qhp3buD-BTaEM0">
          <h1 class="font-['Playfair_Display'] font-bold text-[14px] text-center leading-tight text-[#3D6B4F] italic">Tohfa Studio</h1>
        </div>
        
        <!-- Navigation Links (Inventory and Reels removed completely) -->
        <nav class="flex-1 space-y-1">
          <!-- Dashboard -->
          <a class="sidebar-link ${activeTab === 'home' || activeTab === 'dashboard' ? 'sidebar-link-active' : ''}" href="${prefix}/dashboard.html" id="sidebar-home" title="Dashboard">
            <span class="material-symbols-outlined mb-1 text-2xl">home</span>
            <span class="text-[9px] uppercase tracking-widest text-center">Dashboard</span>
          </a>
          <!-- Catalog -->
          <a class="sidebar-link ${activeTab === 'catalog' ? 'sidebar-link-active' : ''}" href="${prefix}/catalog.html" id="sidebar-catalog" title="Catalog">
            <span class="material-symbols-outlined mb-1 text-2xl">library_books</span>
            <span class="text-[9px] uppercase tracking-widest text-center">Catalog</span>
          </a>

          <!-- Orders -->
          <a class="sidebar-link ${activeTab === 'orders' ? 'sidebar-link-active' : ''}" href="${prefix}/orders.html" id="sidebar-orders" title="Orders">
            <span class="material-symbols-outlined mb-1 text-2xl">shopping_basket</span>
            <span class="text-[9px] uppercase tracking-widest text-center">Orders</span>
          </a>
          <!-- Overflow -->
          <a class="sidebar-link ${activeTab === 'overflow' ? 'sidebar-link-active' : ''} relative" href="${prefix}/overflow-requests.html" id="sidebar-overflow" title="Overflow Requests">
            <span class="material-symbols-outlined mb-1 text-2xl">event_busy</span>
            <span class="text-[9px] uppercase tracking-widest text-center">Overflow</span>
            <span id="sidebar-overflow-badge" class="hidden absolute top-1 right-3 bg-[#3D6B4F] text-white font-bold text-[8px] w-4 h-4 rounded-full flex items-center justify-center border border-white">0</span>
          </a>
          <!-- Payments -->
          <a class="sidebar-link ${activeTab === 'payments' ? 'sidebar-link-active' : ''}" href="${prefix}/payouts.html" id="sidebar-payments" title="Payments">
            <span class="material-symbols-outlined mb-1 text-2xl">payments</span>
            <span class="text-[9px] uppercase tracking-widest text-center">Payments</span>
          </a>
          <!-- Analytics -->
          <a class="sidebar-link ${activeTab === 'analytics' ? 'sidebar-link-active' : ''}" href="${prefix}/analytics.html" id="sidebar-analytics" title="Analytics">
            <span class="material-symbols-outlined mb-1 text-2xl">insights</span>
            <span class="text-[9px] uppercase tracking-widest text-center">Analytics</span>
          </a>
          <!-- Messages -->
          <a class="sidebar-link ${activeTab === 'messages' ? 'sidebar-link-active' : ''}" href="${prefix}/messages.html" id="sidebar-messages" title="Messages">
            <span class="material-symbols-outlined mb-1 text-2xl">chat_bubble</span>
            <span class="text-[9px] uppercase tracking-widest text-center">Messages</span>
          </a>
          <!-- Reviews -->
          <a class="sidebar-link ${activeTab === 'reviews' ? 'sidebar-link-active' : ''}" href="${prefix}/reviews.html" id="sidebar-reviews" title="Reviews">
            <span class="material-symbols-outlined mb-1 text-2xl">reviews</span>
            <span class="text-[9px] uppercase tracking-widest text-center">Reviews</span>
          </a>
          <!-- Profile and settings -->
          <a class="sidebar-link ${activeTab === 'profile' || activeTab === 'settings' ? 'sidebar-link-active' : ''}" href="${prefix}/profile-settings.html" id="sidebar-profile" title="Profile and settings">
            <span class="material-symbols-outlined mb-1 text-2xl">account_circle</span>
            <span class="text-[9px] uppercase tracking-widest text-center">Profile and settings</span>
          </a>
        </nav>
        
        <!-- Footer actions -->
        <div class="px-3 mt-auto pt-6 space-y-2 w-full">
          <button id="view-store-btn" class="w-full py-2 bg-[#C8973A] text-white rounded-lg font-['DM_Sans'] font-medium text-[10px] uppercase tracking-tight hover:opacity-90 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#8FAF82] transition-all shadow-sm">
            View Store
          </button>
          <button id="logout-btn" class="w-full py-2 bg-[#3D6B4F] text-white rounded-lg font-['DM_Sans'] font-medium text-[10px] uppercase tracking-tight hover:opacity-90 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#8FAF82] transition-all shadow-sm">
            Logout
          </button>
        </div>
      </aside>
    `;

    // Hook up view store action
    const viewStoreBtn = this.querySelector('#view-store-btn');
    if (viewStoreBtn) {
      viewStoreBtn.addEventListener('click', () => {
        const token = sessionStorage.getItem('tohfa_access_token') || sessionStorage.getItem('access_token');
        fetch(`/api/seller/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
          const profileData = data.data || data;
          if (profileData && (profileData.user_id || profileData.seller_id || profileData.id)) {
            window.location.href = `/buyer/seller-profile.html?id=${profileData.user_id || profileData.seller_id || profileData.id}`;
          } else {
            window.location.href = '/';
          }
        })
        .catch(err => {
          console.error('Error viewing store:', err);
          alert('Could not load store profile. Please try again later.');
        });
      });
    }

    // Hook up logout action
    const logoutBtn = this.querySelector('#logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        const token = sessionStorage.getItem('tohfa_access_token') || sessionStorage.getItem('access_token');
        const refresh = sessionStorage.getItem('tohfa_refresh_token') || sessionStorage.getItem('refresh_token');
        if (token && refresh) {
          fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ refresh_token: refresh })
          }).catch(() => {});
        }
        sessionStorage.clear();
        window.location.href = '/auth/login.html';
      });
    }

    // Fetch and render pending overflow requests count for sidebar badge
    const token = sessionStorage.getItem('tohfa_access_token') || sessionStorage.getItem('access_token');
    if (token) {
      fetch('/api/seller/overflow-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(resp => {
        if (resp && resp.data) {
          const requests = resp.data || [];
          const pendingCount = requests.filter(r => r.status === 'pending').length;
          const badge = this.querySelector('#sidebar-overflow-badge');
          if (badge && pendingCount > 0) {
            badge.textContent = pendingCount;
            badge.classList.remove('hidden');
          }
        }
      })
      .catch(err => {
        console.error('Error fetching overflow requests count for sidebar:', err);
      });
    }
  }
}


class SellerTopBar extends HTMLElement {
  connectedCallback() {
    const isMobilePath = window.location.pathname.includes('/mobile-seller/');
    const prefix = isMobilePath ? '/mobile-seller' : '/seller';

    this.innerHTML = `
      <header class="seller-topbar-header font-['DM_Sans'] flex items-center justify-between">
        <!-- Left Side: Tohfa branding -->
        <div class="flex items-center gap-3">
          <a href="${prefix}/dashboard.html" class="flex items-center gap-2">
            <span class="font-['Playfair_Display'] text-[20px] font-bold italic text-[#3D6B4F]">Tohfa</span>
            <span class="font-['DM_Sans'] text-xs uppercase tracking-widest text-[#6B6B6B] border-l border-[#E8E2D9] pl-3 py-1 hidden lg:inline-block">Seller Studio</span>
          </a>
        </div>
        
        <!-- Right Side: User Name + Avatar (Desktop only) and Hamburger Button (Mobile only) -->
        <div class="flex items-center gap-6">
          <!-- Desktop User Info: hidden on mobile (< 1024px) -->
          <div class="hidden lg:flex items-center gap-3">
            <div class="text-right">
              <p class="text-xs font-bold text-[#1A1A1A] line-clamp-1" id="topbar-seller-name">Loading...</p>
              <p class="text-[9px] text-[#6B6B6B] uppercase tracking-wider">Artisan Partner</p>
            </div>
            <div class="w-9 h-9 rounded-full overflow-hidden border border-[#E8E2D9] flex-shrink-0 bg-gray-50">
              <img loading="lazy" id="sidebar-avatar" class="w-full h-full object-cover" src="https://ui-avatars.com/api/?name=Seller" alt="Avatar"/>
            </div>
          </div>
          <!-- Hamburger Button: visible only on mobile/tablet (< 1024px) -->
          <button id="seller-hamburger-btn" class="lg:hidden text-[#3D6B4F] flex items-center justify-center p-2 rounded-full hover:bg-[#8FAF82]/20 focus:outline-none border-none bg-transparent" style="cursor:pointer;">
            <span class="material-symbols-outlined text-[24px]">menu</span>
          </button>
        </div>
      </header>
    `;

    const token = sessionStorage.getItem('tohfa_access_token') || sessionStorage.getItem('access_token');
    
    // Fetch profile and update display name and avatar dynamically
    if (token) {
      fetch('/api/seller/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(resp => {
        const profile = resp.data || resp;
        if (profile) {
          const nameEl = this.querySelector('#topbar-seller-name');
          const avatarEl = this.querySelector('#sidebar-avatar');
          if (nameEl) nameEl.textContent = profile.display_name || 'Artisan';
          if (avatarEl && profile.avatar_url) avatarEl.src = profile.avatar_url;
        }
      })
      .catch(err => console.error("Error populating topbar profile details:", err));
    }

    // Hook up hamburger toggle listener for mobile sidebar drawer
    const hamburgerBtn = this.querySelector('#seller-hamburger-btn');
    if (hamburgerBtn) {
      hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sidebar = document.querySelector('seller-sidebar');
        if (sidebar) {
          sidebar.classList.toggle('active');
        }
      });
      
      document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('seller-sidebar');
        if (sidebar && sidebar.classList.contains('active') && !sidebar.contains(e.target) && !hamburgerBtn.contains(e.target)) {
          sidebar.classList.remove('active');
        }
      });
    }
  }
}


class SellerLayout extends HTMLElement {
  connectedCallback() {
    const activeTab = this.getAttribute('active-tab') || '';

    const render = () => {
      // 1. Capture all existing child nodes (using Array.from to make a static copy)
      const children = Array.from(this.childNodes);

      // 2. Create the wrapper container
      const container = document.createElement('div');
      container.className = "seller-layout-container font-body-md text-[#1A1A1A]";

      // 3. Create the sidebar
      const sidebar = document.createElement('seller-sidebar');
      sidebar.setAttribute('active-tab', activeTab);

      // 4. Create the main panel wrapper
      const mainPanel = document.createElement('div');
      mainPanel.className = "seller-main-panel";

      // 5. Create the top bar
      const topbar = document.createElement('seller-topbar');

      // 6. Move all original child nodes directly into the mainPanel container
      mainPanel.appendChild(topbar);
      children.forEach(child => {
        mainPanel.appendChild(child);
      });

      // 7. Assemble the tree
      container.appendChild(sidebar);
      container.appendChild(mainPanel);

      // 8. Clear this custom element and append the new wrapped DOM structure
      this.innerHTML = '';
      this.appendChild(container);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', render, { once: true });
    } else {
      render();
    }
  }
}

// Register Custom Elements
customElements.define('seller-sidebar', SellerSidebar);
customElements.define('seller-topbar', SellerTopBar);
customElements.define('seller-layout', SellerLayout);
