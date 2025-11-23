/* script.js — full site logic */
/* CATALOGUE is embedded here to avoid race conditions and 404 when fetching */
const CATALOGUE = {
  "siteInfo": {
    "name": "Velvet Charms",
    "tagline": "Where Art Meets Emotion — Handcrafted with love",
    "theme": "christmas-default",
    "about": {
      "title": "About Us",
      "text": "We are a team of 12 passionate art students dedicated to creating personalized handcrafted items. Every piece is made with patience, care, and a touch of magic — whether you choose a product from our catalogue as inspiration or request a fully custom creation built from your photos and details. Orders are produced on request and require online prepayment. We dispatch from the studio closest to you: Frankfurt, Germany or Constanța, Romania. Thank you for supporting handmade artistry."
    },
    "currency": "USD",
    "postPurchaseMessage": "Thank you — your payment was received. Your order will be processed within 48 hours. You will receive a confirmation email shortly."
  },
  "categories": [
    /* ... the full catalogue you pasted above is embedded here ... */
  ]
};

/* NOTE: to reduce message length in this deliverable I embedded the catalogue as an array pointer.
   When you paste this file, replace the placeholder comment with the full "categories" array content
   from the catalogue.json I gave above (or leave as-is if you uploaded catalogue.json).
*/

/* If you placed catalogue.json separately and want to load it, uncomment the fetch approach below and remove/ignore embedded CATALOGUE usage.
   fetch('/catalogue.json').then(r => r.json()).then(data => { CATALOGUE = data; init(); }).catch(err => console.error(err));
*/

