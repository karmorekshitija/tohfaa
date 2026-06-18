// CategoriesOverlay.js
(function() {
  const overlayHtml = `
    <div id="categories-overlay-container" class="fixed inset-0 z-[100] hidden overflow-hidden font-body-md">
      <!-- Backdrop -->
      <div id="categories-overlay-backdrop" class="absolute inset-0 bg-[#3A3328]/40 backdrop-blur-sm opacity-0 transition-opacity duration-300"></div>
      
      <!-- Drawer Panel -->
      <div id="categories-overlay-panel" class="absolute top-0 right-0 h-full w-full max-w-[550px] bg-white shadow-2xl border-l border-[#8FAF82] flex flex-col translate-x-full transition-transform duration-300 ease-out">
        
        <!-- Header -->
        <div class="px-6 py-5 border-b border-[#8FAF82]/20 flex items-center justify-between bg-[#FCFAF5]">
          <div>
            <h2 class="font-headline-md text-[24px] text-[#3D6B4F] leading-tight">Master Categories</h2>
            <p class="font-serif-ui-sm italic text-[#6E6453] text-[13px] mt-0.5">CRUD Management & Nesting Controls</p>
          </div>
          <button id="categories-overlay-close-btn" class="p-2 rounded-full hover:bg-[#B14B3E]/10 text-[#6E6453] hover:text-[#B14B3E] transition-all">
            <span class="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        <!-- Action Bar -->
        <div class="px-6 py-4 bg-[#FCFAF5] border-b border-[#8FAF82]/10 flex items-center justify-between gap-4">
          <button id="add-main-cat-btn" class="flex items-center gap-2 px-5 py-2.5 bg-[#3D6B4F] hover:bg-[#2E5340] active:scale-[0.98] text-white rounded-full font-label-btn text-[13px] transition-all shadow-sm">
            <span class="material-symbols-outlined text-[18px]">add</span>
            <span>Add New Category</span>
          </button>
          <span class="text-[11px] font-data-meta text-[#9A8F7A] uppercase tracking-wider" id="total-cats-badge">Loading...</span>
        </div>

        <!-- Categories List (Accordion) -->
        <div id="categories-list-container" class="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <!-- Populated dynamically -->
        </div>
      </div>

      <!-- Nested Form Modal -->
      <div id="category-form-modal" class="fixed inset-0 z-[110] hidden flex items-center justify-center p-4">
        <!-- Inner Backdrop -->
        <div id="category-form-backdrop" class="absolute inset-0 bg-[#3A3328]/30 backdrop-blur-xs"></div>
        
        <!-- Form Content Card -->
        <div class="relative bg-white w-full max-w-[420px] rounded-xl border border-[#8FAF82] shadow-2xl p-6 z-10 flex flex-col gap-5">
          <div class="flex items-center justify-between border-b border-[#8FAF82]/20 pb-3">
            <h3 id="form-modal-title" class="font-headline-md text-[18px] text-[#3D6B4F]">New Category</h3>
            <button id="form-modal-close" class="text-[#9A8F7A] hover:text-[#B14B3E] transition-all">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <form id="overlay-category-form" class="space-y-4 text-left">
            <input type="hidden" id="form-parent-id" value="">
            <input type="hidden" id="form-edit-id" value="">
            
            <div class="flex flex-col items-center gap-2">
              <label class="w-full text-xs font-bold text-[#6E6453] uppercase tracking-wide">Emoji Icon</label>
              <button id="form-emoji-btn" type="button" class="w-16 h-16 bg-[#FCFAF5] border border-[#8FAF82] rounded-full flex items-center justify-center text-[28px] hover:bg-white hover:shadow-md transition-all group">
                <span id="form-emoji-span" class="group-hover:scale-110 transition-transform">🏺</span>
              </button>
              <span class="text-[9px] font-data-meta text-[#9A8F7A]">Click to change</span>
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-bold text-[#6E6453] uppercase tracking-wide">Display Name</label>
              <input type="text" id="form-display-name" required class="w-full px-4 py-2.5 bg-white border border-[#8FAF82] rounded-lg focus:ring-1 focus:ring-[#7B5EA7] focus:border-[#7B5EA7] outline-none transition-all font-body-md text-[14px]" placeholder="e.g. Flower Bouquets">
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-bold text-[#6E6453] uppercase tracking-wide">Slug</label>
              <input type="text" id="form-slug" required class="w-full px-4 py-2.5 bg-white border border-[#8FAF82] rounded-lg focus:ring-1 focus:ring-[#7B5EA7] focus:border-[#7B5EA7] outline-none transition-all font-data-meta text-[12px]" placeholder="e.g. flower-bouquets">
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-bold text-[#6E6453] uppercase tracking-wide">Description</label>
              <textarea id="form-description" rows="2" class="w-full px-4 py-2 bg-white border border-[#8FAF82] rounded-lg focus:ring-1 focus:ring-[#7B5EA7] focus:border-[#7B5EA7] outline-none transition-all font-body-md text-[13px] resize-none" placeholder="Brief description..."></textarea>
            </div>

            <div class="flex items-center justify-between gap-4 pt-2">
              <div class="space-y-1">
                <label class="block text-xs font-bold text-[#6E6453] uppercase tracking-wide">Sort Order</label>
                <input type="number" id="form-sort-order" value="1" class="w-[80px] px-3 py-1.5 bg-white border border-[#8FAF82] rounded-lg focus:ring-1 focus:ring-[#7B5EA7] focus:border-[#7B5EA7] outline-none transition-all font-data-meta text-[13px]">
              </div>
              <div class="flex items-center gap-2.5 mt-4">
                <input type="checkbox" id="form-active" checked class="h-4 w-4 rounded border-[#8FAF82] text-[#3D6B4F] focus:ring-[#7B5EA7]">
                <label for="form-active" class="text-[13px] font-bold text-[#6E6453]">Active</label>
              </div>
            </div>

            <div class="pt-4 flex gap-3">
              <button type="button" id="form-cancel-btn" class="flex-1 py-2.5 rounded-full border border-[#8FAF82] text-[#6E6453] text-[13px] font-label-btn hover:bg-[#FCFAF5] transition-all">Cancel</button>
              <button type="submit" class="flex-1 py-2.5 rounded-full bg-[#3D6B4F] hover:bg-[#2E5340] text-white text-[13px] font-label-btn transition-all">Save Category</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  // Inject Styles dynamically
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    #categories-overlay-container .material-symbols-outlined {
      font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
    }
    #categories-overlay-container .accordion-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s cubic-bezier(0, 1, 0, 1);
    }
    #categories-overlay-container .accordion-content.expanded {
      max-height: 1000px;
      transition: max-height 0.3s cubic-bezier(1, 0, 1, 0);
    }
    #categories-overlay-container .rotate-90 {
      transform: rotate(90deg);
    }
  `;
  document.head.appendChild(styleEl);

  // Helper fetch calls
  async function makeRequest(url, method = 'GET', body = null) {
    const token = sessionStorage.getItem('tohfa_admin_token');
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const res = await fetch(`/api${url}`, options);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${res.status}`);
    }
    return res.json();
  }

  const CategoriesOverlay = {
    el: null,
    categories: [],

    init() {
      if (document.getElementById('categories-overlay-container')) return;
      const div = document.createElement('div');
      div.innerHTML = overlayHtml;
      document.body.appendChild(div.firstElementChild);
      
      this.el = document.getElementById('categories-overlay-container');
      this.bindEvents();
    },

    bindEvents() {
      const closeBtn = document.getElementById('categories-overlay-close-btn');
      const backdrop = document.getElementById('categories-overlay-backdrop');
      const addMainCatBtn = document.getElementById('add-main-cat-btn');
      const formCancelBtn = document.getElementById('form-cancel-btn');
      const formModalClose = document.getElementById('form-modal-close');
      const formEl = document.getElementById('overlay-category-form');
      const emojiBtn = document.getElementById('form-emoji-btn');
      const displayNameInput = document.getElementById('form-display-name');
      const slugInput = document.getElementById('form-slug');

      closeBtn.addEventListener('click', () => this.close());
      backdrop.addEventListener('click', () => this.close());
      
      addMainCatBtn.addEventListener('click', () => this.openFormModal({ title: 'Add New Category' }));
      
      formCancelBtn.addEventListener('click', () => this.closeFormModal());
      formModalClose.addEventListener('click', () => this.closeFormModal());
      
      emojiBtn.addEventListener('click', () => {
        const emojiSpan = document.getElementById('form-emoji-span');
        const newEmoji = prompt("Enter category emoji icon:", emojiSpan.textContent);
        if (newEmoji !== null && newEmoji.trim()) {
          emojiSpan.textContent = newEmoji.trim();
        }
      });

      // Auto-generate slug for new categories
      displayNameInput.addEventListener('input', (e) => {
        const editId = document.getElementById('form-edit-id').value;
        if (!editId) {
          const slug = e.target.value.toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-');
          slugInput.value = slug;
        }
      });

      slugInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        slugInput.value = val;
      });

      formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleFormSubmit();
      });
    },

    async open() {
      this.init();
      this.el.classList.remove('hidden');
      
      // Animations
      setTimeout(() => {
        document.getElementById('categories-overlay-backdrop').style.opacity = '1';
        document.getElementById('categories-overlay-panel').style.transform = 'translateX(0)';
      }, 50);

      await this.loadCategories();
    },

    close() {
      if (!this.el) return;
      document.getElementById('categories-overlay-backdrop').style.opacity = '0';
      document.getElementById('categories-overlay-panel').style.transform = 'translateX(100%)';
      setTimeout(() => {
        this.el.classList.add('hidden');
      }, 300);
    },

    openFormModal({ title, parentId = '', editId = '', catData = null }) {
      document.getElementById('category-form-modal').classList.remove('hidden');
      document.getElementById('form-modal-title').textContent = title;
      document.getElementById('form-parent-id').value = parentId;
      document.getElementById('form-edit-id').value = editId;

      const emojiSpan = document.getElementById('form-emoji-span');
      const displayNameInput = document.getElementById('form-display-name');
      const slugInput = document.getElementById('form-slug');
      const descInput = document.getElementById('form-description');
      const sortInput = document.getElementById('form-sort-order');
      const activeInput = document.getElementById('form-active');

      if (catData) {
        emojiSpan.textContent = catData.emoji_icon || '🏺';
        displayNameInput.value = catData.display_name;
        slugInput.value = catData.slug;
        descInput.value = catData.description || '';
        sortInput.value = catData.sort_order;
        activeInput.checked = !!catData.is_active;
      } else {
        emojiSpan.textContent = parentId ? '🏷️' : '🏺';
        displayNameInput.value = '';
        slugInput.value = '';
        descInput.value = '';
        sortInput.value = '1';
        activeInput.checked = true;
      }
    },

    closeFormModal() {
      document.getElementById('category-form-modal').classList.add('hidden');
    },

    async loadCategories() {
      try {
        const res = await makeRequest('/admin/categories');
        if (res.success) {
          this.categories = res.data.categories;
          this.render();
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    },

    render() {
      const container = document.getElementById('categories-list-container');
      container.innerHTML = '';

      const mainCats = this.categories.filter(c => !c.parent_id);
      const subCats = this.categories.filter(c => c.parent_id);

      document.getElementById('total-cats-badge').textContent = `${mainCats.length} Main, ${subCats.length} Subs`;

      if (mainCats.length === 0) {
        container.innerHTML = `
          <div class="text-center py-10 text-[#9A8F7A] font-serif-ui-sm">
            No categories configured yet.
          </div>
        `;
        return;
      }

      mainCats.forEach(cat => {
        const children = subCats.filter(sub => sub.parent_id === cat.id);
        const card = document.createElement('div');
        card.className = 'border border-[#8FAF82]/30 rounded-xl bg-[#FCFAF5]/50 overflow-hidden transition-all duration-300 hover:shadow-md';
        
        card.innerHTML = `
          <!-- Header -->
          <div class="px-4 py-3.5 flex items-center justify-between gap-3 bg-white hover:bg-[#FCFAF5] transition-colors cursor-pointer accordion-trigger">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-[#9A8F7A] text-[18px] transition-transform duration-200 chevron-icon">chevron_right</span>
              <span class="text-[18px]">${cat.emoji_icon || '🏺'}</span>
              <div>
                <span class="font-bold text-[#3A3328] text-[15px]">${cat.display_name}</span>
                <span class="text-[10px] font-data-meta text-[#9A8F7A] ml-2">(${children.length} items)</span>
              </div>
            </div>
            
            <div class="flex items-center gap-1.5" onclick="event.stopPropagation()">
              <button class="add-sub-btn p-1 rounded-full hover:bg-[#3D6B4F]/10 text-[#3D6B4F] transition-all" title="Add Subcategory" data-id="${cat.id}">
                <span class="material-symbols-outlined text-[18px]">add</span>
              </button>
              <button class="edit-btn p-1 rounded-full hover:bg-[#8FAF82]/20 text-[#6E6453] transition-all" title="Edit Category" data-id="${cat.id}">
                <span class="material-symbols-outlined text-[18px]">edit</span>
              </button>
              <button class="delete-btn p-1 rounded-full hover:bg-[#B14B3E]/10 text-[#B14B3E] transition-all" title="Delete Category" data-id="${cat.id}">
                <span class="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>

          <!-- Content (Subcategories Accordion) -->
          <div class="accordion-content border-t border-[#8FAF82]/10 bg-white">
            <div class="px-5 py-3 space-y-2.5">
              ${children.length === 0 ? `
                <p class="text-[12px] text-[#9A8F7A] italic py-1 pl-6">No subcategories. Click + to add one.</p>
              ` : children.map(sub => `
                <div class="flex items-center justify-between gap-3 py-1.5 pl-6 border-b border-[#F7F3EC]/50 last:border-b-0 hover:translate-x-1 transition-transform">
                  <div class="flex items-center gap-2">
                    <span class="text-[13px] text-[#9A8F7A] font-data-meta">↳</span>
                    <span class="text-[14px] text-[#3A3328] font-medium">${sub.display_name}</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <button class="edit-btn p-1 rounded-full hover:bg-[#8FAF82]/20 text-[#6E6453] transition-all" title="Edit Subcategory" data-id="${sub.id}">
                      <span class="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button class="delete-btn p-1 rounded-full hover:bg-[#B14B3E]/10 text-[#B14B3E] transition-all" title="Delete Subcategory" data-id="${sub.id}">
                      <span class="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        // Toggle accordion functionality
        const trigger = card.querySelector('.accordion-trigger');
        const content = card.querySelector('.accordion-content');
        const chevron = card.querySelector('.chevron-icon');
        
        trigger.addEventListener('click', () => {
          content.classList.toggle('expanded');
          chevron.classList.toggle('rotate-90');
        });

        // Add subcategory click
        card.querySelector('.add-sub-btn').addEventListener('click', (e) => {
          const parentId = e.currentTarget.getAttribute('data-id');
          const parentName = cat.display_name;
          this.openFormModal({ title: `Add Subcategory to ${parentName}`, parentId });
        });

        // Edit actions
        card.querySelectorAll('.edit-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.getAttribute('data-id'));
            const catData = this.categories.find(c => c.id === id);
            if (catData) {
              this.openFormModal({
                title: catData.parent_id ? `Edit Subcategory` : `Edit Category`,
                editId: id,
                parentId: catData.parent_id || '',
                catData
              });
            }
          });
        });

        // Delete actions
        card.querySelectorAll('.delete-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const id = parseInt(e.currentTarget.getAttribute('data-id'));
            const catData = this.categories.find(c => c.id === id);
            if (confirm(`Are you sure you want to delete "${catData.display_name}"?`)) {
              try {
                await makeRequest(`/admin/categories/${id}`, 'DELETE');
                await this.loadCategories();
              } catch (err) {
                alert(err.message || "Failed to delete category");
              }
            }
          });
        });

        container.appendChild(card);
      });
    },

    async handleFormSubmit() {
      const editId = document.getElementById('form-edit-id').value;
      const parentId = document.getElementById('form-parent-id').value;
      
      const payload = {
        emoji_icon: document.getElementById('form-emoji-span').textContent,
        display_name: document.getElementById('form-display-name').value.trim(),
        slug: document.getElementById('form-slug').value.trim(),
        description: document.getElementById('form-description').value.trim(),
        sort_order: parseInt(document.getElementById('form-sort-order').value) || 1,
        is_active: document.getElementById('form-active').checked,
        parent_id: parentId ? parseInt(parentId) : null
      };

      try {
        if (editId) {
          await makeRequest(`/admin/categories/${editId}`, 'PATCH', payload);
        } else {
          await makeRequest('/admin/categories', 'POST', payload);
        }
        this.closeFormModal();
        await this.loadCategories();
      } catch (err) {
        alert(err.message || "Failed to save category");
      }
    }
  };

  window.CategoriesOverlay = CategoriesOverlay;
})();
