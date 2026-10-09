// "I want software for my business" enquiry dialog (100% client-side, zero secrets)
const dlg = document.getElementById('enq-dialog');
if (dlg) init();

function init() {
  const form = document.getElementById('enq-form');
  const errorEl = document.getElementById('enq-error');
  const sendBtn = document.getElementById('enq-send');

  const open = () => {
    errorEl.hidden = true;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    form.querySelector('[name="message"]')?.focus({ preventScroll: true });
  };

  for (const btn of document.querySelectorAll('[data-enq="open"]')) btn.addEventListener('click', open);
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-enq="close"]')) dlg.close();
  });
  if (location.hash === '#software-enquiry') setTimeout(open, 300);

  const showError = (msg) => {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const clean = k => String(data[k] || '').trim().slice(0, k === 'message' ? 2000 : 120);
    const message = clean('message');
    const email = clean('email');
    const phone = clean('phone');
    const name = clean('name');

    if (data.company) { done(); return; } // honeypot
    if (message.length < 5) return showError('Please tell us a little about what you need.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && phone.replace(/\D/g, '').length < 7) {
      return showError('Please add an email address or a phone number so we can reply.');
    }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Opening email client…';
    try {
      const subject = encodeURIComponent(`Software enquiry from ${name || 'Flipkart Seller'}`);
      const body = encodeURIComponent(`Name: ${name || 'N/A'}\nEmail: ${email || 'N/A'}\nPhone: ${phone || 'N/A'}\n\nRequirements:\n${message}\n`);
      window.open(`mailto:mannan.official@gmail.com?subject=${subject}&body=${body}`, '_blank');
      done();
    } catch {
      done();
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send enquiry';
    }
  });

  function done() {
    const card = dlg.querySelector('.enq-card');
    card.innerHTML = `
      <div class="enq-done">
        <span class="enq-tick" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>
        </span>
        <h2>Enquiry submitted!</h2>
        <p>Thank you for reaching out. We will get back to you shortly.</p>
        <button type="button" class="btn btn-primary" data-enq="close">Close</button>
      </div>`;
  }
}
