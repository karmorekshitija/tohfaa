const API_BASE = window.location.origin;
let categoriesList = [];
let selectedCategoryId = '';
let selectedSubcategoryIds = [];
let tagsList = [];

function showToast(msg, type='success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.className = `fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all transform duration-300 ${
        type === 'success' ? 'bg-[#3D6B4F] text-white' : 'bg-[#BA1A1A] text-white'
    }`;
    toast.innerHTML = `<span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : 'error'}</span><span>${msg}</span>`;
    toast.style.display = 'flex';
    setTimeout(() => toast.style.display = 'none', 3500);
}

const FALLBACK_CATEGORIES = [
    {
        id: 2,
        display_name: "Jewellery",
        name: "Jewellery",
        subcategories: [
            { id: 14, name: "Bracelets & Kada" },
            { id: 15, name: "Earrings" },
            { id: 16, name: "Necklace & Pendants" },
            { id: 17, name: "Rings" }
        ]
    },
    {
        id: 7,
        display_name: "Customized Gifts",
        name: "Customized Gifts",
        subcategories: [
            { id: 2, name: "3D Hologram Lamps" },
            { id: 3, name: "Acrylic Frames" },
            { id: 4, name: "Explosion Boxes" },
            { id: 5, name: "Keychains" },
            { id: 6, name: "Lamps" },
            { id: 7, name: "Letters & Cards" },
            { id: 8, name: "Mugs" },
            { id: 9, name: "Photo Albums" },
            { id: 10, name: "Plates" },
            { id: 11, name: "Scrapbooks & Memory Books" },
            { id: 12, name: "Wallets & Clutches" },
            { id: 13, name: "Wooden Plaques" }
        ]
    },
    {
        id: 8,
        display_name: "Home Decor",
        name: "Home Decor",
        subcategories: [
            { id: 25, name: "Wall Art" },
            { id: 26, name: "Dreamcatchers" },
            { id: 27, name: "Nameplates" },
            { id: 28, name: "Resin Art" },
            { id: 29, name: "Macrame" },
            { id: 30, name: "Clocks" },
            { id: 31, name: "Organizers & Boxes" },
            { id: 32, name: "Miniature Models" },
            { id: 33, name: "Lamps" }
        ]
    },
    {
        id: 9,
        display_name: "Hampers",
        name: "Hampers",
        subcategories: [
            { id: 34, name: "Birthday Hampers" },
            { id: 35, name: "Corporate Hampers" },
            { id: 36, name: "Festive Hampers" },
            { id: 37, name: "Wedding Hampers" }
        ]
    },
    {
        id: 10,
        display_name: "Wedding & Rituals",
        name: "Wedding & Rituals",
        subcategories: [
            { id: 43, name: "Shagun Envelopes" },
            { id: 44, name: "Wedding Cards" }
        ]
    },
    {
        id: 11,
        display_name: "Crochet",
        name: "Crochet",
        subcategories: [
            { id: 55, name: "Bouquets" },
            { id: 56, name: "Soft Toys" },
            { id: 57, name: "Sunflowers" }
        ]
    },
    {
        id: 12,
        display_name: "Fabric Crafts",
        name: "Fabric Crafts",
        subcategories: [
            { id: 62, name: "Embroidery" },
            { id: 61, name: "Knitted Items" },
            { id: 60, name: "Tote Bags" }
        ]
    },
    {
        id: 13,
        display_name: "Festivals",
        name: "Festivals",
        subcategories: [
            { id: 67, name: "Christmas" },
            { id: 64, name: "Diwali" },
            { id: 68, name: "Eid" },
            { id: 66, name: "Holi" },
            { id: 69, name: "Karwa Chauth" },
            { id: 65, name: "Navratri" },
            { id: 63, name: "Rakhi" }
        ]
    },
    {
        id: 14,
        display_name: "Couples",
        name: "Couples",
        subcategories: [
            { id: 82, name: "Anniversary Gifts" },
            { id: 80, name: "Anniversary Gifts" },
            { id: 71, name: "Customized Gifts" },
            { id: 76, name: "Flowers" },
            { id: 70, name: "Hampers" },
            { id: 79, name: "Home Decor" },
            { id: 72, name: "Jewellery" },
            { id: 78, name: "Keychains" },
            { id: 77, name: "Lamps" },
            { id: 75, name: "Letters & Cards" },
            { id: 83, name: "Matching Accessories" },
            { id: 73, name: "Portraits" },
            { id: 81, name: "Proposal Gifts" },
            { id: 74, name: "Scrapbooks & Memory Books" }
        ]
    },
    {
        id: 15,
        display_name: "Art & Portraits",
        name: "Art & Portraits",
        subcategories: [
            { id: 97, name: "Caricatures" },
            { id: 92, name: "Couple Portraits" },
            { id: 91, name: "Digital Portraits" },
            { id: 93, name: "Family Portraits" },
            { id: 95, name: "Paintings" },
            { id: 96, name: "Sketches" }
        ]
    }
];

// Category and subcategory selection logic
async function initCategoriesAndSubcategories() {
    let loaded = false;
    try {
        const res = await fetch('/api/categories');
        if (res.ok) {
            const json = await res.json();
            categoriesList = json.data?.categories || json.categories || (Array.isArray(json.data) ? json.data : []) || [];
            if (categoriesList && categoriesList.length > 0) {
                loaded = true;
            }
        }
    } catch (err) {
        console.error('Failed to load categories from API, using fallback:', err);
    }

    if (!loaded) {
        categoriesList = FALLBACK_CATEGORIES;
    }

    const categorySelect = document.getElementById('category-select');
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">Select a Category</option>';
        categoriesList.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.display_name || cat.name;
            categorySelect.appendChild(opt);
        });
    }
}

let categorySelect;
let subcategoriesWrapper;
let subcategoryDropdownBtn;
let subcategoryDropdownMenu;
let subcategoryDropdownLabel;
let subcategoryDropdownArrow;
let tagInput;
let tagsContainer;
let titleInput;
let charCountSpan;

function updateSubcategoryDropdownLabel() {
    if (!subcategoryDropdownLabel) return;
    if (!selectedCategoryId) {
        subcategoryDropdownLabel.textContent = 'Select Subcategories';
        return;
    }
    const cat = categoriesList.find(c => String(c.id) === String(selectedCategoryId));
    if (!cat) {
        subcategoryDropdownLabel.textContent = 'Select Subcategories';
        return;
    }
    const selectedNames = (cat.subcategories || [])
        .filter(sub => selectedSubcategoryIds.includes(sub.id))
        .map(sub => sub.name);

    if (selectedNames.length === 0) {
        subcategoryDropdownLabel.textContent = 'Select Subcategories';
    } else if (selectedNames.length <= 2) {
        subcategoryDropdownLabel.textContent = selectedNames.join(', ');
    } else {
        subcategoryDropdownLabel.textContent = `${selectedNames.length} Selected`;
    }
}

function populateSubcategoriesDropdown(categoryId) {
    if (!subcategoryDropdownMenu) return;
    subcategoryDropdownMenu.innerHTML = '';
    
    if (!categoryId) {
        if (subcategoriesWrapper) subcategoriesWrapper.classList.add('hidden');
        return;
    }
    
    const cat = categoriesList.find(c => String(c.id) === String(categoryId));
    if (cat && cat.subcategories && cat.subcategories.length > 0) {
        if (subcategoriesWrapper) subcategoriesWrapper.classList.remove('hidden');
        cat.subcategories.forEach(sub => {
            const label = document.createElement('label');
            label.className = 'flex items-center gap-3 px-3 py-2 hover:bg-sage/5 rounded-lg cursor-pointer text-xs transition-all duration-200 text-primary font-medium w-full';
            
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = sub.id;
            cb.className = 'rounded border-sage text-forest focus:ring-forest w-4 h-4 cursor-pointer';
            if (selectedSubcategoryIds.includes(sub.id)) {
                cb.checked = true;
            }
            
            cb.addEventListener('change', () => {
                const val = parseInt(cb.value, 10);
                if (cb.checked) {
                    if (selectedSubcategoryIds.length >= 5) {
                        cb.checked = false;
                        showToast('You can select a maximum of 5 subcategories', 'error');
                        return;
                    }
                    if (!selectedSubcategoryIds.includes(val)) selectedSubcategoryIds.push(val);
                } else {
                    selectedSubcategoryIds = selectedSubcategoryIds.filter(id => id !== val);
                }
                updateSubcategoryDropdownLabel();
            });
            
            label.appendChild(cb);
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = sub.name;
            label.appendChild(nameSpan);
            
            subcategoryDropdownMenu.appendChild(label);
        });
        updateSubcategoryDropdownLabel();
    } else {
        if (subcategoriesWrapper) subcategoriesWrapper.classList.add('hidden');
    }
}

// Tags list logic
function renderTags() {
    if (!tagsContainer) return;
    tagsContainer.innerHTML = '';
    tagsList.forEach((tag, idx) => {
        const span = document.createElement('span');
        span.className = 'text-[10px] bg-sage/10 text-sage px-2 py-1 rounded-md border border-sage/20 flex items-center gap-1';
        span.innerHTML = `#${tag} <span class="material-symbols-outlined text-[10px] cursor-pointer remove-tag-btn" data-idx="${idx}">close</span>`;
        tagsContainer.appendChild(span);
    });

    document.querySelectorAll('.remove-tag-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.dataset.idx);
            tagsList.splice(idx, 1);
            renderTags();
        });
    });
}

