/* script.js - Velvet Charms (Christmas-ready) */
(async function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  window.CATALOG = null;
  window.cart = {};
  window.wishlist = {};

  // load catalogue.json from /data folder
  async function loadCatalogJson() {
    try {
      const resp = await fetch('data/catalogue.json', { cache: 'no-store' });
      if (!resp.ok) throw new Error('catalogue.json fetch failed: ' + resp.status);
      const j = await resp.json();
      window.CATALOG = j;
      return j;
    } catch (err) {
      console.error('Failed to load catalogue.json', err);
      const cg = document.getElementById('catalogueGrid');
      if (cg) cg.innerHTML = '<p class="error">Catalogue failed to load. Check data/catalogue.json path.</p>';
      throw err;
    }
  }

  // image helper: images are inside /data/
  function createImg(src, alt = '', cls = '') {
    const img = document.createElement('img');
    // if src already looks like an absolute /data/... preserve it; otherwise prefix with data/
    img.src = src.startsWith('data/') ? src : ('data/' + src);
    img.alt = alt;
    if (cls) img.className = cls;
    img.onerror = () => {
      img.src = 'data/seasonal candle.png';
    };
    return img;
  }

  const fmt = (n) => `USD ${Number(n).toFixed(2)}`;

  async function appInit() {
    if (!window.CATALOG) {
      try {
        await loadCatalogJson();
      } catch (e) {
        // still initialize minimal UI so cart works
      }
    }
    restoreCartAndWishlist();
    syncCountsToUI();
    attachGlobalUI();
    // add snowfall if theme says so
    if (window.CATALOG && window.CATALOG.siteInfo && window.CATALOG.siteInfo.theme && window.CATALOG.siteInfo.theme.includes('christmas')) {
      addSnowfall(28);
    } else {
      addSnowfall(16); // still a small amount
    }
    console.log('appInit done');
  }

  // small snowfall generator
  function addSnowfall(count = 20) {
    // avoid creating duplicates
    if (document.body.dataset.snow === '1') return;
    document.body.dataset.snow = '1';
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'snowflake';
      s.textContent = '❄';
      const left = Math.random() * 100;
      const size = 8 + Math.random() * 18;
      const dur = 8 + Math.random() * 18;
      const delay = Math.random() * -20;
      s.style.left = left + 'vw';
      s.style.fontSize = size + 'px';
      s.style.animationDuration = dur + 's, ' + (3 + Math.random() * 6) + 's';
      s.style.animationDelay = delay + 's';
      document.body.appendChild(s);
      // remove after animation finishes (cleanup)
      setTimeout(() => {
        try { s.remove(); } catch (e) {}
      }, (dur + Math.abs(delay) + 2) * 1000);
    }
  }

  // global UI
  function attachGlobalUI() {
    const cartBtn = document.getElementById('cartBtn') || document.getElementById('cartBtn2') || document.getElementById('cartBtn3') || document.getElementById('cartBtn4');
    const favBtn = document.getElementById('favoritesBtn') || document.getElementById('favoritesBtn2') || document.getElementById('favoritesBtn3') || document.getElementById('favoritesBtn4');

    if (cartBtn) cartBtn.addEventListener('click', () => toggleCartPanel(true));
    if (favBtn) favBtn.addEventListener('click', () => openWishlist());

    // modal close handlers (single handler works across pages)
    document.addEventListener('click', (e) => {
      if (e.target.classList && e.target.classList.contains('modal-backdrop')) closeModal();
      if (e.target.classList && e.target.classList.contains('modal-close')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', handleCheckout);

    const continueBtn = document.getElementById('continueShopping');
    if (continueBtn) continueBtn.addEventListener('click', () => toggleCartPanel(false));
  }

  function syncCountsToUI() {
    const cCount = Object.values(window.cart).reduce((s, x) => s + (x.qty || 0), 0);
    const fCount = Object.keys(window.wishlist || {}).length;
    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setText('cartCount', cCount); setText('cartCount2', cCount); setText('cartCount3', cCount); setText('cartCount4', cCount);
    setText('favCount', fCount); setText('favCount2', fCount); setText('favCount3', fCount); setText('favCount4', fCount);
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

  // render catalogue page (top-level)
  function renderCataloguePage() {
    const categoriesList = document.getElementById('categoriesList');
    const grid = document.getElementById('catalogueGrid');
    if (!window.CATALOG || !categoriesList || !grid) {
      if (categoriesList) categoriesList.innerHTML = '<p class="muted">Categories</p><p class="muted">Failed to load catalogue.</p>';
      return;
    }

    categoriesList.innerHTML = '';
    window.CATALOG.categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'category-btn';
      btn.textContent = cat.name;
      btn.addEventListener('click', () => renderCategory(cat.id));
      categoriesList.appendChild(btn);
    });

    // show category cards
    grid.innerHTML = '';
    window.CATALOG.categories.forEach(cat => {
      const card = document.createElement('article');
      card.className = 'cat-card';

      const imgWrap = document.createElement('div');
      imgWrap.className = 'cat-img';
      const imgSrc = cat.categoryImage || cat.banner || (cat.subcategories && cat.subcategories[0] && cat.subcategories[0].products && cat.subcategories[0].products[0] && cat.subcategories[0].products[0].images && cat.subcategories[0].products[0].images[0]) || 'seasonal candle.png';
      imgWrap.appendChild(createImg(imgSrc, cat.name));

      const body = document.createElement('div');
      body.className = 'cat-body';
      const h = document.createElement('h3'); h.textContent = cat.name;
      const p = document.createElement('p');
      let count = 0;
      if (cat.subcategories) count = cat.subcategories.reduce((s, sc) => s + ((sc.products && sc.products.length) || 0), 0);
      else if (cat.products) count = cat.products.length;
      p.textContent = count + (cat.subcategories ? ' sections' : ' products');

      const open = document.createElement('button');
      open.className = 'btn small';
      open.textContent = 'Open';
      open.addEventListener('click', () => renderCategory(cat.id));

      body.appendChild(h);
      body.appendChild(p);
      body.appendChild(open);

      card.appendChild(imgWrap);
      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  function findCategory(id) {
    return (window.CATALOG && window.CATALOG.categories || []).find(c => c.id === id);
  }

  function renderCategory(catId) {
    const cat = findCategory(catId);
    const grid = document.getElementById('catalogueGrid');
    if (!cat || !grid) return;
    grid.innerHTML = '';

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

    if (cat.subcategories && cat.subcategories.length) {
      cat.subcategories.forEach(sub => {
        const subWrap = document.createElement('section');
        subWrap.className = 'subcategory';
        const subTitle = document.createElement('h3'); subTitle.textContent = sub.name;
        subWrap.appendChild(subTitle);

        const productRow = document.createElement('div'); productRow.className = 'product-row';
        (sub.products || []).forEach(p => productRow.appendChild(renderProductCard(p, cat.id, sub.id)));
        subWrap.appendChild(productRow);
        grid.appendChild(subWrap);
      });
    }

    if (cat.products && cat.products.length) {
      const productRow = document.createElement('div'); productRow.className = 'product-row';
      cat.products.forEach(p => productRow.appendChild(renderProductCard(p, cat.id)));
      grid.appendChild(productRow);
    }
  }

  function renderProductCard(product, categoryId, subcategoryId) {
    const card = document.createElement('article');
    card.className = 'product-card';

    const imgWrap = document.createElement('div'); imgWrap.className = 'product-img';
    const mainImg = (product.images && product.images[0]) || 'seasonal candle.png';
    imgWrap.appendChild(createImg(mainImg, product.name));
    card.appendChild(imgWrap);

    const body = document.createElement('div'); body.className = 'product-body';
    const title = document.createElement('h4'); title.textContent = product.name;
    const desc = document.createElement('p'); desc.className = 'desc'; desc.textContent = product.description || '';
    const price = document.createElement('div'); price.className = 'price'; price.textContent = fmt(product.price || 0);

    const controls = document.createElement('div'); controls.className = 'product-controls';
    const detailsBtn = document.createElement('button'); detailsBtn.className = 'btn'; detailsBtn.textContent = 'Details';
    detailsBtn.addEventListener('click', () => openProductDetails(product, categoryId, subcategoryId));

    const buyBtn = document.createElement('button'); buyBtn.className = 'btn primary'; buyBtn.textContent = 'Buy';
    buyBtn.addEventListener('click', () => { addToCart(product, 1); toggleCartPanel(true); });

    const wishBtn = document.createElement('button'); wishBtn.className = 'icon-btn small'; wishBtn.innerHTML = '♡';
    wishBtn.addEventListener('click', () => toggleWishlist(product));

    controls.appendChild(detailsBtn); controls.appendChild(buyBtn); controls.appendChild(wishBtn);

    body.appendChild(title); body.appendChild(desc); body.appendChild(price); body.appendChild(controls);

    card.appendChild(body);
    return card;
  }

  function openProductDetails(product, categoryId, subcategoryId) {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    if (!modal || !content) return;
    content.innerHTML = '';

    const h = document.createElement('h2'); h.textContent = product.name;
    const imgWrap = document.createElement('div'); imgWrap.className = 'detail-images';
    (product.images || []).forEach(fn => imgWrap.appendChild(createImg(fn, product.name, 'detail-img')));
    const desc = document.createElement('p'); desc.textContent = product.description || '';
    const price = document.createElement('div'); price.className = 'price large'; price.textContent = fmt(product.price || 0);

    const optForm = document.createElement('form'); optForm.className = 'options';
    if (product.options) {
      Object.keys(product.options).forEach(optName => {
        const label = document.createElement('label'); label.textContent = optName;
        const select = document.createElement('select'); select.name = optName;
        (product.options[optName] || []).forEach(val => {
          const o = document.createElement('option'); o.value = val; o.textContent = val; select.appendChild(o);
        });
        label.appendChild(select); optForm.appendChild(label);
      });
    }

    const qtyLabel = document.createElement('label'); qtyLabel.textContent = 'Quantity';
    const qtyInput = document.createElement('input'); qtyInput.type = 'number'; qtyInput.min = 1; qtyInput.value = 1; qtyInput.style.width = '70px';
    qtyLabel.appendChild(qtyInput); optForm.appendChild(qtyLabel);

    const addBtn = document.createElement('button'); addBtn.type = 'button'; addBtn.className = 'btn primary'; addBtn.textContent = 'Add to cart';
    addBtn.addEventListener('click', () => {
      const q = parseInt(qtyInput.value || '1', 10);
      addToCart(product, q);
      closeModal();
      toggleCartPanel(true);
    });

    const closeBtn = document.createElement('button'); closeBtn.type = 'button'; closeBtn.className = 'btn secondary'; closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeModal);

    content.appendChild(h); content.appendChild(imgWrap); content.appendChild(desc); content.appendChild(price); content.appendChild(optForm); content.appendChild(addBtn); content.appendChild(closeBtn);

    modal.classList.remove('hidden'); modal.setAttribute('aria-hidden', 'false');
    // ensure modal fits
    const card = modal.querySelector('.modal-card'); if (card) { card.style.maxHeight = '80vh'; card.style.overflow = 'auto'; }
    // focus
    closeBtn.focus();
  }

  function closeModal() {
    const modal = document.getElementById('modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  function addToCart(product, quantity = 1) {
    const id = product.id || product.name;
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

  function removeFromCart(productId) { delete window.cart[productId]; persistCart(); }

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
        const row = document.createElement('div'); row.className = 'cart-row';
        const name = document.createElement('div'); name.className = 'cart-name'; name.textContent = it.name;
        const qty = document.createElement('input'); qty.type = 'number'; qty.min = 1; qty.value = it.qty;
        qty.addEventListener('change', () => changeQty(it.productId, parseInt(qty.value || '1', 10)));
        const price = document.createElement('div'); price.className = 'cart-price'; price.textContent = fmt(it.unitPrice);
        const remove = document.createElement('button'); remove.className = 'btn small'; remove.textContent = 'Remove';
        remove.addEventListener('click', () => removeFromCart(it.productId));
        row.appendChild(name); row.appendChild(qty); row.appendChild(price); row.appendChild(remove);
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
    if (show) panel.classList.remove('hidden'); else panel.classList.add('hidden');
    panel.setAttribute('aria-hidden', !show);
    renderCartUI();
  }

  function toggleWishlist(product) {
    const id = product.id || product.name;
    if (!id) return;
    if (window.wishlist[id]) delete window.wishlist[id];
    else window.wishlist[id] = product;
    persistWishlist();
  }

  function openWishlist() {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    if (!modal || !content) return;
    content.innerHTML = '<h2>Wishlist</h2>';
    const list = document.createElement('div');
    Object.values(window.wishlist || {}).forEach(p => {
      const el = document.createElement('div'); el.className = 'wish-item';
      const addBtn = document.createElement('button'); addBtn.className = 'btn small'; addBtn.textContent = 'Add to cart';
      addBtn.addEventListener('click', () => { addToCart(p, 1); delete window.wishlist[p.id]; persistWishlist(); closeModal(); });
      el.innerHTML = `<strong>${p.name}</strong> - ${fmt(p.price || 0)}`; el.appendChild(addBtn);
      list.appendChild(el);
    });
    if (!list.children.length) list.innerHTML = '<p>No items in your wishlist.</p>';
    content.appendChild(list);
    modal.classList.remove('hidden'); modal.setAttribute('aria-hidden', 'false');
  }

  // Checkout building PayPal cart upload
  function handleCheckout() {
    const items = Object.values(window.cart || {});
    if (!items.length) { alert('Your cart is empty.'); return; }

    // BUSINESS is your PayPal email / merchant id (you asked me to put it here)
    const BUSINESS = encodeURIComponent('rosalinda.mauve@gmail.com');
    const base = `https://www.paypal.com/cgi-bin/webscr?cmd=_cart&upload=1&business=${BUSINESS}&currency_code=USD`;

    const params = [];
    items.forEach((it, idx) => {
      const i = idx + 1;
      params.push(`item_name_${i}=${encodeURIComponent(it.name)}`);
      params.push(`amount_${i}=${encodeURIComponent(Number(it.unitPrice || 0).toFixed(2))}`);
      params.push(`quantity_${i}=${encodeURIComponent(Number(it.qty || 0))}`);
    });

    const url = base + '&' + params.join('&');
    window.open(url, '_blank');
  }

  // expose for pages
  window.appInit = appInit;
  window.renderCataloguePage = renderCataloguePage;
  window.openProductDetails = openProductDetails;
  window.addToCart = addToCart;

  window.addEventListener('storage', () => restoreCartAndWishlist());
  setInterval(() => { renderCartUI(); }, 1500);
})();
