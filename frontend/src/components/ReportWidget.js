// ReportWidget.js — Floating "Report a Problem" Feedback Widget
(function() {
  // Prevent double rendering
  if (document.getElementById('tohfa-report-widget-btn')) return;

  function initReportWidget() {
    // 1. Create floating button
    const btn = document.createElement('button');
    btn.id = 'tohfa-report-widget-btn';
    btn.className = 'fixed bottom-5 right-5 z-[9999] flex items-center gap-2 px-5 py-3 rounded-full bg-[#3D6B4F] hover:bg-[#2a4d38] text-white shadow-lg active:scale-95 duration-200 transition-all cursor-pointer border-none font-sans';
    btn.style.fontFamily = "'DM Sans', sans-serif";
    btn.innerHTML = `
      <span class="material-symbols-outlined text-[20px] fill-current">flag</span>
      <span style="font-size: 16px; font-weight: 700; letter-spacing: 0.02em;">Report a Problem</span>
    `;
    document.body.appendChild(btn);

    // 2. Create Modal Overlay Container
    const modal = document.createElement('div');
    modal.id = 'tohfa-report-widget-modal';
    modal.className = 'fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 opacity-0 pointer-events-none transition-all duration-300';
    modal.style.backdropFilter = 'blur(4px)';

    modal.innerHTML = `
      <div class="bg-white rounded-2xl w-full max-w-[480px] p-8 shadow-2xl relative mx-4 transform scale-95 transition-all duration-300" style="font-family: 'DM Sans', sans-serif; background: #FFFFFF; border: 1px solid #D9D4CB;">
        <button id="tohfa-report-widget-close" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-all border-none bg-transparent cursor-pointer flex items-center justify-center">
          <span class="material-symbols-outlined text-[24px]">close</span>
        </button>

        <div id="tohfa-report-widget-form-container">
          <h2 class="font-display text-[#3D6B4F] mb-2 font-serif text-[28px] italic leading-tight" style="font-family: 'Playfair Display', Georgia, serif;">Something wrong? Tell us.</h2>
          <p class="text-[15px] text-[#4A4A4A] mb-6 leading-relaxed" style="font-family: 'DM Sans', sans-serif;">We read every report. Your feedback shapes Tohfa.</p>

          <form id="tohfa-report-widget-form" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-[#3D6B4F] uppercase tracking-wider mb-1">Subject</label>
              <input type="text" id="report-subject" required placeholder="e.g. Broken link, payment issue" class="w-full px-4 py-2 border border-[#D9D4CB] rounded-xl focus:outline-none focus:border-[#3D6B4F] text-sm bg-[#F7F3EC]/30" style="font-family: 'DM Sans', sans-serif;" />
            </div>

            <div>
              <label class="block text-xs font-bold text-[#3D6B4F] uppercase tracking-wider mb-1">Related To</label>
              <select id="report-related-type" class="w-full px-4 py-2 border border-[#D9D4CB] rounded-xl focus:outline-none focus:border-[#3D6B4F] text-sm bg-white" style="font-family: 'DM Sans', sans-serif;">
                <option value="other">Something Else</option>
                <option value="order">An Order</option>
                <option value="seller">A Seller</option>
                <option value="product">A Product</option>
              </select>
            </div>

            <div id="report-ref-id-container" class="hidden">
              <label id="report-ref-id-label" class="block text-xs font-bold text-[#3D6B4F] uppercase tracking-wider mb-1">Reference ID (optional)</label>
              <input type="text" id="report-related-id" placeholder="e.g. Order number, product ID" class="w-full px-4 py-2 border border-[#D9D4CB] rounded-xl focus:outline-none focus:border-[#3D6B4F] text-sm bg-[#F7F3EC]/30" style="font-family: 'DM Sans', sans-serif;" />
            </div>

            <div>
              <label class="block text-xs font-bold text-[#3D6B4F] uppercase tracking-wider mb-1">What went wrong?</label>
              <textarea id="report-description" required rows="4" placeholder="Describe the issue in detail..." class="w-full px-4 py-2 border border-[#D9D4CB] rounded-xl focus:outline-none focus:border-[#3D6B4F] text-sm bg-[#F7F3EC]/30" style="font-family: 'DM Sans', sans-serif; resize: none;"></textarea>
            </div>

            <button type="submit" id="tohfa-report-submit-btn" class="w-full py-3 bg-[#3D6B4F] hover:bg-[#2a4d38] text-white rounded-full text-[15px] font-bold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border-none flex items-center justify-center gap-2" style="font-family: 'DM Sans', sans-serif;">
              <span>Send Report</span>
            </button>
          </form>
        </div>

        <div id="tohfa-report-widget-success-container" class="hidden text-center py-6">
          <span class="material-symbols-outlined text-[#3D6B4F] text-6xl mb-4" style="font-variation-settings: 'FILL' 1;">check_circle</span>
          <h2 class="text-[#3D6B4F] font-serif text-[24px] italic mb-2" style="font-family: 'Playfair Display', Georgia, serif;">Thank you.</h2>
          <p class="text-[15px] text-[#4A4A4A] leading-relaxed max-w-[320px] mx-auto" style="font-family: 'DM Sans', sans-serif;">We've received your report. We'll look into it shortly.</p>
          <button id="tohfa-report-widget-success-close" class="mt-6 px-6 py-2 border border-[#3D6B4F] text-[#3D6B4F] hover:bg-[#3D6B4F] hover:text-white rounded-full text-[13px] font-bold transition-all cursor-pointer bg-transparent" style="font-family: 'DM Sans', sans-serif;">
            Close
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const formContainer = modal.querySelector('#tohfa-report-widget-form-container');
    const successContainer = modal.querySelector('#tohfa-report-widget-success-container');
    const form = modal.querySelector('#tohfa-report-widget-form');
    const relatedTypeSelect = modal.querySelector('#report-related-type');
    const refContainer = modal.querySelector('#report-ref-id-container');
    const refLabel = modal.querySelector('#report-ref-id-label');

    // 3. Show/Close handlers
    function openModal() {
      // Reset state
      form.reset();
      refContainer.classList.add('hidden');
      formContainer.classList.remove('hidden');
      successContainer.classList.add('hidden');

      modal.classList.remove('pointer-events-none', 'opacity-0');
      modal.querySelector('.transform').classList.remove('scale-95');
      modal.querySelector('.transform').classList.add('scale-100');
    }

    function closeModal() {
      modal.classList.add('pointer-events-none', 'opacity-0');
      modal.querySelector('.transform').classList.remove('scale-100');
      modal.querySelector('.transform').classList.add('scale-95');
    }

    btn.addEventListener('click', openModal);
    modal.querySelector('#tohfa-report-widget-close').addEventListener('click', closeModal);
    modal.querySelector('#tohfa-report-widget-success-close').addEventListener('click', closeModal);

    // Hide if click outside modal body
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // 4. Related type change handler to show Ref ID input
    relatedTypeSelect.addEventListener('change', (e) => {
      const type = e.target.value;
      if (type === 'other') {
        refContainer.classList.add('hidden');
      } else {
        refContainer.classList.remove('hidden');
        refLabel.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} ID (optional)`;
      }
    });

    // 5. Submit Form
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('#tohfa-report-submit-btn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Sending...</span>';

      // Gather current user context if logged in
      let reporter_id = null;
      let reporter_type = 'anonymous';
      const userStr = sessionStorage.getItem('tohfa_user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          reporter_id = user.id || user.user_id;
          reporter_type = user.role || 'buyer';
        } catch (err) {}
      }

      const payload = {
        reporter_id,
        reporter_type,
        subject: form.querySelector('#report-subject').value,
        related_to_type: relatedTypeSelect.value,
        related_to_id: form.querySelector('#report-related-id').value || null,
        description: form.querySelector('#report-description').value
      };

      try {
        const res = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          formContainer.classList.add('hidden');
          successContainer.classList.remove('hidden');
        } else {
          const errData = await res.json();
          alert(errData.message || 'Failed to submit report. Please try again.');
        }
      } catch (err) {
        console.error('Report submission error:', err);
        alert('Could not submit report. Check your internet connection.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Send Report</span>';
      }
    });
  }

  // Run init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReportWidget);
  } else {
    initReportWidget();
  }
})();
