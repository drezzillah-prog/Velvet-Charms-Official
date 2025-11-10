// Scroll to products
function scrollToSection(id) {
  document.getElementById(id).scrollIntoView({ behavior: "smooth" });
}

// Gold heart toggle
document.querySelectorAll('.love-btn').forEach(btn => {
  btn.addEventListener('click', () => btn.classList.toggle('active'));
});

// Gift box modal
document.querySelector('#addBox')?.addEventListener('change', e => {
  if (e.target.checked) {
    showModal("🎁 Festive Gift Box added to your order!");
  }
});

// Velvet modal logic
function showModal(message) {
  const modal = document.createElement('div');
  modal.className = 'velvet-modal';
  modal.innerHTML = `
    <div class="velvet-modal-content">
      <p>${message}</p>
      <button id="closeModal">Got it 💫</button>
    </div>
  `;
  document.body.appendChild(modal);
  document.querySelector('#closeModal').addEventListener('click', () => modal.remove());
  setTimeout(() => modal.remove(), 4000);
}

// Formspree handler
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form[action*='formspree.io']");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const res = await fetch(form.action, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" }
      });
      if (res.ok) {
        showModal("✨ Thank you! Your idea has been sent — we’ll get back to you soon.");
        form.reset();
      } else {
        showModal("⚠️ Oops! Something went wrong. Please try again later.");
      }
    });
  }
});
