/* script.js
   Core site logic: catalogue rendering, product page rendering, cart, checkout (PayPal),
   filters, wishlist, translations integration, shipping & totals.
*/

'use strict';

const APP = (function () {
  const CATALOG_URL = './catalogue.json';
  const STORAGE_KEY = 'vc_cart_v1';
  const WISHLIST_KEY = 'vc_wishlist_v1';
  const LOCALE_KEY = 'vc_locale_v1';
  const FREE_SHIPPING_THRESHOLD = 300; // USD
  const SHIPPING_TABLE = [
    // simplified shipping per region (flat) — you can tweak server-side later
    { region: 'EU', price: 12, daysText: '~5 days' },
    { region: 'Rest of Europe', price: 12, daysText: '~5 days' },
    { region: 'North America', price: 18, daysText: '~10 days' },
    { region: 'Middle East & N. Africa', price: 16, daysText: '~7 days' },
    { region: 'World', price: 30, daysText: '~10 days' }
  ];

  // runtime state
  let catalogue = null;
  let cart = { items: [] }; // {id, qty, option (string), priceAtAdd}
  let wishlist = [];
  let translations = window.TRANSLATIONS || { en: {} };
  let locale = localStorage.getItem(LOCALE_KEY) || detectLocale();
  let currency = 'USD'; // all prices in USD in catalogue.json (PayPal will handle currency)

  /* ---------- HELPERS ---------- */

  function detectLocale() {
    try {
      const nav = window.navigator;
      const lang = (nav.languages && nav.languages[0]) || nav.language || 'en';
      // basic mapping
      if (lang.startsWith('ro')) return 'ro';
      if (lang.startsWith('fr')) return 'fr';
      if (lang.startsWith('it')) return 'it';
      return 'en';
    } catch (e) {
      return 'en';
    }
  }

  function formatCurrency(amount) {
    // Keep USD for display; PayPal will handle conversion at checkout
    return `USD ${Number(amount).toFixed(2)}`;
  }

  function $(sel, ctx = document) { return ctx.querySelector(sel); }
  function $all(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }

  function saveCart() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    renderCartCount();
  }

  function loadCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) cart = JSON.parse(raw);
    } catch (e) { cart = { items: [] }; }
  }

  function saveWishlist() {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
    renderWishlistCount();
  }

  function loadWishlist() {
    try {
      const raw = localStorage.getItem(WISHLIST_KEY);
      if (raw) wishlist = JSON.parse(raw);
    } catch (e) { wishlist = []; }
  }

  function findProductById(id) {
    if (!catalogue) return null;
    return catalogue.products.find(p => p.id === id);
  }

  function calcSubtotal() {
    return cart.items.reduce((sum, it) => sum + (it.price || (findProductById(it.id)?.price || 0)) * it.qty, 0);
  }

  function calcShipping(subtotal) {
    if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
    // for simplicity, pick default "World" shipping if region unknown
    // server-side you may adjust; client uses default region = 'World'
    const entry = SHIPPING_TABLE.find(e => e.region === 'World') || SHIPPING_TABLE[0];
    return entry.price;
  }

  function calcTotal() {
    const subtotal = calcSubtotal();
    const ship = calcShipping(subtotal);
    return { subtotal, shipping: ship, total: subtotal + ship };
  }

  function renderCartCount() {
    const count = cart.items.reduce((s, it) => s + it.qty, 0);
    $all('#cartCount, #cartCountTop, #cartCount4, #cartCount3, #cartCountTop').forEach(el => {
      if (el) el.textContent = count;
    });
  }

  function renderWishlistCount() {
    const count = wishlist.length;
    $all('#favCount, #favCountTop, #favCount3, #favCount4').forEach(el => {
      if (el) el.textContent = count;
    });
  }

  /* ---------- CATALOGUE LOAD & RENDER ---------- */

  async function loadCatalogue() {
    if (catalogue) return catalogue;
    const res = await fetch(CATALOG_URL);
    if (!res.ok) throw new Error('Failed loading catalogue.json');
    catalogue = await res.json();
    return catalogue;
  }

  function buildCategorySelectOptions() {
    if (!catalogue) return;
    const sel = $('#catFilter');
    if (!sel) return;
    // clear then add categories
    sel.innerHTML = '<option value="all">All categories</option>';
    catalogue.categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
  }

  function getUniqueOptionsForFilter() {
    // collect all option values from products (scent/option arrays)
    const set = new Set();
    catalogue.products.forEach(p => {
      if (p.options) {
        Object.values(p.options).forEach(arr => {
          if (Array.isArray(arr)) arr.forEach(v => set.add(v));
        });
      }
    });
    return Array.from(set).sort();
  }

  function populateOptionFilter() {
    const sel = $('#optionFilter');
    if (!sel || !catalogue) return;
    const vals = getUniqueOptionsForFilter();
    sel.innerHTML = '<option value="all">Any</option>';
    vals.forEach(v => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      sel.appendChild(o);
    });
  }

  async function renderFeatured() {
    const mount = $('#featuredCarousel');
    if (!mount) return;
    mount.innerHTML = '';
    // pick up to 6 featured items: first items of catalogue or high-price ones
    const picks = catalogue.products.slice(0, 6);
    picks.forEach(p => {
      const card = createProductCard(p);
      mount.appendChild(card);
    });
  }

  /* ---------- PRODUCT CARD ---------- */

  function createProductCard(product) {
    const tpl = document.getElementById('productCardTemplate') || document.getElementById('catalogueCardTpl');
    const node = tpl.content ? tpl.content.cloneNode(true) : null;
    if (!node) {
      // fallback basic card
      const article = document.createElement('article');
      article.className = 'product-card';
      article.innerHTML = `<img src="${product.images[0]||''}" alt="">
                           <h4>${product.name}</h4>
                           <div class="price">${formatCurrency(product.price)}</div>`;
      return article;
    }
    const el = node.querySelector('.product-card');
    const img = node.querySelector('.product-thumb');
    const name = node.querySelector('.product-name');
    const price = node.querySelector('.product-price');
    const desc = node.querySelector('.product-desc');
    const addBtn = node.querySelector('.add-to-cart');
    const viewBtn = node.querySelector('.view-details');
    const qty = node.querySelector('.qty-input');
    const optionSelect = node.querySelector('.option-select');

    img.src = product.images?.[0] || '';
    img.alt = product.name;
    name.textContent = product.name;
    price.textContent = formatCurrency(product.price);
    desc.textContent = product.description || '';

    // options
    if (product.options) {
      // try picking the first option group (e.g., scent)
      const optKey = Object.keys(product.options)[0];
      const optVals = product.options[optKey];
      if (optionSelect && Array.isArray(optVals)) {
        optionSelect.classList.remove('hidden');
        optionSelect.innerHTML = '';
        optVals.forEach(v => {
          const o = document.createElement('option');
          o.value = v;
          o.textContent = v;
          optionSelect.appendChild(o);
        });
      }
    }

    // add handlers
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const q = qty ? Number(qty.value || 1) : 1;
        const opt = optionSelect && !optionSelect.classList.contains('hidden') ? optionSelect.value : undefined;
        addToCart(product.id, q, opt);
        showMiniToast(`${product.name} added to cart`);
      });
    }
    if (viewBtn) {
      viewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const url = `product.html?id=${encodeURIComponent(product.id)}`;
        window.location.href = url;
      });
    }
    return node;
  }

  /* ---------- RENDER CATALOGUE PAGE ---------- */

  async function renderCataloguePage() {
    await loadCatalogue();
    buildCategorySelectOptions();
    populateOptionFilter();
    renderFeatured();

    const results = $('#catalogueResults');
    const loader = results.querySelector('.loader-inline');
    if (loader) loader.remove();

    const products = catalogue.products;
    results.innerHTML = ''; // clear
    products.forEach(p => {
      const card = createProductCard(p);
      results.appendChild(card);
    });

    // wire search/filter UI
    const searchInput = $('#catalogueSearch');
    const searchBtn = $('#catalogueSearchBtn');
    const priceSel = $('#priceFilter');
    const optionSel = $('#optionFilter');
    const sortSel = $('#sortSelect');

    const applyFilters = () => {
      let out = catalogue.products.slice();
      const q = searchInput.value.trim().toLowerCase();
      if (q) out = out.filter(p => (p.name + ' ' + (p.description||'') + ' ' + (p.id||'')).toLowerCase().includes(q));
      // price filter
      const priceVal = priceSel.value;
      if (priceVal !== 'all') {
        const [min, max] = priceVal.split('-').map(Number);
        out = out.filter(p => p.price >= min && p.price <= max);
      }
      // option filter
      const opt = optionSel.value;
      if (opt && opt !== 'all') {
        out = out.filter(p => {
          if (!p.options) return false;
          return Object.values(p.options).some(arr => Array.isArray(arr) && arr.includes(opt));
        });
      }
      // sort
      if (sortSel.value === 'price_asc') out.sort((a,b) => a.price - b.price);
      if (sortSel.value === 'price_desc') out.sort((a,b) => b.price - a.price);
      if (sortSel.value === 'name_asc') out.sort((a,b) => a.name.localeCompare(b.name));

      results.innerHTML = '';
      if (out.length === 0) {
        $('#noResults')?.classList.remove('hidden');
      } else {
        $('#noResults')?.classList.add('hidden');
        out.forEach(p => results.appendChild(createProductCard(p)));
      }
    };

    searchBtn.addEventListener('click', applyFilters);
    searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') applyFilters(); });
    priceSel.addEventListener('change', applyFilters);
    optionSel.addEventListener('change', applyFilters);
    sortSel.addEventListener('change', applyFilters);
    $('#resetFilters')?.addEventListener('click', () => {
      searchInput.value = '';
      priceSel.value = 'all';
      optionSel.value = 'all';
      sortSel.value = 'default';
      applyFilters();
    });
  }

  /* ---------- PRODUCT PAGE ---------- */

  async function renderProductPage() {
    await loadCatalogue();
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('id');
    const product = findProductById(pid);
    if (!product) {
      $('#productLoading').textContent = 'Product not found';
      return;
    }
    $('#productLoading').classList.add('hidden');
    const container = $('#productContent');
    container.classList.remove('hidden');

    $('#prodName').textContent = product.name;
    $('#prodCategory').textContent = `${(catalogue.categories.find(c => c.id === product.category) || {}).name || ''} • ${(catalogue.subcategories.find(s => s.id === product.subcategory) || {}).name || ''}`;
    $('#prodPrice').textContent = formatCurrency(product.price);
    $('#prodDescription').textContent = product.description || '';

    // images carousel
    const carousel = $('#imageCarousel');
    const thumbs = $('#imageThumbs');
    carousel.innerHTML = '';
    thumbs.innerHTML = '';
    (product.images || []).forEach((src, i) => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = `${product.name} ${i+1}`;
      img.className = 'carousel-img';
      if (i===0) img.classList.add('active');
      img.addEventListener('click', () => {
        $all('.carousel-img', carousel).forEach(im => im.classList.remove('active'));
        img.classList.add('active');
      });
      carousel.appendChild(img);

      const t = document.createElement('img');
      t.src = src;
      t.alt = 'thumb';
      t.className = 'thumb';
      t.addEventListener('click', () => {
        $all('.carousel-img', carousel).forEach(im => im.classList.remove('active'));
        carousel.querySelectorAll('.carousel-img')[i].classList.add('active');
      });
      thumbs.appendChild(t);
    });

    // options
    if (product.options) {
      $('#optionSection')?.classList.remove('hidden');
      const optSel = $('#prodOptions');
      optSel.innerHTML = '';
      const firstKey = Object.keys(product.options)[0];
      const values = product.options[firstKey];
      if (Array.isArray(values)) {
        values.forEach(v => {
          const o = document.createElement('option');
          o.value = v; o.textContent = v;
          optSel.appendChild(o);
        });
      }
    } else {
      $('#optionSection')?.classList.add('hidden');
    }

    // add handlers
    $('#addToCartBtn').addEventListener('click', () => {
      const qty = Number($('#prodQty').value || 1);
      const opt = $('#prodOptions') ? $('#prodOptions').value : undefined;
      addToCart(product.id, qty, opt);
      showMiniToast('Added to cart');
    });
    $('#buyNowBtn').addEventListener('click', async () => {
      const qty = Number($('#prodQty').value || 1);
      const opt = $('#prodOptions') ? $('#prodOptions').value : undefined;
      // temporary create one-item cart for immediate buy
      const tmpCart = { items: [{ id: product.id, qty, option: opt, price: product.price }]};
      try {
        await startCheckout(tmpCart);
      } catch (err) {
        showModalError('Checkout failed. Please try again.');
      }
    });
  }

  /* ---------- CART MANAGEMENT ---------- */

  function addToCart(id, qty = 1, option) {
    const prod = findProductById(id);
    if (!prod) return;
    const existing = cart.items.find(i => i.id === id && (i.option || '') === (option || ''));
    if (existing) existing.qty += qty;
    else cart.items.push({ id, qty, option: option || null, price: prod.price });
    saveCart();
    renderCartPanel();
  }

  function removeFromCart(index) {
    cart.items.splice(index, 1);
    saveCart();
    renderCartPanel();
  }

  function updateCartItemQuantity(index, qty) {
    if (!cart.items[index]) return;
    cart.items[index].qty = qty;
    if (cart.items[index].qty <= 0) removeFromCart(index);
    saveCart();
    renderCartPanel();
  }

  function toggleWishlist(productId) {
    const idx = wishlist.indexOf(productId);
    if (idx === -1) wishlist.push(productId);
    else wishlist.splice(idx, 1);
    saveWishlist();
  }

  function renderCartPanel() {
    const panel = $('#cartPanel');
    if (!panel) return;
    const itemsEl = $('#cartItems');
    itemsEl.innerHTML = '';
    cart.items.forEach((it, idx) => {
      const p = findProductById(it.id);
      const row = document.createElement('div');
      row.className = 'cart-row';
      row.innerHTML = `<div class="cart-thumb"><img src="${(p.images && p.images[0])||''}" alt=""></div>
                       <div class="cart-info">
                         <div class="cart-name">${p.name}${it.option? ' — ' + it.option : ''}</div>
                         <div class="cart-price">${formatCurrency(p.price)} × ${it.qty}</div>
                       </div>
                       <div class="cart-actions">
                         <input type="number" value="${it.qty}" min="1" class="cart-qty" data-idx="${idx}">
                         <button class="btn small remove" data-idx="${idx}">Remove</button>
                       </div>`;
      itemsEl.appendChild(row);
    });

    // wire qty and remove
    $all('.cart-qty').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const idx = Number(e.target.dataset.idx);
        const q = Number(e.target.value || 1);
        updateCartItemQuantity(idx, q);
      });
    });
    $all('.remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.target.dataset.idx);
        removeFromCart(idx);
      });
    });

    const totals = calcTotal();
    $('#cartSubtotal') && ($('#cartSubtotal').textContent = formatCurrency(totals.subtotal));
    $('#cartShipping') && ($('#cartShipping').textContent = formatCurrency(totals.shipping));
    $('#cartTotal') && ($('#cartTotal').textContent = formatCurrency(totals.total));
    $('#cartTotal') && ($('#cartTotal').setAttribute('data-amount', String(totals.total)));

    renderCartCount();
  }

  /* ---------- CHECKOUT (client side) ---------- */

  async function startCheckout(cartToSend = null) {
    // cartToSend: if null use current cart
    const payload = {
      items: (cartToSend && cartToSend.items) ? cartToSend.items : cart.items,
      shipping: calcShipping(calcSubtotal())
    };
    if (!payload.items || payload.items.length === 0) {
      showModalError('Your cart is empty.');
      return;
    }

    // call server to create order
    const resp = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart: payload })
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(()=>null);
      throw new Error('Failed to create order: ' + (txt || resp.status));
    }

    const data = await resp.json();
    if (!data.approveUrl || !data.orderID) throw new Error('Invalid server response for order creation');

    // open popup for PayPal approval
    const popup = window.open(data.approveUrl, 'paypal_approval', 'width=900,height=700');
    if (!popup) {
      showModalError('Popup blocked. Please allow popups and try again.');
      return;
    }

    // wait until popup closed
    const poll = setInterval(async () => {
      if (popup.closed) {
        clearInterval(poll);
        // after user returns, try capturing the order
        try {
          const captureResp = await fetch('/api/capture-order', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ orderID: data.orderID })
          });
          const captureData = await captureResp.json();
          if (captureResp.ok && captureData.status && (captureData.status === 'COMPLETED' || captureData.status === 'APPROVED' || captureData.status === 'captured')) {
            // success
            handleOrderSuccess(captureData);
          } else {
            // not captured — show message with link to try again or instructions
            const msg = (captureData && captureData.message) ? captureData.message : 'Payment not completed. You may need to approve the payment in the PayPal window.';
            showModalError(msg);
          }
        } catch (err) {
          showModalError('Capture request failed. Please check your PayPal approval and try again.');
        }
      }
    }, 800);
  }

  function handleOrderSuccess(orderDetails) {
    // show success modal with summary
    const modal = $('#orderModal') || createOrderModal();
    const detailsEl = $('#orderDetails');
    detailsEl.innerHTML = `<p><strong>Order ID:</strong> ${orderDetails.id || orderDetails.orderID || '—'}</p>
                           <p><strong>Amount:</strong> ${formatCurrency(calcTotal().total)}</p>
                           <p><strong>Status:</strong> ${orderDetails.status || 'COMPLETED'}</p>`;
    $('#orderModalTitle').textContent = 'Thank you — order confirmed!';
    $('#orderSummaryText').textContent = 'We have received your payment. Your order will be prepared and shipped soon.';
    showModal('orderModal');

    // clear cart
    cart = { items: [] };
    saveCart();
    renderCartPanel();
  }

  /* ---------- UI / MODALS / TOAST ---------- */

  function showModal(idOrEl) {
    let modal;
    if (typeof idOrEl === 'string') modal = document.getElementById(idOrEl);
    else modal = idOrEl;
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    // wire close
    modal.querySelectorAll('.modal-close, .modal-backdrop, #orderModalDone').forEach(el => {
      el.addEventListener('click', () => hideModal(modal));
    });
    // focus
    setTimeout(()=> modal.querySelector('button, a, input')?.focus(), 200);
  }

  function createOrderModal() {
    // fallback if no orderModal in DOM
    const div = document.createElement('div');
    div.id = 'orderModal';
    div.className = 'modal';
    div.innerHTML = `<div class="modal-backdrop"></div>
                     <div class="modal-card">
                       <button id="orderModalClose" class="modal-close">✕</button>
                       <h2 id="orderModalTitle">Thank you — order received!</h2>
                       <div id="orderModalDesc"><p id="orderSummaryText"></p><div id="orderDetails"></div></div>
                       <footer><button id="orderModalDone" class="btn primary">Done</button></footer>
                     </div>`;
    document.body.appendChild(div);
    return div;
  }

  function hideModal(modal) {
    if (typeof modal === 'string') modal = document.getElementById(modal);
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  function showModalError(msg) {
    const modal = document.getElementById('modal');
    if (!modal) {
      alert(msg);
      return;
    }
    const content = document.getElementById('modalContent');
    content.innerHTML = `<h3>Error</h3><p>${escapeHtml(msg)}</p><div class="modal-actions"><button id="closeModalBtn" class="btn">Close</button></div>`;
    showModal(modal);
    $('#closeModalBtn')?.addEventListener('click', () => hideModal(modal));
  }

  function showMiniToast(msg, time = 2000) {
    const t = document.createElement('div');
    t.className = 'mini-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(()=> t.classList.add('visible'), 20);
    setTimeout(()=> { t.classList.remove('visible'); setTimeout(()=> t.remove(), 300); }, time);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  /* ---------- INIT / UI BINDINGS ---------- */

  async function appInit() {
    try {
      await loadCatalogue();
    } catch (err) {
      console.error('Failed to load catalogue:', err);
      return;
    }
    loadCart();
    loadWishlist();
    buildCategorySelectOptions();
    populateOptionFilter();
    renderCartPanel();
    renderWishlistCount();
    renderCartCount();
    // wire cart open/close
    const cartBtn = $('#cartBtn') || $('#cartBtnTop') || $('#cartBtn3') || $('#cartBtn4');
    if (cartBtn) cartBtn.addEventListener('click', toggleCartPanel);
    $all('.menu-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelector('.main-nav')?.classList.toggle('active');
      });
    });

    // wire checkout buttons
    $all('#checkoutBtn, #checkoutBtnLocal, #checkoutBtnTop, #checkoutBtn3, #checkoutBtn4').forEach(b => {
      b.addEventListener('click', async () => {
        try {
          await startCheckout();
        } catch (err) {
          showModalError(err.message || 'Checkout error');
        }
      });
    });

    // render category selects on pages that have them
    if (typeof renderCataloguePage === 'function') {
      try { renderCataloguePage(); } catch (e) { /* ignore — page-specific function will call it too */ }
    }

    // product page hook
    if (typeof renderProductPage === 'function') {
      try { renderProductPage(); } catch (e) { /* product page will call it explicitly */ }
    }

    // newsletter form auto-binding (if present)
    const news = document.getElementById('newsletterForm');
    if (news) {
      news.addEventListener('submit', async (e) => {
        // let form action handle it; optionally show toast
        showMiniToast('Subscribed — thank you!');
      });
    }
  }

  function toggleCartPanel() {
    const panel = $('#cartPanel');
    if (!panel) return;
    panel.classList.toggle('hidden');
  }

  /* ---------- BOOT ---------- */

  // expose for pages to call explicitly
  window.appInit = appInit;
  window.renderCataloguePage = renderCataloguePage;
  window.renderProductPage = renderProductPage;

  // small public API for debug
  return {
    addToCart,
    removeFromCart,
    getCart: () => cart,
    startCheckout
  };
})();

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
  if (window.appInit) window.appInit();
});
