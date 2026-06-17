// Reusable Mobile Seller Navigation Component
export function initMobileSellerNav(activeTab = '') {
  // Prevent double rendering
  if (document.getElementById('msn-topbar')) {
    return;
  }

  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    #msn-topbar {
      display: none !important;
    }
    @media (max-width: 768px) {
      #msn-topbar {
        display: flex !important;
        position: fixed;
        top: 0; left: 0; right: 0;
        height: 56px;
        background-color: #ffffff !important;
        background: #ffffff !important;
        border-bottom: 1px solid var(--secondary-sage);
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
        z-index: 200;
        font-family: 'DM Sans', sans-serif;
      }
      body {
        padding-top: 56px !important;
      }
      #msn-topbar .msn-logo {
        font-family: 'Playfair Display', serif;
        font-style: italic;
        font-size: 22px;
        font-weight: 700;
        color: var(--primary-forest);
        text-decoration: none;
      }
      #msn-topbar .msn-logo span { color: var(--highlight-gold); }
      #msn-hamburger-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--primary-forest);
        display: flex;
        align-items: center;
        min-width: 44px;
        min-height: 44px;
        justify-content: center;
      }
      #msn-drawer {
        position: fixed;
        top: 0; left: 0;
        width: 280px;
        height: 100vh;
        background-color: #ffffff !important;
        background: #ffffff !important;
        border-right: 1px solid var(--secondary-sage);
        box-shadow: 10px 0 30px rgba(0,0,0,0.15);
        transform: translateX(-100%);
        transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
        z-index: 201;
        display: flex;
        flex-direction: column;
      }
      #msn-drawer.open { transform: translateX(0); }
      #msn-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.4);
        z-index: 200;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      #msn-backdrop.open { opacity: 1; pointer-events: auto; }
      .msn-drawer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid var(--secondary-sage);
        flex-shrink: 0;
      }
      .msn-close-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--primary-forest);
        font-size: 20px;
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .msn-nav-list {
        flex: 1;
        padding: 8px 0;
        overflow-y: auto;
      }
      .msn-nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 20px;
        min-height: 48px;
        text-decoration: none;
        font-family: 'DM Sans', sans-serif;
        font-size: 14px;
        color: var(--text-default);
        transition: background 0.15s ease, color 0.15s ease;
        position: relative;
      }
      .msn-nav-item:hover { background: rgba(143,175,130,0.15); }
      .msn-nav-item.active {
        background: var(--primary-forest);
        color: var(--bg-primary);
        font-weight: 600;
      }
      .msn-nav-item.active .material-symbols-outlined { color: var(--bg-primary); }
      .msn-drawer-footer {
        padding: 16px;
        border-top: 1px solid var(--secondary-sage);
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex-shrink: 0;
      }
      .msn-btn {
        width: 100%;
        min-height: 44px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-family: 'DM Sans', sans-serif;
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        transition: opacity 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .msn-btn:hover { opacity: 0.88; }
      .msn-btn-store { background: var(--highlight-gold); color: var(--bg-primary); }
      .msn-btn-logout { background: var(--primary-forest); color: var(--bg-primary); }
      
      /* Hide regular sidebar on mobile */
      seller-sidebar, aside.w-64, aside.w-\\[130px\\] {
        display: none !important;
      }
      
      /* Adjust main panel padding for topbar */
      .seller-main-panel, main.ml-64, main {
        margin-left: 0 !important;
        padding-top: 72px !important;
        padding-left: 16px !important;
        padding-right: 16px !important;
      }
      
      /* Hide existing desktop/tablet topbars on mobile */
      seller-topbar, header.seller-topbar-header, header.fixed.top-0 {
        display: none !important;
      }
    }
  `;
  document.head.appendChild(style);

  // Prepend topbar
  const topbar = document.createElement('div');
  topbar.id = 'msn-topbar';
  topbar.innerHTML = `
    <a href="/seller/dashboard.html" class="msn-logo">Tohfa<span>.</span></a>
    <button id="msn-hamburger-btn" aria-label="Open menu">
      <span class="material-symbols-outlined" style="font-size:24px">menu</span>
    </button>
  `;
  document.body.prepend(topbar);

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'msn-backdrop';
  document.body.appendChild(backdrop);

  // Nav Items
  const navItems = [
    { key: 'home', label: 'Home', icon: 'home', href: '/seller/dashboard.html' },
    { key: 'catalog', label: 'Catalog', icon: 'library_books', href: '/seller/catalog.html' },
    { key: 'orders', label: 'Orders', icon: 'shopping_basket', href: '/seller/orders.html' },
    { key: 'overflow', label: 'Overflow', icon: 'event_busy', href: '/seller/overflow-requests.html', badge: true },
    { key: 'payments', label: 'Payments', icon: 'payments', href: '/seller/payouts.html' },
    { key: 'pay-hist', label: 'Payment History', icon: 'receipt_long', href: '/seller/payment-history.html' },
    { key: 'all-pay', label: 'All Payments', icon: 'account_balance_wallet', href: '/seller/all-payments.html' },
    { key: 'all-trans', label: 'All Transactions', icon: 'swap_horiz', href: '/seller/all-transactions.html' },
    { key: 'disputes', label: 'All Disputes', icon: 'gavel', href: '/seller/all-disputes.html' },
    { key: 'analytics', label: 'Analytics', icon: 'insights', href: '/seller/analytics.html' },
    { key: 'messages', label: 'Messages', icon: 'chat_bubble', href: '/seller/messages.html' },
    { key: 'reviews', label: 'Reviews', icon: 'reviews', href: '/seller/reviews.html' },
    { key: 'reels', label: 'Reels', icon: 'movie', href: '/seller/upload-reel.html' },
    { key: 'planner', label: 'Planner', icon: 'event_note', href: '/seller/production-planner.html' },
    { key: 'profile', label: 'Profile', icon: 'account_circle', href: '/seller/profile.html' },
    { key: 'store', label: 'Store Config', icon: 'storefront', href: '/seller/store-config.html' },
    { key: 'settings', label: 'Profile Settings', icon: 'settings', href: '/seller/profile-settings.html' }
  ];

  // Drawer
  const drawer = document.createElement('div');
  drawer.id = 'msn-drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-label', 'Seller navigation');

  let navLinksHTML = '';
  navItems.forEach(item => {
    const isActive = item.key === activeTab;
    navLinksHTML += `
      <a class="msn-nav-item ${isActive ? 'active' : ''}" href="${item.href}">
        <span class="material-symbols-outlined">${item.icon}</span>
        <span>${item.label}</span>
        ${item.badge ? `<span id="msn-badge-${item.key}" class="hidden absolute right-4 bg-[#C8973A] text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-white">0</span>` : ''}
      </a>
    `;
  });

  drawer.innerHTML = `
    <div class="msn-drawer-header">
      <span style="font-family:'Playfair Display',serif;font-weight:700;color:#3D6B4F;font-size:18px">
        Seller Studio
      </span>
      <button class="msn-close-btn" id="msn-close-btn" aria-label="Close menu">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
    <nav class="msn-nav-list">
      ${navLinksHTML}
    </nav>
    <div class="msn-drawer-footer">
      <button class="msn-btn msn-btn-store" id="msn-view-store-btn">View Store</button>
      <button class="msn-btn msn-btn-logout" id="msn-logout-btn">Logout</button>
    </div>
  `;
  document.body.appendChild(drawer);

  // Toggle events
  const hamburger = document.getElementById('msn-hamburger-btn');
  const closeBtn = document.getElementById('msn-close-btn');

  const openDrawer = () => {
    drawer.classList.add('open');
    backdrop.classList.add('open');
  };

  const closeDrawer = () => {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
  };

  hamburger.addEventListener('click', openDrawer);
  closeBtn.addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);

  // View Store action
  const viewStoreBtn = document.getElementById('msn-view-store-btn');
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

  // Logout action
  const logoutBtn = document.getElementById('msn-logout-btn');
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

  // Fetch overflow badge count if present
  const token = sessionStorage.getItem('tohfa_access_token') || sessionStorage.getItem('access_token');
  if (token) {
    fetch('/api/seller/overflow-requests', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.ok ? res.json() : null)
    .then(resp => {
      if (resp && resp.data) {
        const requests = resp.data || [];
        const pendingCount = requests.filter(r => r.status === 'pending').length;
        const badge = document.getElementById('msn-badge-overflow');
        if (badge && pendingCount > 0) {
          badge.textContent = pendingCount;
          badge.classList.remove('hidden');
        }
      }
    })
    .catch(err => console.error('Error fetching overflow count for mobile nav:', err));
  }
}
