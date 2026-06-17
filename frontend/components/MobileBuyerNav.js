// Reusable Mobile Buyer Bottom Navigation Bar Component
export function initMobileBuyerNav(activePage = '') {
  // Prevent double rendering
  if (document.getElementById('mbn-bottomnav')) {
    return;
  }

  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    #mbn-bottomnav {
      display: none !important;
    }
    @media (max-width: 768px) {
      #mbn-bottomnav {
        display: flex !important;
        position: fixed;
        bottom: 0; left: 0; right: 0;
        height: 60px;
        background-color: #ffffff !important;
        background: #ffffff !important;
        border-top: 0.5px solid rgba(0, 0, 0, 0.1) !important;
        opacity: 1 !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        z-index: 200;
        align-items: stretch;
      }
      body {
        padding-bottom: 60px !important;
      }
      .mbn-tab {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        color: var(--text-muted);
        gap: 2px;
        position: relative;
        transition: all 0.2s ease;
        min-height: 60px;
      }
      .mbn-tab:hover { color: var(--primary-forest); }
      .mbn-tab.active { color: var(--primary-forest); font-weight: bold; }
      .mbn-tab.active::before {
        content: '';
        position: absolute;
        top: 0; left: 50%;
        transform: translateX(-50%);
        width: 24px;
        height: 2px;
        background: var(--primary-forest);
        border-radius: 0 0 2px 2px;
      }
      .mbn-tab .mbn-icon {
        font-size: 24px;
        line-height: 1;
      }
      .mbn-tab .mbn-label {
        font-family: 'DM Sans', sans-serif;
        font-size: 11px;
        line-height: 1;
      }
    }
  `;
  document.head.appendChild(style);

  // Append bottom nav to body
  const bottomNav = document.createElement('nav');
  bottomNav.id = 'mbn-bottomnav';
  bottomNav.setAttribute('aria-label', 'Mobile navigation');
  bottomNav.innerHTML = `
    <a href="/buyer/home.html" 
       class="mbn-tab ${activePage === 'home' ? 'active' : ''}" 
       aria-label="Home">
      <span class="mbn-icon material-symbols-outlined">home</span>
      <span class="mbn-label">Home</span>
    </a>
    <a href="/buyer/categories.html" 
       class="mbn-tab ${activePage === 'category' ? 'active' : ''}" 
       aria-label="Category">
      <span class="mbn-icon material-symbols-outlined">category</span>
      <span class="mbn-label">Category</span>
    </a>
    <a href="/buyer/reels.html" 
       class="mbn-tab ${activePage === 'reels' ? 'active' : ''}" 
       aria-label="Reels">
      <span class="mbn-icon material-symbols-outlined">smart_display</span>
      <span class="mbn-label">Reels</span>
    </a>
    <a href="/buyer/profile.html" 
       class="mbn-tab ${activePage === 'profile' ? 'active' : ''}" 
       aria-label="Profile">
      <span class="mbn-icon material-symbols-outlined">person</span>
      <span class="mbn-label">Profile</span>
    </a>
  `;
  document.body.appendChild(bottomNav);
}
