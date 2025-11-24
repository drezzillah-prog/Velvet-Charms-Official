/* script.js — Catalogue-driven multi-page site for Velvet Charms
   Features:
   - Loads catalogue.json
   - Renders categories on index and catalogue pages
   - Full product modal with personalization (image uploads allowed)
   - Cart and wishlist localStorage persistence
   - Defensive checks to avoid 'siteInfo is null' errors
*/

(() => {
  // Public functions used by HTML
  window.initSiteUI = initSiteUI;
  window.loadCatalogueAndRenderCategories = loadCatalogueAndRenderCategories;
  window.initCataloguePage = initCataloguePage;

  const CATALOGUE_PATH = './catalogue.json';

  // App state
  let CATALOG = null;
  let CART = { items: [] };
  let WISHLIST = [];

  // Utilities
  function q(sel, root = document) { return root.querySelector(sel); }
  function qAll(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  function formatPrice(n) { return `USD ${Number(n).toFixed(2)}`; }
  function encodeFilename(fn) { return './' + encodeURIComponent(fn).replace(/%2F/g, '/'); }

  // Local storage helpers
  function saveCart() { localStorage.setItem('vc_cart_v1', JSON.stringify(CART)); renderCartUI(); }
  function saveWishlist(){ localStorage.setItem('vc_wishlist_v1', JSON.stringify(WISHLIST)); updateWishlistCounts(); }
  function loadCart() { try { const raw = localStorage.getItem('vc_cart_v1'); CART = raw ? JSON.parse(raw) : { items: [] }; } catch(e){ CART={items:[]}; } }
  function loadWishlist(){ try { const raw = localStorage.getItem('vc_wishlist_v1'); WISHLIST = raw ? JSON.parse(raw) : []; } catch(e){ WISHLIST=[]; } }

  // initSiteUI - common UI wiring
  function initSiteUI(){
    loadCart(); loadWishlist();
    renderCartUI();
    updateWishlistCounts();

    // nav buttons
    const cartBtns = qAll('#cart-btn, #cart-btn-2');
    cartBtns.forEach(b => b.addEventListener('click', toggleCartDrawer));
    const favBtns = qAll('#favorites-btn, #favorites-btn-2');
    favBtns.forEach(b => b.addEventListener('click', () => {
      alert(`Wishlist: ${WISHLIST.length} item(s).`);
    }));
  }

  // Fetch catalogue.json
  async function fetchCatalogue(){
    if (CATALOG) return CATALOG;
    try {
      const res = await fetch(CATALOGUE_PATH + '?_=' + Date.now());
      if (!res.ok) throw new Error('Failed to load catalogue.json');
      const json = await res.json();
      // defensive: ensure siteInfo present
      if (!json || !json.siteInfo) {
        console.error('catalogue.json missing siteInfo');
        json.siteInfo = { name: 'Velvet Charms', tagline: '', currency: 'USD' };
      }
      CATALOG = json;
      return CATALOG;
    } catch(err) {
      console.error('Error loading catalogue:', err);
      // graceful fallback: minimal structure
      CATALOG = { siteInfo: { name: 'Velvet Charms', tagline: '', currency: 'USD'}, categories: [] };
      return CATALOG;
    }
  }

  // Render categories grid for index page
  async function loadCatalogueAndRenderCategories(containerSelector = '#categories-grid', topCategoriesOnly = false) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading catalogue…</div>';
    const data = await fetchCatalogue();
    const categories = data.categories || [];

    // fill category select (if present)
    const catSelect = document.getElementById('category-select');
    if (catSelect) {
      catSelect.innerHTML = '<option value="">— All categories —</option>';
      categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id; opt.textContent = cat.name;
        catSelect.appendChild(opt);
      });
    }

    container.innerHTML = '';
    categories.forEach(cat => {
      // show only top X categories on home if requested
      const el = document.createElement('article');
      el.className = 'card';
      const imgFile = cat.categoryImage || cat.banner || (cat.subcategories && cat.subcategories[0] && cat.subcategories[0].products && cat.subcategories[0].products[0] && cat.subcategories[0].products[0].images && cat.subcategories[0].products[0].images[0]) || '';
      const media = document.createElement('div'); media.className='media';
      if (imgFile) {
        const img = document.createElement('img');
        img.src = encodeFilename(imgFile);
        img.alt = cat.name;
        img.onerror = () => { img.style.display='none'; media.style.background='#f2e9e8'; };
        media.appendChild(img);
      }
      const body = document.createElement('div'); body.className='card-body';
      const h = document.createElement('h3'); h.textContent = cat.name;
      const meta = document.createElement('p'); meta.textContent = (cat.subcategories ? (cat.subcategories.length + ' sections') : 'Category');
      const open = document.createElement('a'); open.href = `catalogue.html?category=${encodeURIComponent(cat.id)}`; open.className='btn-outline'; open.textContent='Open';
      body.appendChild(h); body.appendChild(meta); body.appendChild(open);
      el.appendChild(media); el.appendChild(body);
      container.appendChild(el);
    });
  }

  // Catalogue page: render content, handle search, category filter
  async function initCataloguePage(){
    const data = await fetchCatalogue();
    const content = document.getElementById('catalogue-content');
    const select = document.getElementById('category-select');
    const search = document.getElementById('search-input');
    if (!content) return;

    // helper: flatten products with path info (category, subcategory)
    function allProducts() {
      const items = [];
      (data.categories || []).forEach(cat => {
        if (cat.subcategories) {
          cat.subcategories.forEach(sub => {
            if (sub.products) sub.products.forEach(prod => items.push({ cat, sub, prod }));
          });
        } else if (cat.products) {
          cat.products.forEach(prod => items.push({ cat, sub: null, prod }));
        }
      });
      return items;
    }

    function renderList(filterCatId = '', filterText = '') {
      content.innerHTML = '';
      const items = allProducts().filter(entry => {
        if (filterCatId && entry.cat.id !== filterCatId) return false;
        if (!filterText) return true;
        const q = filterText.toLowerCase();
        return (entry.prod.name && entry.prod.name.toLowerCase().includes(q)) ||
               (entry.cat.name && entry.cat.name.toLowerCase().includes(q)) ||
               (entry.sub && entry.sub.name && entry.sub.name.toLowerCase().includes(q));
      });

      if (items.length === 0) {
        content.innerHTML = '<p>No products found.</p>';
        return;
      }

      items.forEach(({cat, sub, prod}) => {
        const card = document.createElement('article');
        card.className = 'card product-card';
        const media = document.createElement('div'); media.className='media';
        const firstImg = (prod.images && prod.images[0]) || (cat.categoryImage || '');
        if (firstImg) {
          const img = document.createElement('img');
          img.src = encodeFilename(firstImg);
          img.alt = prod.name;
          img.onerror = () => { img.style.display='none'; media.style.background='#f2e9e8'; };
          media.appendChild(img);
        }
        const body = document.createElement('div'); body.className='card-body';
        const title = document.createElement('h4'); title.textContent = prod.name;
        const desc = document.createElement('p'); desc.textContent = prod.description || '';
        const price = document.createElement('div'); price.className='price'; price.textContent = formatPrice(prod.price || 0);
        const controls = document.createElement('div'); controls.className='actions';

        const detailsBtn = document.createElement('button'); detailsBtn.className='btn-outline'; detailsBtn.textContent='Details';
        detailsBtn.addEventListener('click', () => openProductModal(prod, cat, sub));

        const buyBtn = document.createElement('button'); buyBtn.className='btn'; buyBtn.textContent='Buy';
        buyBtn.addEventListener('click', () => openProductModal(prod, cat, sub, { autoOpenToBuy:true }));

        const heart = document.createElement('span'); heart.className='icon-heart'; heart.title='Add to wishlist';
        heart.innerHTML = WISHLIST.includes(prod.id) ? '❤' : '♡';
        heart.addEventListener('click', () => {
          toggleWishlist(prod.id);
          heart.innerHTML = WISHLIST.includes(prod.id) ? '❤' : '♡';
        });

        controls.appendChild(detailsBtn);
        controls.appendChild(buyBtn);
        controls.appendChild(heart);

        body.appendChild(title);
        body.appendChild(desc);
        body.appendChild(price);
        body.appendChild(controls);

        card.appendChild(media);
        card.appendChild(body);
        content.appendChild(card);
      });
    }

    // populate select options
    const categories = (data.categories || []);
    if (select) {
      select.innerHTML = '<option value="">— All categories —</option>';
      categories.forEach(c => {
        const opt = document.createElement('option'); opt.value = c.id; opt.textContent = c.name;
        select.appendChild(opt);
      });
      select.addEventListener('change', () => renderList(select.value, search.value.trim()));
    }
    if (search) {
      search.addEventListener('input', () => renderList(select ? select.value : '', search.value.trim()));
    }

    // check URL param category
    const urlParams = new URLSearchParams(location.search);
    const categoryParam = urlParams.get('category') || '';
    if (categoryParam && select) select.value = categoryParam;

    // initial render
    renderList(categoryParam, '');

    // wire modal close and cart UI
    const modalClose = document.getElementById('modal-close');
    if (modalClose) modalClose.addEventListener('click', closeProductModal);
    document.addEventListener('keydown', (ev) => { if(ev.key==='Escape') closeProductModal(); });

    // checkout button
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', handleCheckout);
  }

  // PRODUCT MODAL
  function openProductModal(prod, cat, sub, opts={}) {
    const modal = document.getElementById('product-modal');
    const container = document.getElementById('product-detail');
    if (!modal || !container) return;
    container.innerHTML = '';
    // header
    const title = document.createElement('h3'); title.textContent = prod.name;
    const imagesWrap = document.createElement('div'); imagesWrap.className='modal-images';
    // show all images as gallery
    (prod.images || []).forEach(fn=>{
      const img = document.createElement('img');
      img.src = encodeFilename(fn);
      img.alt = prod.name;
      img.style.maxWidth='180px'; img.style.margin='6px'; img.style.borderRadius='8px';
      img.onerror = () => { img.style.display='none'; };
      imagesWrap.appendChild(img);
    });

    const desc = document.createElement('p'); desc.textContent = prod.description || '';
    const price = document.createElement('div'); price.className='price'; price.textContent = formatPrice(prod.price || 0);

    // personalization form
    const form = document.createElement('form');
    form.id = 'personalization-form';
    form.innerHTML = `
      <label for="pc-quantity">Quantity</label>
      <input id="pc-quantity" name="quantity" type="number" min="1" value="1" />

      <label for="pc-note">Custom note / details</label>
      <textarea id="pc-note" name="note" rows="4" placeholder="Add names, colors, sizes, or attach reference images..."></textarea>

      <label for="pc-files">Upload reference images (optional)</label>
      <input id="pc-files" name="files" type="file" accept="image/*" multiple />
      <div id="pc-files-list" style="margin-top:8px"></div>

      <div style="margin-top:12px">
        <button type="button" id="pc-add-to-cart" class="btn">Add to cart</button>
        <button type="button" id="pc-buy-now" class="btn ghost">Buy now</button>
      </div>
    `;

    // file preview
    const filesInput = form.querySelector('#pc-files');
    const filesList = form.querySelector('#pc-files-list');
    filesInput.addEventListener('change', () => {
      filesList.innerHTML = '';
      Array.from(filesInput.files).forEach(file=>{
        const p = document.createElement('div');
        p.textContent = file.name;
        filesList.appendChild(p);
      });
    });

    container.appendChild(title);
    container.appendChild(imagesWrap);
    container.appendChild(desc);
    container.appendChild(price);
    container.appendChild(form);

    // add-to-cart handler
    const addBtn = form.querySelector('#pc-add-to-cart');
    addBtn.addEventListener('click', () => {
      const qty = Number(form.querySelector('#pc-quantity').value) || 1;
      const note = form.querySelector('#pc-note').value || '';
      // capture file names (we don't upload them to server here)
      const uploaded = Array.from(filesInput.files).map(f=>f.name);
      addToCart(prod, qty, note, uploaded);
      closeProductModal();
    });

    const buyNow = form.querySelector('#pc-buy-now');
    buyNow.addEventListener('click', () => {
      const qty = Number(form.querySelector('#pc-quantity').value) || 1;
      const note = form.querySelector('#pc-note').value || '';
      const uploaded = Array.from(filesInput.files).map(f=>f.name);
      addToCart(prod, qty, note, uploaded);
      // immediately open checkout
      toggleCartDrawer(true);
      closeProductModal();
    });

    // show modal
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeProductModal(){
    const modal = document.getElementById('product-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  // CART functions
  function addToCart(prod, quantity=1, note='', uploadedFiles=[]){
    const existing = CART.items.find(i => i.id === prod.id && i.note === note && JSON.stringify(i.uploaded || []) === JSON.stringify(uploadedFiles));
    if (existing) {
      existing.quantity += quantity;
    } else {
      CART.items.push({
        id: prod.id,
        name: prod.name,
        price: prod.price || 0,
        quantity,
        note,
        uploaded: uploadedFiles
      });
    }
    saveCart();
    toggleCartDrawer(true);
  }

  function toggleCartDrawer(show){
    const drawer = document.getElementById('cart-drawer');
    if (!drawer) return;
    if (typeof show === 'boolean' ? show : drawer.classList.contains('hidden')) {
      drawer.classList.remove('hidden');
      drawer.setAttribute('aria-hidden', 'false');
    } else {
      drawer.classList.add('hidden');
      drawer.setAttribute('aria-hidden', 'true');
    }
    renderCartUI();
  }

  function renderCartUI(){
    const drawer = document.getElementById('cart-drawer');
    const itemsWrap = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    const cartCountEls = qAll('#cart-count, #cart-count-2, #cart-count'); // extra selectors
    const cnt = CART.items.reduce((s,i)=>s+i.quantity, 0);
    cartCountEls.forEach(el => { if (el) el.textContent = cnt; });

    if (!itemsWrap) return;
    itemsWrap.innerHTML = '';
    if (!CART.items || CART.items.length === 0) {
      itemsWrap.innerHTML = '<p>Your cart is empty.</p>';
      if (totalEl) totalEl.textContent = 'Total: USD 0.00';
      return;
    }

    let total = 0;
    CART.items.forEach((it, idx) => {
      const el = document.createElement('div'); el.className='cart-row';
      el.style.marginBottom='10px';
      el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><strong>${it.name}</strong><div style="font-size:13px;color:#555">${it.note ? it.note : ''}</div></div>
          <div style="text-align:right">${formatPrice(it.price)}<div style="font-size:13px;color:#777">x ${it.quantity}</div></div>
        </div>
      `;
      const controls = document.createElement('div'); controls.style.marginTop='6px';
      const rem = document.createElement('button'); rem.className='btn-outline'; rem.textContent='Remove';
      rem.addEventListener('click', () => {
        CART.items.splice(idx,1); saveCart();
      });
      controls.appendChild(rem);
      el.appendChild(controls);
      itemsWrap.appendChild(el);
      total += (it.price || 0) * (it.quantity || 1);
    });
    if (totalEl) totalEl.textContent = `Total: ${formatPrice(total)}`;
  }

  function handleCheckout(){
    // Build a PayPal form redirect (client-side). For demo use, we will open PayPal checkout link per item
    if (!CART.items || CART.items.length === 0) { alert('Your cart is empty.'); return; }
    // For simplicity: if there's exactly one item and it has a paymentLink in catalogue, open it; else open generic PayPal homepage
    (async () => {
      const data = await fetchCatalogue();
      const firstItem = CART.items[0];
      // try to find product paymentLink
      function findPaymentLink(id) {
        const all = [];
        (data.categories || []).forEach(cat => {
          if (cat.subcategories) {
            cat.subcategories.forEach(sub => {
              if (sub.products) sub.products.forEach(p => all.push(p));
            });
          }
          if (cat.products) cat.products.forEach(p => all.push(p));
        });
        const p = all.find(x => x.id === id);
        return p ? p.paymentLink : null;
      }
      const link = findPaymentLink(firstItem.id);
      if (link) {
        // open payment for first item (user can adjust on PayPal)
        window.open(link, '_blank');
      } else {
        // fallback
        window.open('https://www.paypal.com/checkoutnow', '_blank');
      }
    })();
  }

  // Wishlist
  function toggleWishlist(prodId){
    const idx = WISHLIST.indexOf(prodId);
    if (idx === -1) { WISHLIST.push(prodId); } else { WISHLIST.splice(idx,1); }
    saveWishlist();
  }
  function updateWishlistCounts(){
    const favEls = document.querySelectorAll('#fav-count, #fav-count-2');
    favEls.forEach(el => { if (el) el.textContent = WISHLIST.length; });
  }

  // product modal open helper (used from catalogue page)
  function openProductModalById(prodId) {
    const data = CATALOG || {};
    const all = [];
    (data.categories || []).forEach(cat => {
      if (cat.subcategories) cat.subcategories.forEach(sub => { if (sub.products) sub.products.forEach(p => all.push({cat, sub, p})); });
      if (cat.products) cat.products.forEach(p => all.push({cat, sub: null, p}));
    });
    const found = all.find(entry => entry.p.id === prodId);
    if (found) openProductModal(found.p, found.cat, found.sub);
  }

  // Expose some helpers for HTML to call
  window.addToCart = addToCart;
  window.toggleCartDrawer = toggleCartDrawer;
  window.openProductModalById = openProductModalById;

})();
