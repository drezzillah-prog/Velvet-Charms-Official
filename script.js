// script.js - updated
// Assumes you have elements in HTML like: #product-list, #product-view, #categories, etc.
// This is an adaptive script — integrate into your pages where appropriate.

const API = {
  catalogue: '/catalogue.json',
  upload: '/api/upload',
  contact: '/api/contact'
};

let catalogue = null;

// Utility: fetch JSON
async function loadCatalogue() {
  if (catalogue) return catalogue;
  const r = await fetch(API.catalogue + '?_=' + Date.now());
  catalogue = await r.json();
  return catalogue;
}

// Render categories list (simple)
async function renderCategories() {
  const data = await loadCatalogue();
  const list = document.querySelector('#categoriesList');
  if (!list) return;
  list.innerHTML = '';
  data.categories.forEach(c => {
    const el = document.createElement('li');
    el.innerHTML = `<a href="?cat=${encodeURIComponent(c.id)}">${c.name}</a>`;
    list.appendChild(el);
  });
}

// Render product grid for category or all
async function renderProductGrid(categoryId) {
  const data = await loadCatalogue();
  const products = data.products.filter(p => !categoryId || p.category === categoryId);
  const container = document.querySelector('#product-list');
  if (!container) return;
  container.innerHTML = '';
  products.forEach(p => {
    const img = (p.images && p.images[0]) ? p.images[0] : 'top banner picture for candles.png';
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${encodeURI(img)}" alt="${escapeHtml(p.name)}" loading="lazy">
      <h3>${escapeHtml(p.name)}</h3>
      <p class="price">${p.price} ${p.currency || 'USD'}</p>
      <button class="view-btn" data-id="${p.id}">View</button>
    `;
    container.appendChild(card);
  });

  // set up view buttons
  container.querySelectorAll('.view-btn').forEach(b => {
    b.addEventListener('click', e => {
      const id = e.currentTarget.dataset.id;
      showProduct(id);
    });
  });
}

// Show single product view with customization box & upload
async function showProduct(id) {
  const data = await loadCatalogue();
  const p = data.products.find(x => x.id === id);
  if (!p) {
    alert('Product not found');
    return;
  }
  const view = document.querySelector('#product-view');
  if (!view) {
    // fallback: open a modal or new window
    alert(`${p.name}\n\n${p.description}\nPrice: ${p.price} ${p.currency}`);
    return;
  }

  const imagesHtml = (p.images || []).map(src => `<img src="${encodeURI(src)}" alt="${escapeHtml(p.name)}">`).join('');
  view.innerHTML = `
    <div class="product-view-inner">
      <div class="gallery">${imagesHtml || '<img src="top banner picture for candles.png">'}</div>
      <div class="meta">
        <h2>${escapeHtml(p.name)}</h2>
        <p class="desc">${escapeHtml(p.description || '')}</p>
        <p class="price">${p.price} ${p.currency || 'USD'}</p>
        <div class="options"></div>

        <div class="custom-box">
          <h4>Customization & files</h4>
          <p>If you want custom text, reference images or instructions, enter details below. You may attach one image or PDF file (sent to Velvet Charms). Files are handled by the site—we will receive them.</p>
          <textarea id="custom-note" placeholder="Write your customization details..."></textarea>
          <div class="attach-row">
            <input id="custom-file" type="file" accept="image/*,.pdf">
            <button id="upload-file-btn">Upload file</button>
            <span id="upload-status"></span>
          </div>
        </div>

        <div class="actions">
          <button id="buy-now" class="primary">Buy with PayPal</button>
          <button id="send-request" class="secondary">Send customization & attach (save)</button>
        </div>
      </div>
    </div>
  `;

  // upload button
  const fileInput = view.querySelector('#custom-file');
  const uploadBtn = view.querySelector('#upload-file-btn');
  const uploadStatus = view.querySelector('#upload-status');

  let uploadedFileInfo = null;

  uploadBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!fileInput.files || fileInput.files.length === 0) {
      uploadStatus.innerText = 'No file selected';
      return;
    }
    uploadStatus.innerText = 'Uploading...';
    const fd = new FormData();
    fd.append('file', fileInput.files[0]);
    fd.append('productId', p.id);
    fd.append('note', (view.querySelector('#custom-note') || {}).value || '');
    try {
      const res = await fetch(API.upload, { method: 'POST', body: fd });
      const json = await res.json();
      if (json.ok) {
        uploadedFileInfo = json.file;
        uploadStatus.innerText = 'Uploaded ✔';
      } else {
        uploadStatus.innerText = 'Upload failed';
      }
    } catch (err) {
      console.error(err);
      uploadStatus.innerText = 'Upload error';
    }
  });

  // send customization (saves contact record)
  view.querySelector('#send-request').addEventListener('click', async () => {
    const note = (view.querySelector('#custom-note') || {}).value || '';
    const payload = {
      name: 'Customer',
      email: '',
      message: note,
      productId: p.id,
      attachment: uploadedFileInfo ? uploadedFileInfo.path || uploadedFileInfo.name : null
    };
    try {
      const r = await fetch(API.contact, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      if (j.ok) {
        alert('Customization saved — we received your note and file.');
      } else {
        alert('Failed to save customization.');
      }
    } catch (err) {
      console.error(err);
      alert('Error while saving customization.');
    }
  });

  // buy now: open PayPal link (merchant link). Note: If you want the customization data added to PayPal checkout, we need to integrate PayPal SDK / Orders API.
  view.querySelector('#buy-now').addEventListener('click', () => {
    // Open PayPal link in new tab
    if (p.paypalLink && p.paypalLink.includes('paypal.com')) {
      window.open(p.paypalLink, '_blank');
      alert('Tip: When you open PayPal, please include any customization notes in the PayPal notes/message to seller.');
    } else {
      alert('No PayPal link configured for this product.');
    }
  });

  // scroll to view
  view.scrollIntoView({ behavior: 'smooth' });
}

// small helper
function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, function(m) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m];
  });
}

/* Page init - attempt to render based on presence of elements */
document.addEventListener('DOMContentLoaded', async () => {
  // categories list
  renderCategories().catch(console.error);

  // product grid
  const url = new URL(window.location.href);
  const cat = url.searchParams.get('cat');
  await renderProductGrid(cat);

  // if single product id provided like ?product=xxx
  const pid = url.searchParams.get('product');
  if (pid) showProduct(pid);
});
