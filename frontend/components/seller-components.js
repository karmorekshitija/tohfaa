// Tohfa Seller Studio Unified Components

// Inject design system tokens (font family, colors) programmatically
(function injectGlobalStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Global layout design overrides */
    body, html {
      background-color: var(--bg-primary) !important;
      font-family: 'DM Sans', sans-serif !important;
      color: var(--text-default) !important;
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
      background: var(--surface);
      border-radius: 10px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: var(--secondary-sage);
    }

    /* Component specific classes */
    .sidebar-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 10px;
      padding-bottom: 10px;
      color: var(--text-muted);
      font-weight: 500;
      transition: background-color 0.2s ease, color 0.2s ease;
    }
    .sidebar-link:hover {
      background-color: rgba(143, 175, 130, 0.15) !important;
      color: var(--text-default) !important;
    }
    .sidebar-link-active {
      background-color: var(--primary-forest) !important;
      color: var(--bg-primary) !important;
      font-weight: 700 !important;
    }
    .sidebar-link-active span {
      color: var(--bg-primary) !important;
    }

    /* CSS layout overrides to prevent vertical white spaces and horizontal offsets */
    seller-layout {
      display: block !important;
      width: 100% !important;
      min-height: 100vh !important;
      background-color: var(--bg-primary) !important;
    }

    .seller-layout-container {
      display: flex !important;
      min-height: 100vh !important;
      width: 100% !important;
      background-color: var(--bg-primary) !important;
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
      background-color: var(--bg-primary) !important;
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
      background-color: var(--bg-primary) !important;
      border-bottom: 1px solid var(--secondary-sage) !important;
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
        padding: 80px 16px 16px 16px !important;
        height: auto !important;
        max-height: none !important;
        overflow-y: visible !important;
      }

      .seller-topbar-header {
        left: 0 !important;
        padding-left: 16px !important;
        padding-right: 16px !important;
      }
    }

    /* Uniform Form Styling for Seller Panel */
    input[type="text"], input[type="number"], input[type="email"], input[type="password"], input[type="url"], input[type="tel"], input[type="date"], input[type="time"], input[type="datetime-local"], select, textarea {
      height: 48px !important; /* Standardized min 48px tap target height */
      padding: 10px 16px !important;
      font-family: 'DM Sans', sans-serif !important;
      font-size: 14px !important;
      border: 1px solid var(--secondary-sage) !important;
      border-radius: 8px !important;
      background-color: var(--bg-primary) !important;
      color: var(--text-default) !important;
      box-sizing: border-box !important;
      transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
      width: 100% !important;
    }
    textarea {
      height: auto !important;
      min-height: 100px !important;
    }
    input[type="text"]:focus, input[type="number"]:focus, input[type="email"]:focus, input[type="password"]:focus, input[type="url"]:focus, input[type="tel"]:focus, input[type="date"]:focus, input[type="time"]:focus, input[type="datetime-local"]:focus, select:focus, textarea:focus {
      outline: none !important;
      border-color: var(--primary-forest) !important;
      box-shadow: 0 0 0 2px rgba(61,107,79,0.1) !important;
    }
    
    /* Style form labels */
    label, .form-label {
      font-family: 'DM Sans', sans-serif !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      color: var(--primary-forest) !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
      margin-bottom: 6px !important;
      display: inline-block !important;
    }
    
    /* Standardize main CTA buttons inside forms */
    .form-btn, button[type="submit"], .btn-primary {
      min-height: 48px !important; /* Standardized min 48px tap target height */
      padding: 10px 24px !important;
      font-family: 'DM Sans', sans-serif !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
      background-color: var(--primary-forest) !important;
      color: var(--bg-primary) !important;
      border: none !important;
      border-radius: 8px !important;
      cursor: pointer !important;
      transition: background-color 0.2s ease, transform 0.1s ease !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    .form-btn:hover, button[type="submit"]:hover, .btn-primary:hover {
      background-color: var(--primary-deep) !important;
    }
    .form-btn:active, button[type="submit"]:active, .btn-primary:active {
      transform: scale(0.98) !important;
    }
  `;
  document.head.appendChild(style);
})();

class SellerSidebar extends HTMLElement {
  connectedCallback() {
    const activeTab = this.getAttribute('active-tab') || '';
    
    this.innerHTML = `
      <aside class="w-[130px] h-screen fixed left-0 top-0 bg-[#F7F3EC] border-r border-[#E8E2D9] shadow-sm flex flex-col py-8 z-50 overflow-y-auto custom-scrollbar font-['DM_Sans'] text-[#6B6B6B]">
        <!-- Brand Logo Header -->
        <div class="px-4 mb-8 flex flex-col items-center">
          <img alt="TOFA Logo" class="w-12 h-12 mb-3 rounded-full border border-[#E8E2D9]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDKjQjmSoJKqFl-kRbAH85_u94nMS-Ok8oPnG2PAsYIPao9rA7dhGe8UxdJrc2ZZAzrwZNabbn59QVEgS7BBnW9tgfg43AOgPPepQuKoNu9Y8LnAgELFnunu7fN4ziKFD3utWMnD1wUchu7IL5DN5S8YIbb4t6eImmC8IYIbyaXgktzANbK3Bp9S-uJUoxNyfKN0-3CdY6CCeB0ICMb4og8ToBCMSoIyIF4u5UejdhA3mwODAny-lA6K9JdMJHT5Qhp3buD-BTaEM0">
          <h1 class="font-['Playfair_Display'] font-bold text-[14px] text-center leading-tight text-[#1A1A1A]">Tohfa Studio</h1>
        </div>
        
        <!-- Navigation Links (Inventory removed completely) -->
        <nav class="flex-1 space-y-1">
          <!-- Home (Dashboard) -->
          <a class="sidebar-link \${activeTab === 'home' ? 'sidebar-link-active' : ''}" href="/seller/dashboard.html" id="sidebar-home" title="Home">
            <span class="material-symbols-outlined mb-1 text-2xl">home</span>
            <span class="text-[9px] uppercase tracking-widest text-center">Home</span>
          </a>
          <!-- Catalog -->
          <a class="sidebar-link \${activeTab === 'catalog' ? 'sidebar-link-active' : ''}" href="/seller/catalog.html" id="sidebar-catalog" title="Catalog">
            <span class="material-symbols-outlined mb-1 text-2xl">library_books</span>
            <span class="text-[9px] uppercase tracking-widest text-center">Catalog</span>
          </a>
          <!-- Orders -->
          <a class="sidebar-link \${activeTab === 'orders' ? 'sidebar-link-active' : ''}" href="/seller/orders.html" id="sidebar-orders" title="Orders">
            <span class="material-symbols-outlined mb-1 text-2xl">shopping_basket</span>
            <span class="text-[9px] uppercase tracking-widest text-center">Orders</span>
          </a>

          <!-- Overflow -->
          <a class="sidebar-link \${activeTab === 'overflow' ? 'sidebar-link-active' : ''} relative" href="/seller/overflow-requests.html" id="sidebar-overflow" title="Overflow Requests">
            <span class="material-symbols-outlined mb-1 text-2xl">event_busy</span>
            <span class="text-[9px] uppercase tracking-widest text-center">Overflow</span>
            <span id="sidebar-overflow-badge" class="hidden absolute top-1 right-3 bg-[#3D6B4F] text-white font-bold text-[8px] w-4 h-4 rounded-full flex items-center justify-center border border-white">0</span>
          </a>
          <!-- Payments (Payouts) -->
          <a class="sidebar-link \${activeTab === 'payments' ? 'sidebar-link-active' : ''}" href="/seller/payouts.html" id="sidebar-payments" title="Payments">
            <span class="material-symbols-outlined mb-1 text-2xl">payments</span>
            <span class="text-[9px] uppercase tracking-widest text-center">Payments</span>
          </a>
          <!-- Analytics -->
          <a class="sidebar-link \${activeTab === 'analytics' ? 'sidebar-link-active' : ''}" href="/seller/analytics.html" id="sidebar-analytics" title="Analytics">
            <span class="material-symbols-outlined mb-1 text-2xl">insights</span>
            <span class="text-[9px] uppercase tracking-widest text-center">Analytics</span>
          </a>
          <!-- Messages -->
          <a class="sidebar-link \${activeTab === 'messages' ? 'sidebar-link-active' : ''}" href="/seller/messages.html" id="sidebar-messages" title="Messages">
            <span class="material-symbols-outlined mb-1 text-2xl">chat_bubble</span>
            <span class="text-[9px] uppercase tracking-widest text-center">Messages</span>
          </a>
          <!-- Reviews -->
          <a class="sidebar-link \${activeTab === 'reviews' ? 'sidebar-link-active' : ''}" href="/seller/reviews.html" id="sidebar-reviews" title="Reviews">
            <span class="material-symbols-outlined mb-1 text-2xl">reviews</span>
            <span class="text-[9px] uppercase tracking-widest text-center">Reviews</span>
          </a>
          <!-- Reels -->
          <a class="sidebar-link \${activeTab === 'reels' ? 'sidebar-link-active' : ''}" href="/seller/upload-reel.html" id="sidebar-reels" title="Reels">
            <span class="material-symbols-outlined mb-1 text-2xl">movie</span>
            <span class="text-[9px] uppercase tracking-widest text-center">Reels</span>
          </a>
          <!-- Profile -->
          <a class="sidebar-link \${activeTab === 'profile' ? 'sidebar-link-active' : ''}" href="/seller/profile.html" id="sidebar-profile" title="Profile">
            <span class="material-symbols-outlined mb-1 text-2xl">account_circle</span>
            <span class="text-[9px] uppercase tracking-widest text-center">Profile</span>
          </a>
        </nav>
        
        <!-- Footer actions -->
        <div class="px-3 mt-auto pt-6 space-y-2 w-full">
          <button id="view-store-btn" class="w-full py-2 bg-[#C8973A] text-white rounded-lg font-['DM_Sans'] font-medium text-[10px] uppercase tracking-tight hover:opacity-90 transition-all shadow-sm">
            View Store
          </button>
          <button id="logout-btn" class="w-full py-2 bg-[#3D6B4F] text-white rounded-lg font-['DM_Sans'] font-medium text-[10px] uppercase tracking-tight hover:opacity-90 transition-all shadow-sm">
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
                    // Display a user-friendly error message (e.g., using a toast notification)
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
    this.innerHTML = `
      <header class="seller-topbar-header font-['DM_Sans']">
        <!-- Left Side: Tohfa branding -->
        <div class="flex items-center gap-3">
          <button id="seller-hamburger-btn" class="lg:hidden text-[#3D6B4F] flex items-center justify-center p-2 rounded-full hover:bg-[#8FAF82]/20 focus:outline-none border-none bg-transparent mr-1" style="cursor:pointer;">
            <span class="material-symbols-outlined text-[24px]">menu</span>
          </button>
          <a href="/seller/dashboard.html" class="flex items-center gap-2">
            <span class="font-['Playfair_Display'] text-[20px] font-bold italic text-[#3D6B4F]">Tohfa</span>
            <span class="font-['DM_Sans'] text-xs uppercase tracking-widest text-[#6B6B6B] border-l border-[#E8E2D9] pl-3 py-1">Seller Studio</span>
          </a>
        </div>
        
        <!-- Right Side: User Name + Avatar -->
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-3">
            <div class="text-right">
              <p class="text-xs font-bold text-[#1A1A1A] line-clamp-1" id="topbar-seller-name">Loading...</p>
              <p class="text-[9px] text-[#6B6B6B] uppercase tracking-wider">Artisan Partner</p>
            </div>
            <div class="w-9 h-9 rounded-full overflow-hidden border border-[#E8E2D9] flex-shrink-0 bg-gray-50" style="display: none !important;">
              <img id="sidebar-avatar" class="w-full h-full object-cover" src="https://ui-avatars.com/api/?name=Seller" alt="Avatar"/>
            </div>
          </div>
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
