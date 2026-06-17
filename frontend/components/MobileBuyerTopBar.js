// Reusable Mobile Buyer Top Bar Component
export function initMobileBuyerTopBar() {
  // Prevent double rendering
  if (document.getElementById('mbt-topbar')) {
    return;
  }

  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    #mbt-topbar {
      display: none !important;
    }
    @media (max-width: 768px) {
      #mbt-topbar {
        display: flex !important;
        align-items: center;
        justify-content: space-between;
        position: fixed;
        top: 0; left: 0; right: 0;
        height: 56px;
        background: #F7F3EC !important;
        border-bottom: 1px solid var(--secondary-sage);
        z-index: 200;
        padding: 0 16px;
      }
      body {
        padding-top: 56px !important;
      }
      .mbt-logo {
        font-family: 'Playfair Display', serif;
        font-style: italic;
        font-size: 22px;
        font-weight: 700;
        color: var(--primary-forest);
        text-decoration: none;
        flex-shrink: 0;
      }
      .mbt-logo span { color: var(--highlight-gold); }
      
      .mbt-right-actions {
        display: flex;
        align-items: center;
        gap: 2px;
      }
      
      .mbt-icon-btn {
        background: none;
        border: none;
        color: var(--text-default);
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 40px;
        min-height: 44px;
        text-decoration: none;
        transition: all 0.2s ease;
        position: relative;
      }
      .mbt-icon-btn:hover { color: var(--primary-forest); }
      
      .mbt-badge {
        position: absolute;
        top: 4px; right: 2px;
        background: var(--highlight-gold);
        color: #FFFFFF;
        font-family: 'DM Sans', sans-serif;
        font-size: 9px;
        font-weight: 700;
        min-width: 14px;
        height: 14px;
        padding: 0 3px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
      }
      
      .mbt-badge-dot {
        position: absolute;
        top: 8px; right: 8px;
        background: var(--highlight-gold);
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
      
      .mbt-seller-pill {
        background: var(--primary-forest);
        color: #FFFFFF;
        font-family: 'DM Sans', sans-serif;
        font-size: 11px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 999px;
        text-decoration: none;
        white-space: nowrap;
        transition: opacity 0.2s ease;
        display: flex;
        align-items: center;
        gap: 4px;
        margin-left: 6px;
      }
      .mbt-seller-pill:hover { opacity: 0.85; }
      
      @media (max-width: 374px) {
        .mbt-seller-pill .pill-label { display: none; }
        .mbt-seller-pill .pill-icon { display: inline; }
      }
      @media (min-width: 375px) {
        .mbt-seller-pill .pill-icon { display: none; }
        .mbt-seller-pill .pill-label { display: inline; }
      }
    }
  `;
  document.head.appendChild(style);

  // Prepend topbar to body
  const topbar = document.createElement('div');
  topbar.id = 'mbt-topbar';
  topbar.innerHTML = `
    <a href="/buyer/home.html" class="mbt-logo">Tohfa<span>.</span></a>
    <div class="mbt-right-actions" id="mbt-actions">
      <a href="/buyer/search.html" class="mbt-icon-btn" aria-label="Search">
        <span class="material-symbols-outlined" style="font-size:22px">search</span>
      </a>
      <a href="/buyer/saved-makes.html" class="mbt-icon-btn" aria-label="Wishlist">
        <span class="material-symbols-outlined" style="font-size:22px">favorite_border</span>
        <span id="mbt-wishlist-badge" class="mbt-badge hidden">0</span>
      </a>
      <a href="/buyer/cart.html" class="mbt-icon-btn" aria-label="Cart">
        <span class="material-symbols-outlined" style="font-size:22px">shopping_cart</span>
        <span id="mbt-cart-badge" class="mbt-badge hidden">0</span>
      </a>
      <a href="/buyer/notifications.html" class="mbt-icon-btn" aria-label="Notifications">
        <span class="material-symbols-outlined" style="font-size:22px">notifications</span>
        <span id="mbt-notif-badge" class="mbt-badge-dot hidden"></span>
      </a>
    </div>
  `;
  document.body.prepend(topbar);

  // Check seller role in session
  try {
    const user = JSON.parse(sessionStorage.getItem('tohfa_user') || '{}');
    if (user && user.role === 'seller') {
      const actions = document.getElementById('mbt-actions');
      const pill = document.createElement('a');
      pill.href = '/seller/dashboard.html';
      pill.className = 'mbt-seller-pill';
      pill.innerHTML = `
        <span class="pill-icon material-symbols-outlined" style="font-size:18px">storefront</span>
        <span class="pill-label">↗ Seller</span>
      `;
      actions.appendChild(pill);
    }
  } catch (e) {
    console.error('Error parsing user role for buyer topbar:', e);
  }

  // Sync mobile badges with desktop/page badges dynamically
  const syncBadge = (sourceId, targetId, isDot = false) => {
    const sourceEl = document.getElementById(sourceId);
    const targetEl = document.getElementById(targetId);
    if (!sourceEl || !targetEl) return;

    const sync = () => {
      if (!isDot) {
        targetEl.textContent = sourceEl.textContent;
      }
      if (sourceEl.classList.contains('hidden') || sourceEl.style.display === 'none' || sourceEl.textContent.trim() === '0') {
        targetEl.classList.add('hidden');
      } else {
        targetEl.classList.remove('hidden');
      }
    };

    // Initial sync
    sync();

    // Observe changes to the source badge
    const observer = new MutationObserver(sync);
    observer.observe(sourceEl, { attributes: true, childList: true, characterData: true });
  };

  const setupSync = () => {
    syncBadge('nav-wishlist-badge', 'mbt-wishlist-badge');
    syncBadge('nav-cart-badge', 'mbt-cart-badge');
    syncBadge('nav-notif-badge', 'mbt-notif-badge', true);
    syncBadge('nav-notifications-badge', 'mbt-notif-badge', true);
  };

  // Run sync when DOM matches or when navbar loads
  if (document.getElementById('nav-cart-badge')) {
    setupSync();
  } else {
    document.addEventListener('tohfa-navbar-loaded', setupSync);
  }
}
