# Prompt: Custom Order Panel Behavior Refinement (Seller Messages)

Refine the behavior of the right-hand Custom Order panel (`aside#right-panel`) on the Seller Studio Messages page to meet the following requirements. This task is purely frontend-scoped and must be applied consistently across both desktop and mobile views.

---

## 📂 Target Files
1. **Desktop View:** [messages.html](file:///c:/Users/ACER/OneDrive/Desktop/antigravity_workspace/TohfaHub_project-1/frontend/seller/messages.html)
2. **Mobile View:** [messages.html](file:///c:/Users/ACER/OneDrive/Desktop/antigravity_workspace/TohfaHub_project-1/frontend/mobile-seller/messages.html)

---

## 📋 Acceptance Checklist

- [ ] **Hidden by Default:** The right panel (`aside#right-panel`) must start in a closed/hidden state by default on all screen sizes, including desktop (large screens >= `1280px`).
- [ ] **Toggle Button:** Clicking the "Custom Order" button (`#btn-custom-order-toggle`) in the chat header must open/toggle the custom order panel.
- [ ] **Persistent Sidebar on Thread Switch:** If the custom order panel is open and the seller switches to a different conversation thread, the panel must remain open.
- [ ] **Dynamic Data Updating:** When switching conversation threads, the form fields in the custom order panel must update dynamically with the new conversation's data:
  - If the new conversation has an active offer (`data.active_offer` is present), populate the form fields with that offer's details and update the notes character counter.
  - If the new conversation has NO active offer, reset the form fields, clear the hidden offer ID input, and reset the notes character counter to `0/300`.
- [ ] **Desktop Closing Rules:** Clicking outside the panel (e.g., clicking the backdrop or chat log area) on desktop must NOT close the panel. Closing on desktop must require clicking the explicit close (`X`) button on the panel, or clicking the header's toggle button.
- [ ] **Mobile Closing Rules:** On mobile, clicking the dark backdrop (`#right-panel-backdrop`) must still close the panel.
- [ ] **Surgical Edits:** No sibling HTML nodes or structural layout elements are deleted or overwritten. Unrelated UI styling remains untouched.

---

## 🛠️ Step-by-Step Implementation Instructions

### 1. Update RIGHT PANEL Sidebar Initial Classes
In both `frontend/seller/messages.html` and `frontend/mobile-seller/messages.html`, locate the sidebar container `aside#right-panel`.
- **Change:** Remove `xl:translate-x-0` and `xl:flex` from its class list.
- **Result:** The class list should start with `translate-x-full` and `hidden` to ensure it is hidden by default on all screen sizes.
- **Reference:**
  ```html
  <!-- Before -->
  <aside id="right-panel" class="w-[360px] ... translate-x-full xl:translate-x-0 xl:flex hidden">
  
  <!-- After -->
  <aside id="right-panel" class="w-[360px] ... translate-x-full hidden">
  ```

### 2. Update Form Fields on Conversation Switch
In both `messages.html` files, locate the `loadConversation(id)` function.
Inside this function, find the conditional check for `data.active_offer` under the `else` branch of `if (isConcierge)` (or whichever branch manages the custom order form display).
- **Change:** Add an `else` block to clear the form when `data.active_offer` is not present, ensuring that old conversation offer data is not leaked or retained when switching to a thread with no active offer.
- **Reference implementation details:**
  ```javascript
  if (data.active_offer) {
    document.getElementById('form-offer-id').value = data.active_offer.id;
    document.getElementById('form-product-name').value = data.active_offer.product_name || '';
    document.getElementById('form-price').value = data.active_offer.price || '';
    document.getElementById('form-quantity').value = data.active_offer.quantity || 1;
    document.getElementById('form-delivery-date').value = data.active_offer.delivery_date || '';
    document.getElementById('form-custom-notes').value = data.active_offer.custom_notes || '';
    document.getElementById('form-expiry').value = data.active_offer.expiry_hours || 48;
    updateCharCounter(document.getElementById('form-custom-notes'));
  } else {
    // Reset/clear the custom order form fields when there is no active offer
    const orderForm = document.getElementById('custom-order-form');
    if (orderForm) {
      orderForm.reset();
    }
    const offerIdInput = document.getElementById('form-offer-id');
    if (offerIdInput) {
      offerIdInput.value = '';
    }
    const notesInput = document.getElementById('form-custom-notes');
    if (notesInput) {
      notesInput.value = '';
      updateCharCounter(notesInput);
    }
  }
  ```

### 3. Verify Backdrop and Outside Clicking Behavior
Verify that `#right-panel-backdrop` has classes that hide it on desktop screens (e.g. `xl:hidden`). This prevents a backdrop layer from rendering on desktop, allowing the seller to interact with the chat log while the panel is open, and preventing clicks on the chat log area from triggering the backdrop click handler (`toggleRightPanel()`). No further JavaScript click listeners should be attached to the window or document for closing the panel on desktop.

---

## 🧪 Verification Plan

### Automated Verification
- Run a build step to ensure no syntax errors are introduced:
  ```bash
  npm run build
  ```

### Manual Verification
1. **Initial State:** Load the Messages page on desktop and mobile. Verify that the "Custom Order" right panel is NOT visible on page load.
2. **Toggle Click:** Click the "Custom Order" button in the chat header. The panel should slide in/show up smoothly.
3. **Thread Selection Switch (With Offer):**
   - Open the panel.
   - Switch to a thread that has an active custom offer.
   - Verify the panel remains open and the form fields dynamically update with the selected thread's active offer values.
4. **Thread Selection Switch (Without Offer):**
   - With the panel open, switch to a thread that has no active custom offer.
   - Verify the panel remains open and the form fields are cleared/reset to empty defaults (notes char counter showing `0/300`).
5. **Closing Behavior (Desktop):**
   - Open the panel on desktop (viewport >= 1280px).
   - Click inside the chat log, send a text message, or click on the sidebar threads list. Verify that the panel remains open (does not close).
   - Click the "Close" (`X`) button in the panel's header, or click the "Custom Order" button in the header again. Verify that the panel closes.
6. **Closing Behavior (Mobile):**
   - Open the panel on mobile view (viewport < 1280px).
   - Verify the dark backdrop overlay is visible.
   - Tap/click the backdrop overlay. Verify that the panel closes.
