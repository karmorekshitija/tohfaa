// AdminSidebar.js — Shared Admin Sidebar component
(function() {
  function renderSidebar() {
    let aside = document.querySelector('aside');
    if (!aside) return;

    const path = window.location.pathname;

    const navItems = [
      { name: 'Dashboard', href: '/admin/dashboard.html', icon: 'grid_view' },
      { name: 'Sellers', href: '/admin/sellers.html', icon: 'group' },
      { name: 'Orders', href: '/admin/orders.html', icon: 'shopping_cart' },
      { name: 'Categories', href: '/admin/categories.html', icon: 'category' },
      { name: 'Products', href: '/admin/products.html', icon: 'inventory_2' },
      { name: 'UI Settings', href: '/admin/ui-settings.html', icon: 'settings_accessibility' },
      { name: 'Our Story', href: '/admin/our-story.html', icon: 'auto_stories' },
      { name: 'Reports', href: '/admin/reports.html', icon: 'flag' },
      { name: 'Audit Logs', href: '/admin/audit-logs.html', icon: 'history_edu' },
      { name: 'Payment Health', href: '/admin/payment-health.html', icon: 'health_and_safety' }
    ];

    let navHtml = '';
    for (const item of navItems) {
      const isActive = path === item.href || (item.href === '/admin/dashboard.html' && (path === '/admin/' || path === '/admin/index.html'));
      const activeClass = isActive 
        ? 'bg-[#3D6B4F] text-white' 
        : 'text-on-surface-variant hover:bg-surface-container-low transition-all duration-300';
      
      navHtml += `
        <a class="flex items-center gap-3 px-4 py-3 rounded-full ${activeClass}" href="${item.href}">
          <span class="material-symbols-outlined text-[20px]">${item.icon}</span>
          <span class="font-label-btn text-label-btn">${item.name}</span>
        </a>
      `;
    }

    aside.className = "flex flex-col h-screen fixed left-0 top-0 py-10 px-6 z-50 w-64 border-r border-outline-variant/30 bg-[#F7F3EC]";
    aside.innerHTML = `
      <div class="mb-14">
        <h1 class="font-headline-lg text-headline-lg italic text-[#3D6B4F] leading-tight">Tohfa</h1>
        <p class="text-accent-caps font-accent-caps text-text-faint tracking-widest text-[10px] mt-1 opacity-70">Admin Console</p>
      </div>
      <nav class="flex-1 space-y-1 overflow-y-auto pr-1">
        ${navHtml}
      </nav>
      <!-- Profile Footer -->
      <div class="mt-auto pt-6 border-t border-outline-variant/20 flex items-center gap-3">
        <div class="h-10 w-10 rounded-full bg-sage-soft flex items-center justify-center text-primary font-bold text-xs shrink-0">TA</div>
        <div class="overflow-hidden">
          <p class="text-[13px] font-bold text-text-default truncate leading-tight">Tohfa Admin</p>
          <p class="text-[11px] text-text-faint font-data-meta truncate">Master Access</p>
        </div>
      </div>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderSidebar);
  } else {
    renderSidebar();
  }
})();
