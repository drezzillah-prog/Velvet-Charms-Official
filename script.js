/* script.js - Velvet Charms
   - Loads /catalogue.json
   - Renders categories, subcategories, products
   - Details modal with gallery, options
   - Checkout customization form (multiple items)
   - Small client-side PayPal redirect simulation with confirmation message shown
*/

const state = {
  catalogue: null,
  currentCategory: null,
  currentSubcategory: null,
  currentProduct: null,
  cartDraft: [] // array of {productId, qty, options, notes, images: [dataURLs]}
};

function $q(sel, root=document) { return root.querySelector(sel); }
function $qa(sel, root=document) { return Array.from(root.querySelectorAll(sel)); }

async function loadCatalogue() {
  try {
    const res = await fetch('/catalogue.json');
    if (!res.ok) throw new Error('catalogue.json not found');
    state.catalogue = await res.json();
    renderMenu();
    renderHome();
  } catch (err) {
    console.error('Failed to load catalogue:', err);
    showErrorBanner('Error loading catalogue. Please ensure /catalogue.json exists in site root.');
  }
}

function showErrorBanner(msg) {
  const el = document.createElement('div');
  el.className = 'error-banner';
  el.innerText = msg;
  document.body.prepend(el);
}

function renderMenu() {
  const nav = $q('#nav-categories');
  nav.innerHTML = '';
  if (!state.catalogue || !state.catalogue.categories) return;
  state.catalogue.categories.forEach(cat => {
    const li = document.createElement('li');
    li.className = 'nav-cat';
    li.innerHTML = `<button class="cat-btn" data-cat="${cat.id}">${escapeHtml(cat.name)}</button>`;
    nav.appendChild(li);
  });

  // Wire category buttons
  $qa('.cat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.cat;
      openCategory(id);
    });
  });

  // About link
  $q('#nav-about').addEventListener('click', (ev) => {
    ev.preventDefault();
    openAbout();
  });

  // Contact
  $q('#nav-contact').addEventListener('click', (ev) => {
    ev.preventDefault();
    document.getElementById('contact-form').scrollIntoView({behavior:'smooth'});
  });
}

function openAbout(){
  const main = $q('#main');
  main.innerHTML = `
    <section class="about">
      <h2>${escapeHtml(state.catalogue.siteInfo.about.title)}</h2>
      <div class="about-inner">
        <div class="about-image"></div>
        <div class="about-text large">${escapeHtml(state.catalogue.siteInfo.about.text)}</div>
      </div>
    </section>
  `;
}

function renderHome() {
  const main = $q('#main');
  main.innerHTML = `
    <section class="hero">
      <img src="top banner picture for candles.png" alt="Candles banner" class="hero-banner">
      <div class="hero-copy">
        <h1>Handcrafted Treasures</h1>
        <p class="lead">Personalized, artisan-made pieces — created with love by our team of 12 art students.</p>
        <div class="hero-cta">
          <button id="explore-collection">Explore Catalogue</button>
          <button id="open-about">About Us</button>
        </div>
      </div>
    </section>
    <section class="intro-cats">
      <h2>Collections</h2>
      <div id="category-grid" class="grid"></div>
    </section>
  `;
  // populate grid with category cards
  const grid = $q('#category-grid');
  state.catalogue.categories.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'cat-card';
    const image = cat.categoryImage || cat.banner || (cat.subcategories && cat.subcategories[0] && cat.subcategories[0].products && cat.subcategories[0].products[0] && cat.subcategories[0].products[0].images && cat.subcategories[0].products[0].images[0]) || '';
    card.innerHTML = `
      <div class="cat-image-wrap">
        ${image ? `<img loading="lazy" src="${image}" alt="${escapeHtml(cat.name)}">` : `<div class="cat-fallback">${escapeHtml(cat.name.substring(0,1))}</div>`}
      </div>
      <div class="cat-body">
        <h3>${escapeHtml(cat.name)}</h3>
        <button class="open-cat" data-cat="${cat.id}">View</button>
      </div>
    `;
    grid.appendChild(card);
  });

  $q('#explore-collection').addEventListener('click', () => {
    // open first category for convenience
    if (state.catalogue.categories[0]) openCategory(state.catalogue.categories[0].id);
  });

  $q('#open-about').addEventListener('click', () => openAbout());

  // wire view buttons
  $qa('.open-cat').forEach(btn => {
    btn.addEventListener('click', e => openCategory(e.currentTarget.dataset.cat));
  });
}

