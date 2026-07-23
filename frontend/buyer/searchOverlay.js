import apiClient from '/src/utils/apiClient.js';

class SearchOverlay {
  constructor() {
    this.overlay = null;
    this.scrim = null;
    this.card = null;
    this.input = null;
    this.clearBtn = null;
    this.closeBtn = null;
    this.resultsContainer = null;
    this.typingTimeout = null;
    this.isOpen = false;
    
    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    // Check if search overlay already exists
    if (document.getElementById('global-search-overlay')) {
      this.overlay = document.getElementById('global-search-overlay');
      this.scrim = document.getElementById('global-search-scrim');
      this.card = document.getElementById('global-search-card');
      this.input = document.getElementById('global-search-input');
      this.clearBtn = document.getElementById('global-search-clear');
      this.closeBtn = document.getElementById('global-search-close');
      this.resultsContainer = document.getElementById('global-search-results');
      return;
    }

    // Create the overlay elements
    const overlayMarkup = `
      <div id="global-search-overlay" class="fixed inset-0 z-[250] flex items-start justify-center p-4 md:p-10 pointer-events-none hidden font-['DM_Sans']">
        <!-- Backdrop Blur Scrim -->
        <div id="global-search-scrim" class="fixed inset-0 bg-[#1f1b15]/40 backdrop-blur-md transition-opacity duration-300 opacity-0 pointer-events-auto cursor-pointer"></div>
        
        <style>
          #global-search-overlay {
            --primary-container: #3d6b4f;
            --primary: #3D6B4F;
            --gold: #A68911;
            --sage: #717972;
            --ivory: #FCFAF5;
            --ink: #211b11;
            --outline-variant: #c1c9c0;
            --violet: #7B5EA7;
          }
          .speech-bubble::after {
              content: '';
              position: absolute;
              left: -10px;
              top: 50%;
              transform: translateY(-50%);
              border-width: 10px 10px 10px 0;
              border-style: solid;
              border-color: transparent #FCFAF5 transparent transparent;
          }
          .speech-bubble::before {
              content: '';
              position: absolute;
              left: -11px;
              top: 50%;
              transform: translateY(-50%);
              border-width: 11px 11px 11px 0;
              border-style: solid;
              border-color: transparent #717972 transparent transparent;
          }
          .custom-scrollbar::-webkit-scrollbar {
              width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
              background: #f1f1f1;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #717972;
              border-radius: 10px;
          }
        </style>

        <!-- Search Card -->
        <div id="global-search-card" class="relative max-w-2xl w-full bg-[#FCFAF5] rounded-2xl shadow-2xl border-2 border-[#717972] flex flex-col max-h-[85vh] overflow-hidden transform transition-all duration-300 scale-95 opacity-0 -translate-y-5 pointer-events-auto z-[251]">
          
          <!-- Search Header -->
          <div class="relative flex items-center border-b border-[#c1c9c0]/50 px-6 py-4 bg-[#FCFAF5]">
            <span class="material-symbols-outlined text-[#717972] absolute left-10 pointer-events-none select-none">search</span>
            
            <input type="text" id="global-search-input" placeholder="Search gifts, sellers, occasions..." class="w-full bg-white border-2 border-[#c1c9c0] focus:border-[#7B5EA7] rounded-full py-2.5 pl-12 pr-24 outline-none text-[#211b11] text-[15px] transition-all placeholder:text-[#717972]/60 focus:ring-0" autocomplete="off">
            
            <button id="global-search-clear" class="absolute right-20 flex items-center text-[#717972] hover:text-[#3D6B4F] transition-colors hidden" title="Clear input">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
            
            <button id="global-search-close" class="absolute right-10 flex items-center text-[#717972] hover:text-[#ba1a1a] transition-colors" title="Close Search">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <!-- Search Content / Results Container -->
          <div id="global-search-results" class="overflow-y-auto flex-1 bg-[#FCFAF5] p-6 space-y-6 custom-scrollbar">
            <!-- Idle State (Mascot Greeting, Trending, Occasions, Recent Searches) -->
            <div id="global-search-idle" class="space-y-6">
              <!-- Mascot Greeting Block -->
              <div class="flex items-center justify-center gap-6 mb-6">
                <div class="relative w-[120px] h-[120px] flex-shrink-0">
                  <img alt="Tofha Mascot Greeting" class="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJVV7FEfzFX7LwbZrrkNgV6I6zLMOzX5bFMbcMv408ZPuULNaGpwbjgThA0iKWnNG7PWZ5hYneG87SxT15GRi9md3SK1lK5d30zwHkYmlZWx3WFaC1YqgG8eCLlx5TeJ7A7Ce0yjppuoImBNpTKRMpTWGmiDB2C4u6TzXEra_7uDwitq_0ZR_yQjNhqu4aHfdfD3tpVcIbWJ7cB8WTBb4f0Is8-7qO4jFpmtrLLNDfBqlJTOY_GxUJkQOtswWTIOEfdFUhvmUonBY"/>
                </div>
                <div class="speech-bubble relative bg-[#FCFAF5] border border-[#717972] p-4 rounded-xl max-w-sm">
                  <h3 class="font-['Playfair_Display'] italic text-[18px] text-[#211b11] mb-1 leading-tight">
                    What would you like to gift today? ✦
                  </h3>
                  <p class="font-['DM_Sans'] text-[13px] text-[#717972]">
                    Search by product, occasion, seller, or mood.
                  </p>
                </div>
              </div>

              <!-- Trending Searches -->
              <div>
                <h2 class="text-[11px] font-bold text-[#A68911] tracking-widest mb-3 uppercase font-['Cinzel']">Trending Now 🔥</h2>
                <div class="flex flex-wrap gap-2">
                  <button class="trending-chip px-4 py-1.5 bg-[#FCFAF5] border border-[#c1c9c0] rounded-full font-['DM_Sans'] text-[14px] text-[#211b11] hover:border-[#3D6B4F] hover:bg-white transition-all transform hover:-translate-y-0.5 duration-200">Birthday gifts</button>
                  <button class="trending-chip px-4 py-1.5 bg-[#FCFAF5] border border-[#c1c9c0] rounded-full font-['DM_Sans'] text-[14px] text-[#211b11] hover:border-[#3D6B4F] hover:bg-white transition-all transform hover:-translate-y-0.5 duration-200">Anniversary</button>
                  <button class="trending-chip px-4 py-1.5 bg-[#FCFAF5] border border-[#c1c9c0] rounded-full font-['DM_Sans'] text-[14px] text-[#211b11] hover:border-[#3D6B4F] hover:bg-white transition-all transform hover:-translate-y-0.5 duration-200">Handmade candles</button>
                  <button class="trending-chip px-4 py-1.5 bg-[#FCFAF5] border border-[#c1c9c0] rounded-full font-['DM_Sans'] text-[14px] text-[#211b11] hover:border-[#3D6B4F] hover:bg-white transition-all transform hover:-translate-y-0.5 duration-200">Pottery kits</button>
                  <button class="trending-chip px-4 py-1.5 bg-[#FCFAF5] border border-[#c1c9c0] rounded-full font-['DM_Sans'] text-[14px] text-[#211b11] hover:border-[#3D6B4F] hover:bg-white transition-all transform hover:-translate-y-0.5 duration-200">Silk scarves</button>
                  <button class="trending-chip px-4 py-1.5 bg-[#FCFAF5] border border-[#c1c9c0] rounded-full font-['DM_Sans'] text-[14px] text-[#211b11] hover:border-[#3D6B4F] hover:bg-white transition-all transform hover:-translate-y-0.5 duration-200">Eco-friendly wraps</button>
                </div>
              </div>

              <!-- Shop by Occasion -->
              <div>
                <h2 class="text-[11px] font-bold text-[#A68911] tracking-widest mb-3 uppercase font-['Cinzel']">Shop by Occasion</h2>
                <div class="grid grid-cols-5 gap-3">
                  <div class="occasion-card h-[90px] bg-[#FCFAF5] border border-[#c1c9c0] rounded-lg flex flex-col items-center justify-center group hover:bg-white hover:border-[#3D6B4F] cursor-pointer transition-all hover:scale-[1.02] duration-200" data-occasion="Birthday">
                    <span class="material-symbols-outlined text-[#3D6B4F] mb-1.5">cake</span>
                    <span class="text-[11px] text-[#211b11] font-bold font-['Cinzel']">BIRTHDAY</span>
                  </div>
                  <div class="occasion-card h-[90px] bg-[#FCFAF5] border border-[#c1c9c0] rounded-lg flex flex-col items-center justify-center group hover:bg-white hover:border-[#3D6B4F] cursor-pointer transition-all hover:scale-[1.02] duration-200" data-occasion="Anniversary">
                    <span class="material-symbols-outlined text-[#3D6B4F] mb-1.5">favorite</span>
                    <span class="text-[11px] text-[#211b11] font-bold font-['Cinzel']">ANNIVERSARY</span>
                  </div>
                  <div class="occasion-card h-[90px] bg-[#FCFAF5] border border-[#c1c9c0] rounded-lg flex flex-col items-center justify-center group hover:bg-white hover:border-[#3D6B4F] cursor-pointer transition-all hover:scale-[1.02] duration-200" data-occasion="Wedding">
                    <span class="material-symbols-outlined text-[#3D6B4F] mb-1.5">celebration</span>
                    <span class="text-[11px] text-[#211b11] font-bold font-['Cinzel']">WEDDING</span>
                  </div>
                  <div class="occasion-card h-[90px] bg-[#FCFAF5] border border-[#c1c9c0] rounded-lg flex flex-col items-center justify-center group hover:bg-white hover:border-[#3D6B4F] cursor-pointer transition-all hover:scale-[1.02] duration-200" data-occasion="Festival">
                    <span class="material-symbols-outlined text-[#3D6B4F] mb-1.5">festival</span>
                    <span class="text-[11px] text-[#211b11] font-bold font-['Cinzel']">FESTIVAL</span>
                  </div>
                  <div class="occasion-card h-[90px] bg-[#FCFAF5] border border-[#c1c9c0] rounded-lg flex flex-col items-center justify-center group hover:bg-white hover:border-[#3D6B4F] cursor-pointer transition-all hover:scale-[1.02] duration-200" data-occasion="Just Because">
                    <span class="material-symbols-outlined text-[#3D6B4F] mb-1.5">volunteer_activism</span>
                    <span class="text-[11px] text-[#211b11] font-bold font-['Cinzel']">JUST BECAUSE</span>
                  </div>
                </div>
              </div>

              <!-- Recent Searches Section -->
              <div id="global-search-recents-section" class="hidden">
                <div class="flex items-center justify-between mb-3">
                  <h2 class="text-[11px] font-bold text-[#A68911] tracking-widest uppercase font-['Cinzel']">Recent Searches</h2>
                  <button id="global-search-clear-recents" class="text-[13px] text-[#70539b] hover:underline font-medium">Clear all</button>
                </div>
                <div id="global-search-recents-list" class="bg-white rounded-xl overflow-hidden divide-y divide-[#c1c9c0]/50 border border-[#c1c9c0]/30 shadow-sm"></div>
              </div>
            </div>
            
            <!-- Dynamic Autocomplete Results -->
            <div id="global-search-typing" class="hidden space-y-6">
              <div id="global-suggestions-list" class="flex flex-col"></div>
              
              <div id="global-sellers-section" class="hidden">
                <h4 class="text-[11px] font-bold text-[#A68911] tracking-widest mb-3 uppercase font-['Cinzel']">Sellers</h4>
                <div id="global-sellers-list" class="flex gap-3 overflow-x-auto pb-2 custom-scrollbar"></div>
              </div>
              
              <div id="global-categories-section" class="hidden">
                <h4 class="text-[11px] font-bold text-[#A68911] tracking-widest mb-3 uppercase font-['Cinzel']">Categories</h4>
                <div id="global-categories-list" class="flex gap-3 overflow-x-auto pb-2 custom-scrollbar"></div>
              </div>
            </div>

            <!-- Full Product Grid Results -->
            <div id="global-search-results-view" class="hidden space-y-4">
              <div class="flex justify-between items-center border-b border-[#c1c9c0]/50 pb-2">
                <h3 id="global-results-title" class="font-['Playfair_Display'] text-lg text-[#3D6B4F] italic font-semibold">Search Results</h3>
                <span id="global-results-count" class="text-xs text-[#717972]"></span>
              </div>
              
              <div id="global-results-loader" class="hidden flex flex-col items-center justify-center py-10">
                <div class="relative w-8 h-8">
                  <div class="absolute inset-0 border-4 border-[#3D6B4F]/10 rounded-full"></div>
                  <div class="absolute inset-0 border-4 border-[#3D6B4F] border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p class="mt-2 text-[#717972] text-xs italic">Gathering handcrafted items...</p>
              </div>

              <div id="global-results-grid" class="grid grid-cols-2 gap-4 max-h-[45vh] overflow-y-auto p-1 custom-scrollbar"></div>
              
              <!-- Sad Mascot No-Results State -->
              <div id="global-no-results" class="hidden flex flex-col items-center justify-center py-10 space-y-6 text-center">
                <div class="flex items-center gap-4 max-w-md bg-white border border-[#717972] p-5 rounded-2xl relative font-['DM_Sans']">
                  <div class="w-24 h-24 flex-shrink-0">
                    <img alt="Tofha Mascot Sad" class="w-full h-full object-contain grayscale" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJVV7FEfzFX7LwbZrrkNgV6I6zLMOzX5bFMbcMv408ZPuULNaGpwbjgThA0iKWnNG7PWZ5hYneG87SxT15GRi9md3SK1lK5d30zwHkYmlZWx3WFaC1YqgG8eCLlx5TeJ7A7Ce0yjppuoImBNpTKRMpTWGmiDB2C4u6TzXEra_7uDwitq_0ZR_yQjNhqu4aHfdfD3tpVcIbWJ7cB8WTBb4f0Is8-7qO4jFpmtrLLNDfBqlJTOY_GxUJkQOtswWTIOEfdFUhvmUonBY"/>
                  </div>
                  <div class="text-left">
                    <h3 class="font-['Playfair_Display'] italic text-[18px] text-[#211b11] font-bold mb-1">No matches found ✦</h3>
                    <p class="text-sm text-[#717972]">We couldn't find any products matching your query. Let's try searching for different terms or browsing the categories!</p>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', overlayMarkup);

    this.overlay = document.getElementById('global-search-overlay');
    this.scrim = document.getElementById('global-search-scrim');
    this.card = document.getElementById('global-search-card');
    this.input = document.getElementById('global-search-input');
    this.clearBtn = document.getElementById('global-search-clear');
    this.closeBtn = document.getElementById('global-search-close');
    this.resultsContainer = document.getElementById('global-search-results');
  }

  bindEvents() {
    // Intercept clicks on search button in header
    document.addEventListener('click', (e) => {
      const searchBtn = e.target.closest('#header-search-btn, a[href="/buyer/categories.html"], a[href="/buyer/search.html?focus=true"]');
      if (searchBtn && !searchBtn.closest('#global-search-overlay')) {
        const icon = searchBtn.querySelector('.material-symbols-outlined');
        if (icon && icon.textContent.trim() === 'search') {
          e.preventDefault();
          this.open();
        }
      }
    });

    // Scrim click closes
    this.scrim.addEventListener('click', () => this.close());
    
    // Close button click closes
    this.closeBtn.addEventListener('click', () => this.close());

    // Input events
    this.input.addEventListener('input', () => this.handleInput());
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
    
    // Clear input button
    this.clearBtn.addEventListener('click', () => {
      this.input.value = '';
      this.clearBtn.classList.add('hidden');
      this.showState('idle');
      this.input.focus();
    });

    // Clear recent searches
    const clearRecents = document.getElementById('global-search-clear-recents');
    if (clearRecents) {
      clearRecents.addEventListener('click', () => {
        localStorage.removeItem('global_recent_searches');
        this.renderRecentSearches();
      });
    }

    // Trending Searches click triggers
    this.overlay.querySelectorAll('.trending-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.textContent.trim();
        this.input.value = text;
        this.executeSearch(text);
      });
    });

    // Occasion Cards click triggers
    this.overlay.querySelectorAll('.occasion-card').forEach(card => {
      card.addEventListener('click', () => {
        const text = card.getAttribute('data-occasion');
        this.input.value = text;
        this.executeSearch(text);
      });
    });

    // Escape key closes
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;

    // Show overlay element container
    this.overlay.classList.remove('hidden');
    
    // Render latest recent searches
    this.renderRecentSearches();
    this.showState('idle');

    // Force reflow for transitions
    this.overlay.offsetHeight;

    // Transition animations in
    this.scrim.classList.remove('opacity-0');
    this.scrim.classList.add('opacity-100');
    this.card.classList.remove('scale-95', 'opacity-0', '-translate-y-5');
    this.card.classList.add('scale-100', 'opacity-100', 'translate-y-0');

    // Focus immediately
    setTimeout(() => {
      this.input.focus();
    }, 100);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;

    // Transition animations out
    this.scrim.classList.remove('opacity-100');
    this.scrim.classList.add('opacity-0');
    this.card.classList.remove('scale-100', 'opacity-100', 'translate-y-0');
    this.card.classList.add('scale-95', 'opacity-0', '-translate-y-5');

    // Hide overlay container after transitions finish
    setTimeout(() => {
      if (!this.isOpen) {
        this.overlay.classList.add('hidden');
        this.input.value = '';
        this.clearBtn.classList.add('hidden');
      }
    }, 300);
  }

  showState(stateName) {
    const idleView = document.getElementById('global-search-idle');
    const typingView = document.getElementById('global-search-typing');
    const resultsView = document.getElementById('global-search-results-view');

    if (stateName === 'idle') {
      idleView.classList.remove('hidden');
      typingView.classList.add('hidden');
      resultsView.classList.add('hidden');
      this.clearBtn.classList.add('hidden');
    } else if (stateName === 'typing') {
      idleView.classList.add('hidden');
      typingView.classList.remove('hidden');
      resultsView.classList.add('hidden');
      this.clearBtn.classList.remove('hidden');
    } else if (stateName === 'results') {
      idleView.classList.add('hidden');
      typingView.classList.add('hidden');
      resultsView.classList.remove('hidden');
      this.clearBtn.classList.remove('hidden');
    }
  }

  handleInput() {
    const val = this.input.value.trim();
    if (val === '') {
      this.showState('idle');
      return;
    }

    this.showState('typing');

    // Debounce suggestion calls
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(async () => {
      try {
        const res = await apiClient.get('/products/search-suggestions', { params: { q: val } });
        if (res.data && res.data.success) {
          this.renderSuggestions(res.data.data, val);
        }
      } catch (err) {
        console.error("Global suggestions fetch error:", err);
      }
    }, 300);
  }

  handleKeydown(e) {
    if (e.key === 'Enter') {
      const query = this.input.value.trim();
      if (query) {
        this.executeSearch(query);
      }
    }
  }

  renderRecentSearches() {
    const recentsSection = document.getElementById('global-search-recents-section');
    const recentsList = document.getElementById('global-search-recents-list');
    if (!recentsSection || !recentsList) return;

    const searches = JSON.parse(localStorage.getItem('global_recent_searches') || '[]');
    if (searches.length === 0) {
      recentsSection.classList.add('hidden');
      return;
    }

    recentsSection.classList.remove('hidden');
    recentsList.innerHTML = searches.map(s => `
      <div class="recent-search-row flex items-center justify-between p-3.5 hover:bg-[#FCFAF5] transition-colors cursor-pointer group" data-query="${s}">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-[#717972] group-hover:text-[#3D6B4F]" data-icon="history">history</span>
          <span class="font-['DM_Sans'] text-[15px] text-[#211b11] font-medium">${s}</span>
        </div>
        <span class="material-symbols-outlined text-[#717972] group-hover:text-[#3D6B4F] transform -rotate-45 transition-transform" data-icon="arrow_forward">arrow_forward</span>
      </div>
    `).join('');

    // Bind clicks to execute search
    recentsList.querySelectorAll('.recent-search-row').forEach(row => {
      row.addEventListener('click', () => {
        const q = row.getAttribute('data-query');
        this.input.value = q;
        this.executeSearch(q);
      });
    });
  }

  saveRecentSearch(query) {
    let searches = JSON.parse(localStorage.getItem('global_recent_searches') || '[]');
    searches = searches.filter(s => s !== query);
    searches.unshift(query);
    searches = searches.slice(0, 5); // Keep top 5
    localStorage.setItem('global_recent_searches', JSON.stringify(searches));
  }

  highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="font-bold text-[#3d6b4f]">$1</span>');
  }

  renderSuggestions(data, query) {
    const { suggestions, sellers, categories } = data;
    const suggestionsList = document.getElementById('global-suggestions-list');
    
    // 1. Text suggestions
    if (suggestions.length === 0 && sellers.length === 0 && categories.length === 0) {
      suggestionsList.innerHTML = `
        <div class="py-4 text-[#717972] italic text-sm text-center">
          No matches found... press Enter to search anyway.
        </div>
      `;
      document.getElementById('global-sellers-section').classList.add('hidden');
      document.getElementById('global-categories-section').classList.add('hidden');
      return;
    }

    suggestionsList.innerHTML = suggestions.slice(0, 5).map(s => {
      const highlighted = this.highlightMatch(s, query);
      return `
        <div class="suggestion-row h-[52px] flex items-center justify-between border-b border-[#c1c9c0]/50 hover:bg-[#fff2e1]/50 transition-colors px-3 cursor-pointer group" data-suggestion="${s}">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-[#717972] group-hover:text-[#3D6B4F] transition-colors">search</span>
            <p class="text-sm text-[#211b11] font-['DM_Sans']">${highlighted}</p>
          </div>
          <span class="material-symbols-outlined text-[#717972] group-hover:text-[#3D6B4F] transition-colors">north_east</span>
        </div>
      `;
    }).join('');

    // Bind suggestion clicks
    suggestionsList.querySelectorAll('.suggestion-row').forEach(row => {
      row.addEventListener('click', () => {
        const val = row.getAttribute('data-suggestion');
        this.input.value = val;
        this.executeSearch(val);
      });
    });

    // 2. Sellers (Artisans)
    const sellersSection = document.getElementById('global-sellers-section');
    const sellersList = document.getElementById('global-sellers-list');
    if (sellers.length > 0) {
      sellersSection.classList.remove('hidden');
      sellersList.innerHTML = sellers.map(s => {
        const rating = s.rating || (4.5 + Math.random() * 0.5).toFixed(1);
        const avatar = s.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLtjgl_6d1G3zozwOlNmm0erX55KCaVTW_S9DB1bwE90KeC2OHksOWMyexD5yE8_kbwU8gAVG70ZS7jRBfXR-gwGrZCMzgOpEYy39jcAPd6PD0BtuzlpvGquAHifvAuq9H__BIKrYWChm1UoV1YcCMaR6xdHuKC63a138ame_0_BLMInDJJnSAld04T_Rtpfjw-iPOzagDcOAd6EmQbZw8EXMCg3PtpXTYa5bgHpm6zMnLSPmFCUDZaSznuLZ_MTwQVrCUE9lVNKU';
        return `
          <a href="/buyer/seller-profile.html?id=${s.id}" class="flex-shrink-0 flex items-center gap-2 bg-[#fff8f3] px-3.5 py-2 rounded-full border border-[#c1c9c0] shadow-sm hover:border-[#3D6B4F] hover:bg-white transition-all cursor-pointer">
            <img alt="Seller Avatar" class="w-[28px] h-[28px] rounded-full object-cover" src="${avatar}">
            <span class="text-sm font-medium text-[#211b11] font-['DM_Sans']">${s.shop_name || s.username}</span>
            <span class="text-[13px] font-medium text-[#A68911] font-['Space_Mono']">${rating} ★</span>
          </a>
        `;
      }).join('');
    } else {
      sellersSection.classList.add('hidden');
    }

    // 3. Categories
    const categoriesSection = document.getElementById('global-categories-section');
    const categoriesList = document.getElementById('global-categories-list');
    if (categories.length > 0) {
      categoriesSection.classList.remove('hidden');
      categoriesList.innerHTML = categories.map(c => `
        <a href="/buyer/category.html?slug=${c.slug}" class="flex-shrink-0 bg-[#3D6B4F] px-4 py-2 rounded-full text-white font-['DM_Sans'] text-[12px] uppercase tracking-wide hover:bg-[#3D6B4F]/90 transition-colors shadow-sm">
          ${c.name}
        </a>
      `).join('');
    } else {
      categoriesSection.classList.add('hidden');
    }
  }

  async executeSearch(query) {
    if (!query || query.trim() === '') return;
    query = query.trim();
    this.saveRecentSearch(query);
    this.showState('results');

    const resultsTitle = document.getElementById('global-results-title');
    const resultsCount = document.getElementById('global-results-count');
    const resultsLoader = document.getElementById('global-results-loader');
    const resultsGrid = document.getElementById('global-results-grid');
    const noResults = document.getElementById('global-no-results');

    resultsTitle.innerText = `Search Results for "${query}"`;
    resultsCount.innerText = 'Finding items...';
    resultsLoader.classList.remove('hidden');
    resultsGrid.classList.add('hidden');
    noResults.classList.add('hidden');

    try {
      const res = await apiClient.get('/products/search', { params: { q: query, limit: 12 } });
      resultsLoader.classList.add('hidden');
      
      if (res.data && res.data.success) {
        const products = res.data.data.products || [];
        resultsCount.innerText = `${products.length} items found`;
        
        if (products.length === 0) {
          noResults.classList.remove('hidden');
          resultsGrid.innerHTML = '';
        } else {
          resultsGrid.classList.remove('hidden');
          resultsGrid.innerHTML = products.map(p => `
            <a href="/buyer/product.html?id=${p.id}" class="flex gap-3 p-2 border border-[#717972]/30 rounded-xl hover:bg-[#3D6B4F]/5 hover:border-[#3D6B4F]/50 transition-all duration-200 bg-white">
              <img loading="lazy" src="${p.image_url || 'https://placehold.co/100x100?text=Item'}" class="w-16 h-16 rounded-lg object-cover bg-white border border-[#c1c9c0]/20 flex-shrink-0">
              <div class="flex-1 min-w-0 flex flex-col justify-center font-['DM_Sans']">
                <h4 class="text-xs font-semibold text-[#3D6B4F] truncate leading-tight">${p.name}</h4>
                <p class="text-[10px] text-[#717972] truncate mt-0.5">By ${p.seller_name || 'Artisan'}</p>
                <p class="text-xs font-bold text-[#211b11] mt-1">₹${p.price}</p>
              </div>
            </a>
          `).join('');
        }
      } else {
        noResults.classList.remove('hidden');
      }
    } catch (err) {
      console.error("Execute search error:", err);
      resultsLoader.classList.add('hidden');
      noResults.classList.remove('hidden');
    }
  }
}

// Bind method to class instance so executeSearch runs properly
SearchOverlay.prototype.executeSearch = SearchOverlay.prototype.executeSearch;

let searchOverlayInstance = null;

export function initSearchOverlay() {
  if (!searchOverlayInstance) {
    searchOverlayInstance = new SearchOverlay();
  }
  return searchOverlayInstance;
}