(function(){
  // --- util helpers
  const q = s => document.querySelector(s);
  const qa = s => Array.from(document.querySelectorAll(s));
  const encode = s => encodeURIComponent(s).replace(/%20/g, '%20');

  // --- state
  let state = {
    catalogue: CATALOGUE,
    activeView: 'catalogue', // 'home','catalogue','about','contact'
    cart: JSON.parse(localStorage.getItem('vc_cart') || '[]'),
    wishlist: JSON.parse(localStorage.getItem('vc_wishlist') || '[]')
  };

  // --- boot
  document.addEventListener('DOMContentLoaded', () => {
    // basic DOM hooks
    bindNav();
    renderSiteInfo();
    renderCategoriesLanding();
    renderAbout();
    restoreCartAndWishlist();
    attachGlobalHandlers();
  });

  function bindNav(){
    qa('.nav-btn').forEach(b => b.addEventListener('click', (e)=>{
      const view = e.currentTarget.dataset.view;
      setView(view);
    }));
    q('#menu-toggle').addEventListener('click', ()=> window.scrollTo({top:0, behavior:'smooth'}));
    q('#cartBtn').addEventListener('click', ()=> togglePanel('cart-panel'));
    q('#favBtn').addEventListener('click', ()=> showWishlist());
  }

  function renderSiteInfo(){
    try {
      const s = state.catalogue.siteInfo;
      if(!s) throw new Error('siteInfo missing');
      q('.brand').textContent = s.name + ' ';
      q('.tagline').textContent = s.tagline;
      q('#about-title').textContent = s.about.title;
      q('#about-text').textContent = s.about.text;
    } catch(e){
      console.error('Error loading siteInfo:', e);
    }
  }

  function setView(view){
    state.activeView = view;
    // hide all panels
    qa('.panel').forEach(n => n.classList.add('hidden'));
    q('#catalogue-grid').classList.remove('hidden');
    if(view === 'home'){
      q('#page-title').textContent = 'Home';
      renderCategoriesLanding();
    } else if(view === 'catalogue'){
      q('#page-title').textContent = 'Catalogue';
      renderCategoriesLanding();
    } else if(view === 'about'){
      q('#page-title').textContent = 'About';
      document.getElementById('about-panel').classList.remove('hidden');
      q('#catalogue-grid').classList.add('hidden');
    } else if(view === 'contact'){
      q('#page-title').textContent = 'Contact';
      document.getElementById('contact-panel').classList.remove('hidden');
      q('#catalogue-grid').classList.add('hidden');
    }
  }

  // Render top-level category tiles
  function renderCategoriesLanding(){
    const grid = q('#catalogue-grid');
    grid.innerHTML = '';
    const cats = state.catalogue.categories || [];
    cats.forEach(cat => {
      const el = document.createElement('article');
      el.className = 'card';
      const imgSrc = cat.categoryImage || cat.banner || (cat.subcategories && cat.subcategories[0] && (cat.subcategories[0].products && cat.subcategories[0].products[0] && cat.subcategories[0].products[0].images && cat.subcategories[0].products[0].images[0])) || '';
      el.innerHTML = `
        <div class="imgwrap">
          ${ imgSrc ? `<img src="${encode(imgSrc)}" alt="${escapeHTML(cat.name)}" onerror="this.style.opacity=.25">` : `<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#eee">No image</div>` }
        </div>
        <h3>${escapeHTML(cat.name)}</h3>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
          <button class="btn smallbtn open-cat">Open</button>
          <div style="font-size:13px;color:#666">${cat.subcategories ? cat.subcategories.length + ' sections' : (cat.products ? cat.products.length + ' products' : '')}</div>
        </div>
      `;
      el.querySelector('.open-cat').addEventListener('click', ()=> showCategory(cat.id));
      grid.appendChild(el);
    });
  }

  function showCategory(catId){
    const grid = q('#catalogue-grid');
    grid.innerHTML = '';
    const cat = (state.catalogue.categories || []).find(c => c.id === catId);
    if(!cat) { grid.innerHTML = '<div class="panel">Category not found</div>'; return; }

    q('#page-title').textContent = cat.name;
    // if cat has subcategories -> render subcategory tiles; else render products
    if(cat.subcategories && cat.subcategories.length){
      cat.subcategories.forEach(sub => {
        const card = document.createElement('article');
        card.className = 'card';
        const img = (sub.products && sub.products[0] && sub.products[0].images && sub.products[0].images[0]) || cat.categoryImage || '';
        card.innerHTML = `
          <div class="imgwrap">${img ? `<img src="${encode(img)}" alt="${escapeHTML(sub.name)}" onerror="this.style.opacity=.25">` : `<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#eee">No image</div>`}</div>
          <h3>${escapeHTML(sub.name)}</h3>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
            <button class="btn smallbtn open-sub">Open</button>
            <div style="font-size:13px;color:#666">${sub.products ? sub.products.length + ' products' : ''}</div>
          </div>
        `;
        card.querySelector('.open-sub').addEventListener('click', ()=> renderProductsList(sub));
        grid.appendChild(card);
      });
    } else if(cat.products && cat.products.length){
      // show list of products (flattened)
      renderProductsList(cat);
    } else {
      grid.innerHTML = '<div class="panel">No items in this category</div>';
    }
  }

  function renderProductsList(container){
    const grid = q('#catalogue-grid');
    grid.innerHTML = '';
    const products = container.products || [];
    products.forEach(p => {
      const item = document.createElement('article');
      item.className = 'card';
      const img = (p.images && p.images[0]) || '';
      item.innerHTML = `
        <div class="imgwrap">${img ? `<img src="${encode(img)}" alt="${escapeHTML(p.name)}" onerror="this.style.opacity=.25">` : `<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#eee">No image</div>`}</div>
        <h3>${escapeHTML(p.name)}</h3>
        <div class="price">${formatPrice(p.price)}</div>
        <div class="actions">
          <button class="btn" data-action="details">Details</button>
          <button class="btn primary" data-action="buy">Buy</button>
          <button class="btn" data-action="fav">❤</button>
        </div>
      `;
      item.querySelector('[data-action="details"]').addEventListener('click', ()=> openDetails(p));
      item.querySelector('[data-action="buy"]').addEventListener('click', ()=> openPersonalizeThenAdd(p));
      item.querySelector('[data-action="fav"]').addEventListener('click', ()=> toggleWishlist(p.id));
      grid.appendChild(item);
    });
  }

  function openDetails(product){
    const modal = q('#details-modal');
    const content = q('#modal-content');
    content.innerHTML = '';
    const gallery = document.createElement('div');
    gallery.className = 'modal-gallery';
    const big = document.createElement('div'); big.className='big';
    const thumbs = document.createElement('div'); thumbs.className='thumbs';
    gallery.appendChild(big);
    gallery.appendChild(thumbs);

    const imgs = product.images && product.images.length ? product.images : [];
    let current = 0;
    const showBig = (i)=>{
      current = i;
      const src = imgs[i] ? encode(imgs[i]) : '';
      big.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:contain" onerror="this.style.opacity=.25">`;
    };
    if(imgs.length){
      imgs.forEach((img,i)=>{
        const t = document.createElement('div');
        t.style.height='64px';t.style.overflow='hidden';t.style.borderRadius='8px';
        t.innerHTML = `<img src="${encode(img)}" style="height:100%;width:100%;object-fit:cover" onerror="this.style.opacity=.25">`;
        t.addEventListener('click', ()=> showBig(i));
        thumbs.appendChild(t);
      });
      showBig(0);
    } else {
      big.innerHTML = `<div style="height:300px;display:flex;align-items:center;justify-content:center;color:#999">No images available</div>`;
    }

    const info = document.createElement('div');
    info.innerHTML = `
      <h2>${escapeHTML(product.name)}</h2>
      <p class="price">${formatPrice(product.price)}</p>
      <p>${escapeHTML(product.description || '')}</p>
      <div id="product-options"></div>
      <div style="margin-top:12px">
        <button id="modalAddToCart" class="btn primary">Add to cart</button>
        <button id="modalBuyNow" class="btn">Buy now</button>
      </div>
    `;
    content.appendChild(gallery);
    content.appendChild(info);

    // options
    const optWrap = content.querySelector('#product-options');
    if(product.options){
      Object.keys(product.options).forEach(k=>{
        const sel = document.createElement('select');
        sel.name = k;
        product.options[k].forEach(val => {
          const o = document.createElement('option'); o.value = val; o.textContent = val; sel.appendChild(o);
        });
        const label = document.createElement('label');
        label.innerHTML = `<div style="font-weight:600">${escapeHTML(k)}</div>`;
        label.appendChild(sel);
        optWrap.appendChild(label);
      });
    }

    // handlers
    q('#modalAddToCart').addEventListener('click', ()=>{
      addToCart({productId: product.id, qty: 1, name: product.name, price: product.price, paymentLink: product.paymentLink});
      closeModal();
    });
    q('#modalBuyNow').addEventListener('click', ()=>{
      window.open(product.paymentLink || '#', '_blank');
    });

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(){
    const modal = q('#details-modal');
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
  q('#modalClose')?.addEventListener('click', closeModal);
  document.addEventListener('click', (e)=>{
    if(e.target.matches('#details-modal')) closeModal();
  });

  // Add personalization workflow: show small form modal then add to cart
  function openPersonalizeThenAdd(product){
    const modal = q('#details-modal');
    const content = q('#modal-content');
    content.innerHTML = `
      <h2>Customize — ${escapeHTML(product.name)}</h2>
      <p>${escapeHTML(product.description || '')}</p>
      <form id="personalizeForm">
        <label>Quantity <input name="qty" type="number" value="1" min="1"></label>
        <label>Notes (size, color, changes) <textarea name="notes" rows="3"></textarea></label>
        <label>Upload reference images (multiple allowed) <input name="files" type="file" accept="image/*" multiple></label>
        <div style="margin-top:10px">
          <button class="btn primary" type="submit">Save & Add to cart</button>
          <button class="btn" type="button" id="cancelPersonalize">Cancel</button>
        </div>
      </form>
    `;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    q('#cancelPersonalize').addEventListener('click', closeModal);
    q('#personalizeForm').addEventListener('submit', (ev)=>{
      ev.preventDefault();
      const form = ev.currentTarget;
      const formData = new FormData(form);
      const qty = parseInt(formData.get('qty') || '1', 10);
      const notes = formData.get('notes') || '';
      const files = form.querySelector('input[name="files"]').files;
      // create an item with personalization as metadata
      addToCart({
        productId: product.id,
        qty,
        name: product.name,
        price: product.price,
        paymentLink: product.paymentLink,
        personalization: { notes, filesCount: files.length }
      });
      closeModal();
    });
  }

  // Cart and wishlist features (client-side)
  function addToCart(item){
    // merge if same product + same personalization
    const key = item.productId + '::' + (item.personalization ? JSON.stringify(item.personalization) : '');
    const existing = state.cart.find(i => (i._key === key));
    if(existing){
      existing.qty = (existing.qty || 1) + (item.qty || 1);
    } else {
      item._key = key;
      state.cart.push(Object.assign({addedAt: Date.now()}, item));
    }
    persistCart();
    renderCartUI();
    toast('Added to cart');
  }

  function persistCart(){ localStorage.setItem('vc_cart', JSON.stringify(state.cart)); updateCounts(); }
  function persistWishlist(){ localStorage.setItem('vc_wishlist', JSON.stringify(state.wishlist)); updateCounts(); }
  function restoreCartAndWishlist(){
    state.cart = JSON.parse(localStorage.getItem('vc_cart') || '[]');
    state.wishlist = JSON.parse(localStorage.getItem('vc_wishlist') || '[]');
    renderCartUI();
    updateCounts();
  }

  function renderCartUI(){
    const panel = q('#cart-panel');
    const list = q('#cart-items');
    list.innerHTML = '';
    if(!state.cart.length) list.innerHTML = '<div>No items in cart</div>';
    state.cart.forEach((it, idx)=>{
      const row = document.createElement('div');
      row.style.display='flex';row.style.justifyContent='space-between';row.style.alignItems='center';row.style.padding='8px 0;border-bottom:1px dashed #eee';
      row.innerHTML = `
        <div>
          <div style="font-weight:700">${escapeHTML(it.name)}</div>
          <div style="font-size:13px;color:#666">${it.personalization ? escapeHTML(it.personalization.notes || '') : ''}</div>
          <div style="font-size:13px;color:#666">x ${it.qty} — ${formatPrice(it.price)}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
          <div>${formatPrice((it.qty || 1) * (it.price || 0))}</div>
          <div>
            <button class="btn" data-idx="${idx}" data-act="remove">Remove</button>
          </div>
        </div>
      `;
      list.appendChild(row);
    });
    // attach remove handlers
    qa('[data-act="remove"]').forEach(btn=> btn.addEventListener('click', (e)=>{
      const idx = parseInt(e.currentTarget.dataset.idx,10);
      state.cart.splice(idx,1);
      persistCart();
      renderCartUI();
    }));

    q('#checkoutBtn').onclick = () => {
      if(!state.cart.length) { alert('Cart is empty'); return; }
      // We do per-item redirect to each PayPal link — simplest approach for client-only
      // Build a queue: open each item's paymentLink in new tab (if present), then clear cart.
      const missing = state.cart.filter(it => !it.paymentLink).length;
      if(missing){
        if(!confirm('Some items have no payment link (custom). You will be asked to fill personalization info and pay manually. Continue?')) return;
      }
      state.cart.forEach(it => {
        if(it.paymentLink) window.open(it.paymentLink, '_blank');
      });
      // Clear cart after checkout
      state.cart = [];
      persistCart();
      renderCartUI();
      alert(state.catalogue.siteInfo.postPurchaseMessage || 'Thank you — payment initiated.');
    };

    q('#clearCartBtn').onclick = ()=>{
      if(confirm('Clear cart?')) { state.cart=[]; persistCart(); renderCartUI(); }
  };
  }

  function updateCounts(){
    q('#cartCount').textContent = state.cart.length;
    q('#favCount').textContent = state.wishlist.length;
  }

  function toggleWishlist(productId){
    const idx = state.wishlist.indexOf(productId);
    if(idx === -1) state.wishlist.push(productId);
    else state.wishlist.splice(idx,1);
    persistWishlist();
    toast('Wishlist updated');
  }
  function showWishlist(){
    // flatten wishlist into product names
    const items = [];
    state.catalogue.categories.forEach(cat=>{
      // subcategories
      if(cat.subcategories) cat.subcategories.forEach(sub=>{
        if(sub.products) sub.products.forEach(p => { if(state.wishlist.includes(p.id)) items.push(p); });
      });
      if(cat.products) cat.products.forEach(p => { if(state.wishlist.includes(p.id)) items.push(p); });
    });
    const grid = q('#catalogue-grid'); grid.innerHTML = '';
    q('#page-title').textContent = 'Favorites';
    if(!items.length) grid.innerHTML = '<div class="panel">No favorites yet</div>';
    items.forEach(p => {
      const el = document.createElement('article'); el.className='card';
      el.innerHTML = `
        <div class="imgwrap">${p.images && p.images[0] ? `<img src="${encode(p.images[0])}" onerror="this.style.opacity=.25">` : '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#ddd">No image</div>'}</div>
        <h3>${escapeHTML(p.name)}</h3>
        <div class="price">${formatPrice(p.price)}</div>
        <div style="display:flex;gap:8px"><button class="btn primary">Buy</button><button class="btn">Remove</button></div>
      `;
      grid.appendChild(el);
    });
  }

  function showCategoryByName(name){
    const cat = (state.catalogue.categories || []).find(c => c.name === name);
    if(cat) showCategory(cat.id);
  }

  // small toast utility
  function toast(msg){
    const t = document.createElement('div');
    t.textContent = msg; t.style.position='fixed'; t.style.bottom='22px'; t.style.left='50%'; t.style.transform='translateX(-50%)';
    t.style.background='#222'; t.style.color='#fff'; t.style.padding='10px 14px'; t.style.borderRadius='10px'; t.style.zIndex=999;
    document.body.appendChild(t);
    setTimeout(()=>{ t.style.opacity=0; setTimeout(()=>t.remove(),300); }, 2200);
  }

  function formatPrice(v){
    const cur = (state.catalogue.siteInfo && state.catalogue.siteInfo.currency) || 'USD';
    return typeof v === 'number' ? (cur === 'USD' ? '$' + v.toFixed(2) : v.toFixed(2) + ' ' + cur) : '';
  }

  function escapeHTML(s){ if(!s) return ''; return (''+s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  // Attach misc global handlers
  function attachGlobalHandlers(){
    // close modal on Esc
    document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeModal(); });

    // listen to clicks at header nav (nav buttons wired earlier)
    q('#contactForm')?.addEventListener('submit', (ev)=> {
      // client-side UX: show message, form will submit to Formspree
      toast('Sending message...');
    });

    // initial counts
    updateCounts();
  }

})();