function addTag() {
    if (!tagInput) return;
    let val = tagInput.value.trim().replace(/^#/, '');
    if (val && !tagsList.includes(val)) {
        tagsList.push(val);
        tagInput.value = '';
        renderTags();
    }
}

// Customisation Suite logic
function updateCustomisationPreview() {
    const isCustom = document.getElementById('type-customisable').checked;
    const previewCard = document.getElementById('customisation-preview-card');
    if (!isCustom) {
        previewCard.classList.add('hidden');
        return;
    }
    previewCard.classList.remove('hidden');

    const allowText = document.getElementById('allow-text-personalisation').checked;
    const textLabel = document.getElementById('text-personalisation-label').value.trim();
    const textLimit = document.getElementById('text-personalisation-limit').value;

    const allowColor = document.getElementById('allow-color-choices').checked;
    const colors = document.getElementById('color-choices-input').value.trim();

    const allowImage = document.getElementById('allow-image-upload').checked;
    const imageNotes = document.getElementById('image-upload-notes').value.trim();

    const allowNotes = document.getElementById('allow-additional-notes').checked;
    const fee = document.getElementById('customisation-fee').value || 0;

    let html = '';
    if (allowText) {
        html += `<div class="flex items-center gap-2 text-forest"><span class="material-symbols-outlined text-sm">check</span>Text Personalisation: <strong>"${textLabel || 'Personalisation Text'}"</strong> (Max ${textLimit} chars)</div>`;
    }
    if (allowColor) {
        html += `<div class="flex items-center gap-2 text-forest"><span class="material-symbols-outlined text-sm">check</span>Color Choices: <strong>"${colors || 'Any color'}"</strong></div>`;
    }
    if (allowImage) {
        html += `<div class="flex items-center gap-2 text-forest"><span class="material-symbols-outlined text-sm">check</span>Image Upload: <strong>Enabled</strong> ("${imageNotes || 'Seller Instructions'}")</div>`;
    }
    if (allowNotes) {
        html += `<div class="flex items-center gap-2 text-forest"><span class="material-symbols-outlined text-sm">check</span>Additional Special Notes: <strong>Allowed</strong></div>`;
    }
    html += `<div class="mt-2 pt-2 border-t border-sage/20 text-primary font-bold">Extra Fee: ₹${fee}</div>`;

    if (!allowText && !allowColor && !allowImage && !allowNotes) {
        html = '<div class="text-rose-500 italic">No customisation options configured yet. Set some options above.</div>';
    }

    document.getElementById('preview-summary-content').innerHTML = html;
}

function initCustomisationSuite() {
    const radioPremade = document.getElementById('type-premade');
    const radioCustom = document.getElementById('type-customisable');
    const panel = document.getElementById('customisation-panel');
    const labelPremade = document.getElementById('label-premade');
    const labelCustom = document.getElementById('label-custom');

    function togglePanel() {
        if (radioCustom && radioCustom.checked) {
            if (panel) panel.classList.remove('hidden');
            if (labelCustom) labelCustom.classList.add('border-forest', 'bg-sage/5');
            if (labelPremade) labelPremade.classList.remove('border-forest', 'bg-sage/5');
        } else {
            if (panel) panel.classList.add('hidden');
            if (labelPremade) labelPremade.classList.add('border-forest', 'bg-sage/5');
            if (labelCustom) labelCustom.classList.remove('border-forest', 'bg-sage/5');
        }
        updateCustomisationPreview();
    }

    if (radioPremade) radioPremade.addEventListener('change', togglePanel);
    if (radioCustom) radioCustom.addEventListener('change', togglePanel);

    // Sub-sections toggles
    const allowTextCheckbox = document.getElementById('allow-text-personalisation');
    const textDetails = document.getElementById('text-personalisation-details');
    if (allowTextCheckbox && textDetails) {
        allowTextCheckbox.addEventListener('change', () => {
            if (allowTextCheckbox.checked) textDetails.classList.remove('hidden');
            else textDetails.classList.add('hidden');
            updateCustomisationPreview();
        });
    }

    const allowColorCheckbox = document.getElementById('allow-color-choices');
    const colorDetails = document.getElementById('color-choices-details');
    if (allowColorCheckbox && colorDetails) {
        allowColorCheckbox.addEventListener('change', () => {
            if (allowColorCheckbox.checked) colorDetails.classList.remove('hidden');
            else colorDetails.classList.add('hidden');
            updateCustomisationPreview();
        });
    }

    const allowImageCheckbox = document.getElementById('allow-image-upload');
    const imageDetails = document.getElementById('image-upload-details');
    if (allowImageCheckbox && imageDetails) {
        allowImageCheckbox.addEventListener('change', () => {
            if (allowImageCheckbox.checked) imageDetails.classList.remove('hidden');
            else imageDetails.classList.add('hidden');
            updateCustomisationPreview();
        });
    }

    const allowNotesCheckbox = document.getElementById('allow-additional-notes');
    if (allowNotesCheckbox) {
        allowNotesCheckbox.addEventListener('change', updateCustomisationPreview);
    }

    const textLabelEl = document.getElementById('text-personalisation-label');
    if (textLabelEl) textLabelEl.addEventListener('input', updateCustomisationPreview);

    const textLimitEl = document.getElementById('text-personalisation-limit');
    if (textLimitEl) textLimitEl.addEventListener('input', updateCustomisationPreview);

    const colorChoicesEl = document.getElementById('color-choices-input');
    if (colorChoicesEl) colorChoicesEl.addEventListener('input', updateCustomisationPreview);

    const imageNotesEl = document.getElementById('image-upload-notes');
    if (imageNotesEl) imageNotesEl.addEventListener('input', updateCustomisationPreview);

    const feeEl = document.getElementById('customisation-fee');
    if (feeEl) feeEl.addEventListener('input', updateCustomisationPreview);

    // Initial trigger
    togglePanel();
}

// Load draft
async function loadDetailsDraft() {
    const draftId = sessionStorage.getItem('draft_id');
    if (!draftId) return;

    const token = sessionStorage.getItem('access_token') || sessionStorage.getItem('tohfa_access_token');
    try {
        const res = await fetch(`${API_BASE}/api/seller/listings/${draftId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const resp = await res.json();
            const listing = resp.data || resp;
            titleInput.value = listing.title || '';
            charCountSpan.textContent = `${titleInput.value.length}/80 characters`;
            document.getElementById('listing-description').value = listing.description || '';
            
            // Load dimensions & weight
            document.getElementById('length-input').value = listing.length_cm !== null && listing.length_cm !== undefined ? listing.length_cm : '';
            document.getElementById('width-input').value = listing.width_cm !== null && listing.width_cm !== undefined ? listing.width_cm : '';
            document.getElementById('height-input').value = listing.height_cm !== null && listing.height_cm !== undefined ? listing.height_cm : '';
            
            const weightVal = listing.weight_g !== null && listing.weight_g !== undefined ? listing.weight_g : (listing.weight_grams !== null && listing.weight_grams !== undefined ? listing.weight_grams : '');
            document.getElementById('weight-input').value = weightVal;
            
            // Select Category & Subcategories
            if (listing.category_id) {
                selectedCategoryId = listing.category_id;
                document.getElementById('category-select').value = listing.category_id;
            } else if (listing.category) {
                const catObj = categoriesList.find(c => (c.display_name || c.name).toLowerCase() === listing.category.toLowerCase());
                if (catObj) {
                    selectedCategoryId = catObj.id;
                    document.getElementById('category-select').value = catObj.id;
                }
            }
            
            if (listing.subcategories) {
                selectedSubcategoryIds = listing.subcategories.map(sc => sc.id || sc);
            }
            
            // Trigger change to populate subcategories select dropdown
            document.getElementById('category-select').dispatchEvent(new Event('change'));

            const subcatSelect = document.getElementById('subcategory-select');
            if (subcatSelect && selectedSubcategoryIds.length > 0) {
                subcatSelect.value = selectedSubcategoryIds[0];
            }

            // Tags
            if (listing.tags) {
                tagsList = Array.isArray(listing.tags) ? listing.tags : JSON.parse(listing.tags || '[]');
                renderTags();
            }

            // Pre-fill Product Type & Customisation Options
            const isCust = listing.isCustomisable || listing.listing_type === 'custom';
            if (isCust) {
                document.getElementById('type-customisable').checked = true;
            } else {
                document.getElementById('type-premade').checked = true;
            }

            const config = listing.customization_config || {};
            
            document.getElementById('allow-text-personalisation').checked = !!config.allow_text;
            document.getElementById('text-personalisation-label').value = config.text_label || '';
            document.getElementById('text-personalisation-limit').value = config.text_limit || 20;

            document.getElementById('allow-color-choices').checked = !!config.allow_color;
            document.getElementById('color-choices-input').value = Array.isArray(config.colors) ? config.colors.join(', ') : (config.colors || '');

            document.getElementById('allow-image-upload').checked = !!config.allow_image;
            document.getElementById('image-upload-notes').value = config.image_notes || '';

            document.getElementById('allow-additional-notes').checked = !!config.allow_notes;
            document.getElementById('customisation-fee').value = config.extra_fee_rupees || 0;

            // Sync UI visibility
            const radioCustom = document.getElementById('type-customisable');
            const radioPremade = document.getElementById('type-premade');
            const panel = document.getElementById('customisation-panel');
            const labelPremade = document.getElementById('label-premade');
            const labelCustom = document.getElementById('label-custom');

            if (isCust) {
                panel.classList.remove('hidden');
                labelCustom.classList.add('border-forest', 'bg-sage/5');
                labelPremade.classList.remove('border-forest', 'bg-sage/5');
                if (config.allow_text) document.getElementById('text-personalisation-details').classList.remove('hidden');
                if (config.allow_color) document.getElementById('color-choices-details').classList.remove('hidden');
                if (config.allow_image) document.getElementById('image-upload-details').classList.remove('hidden');
            } else {
                panel.classList.add('hidden');
                labelPremade.classList.add('border-forest', 'bg-sage/5');
                labelCustom.classList.remove('border-forest', 'bg-sage/5');
            }
            updateCustomisationPreview();
        }
    } catch (err) {
        console.error('Error loading details draft:', err);
    }
}

async function saveDetails(shouldRedirect) {
    const title = titleInput.value.trim();
    const description = document.getElementById('listing-description').value.trim();
    const lengthVal = document.getElementById('length-input').value.trim();
    const widthVal = document.getElementById('width-input').value.trim();
    const heightVal = document.getElementById('height-input').value.trim();
    const weightVal = document.getElementById('weight-input').value.trim();

    const length_cm = lengthVal ? parseFloat(lengthVal) : null;
    const width_cm = widthVal ? parseFloat(widthVal) : null;
    const height_cm = heightVal ? parseFloat(heightVal) : null;
    const weight_g = weightVal ? parseInt(weightVal, 10) : null;

    if (!title) {
        showToast('Title is required.', 'error');
        titleInput.focus();
        titleInput.classList.add('border-red-400');
        setTimeout(() => titleInput.classList.remove('border-red-400'), 2500);
        return;
    }

    const categorySelectEl = document.getElementById('category-select');
    const selectedCategoryIdVal = categorySelectEl.value;
    if (!selectedCategoryIdVal) {
        showToast('Please select a category before continuing.', 'error');
        categorySelectEl.focus();
        return;
    }

    const catObj = categoriesList.find(c => String(c.id) === String(selectedCategoryIdVal));
    const categoryName = catObj ? (catObj.display_name || catObj.name) : '';
    const subcatIds = selectedSubcategoryIds;

    let product_tag = null;
    const draftId = sessionStorage.getItem('draft_id');
    const token = sessionStorage.getItem('access_token') || sessionStorage.getItem('tohfa_access_token');
    const isCustomisable = document.getElementById('type-customisable').checked;
    const customization_config = {
        allow_text: document.getElementById('allow-text-personalisation').checked,
        text_label: document.getElementById('text-personalisation-label').value.trim(),
        text_limit: parseInt(document.getElementById('text-personalisation-limit').value, 10) || 0,
        allow_color: document.getElementById('allow-color-choices').checked,
        colors: document.getElementById('color-choices-input').value.split(',').map(c => c.trim()).filter(Boolean),
        allow_image: document.getElementById('allow-image-upload').checked,
        image_notes: document.getElementById('image-upload-notes').value.trim(),
        allow_notes: document.getElementById('allow-additional-notes').checked,
        extra_fee_rupees: parseFloat(document.getElementById('customisation-fee').value) || 0
    };

    if (!token) {
        showToast('Details validated! (Offline mode)', 'success');
        if (shouldRedirect) {
            window.location.href = 'listing-photos.html';
        }
        return;
    }

    let url = `${API_BASE}/api/seller/listings`;
    let method = 'POST';
    let bodyPayload = {
        title,
        description: description,
        story: null,
        category: categoryName,
        category_id: parseInt(selectedCategoryIdVal, 10),
        subcategory_ids: subcatIds,
        tags: tagsList,
        status: 'draft',
        isCustomisable,
        customization_config,
        product_tag,
        length_cm,
        width_cm,
        height_cm,
        weight_g,
        weight_grams: weight_g,
        base_price: 0
    };

    if (draftId) {
        url = `${API_BASE}/api/seller/listings/${draftId}`;
        method = 'PUT';
    }

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bodyPayload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to save listing details');

        const newDraftId = draftId || data.data.listing_id || data.data.id;
        if (newDraftId) {
            sessionStorage.setItem('draft_id', newDraftId);
        }

        showToast('Details saved as draft!', 'success');
        if (shouldRedirect) {
            window.location.href = 'listing-photos.html';
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    // Resolve DOM elements
    categorySelect = document.getElementById('category-select');
    subcategoriesWrapper = document.getElementById('subcategories-wrapper');
    subcategoryDropdownBtn = document.getElementById('subcategory-dropdown-btn');
    subcategoryDropdownMenu = document.getElementById('subcategory-dropdown-menu');
    subcategoryDropdownLabel = document.getElementById('subcategory-dropdown-label');
    subcategoryDropdownArrow = document.getElementById('subcategory-dropdown-arrow');
    tagInput = document.getElementById('tag-input');
    tagsContainer = document.getElementById('tags-container');
    titleInput = document.getElementById('listing-title');
    charCountSpan = document.getElementById('title-char-count');

    // Toggle dropdown open/close
    if (subcategoryDropdownBtn && subcategoryDropdownMenu && subcategoryDropdownArrow) {
        subcategoryDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = !subcategoryDropdownMenu.classList.contains('hidden');
            if (isOpen) {
                subcategoryDropdownMenu.classList.add('hidden');
                subcategoryDropdownArrow.classList.remove('rotate-180');
            } else {
                subcategoryDropdownMenu.classList.remove('hidden');
                subcategoryDropdownArrow.classList.add('rotate-180');
            }
        });
    }

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (subcategoryDropdownMenu && !subcategoryDropdownMenu.classList.contains('hidden')) {
            if (!subcategoryDropdownMenu.contains(e.target) && !subcategoryDropdownBtn.contains(e.target)) {
                subcategoryDropdownMenu.classList.add('hidden');
                subcategoryDropdownArrow.classList.remove('rotate-180');
            }
        }
    });

    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            const catId = this.value;
            if (String(selectedCategoryId) !== String(catId)) {
                selectedSubcategoryIds = [];
            }
            selectedCategoryId = catId;

            // Standard Subcategory select element population
            const subcatSelect = document.getElementById('subcategory-select');
            const subcatContainer = document.getElementById('subcategory-container');
            if (subcatSelect && subcatContainer) {
                subcatSelect.innerHTML = '<option value="">Select a Subcategory</option>';
                const selectedCat = categoriesList.find(c => String(c.id) === String(catId));
                if (selectedCat && selectedCat.subcategories && selectedCat.subcategories.length > 0) {
                    selectedCat.subcategories.forEach(sub => {
                        const opt = document.createElement('option');
                        opt.value = sub.id;
                        opt.textContent = sub.name;
                        if (selectedSubcategoryIds.includes(sub.id)) {
                            opt.selected = true;
                        }
                        subcatSelect.appendChild(opt);
                    });
                    subcatContainer.style.display = 'block';
                } else {
                    subcatContainer.style.display = 'none';
                }
            }

            // Also populate the old custom checkboxes dropdown, just in case
            populateSubcategoriesDropdown(catId);
        });
    }

    const subcatSelect = document.getElementById('subcategory-select');
    if (subcatSelect) {
        subcatSelect.addEventListener('change', function() {
            const val = parseInt(this.value, 10);
            if (val) {
                selectedSubcategoryIds = [val];
            } else {
                selectedSubcategoryIds = [];
            }
        });
    }

    if (tagInput) {
        tagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
            }
        });
    }

    const addTagIcon = document.getElementById('add-tag-icon');
    if (addTagIcon) {
        addTagIcon.addEventListener('click', addTag);
    }

    if (titleInput && charCountSpan) {
        titleInput.addEventListener('input', () => {
            const len = titleInput.value.length;
            charCountSpan.textContent = `${len}/80 characters`;
        });
    }

    const zaiCard = document.getElementById('zai-card');
    if (zaiCard) {
        zaiCard.addEventListener('click', () => {
            const title = titleInput ? titleInput.value.trim() : '';
            document.getElementById('listing-description').value = `This exquisite handcrafted piece${title ? ', ' + title : ''}, is created with carefully selected natural elements preserved in crystal clear resin. Sourced from local woodlands, the delicate structures reflect slow design principles. Perfectly captured to bring organic warmth and the quiet luxury of nature to your home space.`;
            showToast('ZAI narrative generated based on title!', 'success');
        });
    }

    const saveDraftBtn = document.getElementById('save-draft-btn');
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', () => {
            const token = sessionStorage.getItem('access_token') || sessionStorage.getItem('tohfa_access_token');
            if (!token) {
                showToast('Draft details saved successfully (offline mode)!', 'success');
                return;
            }
            saveDetails(false);
        });
    }

    const nextStepBtn = document.getElementById('next-step-btn');
    if (nextStepBtn) {
        nextStepBtn.addEventListener('click', () => {
            saveDetails(true);
        });
    }

    const headerSaveBtn = document.getElementById('header-save-draft-btn');
    if (headerSaveBtn) {
        headerSaveBtn.addEventListener('click', () => {
            const token = sessionStorage.getItem('access_token') || sessionStorage.getItem('tohfa_access_token');
            if (!token) {
                showToast('Draft details saved successfully (offline mode)!', 'success');
                return;
            }
            saveDetails(false);
        });
    }

    const headerNextBtn = document.getElementById('header-next-step-btn');
    if (headerNextBtn) {
        headerNextBtn.addEventListener('click', () => {
            saveDetails(true);
        });
    }

    const headerBackBtn = document.getElementById('header-back-btn');
    if (headerBackBtn) {
        headerBackBtn.addEventListener('click', () => {
            window.location.href = 'catalog.html';
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const drawer = document.getElementById('listing-drawer');
            if (drawer) drawer.classList.add('translate-y-full');
        }
    });

    // Load categories first to guarantee dropdown renders
    try {
        await initCategoriesAndSubcategories();
    } catch (err) {
        console.error('Failed categories load in DOMContentLoaded:', err);
    }

    try {
        initCustomisationSuite();
    } catch (err) {
        console.error('Failed customisation suite init in DOMContentLoaded:', err);
    }

    try {
        await loadDetailsDraft();
    } catch (err) {
        console.error('Failed draft details load in DOMContentLoaded:', err);
    }

    const sidebar = document.querySelector('seller-sidebar');
    if (sidebar) {
      sidebar.addEventListener('click', async (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href) return;
        if (hasUnsavedWork()) {
          e.preventDefault();
          await autoSaveDraft();
          showToast('Progress auto-saved as draft ✦', 'success');
          setTimeout(() => { window.location.href = href; }, 700);
        }
      });
    }
});

function hasUnsavedWork() {
  const title = document.getElementById('listing-title') || document.querySelector('input[type="text"]');
  return !!sessionStorage.getItem('draft_id') || (title && title.value.trim().length > 0);
}
async function autoSaveDraft() {
  try { await saveDetails(false); } catch(e) { console.warn('Auto-save failed:', e); }
}