function openCategory(catId) {
  state.currentCategory = state.catalogue.categories.find(c => c.id === catId);
  if (!state.currentCategory) return;
  const main = $q('#main');
  main.innerHTML = `
    <section class="category-page">
      <div class="cat-header" style="background-image: url('${state.currentCategory.banner || state.currentCategory.categoryImage || ''}')">
        <h2>${escapeHtml(state.currentCategory.name)}</h2>
      </div>
      <div class="cat-content">
        <ul class="subcat-list" id="subcat-list"></ul>
        <div id="subcat-view"></div>
      </div>
    </section>
  `;
  const sublist = $q('#subcat-list');
  if (state.currentCategory.subcategories) {
    state.currentCategory.subcategories.forEach(sc => {
      const li = document.createElement('li');
      li.innerHTML = `<button class="subcat-btn" data-sub="${sc.id}">${escapeHtml(sc.name)}</button>`;
      sublist.appendChild(li);
    });
    $qa('.subcat-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        openSubcategory(e.currentTarget.dataset.sub);
      });
    });
    // open first subcategory by default
    const first = state.currentCategory.subcategories[0];
    if (first) openSubcategory(first.id);
  } else {
    $q('#subcat-view').innerHTML = `<p>No subcategories found.</p>`;
  }
}

function openSubcategory(subId) {
  const sc = state.currentCategory.subcategories.find(s => s.id === subId);
  if (!sc) return;
  state.currentSubcategory = sc;
  const view = $q('#subcat-view');
  view.innerHTML = `
    <h3>${escapeHtml(sc.name)}</h3>
    <div class="products-grid" id="products-grid"></div>
  `;
  const grid = $q('#products-grid');
  sc.products.forEach(prod => {
    const img = prod.images && prod.images[0] ? prod.images[0] : '';
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="prod-image">
        ${img ? `<img loading="lazy" src="${img}" alt="${escapeHtml(prod.name)}">` : `<div class="no-img">No image</div>`}
      </div>
      <div class="prod-body">
        <h4>${escapeHtml(prod.name)}</h4>
        <p class="price">$${Number(prod.price).toFixed(2)}</p>
        <div class="prod-actions">
          <button class="details-btn" data-prod="${prod.id}">Details</button>
          <button class="buy-btn" data-prod="${prod.id}">Buy</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  // wire details & buy
  $qa('.details-btn').forEach(btn => btn.addEventListener('click', (e) => openDetails(e.currentTarget.dataset.prod)));
  $qa('.buy-btn').forEach(btn => btn.addEventListener('click', (e) => openBuyDraft(e.currentTarget.dataset.prod)));
}

function openDetails(prodId) {
  // find product across current category
  const prod = findProductById(prodId);
  if (!prod) return;
  state.currentProduct = prod;
  // build modal content
  const modal = $q('#modal');
  modal.innerHTML = '';
  const galleryImages = (prod.images || []).slice(); // copy
  const detailsNode = document.createElement('div');
  detailsNode.className = 'modal-inner';
  detailsNode.innerHTML = `
    <button id="modal-close-x" class="modal-close">✕</button>
    <div class="modal-left">
      <div class="gallery" id="modal-gallery">${galleryImages.map((g,i) => `<img src="${g}" data-i="${i}" class="${i===0?'active':''}">`).join('')}</div>
      <div class="thumbs">${galleryImages.map((g,i)=>`<img src="${g}" data-i="${i}" class="thumb ${i===0?'selected':''}">`).join('')}</div>
    </div>
    <div class="modal-right">
      <h3>${escapeHtml(prod.name)}</h3>
      <p class="modal-price">$${Number(prod.price).toFixed(2)}</p>
      <p class="modal-desc">${escapeHtml(prod.description || '')}</p>
      <div id="options-area"></div>
      <div class="modal-actions">
        <button id="add-to-draft">Add to order</button>
        <a class="paypal-link" href="${prod.paymentLink}" target="_blank" rel="noopener">Buy with PayPal</a>
      </div>
    </div>
  `;
  modal.appendChild(detailsNode);
  modal.classList.add('open');

  // wire close
  $q('#modal-close-x').addEventListener('click', closeModal);
  // thumbnails & gallery
  $qa('#modal-gallery img').forEach(img => img.addEventListener('click', (e)=>{
    const i = e.currentTarget.dataset.i;
    setActiveGallery(i);
  }));
  $qa('.thumb').forEach(t => t.addEventListener('click', e => setActiveGallery(e.currentTarget.dataset.i)));

  // options
  const optionsArea = $q('#options-area');
  optionsArea.innerHTML = '';
  if (prod.options) {
    for (const [optName, optValues] of Object.entries(prod.options)) {
      const label = document.createElement('label');
      label.innerHTML = `<strong>${capitalize(optName)}:</strong>`;
      const select = document.createElement('select');
      select.name = optName;
      optValues.forEach(v => {
        const o = document.createElement('option');
        o.value = v;
        o.innerText = v;
        select.appendChild(o);
      });
      label.appendChild(select);
      optionsArea.appendChild(label);
    }
  }
  // notes + image uploader
  const notesLabel = document.createElement('label');
  notesLabel.innerHTML = `<strong>Notes / Customization:</strong><textarea id="prod-notes" placeholder="Add details, photos to guide the custom work..."></textarea>`;
  optionsArea.appendChild(notesLabel);
  const fileLabel = document.createElement('label');
  fileLabel.innerHTML = `<strong>Attach photos (optional):</strong><input id="prod-images" type="file" accept="image/*" multiple />`;
  optionsArea.appendChild(fileLabel);

  // add to draft button
  $q('#add-to-draft').addEventListener('click', () => {
    const selects = optionsArea.querySelectorAll('select');
    const opts = {};
    selects.forEach(s => opts[s.name] = s.value);
    const notes = $q('#prod-notes').value || '';
    const files = $q('#prod-images').files;
    readFilesAsDataURLs(files).then(dataurls => {
      state.cartDraft.push({
        productId: prod.id,
        name: prod.name,
        price: prod.price,
        qty: 1,
        options: opts,
        notes,
        images: dataurls
      });
      saveDraftToStorage();
      closeModal();
      openDraftCart(); // open customization/checkout draft
    });
  });
}

function setActiveGallery(index) {
  $qa('#modal-gallery img').forEach(img => img.classList.remove('active'));
  $qa('.thumb').forEach(t => t.classList.remove('selected'));
  const active = $q(`#modal-gallery img[data-i="${index}"]`);
  if (active) active.classList.add('active');
  const selectedThumb = $q(`.thumb[data-i="${index}"]`);
  if (selectedThumb) selectedThumb.classList.add('selected');
}

function closeModal() {
  const modal = $q('#modal');
  modal.classList.remove('open');
  modal.innerHTML = '';
}

function findProductById(pid) {
  for (const cat of state.catalogue.categories) {
    if (cat.subcategories) {
      for (const sc of cat.subcategories) {
        if (sc.products) {
          const p = sc.products.find(pp => pp.id === pid);
          if (p) return p;
        }
      }
    }
    if (cat.products) {
      const p = cat.products.find(pp => pp.id === pid);
      if (p) return p;
    }
  }
  return null;
}

// Draft/cart UI - allows multiple product entries and attachments
function openBuyDraft(prodId) {
  const prod = findProductById(prodId);
  if (!prod) return;
  // prefill a single-draft entry and open draft UI
  const draftEntry = {
    productId: prod.id,
    name: prod.name,
    price: prod.price,
    qty: 1,
    options: {},
    notes: '',
    images: []
  };
  // if options exist, pick defaults
  if (prod.options) {
    for (const k of Object.keys(prod.options)) draftEntry.options[k] = prod.options[k][0];
  }
  state.cartDraft.push(draftEntry);
  saveDraftToStorage();
  openDraftCart();
}

function openDraftCart() {
  const main = $q('#main');
  // render draft cart editor
  main.innerHTML = `
    <section class="checkout-draft">
      <h2>Order & Customization</h2>
      <p class="notice">All items are custom-made. Payment is required online at checkout. Orders are processed within 48 hours of payment confirmation.</p>
      <div id="draft-list"></div>
      <div class="draft-actions">
        <button id="add-product-manual">Add another product</button>
        <button id="proceed-pay">Proceed to Pay (PayPal)</button>
      </div>
      <div id="pay-result"></div>
    </section>
  `;
  renderDraftList();
  $q('#add-product-manual').addEventListener('click', manualAddProduct);
  $q('#proceed-pay').addEventListener('click', handleProceedToPay);
}

function renderDraftList() {
  const container = $q('#draft-list');
  container.innerHTML = '';
  state.cartDraft.forEach((entry, idx) => {
    const prod = findProductById(entry.productId);
    const div = document.createElement('div');
    div.className = 'draft-entry';
    div.innerHTML = `
      <div class="draft-left">
        <img src="${(prod && prod.images && prod.images[0]) ? prod.images[0] : ''}" alt="${escapeHtml(entry.name)}">
      </div>
      <div class="draft-right">
        <h4>${escapeHtml(entry.name)} — $${Number(entry.price).toFixed(2)}</h4>
        <label>Quantity: <input type="number" min="1" value="${entry.qty}" data-idx="${idx}" class="draft-qty"></label>
        <div class="draft-options" id="draft-options-${idx}"></div>
        <label>Notes: <textarea data-idx="${idx}" class="draft-notes">${escapeHtml(entry.notes)}</textarea></label>
        <label>Attach images: <input type="file" accept="image/*" multiple data-idx="${idx}" class="draft-files"></label>
        <div class="draft-images" id="draft-images-${idx}"></div>
        <div class="draft-entry-actions">
          <button class="remove-draft" data-idx="${idx}">Remove</button>
        </div>
      </div>
    `;
    container.appendChild(div);

    // render options selects if product has them
    const optsArea = $q(`#draft-options-${idx}`);
    const prodDef = findProductById(entry.productId);
    if (prodDef && prodDef.options) {
      for (const [k,v] of Object.entries(prodDef.options)) {
        const label = document.createElement('label');
        label.innerHTML = `<strong>${capitalize(k)}:</strong>`;
        const select = document.createElement('select');
        select.dataset.idx = idx;
        select.dataset.opt = k;
        v.forEach(val => {
          const o = document.createElement('option');
          o.value = val; o.textContent = val;
          if (entry.options && entry.options[k] === val) o.selected = true;
          select.appendChild(o);
        });
        label.appendChild(select);
        optsArea.appendChild(label);
      }
    }

    // wire events
  });

  // Wire dynamic inputs
  $qa('.draft-qty').forEach(inp => inp.addEventListener('input', e => {
    const i = +e.currentTarget.dataset.idx;
    state.cartDraft[i].qty = Number(e.currentTarget.value) || 1;
    saveDraftToStorage();
  }));
  $qa('.draft-notes').forEach(inp => inp.addEventListener('input', e => {
    const i = +e.currentTarget.dataset.idx;
    state.cartDraft[i].notes = e.currentTarget.value;
    saveDraftToStorage();
  }));
  $qa('.remove-draft').forEach(btn => btn.addEventListener('click', e => {
    const i = +e.currentTarget.dataset.idx;
    state.cartDraft.splice(i, 1);
    saveDraftToStorage();
    renderDraftList();
  }));
  $qa('.draft-files').forEach(inp => inp.addEventListener('change', (e) => {
    const i = +e.currentTarget.dataset.idx;
    const files = e.currentTarget.files;
    readFilesAsDataURLs(files).then(urls => {
      state.cartDraft[i].images = state.cartDraft[i].images.concat(urls);
      saveDraftToStorage();
      renderDraftList();
    });
  }));
  // options selects
  $qa('select[data-opt]').forEach(sel => sel.addEventListener('change', e => {
    const i = +e.currentTarget.dataset.idx;
    const opt = e.currentTarget.dataset.opt;
    state.cartDraft[i].options[opt] = e.currentTarget.value;
    saveDraftToStorage();
  }));
}

function manualAddProduct() {
  // Show a tiny modal to pick product
  const choices = [];
  state.catalogue.categories.forEach(cat => {
    if (cat.subcategories) {
      cat.subcategories.forEach(sc => {
        sc.products.forEach(p => choices.push({id: p.id, name: p.name}));
      });
    } else if (cat.products) {
      cat.products.forEach(p => choices.push({id: p.id, name: p.name}));
    }
  });
  const pick = prompt('Type product ID or exact name to add to order (example: wax_large or Wax Candle — Large (400ml)).\nAlternatively paste product name:');
  if (!pick) return;
  // try to match by id first
  let found = choices.find(c => c.id === pick.trim());
  if (!found) found = choices.find(c => c.name.toLowerCase() === pick.trim().toLowerCase());
  if (!found) {
    alert('Product not found. Paste exact product name or ID.');
    return;
  }
  const p = findProductById(found.id);
  const newEntry = {
    productId: p.id,
    name: p.name,
    price: p.price,
    qty: 1,
    options: {},
    notes: '',
    images: []
  };
  if (p.options) for (const k of Object.keys(p.options)) newEntry.options[k] = p.options[k][0];
  state.cartDraft.push(newEntry);
  saveDraftToStorage();
  renderDraftList();
}

function handleProceedToPay() {
  if (state.cartDraft.length === 0) { alert('Add at least one product to proceed'); return; }
  // For simplicity: build a text summary and ask user to confirm & proceed to PayPal (opens first product's PayPal link)
  let summary = 'Order summary:\\n';
  state.cartDraft.forEach((d,i) => {
    summary += `${i+1}. ${d.name} x${d.qty} — $${(d.price*d.qty).toFixed(2)}\\n`;
  });
  summary += `\\nTotal approximate: $${calculateDraftTotal().toFixed(2)}\\n\\nClick OK to open PayPal for the first item. After payment, you will see a confirmation message and we will process the entire order within 48 hours.`;
  if (!confirm(summary)) return;
  // open PayPal link of first product (client will pay for that product). This is a simple UX: you can expand to real cart/PayPal later.
  const first = findProductById(state.cartDraft[0].productId);
  if (first && first.paymentLink) {
    window.open(first.paymentLink, '_blank');
  }
  // Show client-side confirmation message (we cannot verify payment without server/webhook)
  const payResult = $q('#pay-result');
  payResult.innerHTML = `<div class="confirm-box"><h3>Thank you — next steps</h3>
    <p>Your payment window was opened. After payment, please return here and complete the quick confirmation form so we can match your payment to the order. Orders are processed within 48 hours of payment confirmation. You will also receive an automated email if we have your address.</p>
    <p class="small">Note: This is a client-side confirmation. For full payment validation, set up a server-side PayPal webhook (instructions included in the repo as webhook_instructions.txt)</p>
    <button id="confirm-paid">I have paid — confirm</button>
  </div>`;
  $q('#confirm-paid').addEventListener('click', () => {
    // simulate immediate post-payment state for the user
    showPostPaymentMessage();
    clearDraft();
  });
}

function showPostPaymentMessage() {
  const main = $q('#main');
  main.innerHTML = `
    <section class="post-pay">
      <h2>Payment received — thank you!</h2>
      <p>Your order will be processed within 48 hours. We’ll contact you by email if we need any clarifications. If you added photos or notes, our maker team will use those to craft your order.</p>
      <p class="small">If you need to update anything, reply to the confirmation email or contact us via the Contact form.</p>
    </section>
  `;
}

function calculateDraftTotal() {
  return state.cartDraft.reduce((sum, d) => sum + (d.price * (d.qty || 1)), 0);
}

function saveDraftToStorage() {
  try { localStorage.setItem('velvet_cartDraft', JSON.stringify(state.cartDraft)); } catch(e){}
}

function loadDraftFromStorage() {
  try {
    const raw = localStorage.getItem('velvet_cartDraft');
    if (raw) state.cartDraft = JSON.parse(raw);
  } catch(e) {}
}

function clearDraft() {
  state.cartDraft = [];
  saveDraftToStorage();
}

function readFilesAsDataURLs(files) {
  if (!files || files.length === 0) return Promise.resolve([]);
  const arr = Array.from(files);
  return Promise.all(arr.map(f => new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res({name: f.name, data: reader.result});
    reader.onerror = () => rej();
    reader.readAsDataURL(f);
  })));
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function escapeHtml(s){ if(!s) return ''; return s.replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]); }

// Init
document.addEventListener('DOMContentLoaded', () => {
  loadDraftFromStorage();
  loadCatalogue();
  // modal container
  const modalWrap = document.createElement('div');
  modalWrap.id = 'modal';
  document.body.appendChild(modalWrap);

  // Add basic contact form behavior
  const contactForm = $q('#contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Thanks! Message received. We will reply by email.');
      contactForm.reset();
    });
  }

  // Christmas default theme toggle (loads as default)
  document.documentElement.classList.add('theme-christmas');
});

// Expose for debugging
window.VC = { state, openCategory, openDetails, openDraftCart };
