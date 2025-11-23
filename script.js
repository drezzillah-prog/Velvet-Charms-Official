/* script.js — Velvet Charms patch replacement
   - Renders catalogue.json into a clean card grid
   - Modal details with gallery + unlimited image upload for customization
   - Wishlist (localStorage)
   - Cart (localStorage)
   - Filters out the "Oil Perfume (50ml)" product by name
   - Fixes details button contrast & modal close
*/

(() => {
  const CATALOGUE_URL = '/catalogue.json'; // ensure this file exists in root
  const APP = document.getElementById('app') || document.body;
  const state = {
    catalogue: null,
    wishlist: JSON.parse(localStorage.getItem('vc_wishlist') || '[]'),
    cart: JSON.parse(localStorage.getItem('vc_cart') || '[]'),
    activeProduct: null
  };

  // Helpers
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const formatPrice = p => `$${Number(p).toFixed(2)}`;

  // persist
  function saveWishlist() { localStorage.setItem('vc_wishlist', JSON.stringify(state.wishlist)); updateWishlistCounter(); }
  function saveCart() { localStorage.setItem('vc_cart', JSON.stringify(state.cart)); updateCartCounter(); }

  // UI counters
  function updateWishlistCounter() {
    $$('.wishlist-count').forEach(el => el.textContent = state.wishlist.length);
  }
  function updateCartCounter() {
    $$('.cart-count').forEach(el => el.textContent = state.cart.reduce((s,i) => s + (i.qty||1),0));
  }

  // Fetch & render
  async function loadCatalogue() {
    try {
      const res = await fetch(CATALOGUE_URL + '?_=' + Date.now());
      if (!res.ok) throw new Error('catalogue fetch failed');
      const json = await res.json();
      state.catalogue = json;
      renderSite();
    } catch (err) {
      console.error(err);
      showCatalogueError();
    }
  }

  function showCatalogueError() {
    const c = document.createElement('div');
    c.className = 'catalogue-error';
    c.innerHTML = `<p>Error loading catalogue. Please ensure /catalogue.json is present and valid in site root.</p>`;
    APP.innerHTML = '';
    APP.appendChild(c);
  }

  // Filter bad products (client-side safeguard)
  function productIsAllowed(product) {
    if (!product || !product.name) return true;
    // Exact match filter for the problematic product
    if (product.name.trim().toLowerCase().includes('oil perfume (50ml)')) return false;
    return true;
  }

  // Render site skeleton
  function renderSite() {
    APP.innerHTML = `
      <div class="vc-header">
        <div class="vc-brand"><h1>${escapeHtml(state.catalogue.siteInfo.name || 'Velvet Charms')} <span class="vc-snow">❄️</span></h1>
        <p class="tagline">${escapeHtml(state.catalogue.siteInfo.tagline || '')}</p></div>
        <div class="vc-controls">
          <button class="btn view-wishlist">❤ <span class="wishlist-count">0</span></button>
          <button class="btn view-cart">🛒 <span class="cart-count">0</span></button>
        </div>
      </div>
      <div class="vc-main">
        <aside class="vc-sidebar" id="vc-categories"></aside>
        <main class="vc-content" id="vc-content"></main>
      </div>

      <!-- modal container -->
      <div id="vc-modal" class="vc-modal" aria-hidden="true"></div>

      <!-- lightbox / checkout overlay -->
      <div id="vc-overlay" class="vc-overlay hidden"></div>
    `;

    updateWishlistCounter();
    updateCartCounter();
    renderCategories();
    // auto-open first category for UX
    const firstCat = state.catalogue.categories?.[0];
    if (firstCat) renderCategory(firstCat.id);
    attachGlobalListeners();
  }

  // escape (simple)
  function escapeHtml(s='') {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Sidebar categories
  function renderCategories() {
    const sidebar = $('#vc-categories');
    sidebar.innerHTML = '';
    state.catalogue.categories.forEach(cat => {
      const catEl = document.createElement('div');
      catEl.className = 'vc-cat';
      catEl.innerHTML = `
        <button class="vc-cat-btn" data-cat="${escapeHtml(cat.id)}">
          <span class="cat-name">${escapeHtml(cat.name)}</span>
        </button>
      `;
      sidebar.appendChild(catEl);
    });
    // category nav click
    $$('.vc-cat-btn').forEach(b => b.addEventListener('click', e => {
      const id = e.currentTarget.dataset.cat;
      renderCategory(id);
    }));
  }

  // Render category page
  function renderCategory(catId) {
    const content = $('#vc-content');
    const cat = state.catalogue.categories.find(c => c.id === catId);
    if (!cat) {
      content.innerHTML = '<p>Category not found.</p>';
      return;
    }

    // header + banner
    const banner = cat.banner ? `<img src="${encodeURI(cat.banner)}" alt="${escapeHtml(cat.name)} banner" class="vc-banner">` : '';
    content.innerHTML = `
      <section class="vc-cat-header">${banner}<h2>${escapeHtml(cat.name)}</h2>
      <p class="vc-cat-desc">${escapeHtml(cat.description || '')}</p></section>
      <section class="vc-subcats" id="vc-subcats"></section>
    `;

    const sc = $('#vc-subcats');
    sc.innerHTML = '';
    const subcats = cat.subcategories || [];
    if (!subcats.length && (cat.products || []).length) {
      // Support categories that store products at top level
      subcats.push({ id: cat.id + '-all', name: 'All', products: cat.products });
    }

    subcats.forEach(sub => {
      const subEl = document.createElement('div');
      subEl.className = 'vc-subcat';
      subEl.innerHTML = `<h3>${escapeHtml(sub.name)}</h3><div class="vc-grid" data-sub="${escapeHtml(sub.id)}"></div>`;
      sc.appendChild(subEl);

      const grid = subEl.querySelector('.vc-grid');
      const products = sub.products || [];
      products.filter(productIsAllowed).forEach(prod => {
        const card = document.createElement('article');
        card.className = 'vc-card';
        const imgSrc = (prod.images && prod.images[0]) ? prod.images[0] : (cat.categoryImage || '');
        const pdesc = prod.description ? `<p class="prod-desc">${escapeHtml(prod.description)}</p>` : '';
        const optionsBadge = prod.options ? `<small class="options-badge">options</small>` : '';
        card.innerHTML = `
          <div class="card-media"><img src="${encodeURI(imgSrc)}" alt="${escapeHtml(prod.name)}"></div>
          <div class="card-body">
            <h4 class="prod-name">${escapeHtml(prod.name)}</h4>
            ${pdesc}
            <div class="card-meta">
              <span class="price">${formatPrice(prod.price || 0)}</span>
              ${optionsBadge}
            </div>
            <div class="card-actions">
              <button class="btn details-btn" data-prod='${escapeHtml(prod.id)}'>Details</button>
              <button class="btn buy-btn" data-prod='${escapeHtml(prod.id)}'>Buy</button>
              <button class="heart-btn" data-prod='${escapeHtml(prod.id)}' title="Add to favorites">❤</button>
            </div>
          </div>
        `;
        grid.appendChild(card);
      });
    });

    // attach card listeners
    $$('.details-btn').forEach(b => b.addEventListener('click', onDetails));
    $$('.buy-btn').forEach(b => b.addEventListener('click', onBuy));
    $$('.heart-btn').forEach(b => b.addEventListener('click', onHeart));
  }

  // Find product by id across catalogue
  function findProductById(pid) {
    for (const cat of (state.catalogue.categories || [])) {
      const subcats = cat.subcategories || [];
      for (const sub of subcats) {
        const prods = sub.products || [];
        const p = prods.find(x => x.id === pid);
        if (p) return p;
      }
      // top-level products
      if (cat.products) {
        const p = cat.products.find(x => x.id === pid);
        if (p) return p;
      }
    }
    return null;
  }

  // Details modal
  function onDetails(e) {
    const pid = e.currentTarget.dataset.prod;
    const prod = findProductById(pid);
    if (!prod) return alert('Product not found');
    openProductModal(prod);
  }

  // Build modal html and open
  function openProductModal(prod) {
    state.activeProduct = prod;
    const modal = $('#vc-modal');
    modal.innerHTML = `
      <div class="vc-modal-inner" role="dialog" aria-modal="true">
        <button class="vc-modal-close" aria-label="Close">×</button>
        <div class="vc-modal-content">
          <div class="vc-modal-left">
            <div class="vc-gallery" id="vc-gallery">${(prod.images || []).map(src => `<img src="${encodeURI(src)}" alt="${escapeHtml(prod.name)}">`).join('')}</div>
          </div>
          <div class="vc-modal-right">
            <h2>${escapeHtml(prod.name)}</h2>
            <p class="vc-price">${formatPrice(prod.price || 0)}</p>
            <p class="vc-desc">${escapeHtml(prod.description || '')}</p>

            <!-- personalization form -->
            <form id="vc-personalize-form" class="vc-personalize-form">
              <label>Personalisation (optional):</label>
              <textarea name="custom_text" placeholder="Write personalization details (size, color, inscriptions)..."></textarea>
              <label>Upload reference image(s): <small>(unlimited)</small></label>
              <input id="vc-upload" name="images" type="file" multiple accept="image/*">
              <div id="vc-upload-list" class="vc-upload-list"></div>
              <div class="vc-modal-actions">
                <button type="button" class="btn add-to-cart">Add to cart</button>
                <a class="btn buy-now" href="#" role="button">Buy now</a>
              </div>
            </form>

            <div class="vc-modal-footnote">
              <small>Choose scent & intensity (if available) at checkout. Orders shipped from closest studio: Frankfurt 🇩🇪 or Constanța 🇷🇴. Payment required at order time.</small>
            </div>

          </div>
        </div>
      </div>
    `;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.getElementById('vc-overlay').classList.remove('hidden');

    // gallery scrolling / clamping
    const gallery = $('#vc-gallery');
    gallery && gallery.addEventListener('click', e => {
      if (e.target.tagName === 'IMG') {
        // open clicked image in bigger view
        openLightbox(e.target.src);
      }
    });

    // close handlers
    $('.vc-modal-close', modal).addEventListener('click', closeModal);
    $('#vc-overlay').addEventListener('click', closeModal);
    document.addEventListener('keydown', onEscClose);

    // upload preview
    const uploadInput = $('#vc-upload');
    uploadInput.addEventListener('change', ev => {
      const list = $('#vc-upload-list');
      list.innerHTML = '';
      Array.from(uploadInput.files).forEach((file, idx) => {
        const p = document.createElement('div');
        p.className = 'vc-upload-item';
        p.innerHTML = `<strong>${escapeHtml(file.name)}</strong> <small>${Math.round(file.size/1024)} KB</small>`;
        list.appendChild(p);
      });
    });

    // add to cart handler
    $('.add-to-cart', modal).addEventListener('click', () => {
      const form = $('#vc-personalize-form');
      const text = form.custom_text.value;
      const uploadFiles = Array.from(document.getElementById('vc-upload').files || []);
      // store file names only (client-side). You can later upload server-side.
      const images = uploadFiles.map(f => f.name);
      // cart item
      const cartItem = {
        id: prod.id,
        name: prod.name,
        price: prod.price || 0,
        qty: 1,
        custom: { text, images }
      };
      state.cart.push(cartItem);
      saveCart();
      alert('Added to cart');
      closeModal();
    });

    // buy now handler -> opens lightweight checkout modal
    $('.buy-now', modal).addEventListener('click', (ev) => {
      ev.preventDefault();
      openCheckout([{
        id: prod.id,
        name: prod.name,
        price: prod.price || 0,
        qty: 1,
        custom: {
          text: $('#vc-personalize-form').custom_text.value,
          images: Array.from(document.getElementById('vc-upload').files || []).map(f => f.name)
        }
      }]);
    });
  }

  function onEscClose(e) {
    if (e.key === 'Escape') closeModal();
  }

  function closeModal() {
    const modal = $('#vc-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML = '';
    document.getElementById('vc-overlay').classList.add('hidden');
    document.removeEventListener('keydown', onEscClose);
  }

  // Lightbox simple
  function openLightbox(src) {
    const overlay = document.getElementById('vc-overlay');
    overlay.classList.remove('hidden');
    overlay.innerHTML = `<div class="vc-lightbox"><button class="vc-lightbox-close">×</button><img src="${src}" alt="lightbox"></div>`;
    $('.vc-lightbox-close', overlay).addEventListener('click', () => { overlay.classList.add('hidden'); overlay.innerHTML=''; });
  }

  // add to cart via buy button on cards
  function onBuy(e) {
    const pid = e.currentTarget.dataset.prod;
    const prod = findProductById(pid);
    if (!prod) return alert('Product not found');
    // open personalization modal to let user add images/options before adding to cart
    openProductModal(prod);
  }

  // Hearts
  function onHeart(e) {
    const pid = e.currentTarget.dataset.prod;
    const idx = state.wishlist.indexOf(pid);
    if (idx === -1) {
      state.wishlist.push(pid);
      e.currentTarget.classList.add('hearted');
    } else {
      state.wishlist.splice(idx, 1);
      e.currentTarget.classList.remove('hearted');
    }
    saveWishlist();
  }

  // Wishlist & Cart overlays
  function attachGlobalListeners() {
    document.querySelectorAll('.view-wishlist').forEach(b => b.addEventListener('click', showWishlist));
    document.querySelectorAll('.view-cart').forEach(b => b.addEventListener('click', showCart));
  }

  function showWishlist() {
    const items = state.wishlist.map(pid => findProductById(pid)).filter(Boolean);
    const content = items.length ? items.map(p => `<div class="wish-item"><img src="${encodeURI((p.images && p.images[0])||'')}" alt=""><div><h4>${escapeHtml(p.name)}</h4><p>${formatPrice(p.price||0)}</p><button class="btn add-from-wish" data-prod="${p.id}">Add to cart</button></div></div>`).join('') : '<p>Your wishlist is empty.</p>';
    openGenericModal('Wishlist', `<div class="vc-wishlist">${content}</div>`);
    $$('.add-from-wish').forEach(btn => btn.addEventListener('click', ev => {
      const pid = ev.currentTarget.dataset.prod;
      const prod = findProductById(pid);
      if (!prod) return;
      state.cart.push({ id: prod.id, name: prod.name, price: prod.price || 0, qty:1 });
      saveCart();
      alert('Added to cart');
      closeModal();
    }));
  }

  function showCart() {
    const items = state.cart;
    if (!items.length) return openGenericModal('Cart', '<p>Your cart is empty.</p>');
    const rows = items.map((it, idx) => `<div class="cart-row"><div class="cart-left"><strong>${escapeHtml(it.name)}</strong><div class="cart-custom">${escapeHtml(it.custom?.text || '')}</div></div><div class="cart-right"><span>${formatPrice(it.price)}</span><input type="number" min="1" value="${it.qty||1}" data-idx="${idx}" class="cart-qty"><button class="btn remove-item" data-idx="${idx}">Remove</button></div></div>`).join('');
    const html = `<div class="cart-list">${rows}</div><div class="cart-actions"><button class="btn checkout-btn">Proceed to Checkout</button></div>`;
    openGenericModal('Cart', html);

    $$('.remove-item').forEach(b => b.addEventListener('click', ev => {
      const i = Number(ev.currentTarget.dataset.idx);
      state.cart.splice(i,1);
      saveCart();
      showCart();
    }));

    $$('.cart-qty').forEach(inp => {
      inp.addEventListener('change', ev => {
        const i = Number(ev.currentTarget.dataset.idx);
        const v = parseInt(ev.currentTarget.value) || 1;
        state.cart[i].qty = v;
        saveCart();
        updateCartCounter();
      });
    });

    $('.checkout-btn').addEventListener('click', () => {
      openCheckout(state.cart);
    });
  }

  // Generic modal for wishlist/cart
  function openGenericModal(title, innerHtml) {
    const modal = $('#vc-modal');
    modal.innerHTML = `
      <div class="vc-modal-inner" role="dialog">
        <button class="vc-modal-close">×</button>
        <div class="vc-modal-content generic">
          <h2>${escapeHtml(title)}</h2>
          <div class="generic-body">${innerHtml}</div>
        </div>
      </div>
    `;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.getElementById('vc-overlay').classList.remove('hidden');
    $('.vc-modal-close', modal).addEventListener('click', closeModal);
  }

  // Checkout modal (simple, client-side; includes Formspree optional hook)
  function openCheckout(items) {
    const total = items.reduce((s,i) => s + (i.price ||0) * (i.qty||1), 0);
    const lines = items.map(i => `<li>${escapeHtml(i.name)} <strong>${formatPrice(i.price)}</strong> x ${i.qty||1}</li>`).join('');
    const modalHtml = `
      <div class="checkout-summary">
        <ul>${lines}</ul>
        <p class="checkout-total"><strong>Total: ${formatPrice(total)}</strong></p>

        <!-- personalization files are referenced by name only client-side.
             For real uploads, implement server upload; here we offer Formspree + file inputs (will be sent as attachments if you set up a server endpoint) -->
        <form id="vc-checkout-form" method="POST" action="https://formspree.io/f/YOUR_FORMSPREE_ID" enctype="multipart/form-data">
          <input type="hidden" name="order_json" value='${escapeHtml(JSON.stringify(items))}'>
          <label>Full name</label><input name="name" required>
          <label>Email</label><input name="email" type="email" required>
          <label>Shipping address</label><textarea name="address" required></textarea>
          <label>Attach reference file(s) (optional)</label>
          <input name="attachments" type="file" multiple>
          <p><small>Payment is required at time of order. After payment you'll receive a confirmation message; orders are processed within 48 hours.</small></p>
          <div class="checkout-buttons">
            <button class="btn submit-order" type="submit">Submit order (Formspree)</button>
            <button class="btn pay-paypal" type="button">Pay with PayPal</button>
          </div>
        </form>
      </div>
    `;
    openGenericModal('Checkout', modalHtml);

    // PayPal quick simulation: open PayPal link for total (you will want to implement per-product PayPal links or a server-side cart handling)
    $('.pay-paypal').addEventListener('click', () => {
      // If you have a single PayPal link, or create one per order on the server, redirect accordingly.
      // For now open the first product's PayPal if available (best effort).
      const first = items[0];
      const prod = findProductById(first.id);
      if (prod && prod.paymentLink) {
        window.open(prod.paymentLink, '_blank');
      } else {
        alert('No PayPal link available for this order. Please use the Form to submit the order details and we will send payment instructions.');
      }
    });

    // Formspree: the action should be replaced with your real form endpoint (replace YOUR_FORMSPREE_ID).
  }

  // Boot
  loadCatalogue();

})();
