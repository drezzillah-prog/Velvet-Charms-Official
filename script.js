/* script.js - robust catalogue loader and UI (replace existing) */

(async function () {
  // simple utility
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // state
  window.CATALOG = null;
  window.cart = {}; // {productId: {product, qty, unitPrice, name}}
  window.wishlist = {}; // {productId: product}

  // helper: fetch JSON with timeout and nice errors
  async function fetchJson(url, timeout = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const resp = await fetch(url, {cache: "no-store", signal: controller.signal});
      clearTimeout(id);
      if (!resp.ok) throw new Error(`Fetch ${url} failed: ${resp.status}`);
      return await resp.json();
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  // try to load master catalogue, otherwise load individual files
  async function loadCatalogJson() {
    const dataPrefix = 'data/';
    const fallbackFiles = [
      'candles.json',
      'soaps.json',
      'perfumes.json',
      'hair.json',
      'wool.json',
      'epoxy.json',
      'paintings.json',
      'bundles.json',
      'catalogue.json' // included in fallback list in case it exists with different casing
    ];
    // first try canonical merged file
    try {
      const j = await fetchJson(dataPrefix + 'catalogue.json');
      window.CATALOG = j;
      return j;
    } catch (err) {
      console.warn('Primary catalogue.json failed, attempting to load small JSONs...', err);
      // try to load all individual category JSONs and merge
      const merged = { siteInfo: null, categories: [] };
      for (const fname of fallbackFiles) {
        // skip catalogue.json here (already tried)
        if (fname === 'catalogue.json') continue;
        try {
          const obj = await fetchJson(dataPrefix + fname);
          // Determine structure: either top-level with "categories" or a single category
          if (obj.categories && Array.isArray(obj.categories)) {
            // merge each category
            merged.categories.push(...obj.categories);
          } else if (obj.category && (obj.products || obj.subcategories || obj.items)) {
            // many small JSONs may use { "category": "Name", ... } shape
            // convert to normalized category shape
            const cat = { id: (obj.id || (obj.category && obj.category.toLowerCase().replace(/\s+/g,'_')) || fname.replace('.json','')), name: obj.category || obj.name || 'Category', ...{} };
            if (obj.categoryImage) cat.categoryImage = obj.categoryImage;
            // different possible content shapes: "products", "subcategories", "items", "subcategories"
            if (obj.products) cat.products = obj.products;
            else if (obj.items) cat.products = obj.items;
            else if (obj.subcategories) cat.subcategories = obj.subcategories;
            else if (obj.subcategories_list) cat.subcategories = obj.subcategories_list;
            merged.categories.push(cat);
          } else if (obj.subcategories && Array.isArray(obj.subcategories)) {
            // e.g. candles.json in some shapes
            const cat = { id: fname.replace('.json',''), name: (obj.category || fname.replace('.json','')), subcategories: obj.subcategories };
            merged.categories.push(cat);
          } else {
            // unknown shape: try to push as-is
            merged.categories.push({ id: fname.replace('.json',''), name: (obj.category || obj.name || fname.replace('.json','')), products: obj.items || obj.products || [] });
          }
        } catch (e) {
          console.warn('Could not load', fname, e.message);
        }
      }

      // if no categories loaded, throw error
      if (!merged.categories.length) {
        throw new Error('No category JSONs could be loaded.');
      }

      // Try to also load siteInfo if present in root-level catalogue.json (some backups)
      try {
        const rootCat = await fetchJson(dataPrefix + 'catalogue.json');
        if (rootCat.siteInfo) merged.siteInfo = rootCat.siteInfo;
      } catch (e) {
        // ignore
      }

      // normalize: if any product images do not include data/ prefix, script will add when rendering
      window.CATALOG = merged;
      return merged;
    }
  }

  // safe image element with fallback; images are inside data/ folder
  function createImg(src, alt = '', cls = '') {
    const img = document.createElement('img');
    // if src already absolute or contains data/ then keep; else prefix with data/
    if (!src) src = 'seasonal candle.png';
    const srcStr = (src.startsWith('data/') || src.startsWith('http') || src.startsWith('/')) ? src : `data/${src}`;
    img.src = srcStr;
    img.alt = alt;
    if (cls) img.className = cls;
    img.onerror = () => {
      // fallback local file (keep inside data/ too)
      img.onerror = null;
      img.src = 'data/seasonal candle.png';
    };
    return img;
  }

  // format price
  const fmt = (n) => `USD ${Number(n || 0).toFixed(2)}`;

  // app init
  async function appInit() {
    try {
      await loadCatalogJson();
    } catch (err) {
      console.error('Failed to load any catalogue JSONs:', err);
      const cg = document.getElementById('catalogueGrid');
      if (cg) cg.innerHTML = '<p class="error">Catalogue failed to load. Check /data/*.json files and console for details.</p>';
      return;
    }
    // render header counts if exist
    syncCountsToUI();
    // restore cart/wishlist from storage
    restoreCartAndWishlist();
    // attach UI events (global)
    attachGlobalUI();
    // initial render
    renderCataloguePage();
    console.log('appInit done');
  }

  // attach global UI buttons
  function attachGlobalUI() {
    const cartBtn = document.getElementById('cartBtn') || document.getElementById('cartBtn2') || document.getElementById('cartBtn3') || document.getElementById('cartBtn4');
    const favBtn = document.getElementById('favoritesBtn') || document.getElementById('favoritesBtn2') || document.getElementById('favoritesBtn3') || document.getElementById('favoritesBtn4');

    if (cartBtn) cartBtn.addEventListener('click', () => toggleCartPanel(true));
    if (favBtn) favBtn.addEventListener('click', () => openWishlist());

    // modal close buttons
    const modalClose = document.getElementById('modalClose2');
    if (modalClose) modalClose.addEventListener('click', closeModal);
    const modal = document.getElementById('modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-backdrop')) closeModal();
      });
    }

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', handleCheckout);

    const continueBtn = document.getElementById('continueShopping');
    if (continueBtn) continueBtn.addEventListener('click', () => toggleCartPanel(false));
  }

  function syncCountsToUI() {
    const cCount = Object.values(window.cart).reduce((s, x) => s + (x.qty || 0), 0);
    const fCount = Object.keys(window.wishlist || {}).length;
    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setText('cartCount', cCount);
    setText('cartCount2', cCount);
    setText('cartCount3', cCount);
    setText('cartCount4', cCount);
    setText('favCount', fCount);
    setText('favCount2', fCount);
    setText('favCount3', fCount);
    setText('favCount4', fCount);
  }

  function restoreCartAndWishlist() {
    try {
      const c = JSON.parse(localStorage.getItem('vc_cart') || '{}');
      const w = JSON.parse(localStorage.getItem('vc_wishlist') || '{}');
      window.cart = c || {};
      window.wishlist = w || {};
    } catch (e) {
      window.cart = {};
      window.wishlist = {};
    }
    renderCartUI();
    syncCountsToUI();
  }

  function persistCart() {
    localStorage.setItem('vc_cart', JSON.stringify(window.cart));
    renderCartUI();
    syncCountsToUI();
  }

  function persistWishlist() {
    localStorage.setItem('vc_wishlist', JSON.stringify(window.wishlist));
    syncCountsToUI();
  }

  // render catalogue page
  function renderCataloguePage() {
    const categoriesList = document.getElementById('categoriesList');
    const grid = document.getElementById('catalogueGrid');
    if (!window.CATALOG || !categoriesList || !grid) return;

    // categories sidebar
    categoriesList.innerHTML = '';
    (window.CATALOG.categories || []).forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'category-btn';
      btn.textContent = cat.name || cat.id;
      btn.addEventListener('click', () => renderCategory(cat.id || cat.name));
      categoriesList.appendChild(btn);
    });

    // initial grid: show top-level categories as cards
    grid.innerHTML = '';
    (window.CATALOG.categories || []).forEach(cat => {
      const card = document.createElement('article');
      card.className = 'cat-card';

      const imgWrap = document.createElement('div');
      imgWrap.className = 'cat-img';
      const imgSrc = cat.categoryImage || cat.banner || (cat.subcategories && cat.subcategories[0] && (cat.subcategories[0].products && cat.subcategories[0].products[0] && cat.subcategories[0].products[0].images && cat.subcategories[0].products[0].images[0])) || (cat.products && cat.products[0] && cat.products[0].images && cat.products[0].images[0]) || 'seasonal candle.png';
      imgWrap.appendChild(createImg(imgSrc, cat.name));

      const body = document.createElement('div');
      body.className = 'cat-body';
      const h = document.createElement('h3'); h.textContent = cat.name;
      const p = document.createElement('p');
      // count logic
      let count = 0;
      if (cat.subcategories) count = cat.subcategories.reduce((s, sc) => s + ((sc.products && sc.products.length) || (sc.items && sc.items.length) || 0), 0);
      else if (cat.products) count = cat.products.length;
      else if (cat.items) count = cat.items.length;
      p.textContent = count + ' items';

      const open = document.createElement('button');
      open.className = 'btn small';
      open.textContent = 'Open';
      open.addEventListener('click', () => renderCategory(cat.id || cat.name));

      body.appendChild(h);
      body.appendChild(p);
      body.appendChild(open);

      card.appendChild(imgWrap);
      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  // find category by id or name
  function findCategory(idOrName) {
    return (window.CATALOG.categories || []).find(c => (c.id && c.id === idOrName) || (c.name && c.name === idOrName));
  }

  // render a specific category (list products/subcategories)
  function renderCategory(catId) {
    const cat = findCategory(catId);
    const grid = document.getElementById('catalogueGrid');
    if (!cat || !grid) return;
    grid.innerHTML = '';

    // show breadcrumb + back button
    const headerCard = document.createElement('div');
    headerCard.className = 'category-header';
    const backBtn = document.createElement('button');
    backBtn.className = 'btn small';
    backBtn.textContent = 'Back';
    backBtn.addEventListener('click', renderCataloguePage);
    const title = document.createElement('h2');
    title.textContent = cat.name;
    headerCard.appendChild(backBtn);
    headerCard.appendChild(title);
    grid.appendChild(headerCard);

    // if subcategories: render each subcategory title and products
    if (cat.subcategories && cat.subcategories.length) {
      cat.subcategories.forEach(sub => {
        const subWrap = document.createElement('section');
        subWrap.className = 'subcategory';
        const subTitle = document.createElement('h3');
        subTitle.textContent = sub.name;
        subWrap.appendChild(subTitle);

        const productRow = document.createElement('div');
        productRow.className = 'product-row';
        (sub.products || sub.items || []).forEach(p => {
          productRow.appendChild(renderProductCard(p, cat.id, sub.id));
        });
        subWrap.appendChild(productRow);
        grid.appendChild(subWrap);
      });
    }

    // if direct products
    if (cat.products && cat.products.length) {
      const productRow = document.createElement('div');
      productRow.className = 'product-row';
      cat.products.forEach(p => productRow.appendChild(renderProductCard(p, cat.id)));
      grid.appendChild(productRow);
    }

    // if items (different shape)
    if (cat.items && cat.items.length) {
      const productRow = document.createElement('div');
      productRow.className = 'product-row';
      cat.items.forEach(p => productRow.appendChild(renderProductCard(p, cat.id)));
      grid.appendChild(productRow);
    }
  }

  // create product card element
  function renderProductCard(product, categoryId, subcategoryId) {
    const card = document.createElement('article');
    card.className = 'product-card';

    const imgWrap = document.createElement('div');
    imgWrap.className = 'product-img';
    const mainImg = (product.images && product.images[0]) || 'seasonal candle.png';
    imgWrap.appendChild(createImg(mainImg, product.name));
    card.appendChild(imgWrap);

    const body = document.createElement('div');
    body.className = 'product-body';
    const title = document.createElement('h4'); title.textContent = product.name;
    const desc = document.createElement('p'); desc.className = 'desc'; desc.textContent = product.description || '';
    const price = document.createElement('div'); price.className = 'price'; price.textContent = fmt(product.price);

    const controls = document.createElement('div'); controls.className = 'product-controls';
    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'btn';
    detailsBtn.textContent = 'Details';
    detailsBtn.addEventListener('click', () => openProductDetails(product, categoryId, subcategoryId));

    const buyBtn = document.createElement('button');
    buyBtn.className = 'btn primary';
    buyBtn.textContent = 'Buy';
    buyBtn.addEventListener('click', () => addToCart(product, 1));

    const wishBtn = document.createElement('button');
    wishBtn.className = 'icon-btn small';
    wishBtn.innerHTML = '♡';
    wishBtn.addEventListener('click', () => {
      toggleWishlist(product);
    });

    controls.appendChild(detailsBtn);
    controls.appendChild(buyBtn);
    controls.appendChild(wishBtn);

    body.appendChild(title);
    body.appendChild(desc);
    body.appendChild(price);
    body.appendChild(controls);

    card.appendChild(body);
    return card;
  }

  // product details modal
  function openProductDetails(product, categoryId, subcategoryId) {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    if (!modal || !content) return;
    content.innerHTML = '';

    const h = document.createElement('h2'); h.textContent = product.name;
    const imgWrap = document.createElement('div'); imgWrap.className = 'detail-images';
    (product.images || []).slice(0,5).forEach(fn => imgWrap.appendChild(createImg(fn, product.name, 'detail-img')));
    const desc = document.createElement('p'); desc.textContent = product.description || '';
    const price = document.createElement('div'); price.className = 'price large'; price.textContent = fmt(product.price);

    // options (if any)
    const optForm = document.createElement('form');
    optForm.className = 'options';
    if (product.options) {
      Object.keys(product.options).forEach(optName => {
        const label = document.createElement('label');
        label.textContent = optName;
        const select = document.createElement('select');
        select.name = optName;
        (product.options[optName] || []).forEach(val => {
          const o = document.createElement('option'); o.value = val; o.textContent = val;
          select.appendChild(o);
        });
        label.appendChild(select);
        optForm.appendChild(label);
      });
    }

    const qtyLabel = document.createElement('label');
    qtyLabel.textContent = 'Quantity';
    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.min = 1;
    qtyInput.value = 1;
    qtyInput.style.width = '70px';
    qtyLabel.appendChild(qtyInput);
    optForm.appendChild(qtyLabel);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn primary';
    addBtn.textContent = 'Add to cart';
    addBtn.addEventListener('click', () => {
      const q = parseInt(qtyInput.value || '1', 10);
      addToCart(product, q);
      closeModal();
      toggleCartPanel(true);
    });

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn secondary';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeModal);

    content.appendChild(h);
    content.appendChild(imgWrap);
    content.appendChild(desc);
    content.appendChild(price);
    content.appendChild(optForm);
    content.appendChild(addBtn);
    content.appendChild(closeBtn);

    // show modal
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    // ensure modal fits: limit height
    const card = modal.querySelector('.modal-card');
    if (card) {
      card.style.maxHeight = '80vh';
      card.style.overflow = 'auto';
    }
  }

  function closeModal() {
    const modal = document.getElementById('modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  // cart functions
  function addToCart(product, quantity = 1) {
    const id = product.id;
    if (!id) return;
    const existing = window.cart[id];
    if (existing) {
      existing.qty = existing.qty + quantity;
    } else {
      window.cart[id] = {
        productId: id,
        name: product.name,
        unitPrice: Number(product.price || 0),
        qty: quantity,
        paymentLink: product.paymentLink || null
      };
    }
    persistCart();
  }

  function removeFromCart(productId) {
    delete window.cart[productId];
    persistCart();
  }

  function changeQty(productId, qty) {
    if (!window.cart[productId]) return;
    window.cart[productId].qty = qty;
    if (qty <= 0) removeFromCart(productId);
    persistCart();
  }

  function renderCartUI() {
    const panel = document.getElementById('cartPanel');
    const itemsWrap = document.getElementById('cartItems');
    if (!itemsWrap) return;
    itemsWrap.innerHTML = '';
    const items = Object.values(window.cart || {});
    if (items.length === 0) {
      itemsWrap.innerHTML = '<p>Your cart is empty.</p>';
    } else {
      items.forEach(it => {
        const row = document.createElement('div');
        row.className = 'cart-row';
        const name = document.createElement('div'); name.className = 'cart-name'; name.textContent = it.name;
        const qty = document.createElement('input'); qty.type = 'number'; qty.min = 1; qty.value = it.qty; qty.addEventListener('change', () => changeQty(it.productId, parseInt(qty.value || '1', 10)));
        const price = document.createElement('div'); price.className = 'cart-price'; price.textContent = fmt(it.unitPrice);
        const remove = document.createElement('button'); remove.className = 'btn small'; remove.textContent = 'Remove'; remove.addEventListener('click', () => removeFromCart(it.productId));
        row.appendChild(name);
        row.appendChild(qty);
        row.appendChild(price);
        row.appendChild(remove);
        itemsWrap.appendChild(row);
      });
    }
    const totalEl = document.getElementById('cartTotal');
    if (totalEl) totalEl.textContent = fmt(computeCartTotal());
    syncCountsToUI();
  }

  function computeCartTotal() {
    return Object.values(window.cart || {}).reduce((s, it) => s + (Number(it.unitPrice || 0) * Number(it.qty || 0)), 0);
  }

  function toggleCartPanel(show) {
    const panel = document.getElementById('cartPanel');
    if (!panel) return;
    if (show) panel.classList.remove('hidden');
    else panel.classList.add('hidden');
    panel.setAttribute('aria-hidden', !show);
    renderCartUI();
  }

  // wishlist toggle
  function toggleWishlist(product) {
    if (!product || !product.id) return;
    if (window.wishlist[product.id]) {
      delete window.wishlist[product.id];
    } else {
      window.wishlist[product.id] = product;
    }
    persistWishlist();
  }

  function openWishlist() {
    // simple: show modal listing wishlist
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    if (!modal || !content) return;
    content.innerHTML = '<h2>Wishlist</h2>';
    const list = document.createElement('div');
    Object.values(window.wishlist || {}).forEach(p => {
      const el = document.createElement('div');
      el.className = 'wish-item';
      el.innerHTML = `<strong>${p.name}</strong> - ${fmt(p.price || 0)} <button class="btn small">Add to cart</button>`;
      const btn = el.querySelector('button');
      btn.addEventListener('click', () => { addToCart(p, 1); delete window.wishlist[p.id]; persistWishlist(); closeModal(); });
      list.appendChild(el);
    });
    if (!list.children.length) list.innerHTML = '<p>No items in your wishlist.</p>';
    content.appendChild(list);
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }

  // Checkout handling
  // Build PayPal cart upload URL (uses standard PayPal webcart). NOTE: you MUST replace BUSINESS_EMAIL placeholder with your PayPal business email or merchant ID for it to work.
  function handleCheckout() {
    const items = Object.values(window.cart || {});
    if (!items.length) {
      alert('Your cart is empty.');
      return;
    }

    // Build PayPal cart upload query
    // Replace the placeholder with your PayPal business email or merchant ID.
    const BUSINESS = encodeURIComponent('rosalinda.mauve@gmail.com'); // prefilled per request
    const base = `https://www.paypal.com/cgi-bin/webscr?cmd=_cart&upload=1&business=${BUSINESS}&currency_code=USD`;

    // Build item parameters (item_name_1, amount_1, quantity_1 ...)
    const params = [];
    items.forEach((it, idx) => {
      const i = idx + 1;
      params.push(`item_name_${i}=${encodeURIComponent(it.name)}`);
      // amount must be unit price
      params.push(`amount_${i}=${encodeURIComponent(Number(it.unitPrice || 0).toFixed(2))}`);
      params.push(`quantity_${i}=${encodeURIComponent(Number(it.qty || 0))}`);
      // If product has a paymentLink, we cannot push that into the cart upload easily; keep the webcart fallback.
    });

    const url = base + '&' + params.join('&');

    // Open PayPal cart
    window.open(url, '_blank');
  }

  // small helper: render home (optional)
  function renderHome() {
    // nothing heavy — homepage is static
  }

  // expose to global
  window.appInit = appInit;
  window.renderCataloguePage = renderCataloguePage;
  window.renderAbout = () => {}; // placeholder
  window.openProductDetails = openProductDetails;
  window.addToCart = addToCart;

  // watch localStorage and render when changes happen elsewhere
  window.addEventListener('storage', () => restoreCartAndWishlist());

  // keep renderCart UI updated whenever cart changes by setting a small interval (safe)
  setInterval(() => { renderCartUI(); }, 1500);

  // init on DOM ready
  document.addEventListener('DOMContentLoaded', () => { appInit().catch(e => console.error(e)); });

})();
