/* script.js - Velvet Charms
   Loads catalogue.json, renders categories, products, modal, cart, favorites, and simple PayPal redirect checkout.
   Christmas theme is default. Cart & customization form are client-side (localStorage).
*/

"use strict";

const APP = {
  catalogue: null,
  currency: "USD",
  cart: [],
  favorites: new Set(),
  el: {}
};

function q(selector, root = document) { return root.querySelector(selector); }
function qa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }

// --- Helpers
function formatPrice(amount, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch (e) {
    return `${amount} ${currency}`;
  }
}

function detectCurrency() {
  // best-effort via navigator language and timezone; map to provided mapping
  try {
    const locale = navigator.language || 'en-US';
    const country = locale.split('-')[1] || 'US';
    const mapping = APP.catalogue.siteInfo.currencyMapping || {};
    return mapping[country] || APP.catalogue.siteInfo.defaultCurrency || "USD";
  } catch (e) { return APP.catalogue.siteInfo.defaultCurrency || "USD"; }
}

function saveState() {
  localStorage.setItem('vc_cart', JSON.stringify(APP.cart));
  localStorage.setItem('vc_favs', JSON.stringify(Array.from(APP.favorites)));
}

function loadState() {
  try {
    APP.cart = JSON.parse(localStorage.getItem('vc_cart')) || [];
    const favs = JSON.parse(localStorage.getItem('vc_favs')) || [];
    APP.favorites = new Set(favs);
  } catch (e) {
    APP.cart = []; APP.favorites = new Set();
  }
}

// --- DOM Renderers
function renderHeader() {
  const root = q('#site-header');
  root.innerHTML = `
    <div class="logo">
      <h1>${APP.catalogue.siteInfo.name} <span class="snow">❄️</span></h1>
      <p class="tagline">${APP.catalogue.siteInfo.tagline}</p>
    </div>
    <nav class="main-nav">
      <button class="nav-btn" data-target="home">Home</button>
      <button class="nav-btn" data-target="catalogue">Catalogue</button>
      <button class="nav-btn" data-target="about">About Us</button>
      <button class="nav-btn" data-target="contact">Contact</button>
    </nav>
    <div class="actions">
      <button id="favoritesBtn" title="Favorites">❤ <span id="fav-count">0</span></button>
      <button id="cartBtn" title="Cart">🛒 <span id="cart-count">0</span></button>
    </div>
  `;
  qa('.nav-btn').forEach(b => b.addEventListener('click', (ev)=>{
    const t = b.dataset.target;
    navigateTo(t);
  }));
}

function renderHome() {
  const root = q('#content');
  root.innerHTML = `
    <section class="hero">
      <img src="${APP.catalogue.categories.find(c=>c.id==='candles')?.banner || ''}" alt="banner" class="hero-img"/>
      <div class="hero-text">
        <h2>Handcrafted Treasures</h2>
        <p>Personalized, artisan-made pieces — created with love by our team of 12 art students. Preorder now for holiday gifting.</p>
        <div class="hero-cta">
          <button id="exploreBtn">Explore Catalogue</button>
          <button id="aboutBtn">About Us</button>
        </div>
      </div>
    </section>

    <section class="category-grid" id="categoriesGrid"></section>
  `;
  q('#exploreBtn').addEventListener('click', ()=>navigateTo('catalogue'));
  q('#aboutBtn').addEventListener('click', ()=>navigateTo('about'));
  renderCategoriesGrid();
}

function renderCategoriesGrid() {
  const grid = q('#categoriesGrid');
  grid.innerHTML = '';
  APP.catalogue.categories.forEach(cat=>{
    const img = cat.categoryImage || (cat.banner || '');
    const el = document.createElement('article');
    el.className = 'cat-card';
    el.innerHTML = `
      <img src="${img}" alt="${cat.name}" onerror="this.style.opacity=.06">
      <div class="cat-info"><h3>${cat.name}</h3></div>
    `;
    el.addEventListener('click', ()=>renderCategory(cat.id));
    grid.appendChild(el);
  });
}

function renderCategory(categoryId) {
  const cat = APP.catalogue.categories.find(c=>c.id===categoryId);
  if(!cat) return;
  const root = q('#content');
  root.innerHTML = `<section class="category-page"><h2>${cat.name}</h2><div class="sub-grid"></div></section>`;
  const subGrid = q('.sub-grid');
  // If category has subcategories show them
  if(cat.subcategories && cat.subcategories.length) {
    cat.subcategories.forEach(sub=>{
      const subCard = document.createElement('div');
      subCard.className = 'subcard';
      const sampleImage = (sub.products && sub.products[0] && (sub.products[0].images||[])[0]) || cat.categoryImage || '';
      subCard.innerHTML = `
        <img src="${sampleImage}" alt="${sub.name}" onerror="this.style.opacity=.06">
        <div class="subcard-info"><h3>${sub.name}</h3><button class="view-sub" data-sub="${sub.id}">View</button></div>
      `;
      subCard.querySelector('.view-sub').addEventListener('click', ()=>renderSubcategory(categoryId, sub.id));
      subGrid.appendChild(subCard);
    });
  } else if(cat.products) { // some categories may have direct products
    renderProductsList(cat.products, root);
  } else {
    root.innerHTML += `<p class="muted">No items found.</p>`;
  }
}

function renderSubcategory(categoryId, subId) {
  const cat = APP.catalogue.categories.find(c=>c.id===categoryId);
  const sub = (cat.subcategories||[]).find(s=>s.id===subId);
  const root = q('#content');
  root.innerHTML = `<section class="subcat-page"><h2>${sub.name}</h2><div class="products-grid"></div></section>`;
  const grid = q('.products-grid');
  (sub.products||[]).forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${(p.images && p.images[0])||''}" alt="${p.name}" loading="lazy">
      <h4>${p.name}</h4>
      <p class="price">${formatPrice(p.price, APP.currency)}</p>
      <div class="card-actions">
        <button class="details-btn" data-id="${p.id}">Details</button>
        <button class="buy-btn" data-id="${p.id}">Buy</button>
      </div>
    `;
    card.querySelector('.details-btn').addEventListener('click', ()=>openDetailsModal(categoryId, subId, p.id));
    card.querySelector('.buy-btn').addEventListener('click', ()=>openCustomizeThenCheckout(categoryId, subId, p.id));
    grid.appendChild(card);
  });
}

function renderProductsList(products, root) {
  const html = `<div class="products-grid"></div>`;
  root.innerHTML += html;
  const grid = q('.products-grid');
  products.forEach(p=>{
    const card = document.createElement('div'); card.className='product-card';
    card.innerHTML = `
      <img src="${(p.images&&p.images[0])||''}" alt="${p.name}" loading="lazy">
      <h4>${p.name}</h4>
      <p class="price">${formatPrice(p.price, APP.currency)}</p>
      <div class="card-actions"><button class="details-btn" data-id="${p.id}">Details</button><button class="buy-btn" data-id="${p.id}">Buy</button></div>
    `;
    card.querySelector('.details-btn').addEventListener('click', ()=>openGenericDetails(p));
    card.querySelector('.buy-btn').addEventListener('click', ()=>openCustomizeThenCheckoutForProduct(p));
    grid.appendChild(card);
  });
}

function openGenericDetails(product) {
  openProductModal(product);
}

function openDetailsModal(categoryId, subId, productId) {
  const cat = APP.catalogue.categories.find(c=>c.id===categoryId);
  const sub = (cat.subcategories||[]).find(s=>s.id===subId);
  const product = (sub.products||[]).find(p=>p.id===productId);
  if(!product) return;
  openProductModal(product);
}

function openProductModal(product) {
  const modal = q('#modal');
  modal.innerHTML = buildProductModalHTML(product);
  modal.classList.add('open');
  modal.querySelector('.modal-close').addEventListener('click', closeModal);
  modal.querySelector('.add-to-cart')?.addEventListener('click', ()=>{
    const customization = collectCustomization(modal);
    addToCart(product, customization);
    closeModal();
  });
  // image gallery click handlers
  qa('.modal-thumb').forEach(t=>{
    t.addEventListener('click', ()=> {
      q('.modal-main-img').src = t.dataset.src;
    });
  });
}

function buildProductModalHTML(product) {
  const images = product.images || [];
  // Trim removed details if flagged
  const thumbs = images.map((src,i)=>`<img class="modal-thumb" data-src="${src}" src="${src}" alt="" loading="lazy" />`).join('');
  const optionsHtml = buildOptionsHTML(product.options);
  return `
    <div class="modal-card">
      <button class="modal-close" title="Close">✕</button>
      <div class="modal-body">
        <div class="modal-gallery">
          <img class="modal-main-img" src="${images[0]||''}" alt="${product.name}">
          <div class="modal-thumbs">${thumbs}</div>
        </div>
        <div class="modal-info">
          <h3>${product.name}</h3>
          <p class="modal-price">${formatPrice(product.price, APP.currency)}</p>
          <p class="modal-desc">${product.description || ''}</p>
          ${optionsHtml}
          <label>Quantity <input id="modal-qty" type="number" min="1" value="1"></label>
          <div class="modal-actions">
            <button class="add-to-cart">Add to Cart</button>
            <button class="buy-now">Buy Now</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildOptionsHTML(options) {
  if(!options) return '';
  let html = '<div class="options">';
  for(const [key, vals] of Object.entries(options)) {
    if(!Array.isArray(vals)) continue;
    html += `<label>${capitalize(key)}<select data-opt="${key}">`;
    vals.forEach(v => html += `<option value="${v}">${v}</option>`);
    html += `</select></label>`;
  }
  html += '</div>';
  return html;
}

function collectCustomization(modalEl) {
  const opts = {};
  qa('select[data-opt]', modalEl).forEach(s => opts[s.dataset.opt] = s.value);
  const qty = parseInt(q('#modal-qty', modalEl).value) || 1;
  return { options: opts, quantity: qty };
}

function addToCart(product, customization = {options:{}, quantity:1}) {
  const item = {
    id: product.id,
    name: product.name,
    price: product.price,
    paymentLink: product.paymentLink,
    images: product.images,
    quantity: customization.quantity || 1,
    options: customization.options || {}
  };
  APP.cart.push(item);
  saveState();
  renderCartCount();
  toast('Added to cart');
}

function renderCartCount() {
  q('#cart-count').textContent = APP.cart.reduce((s,i)=>s+i.quantity,0);
}
function renderFavCount(){ q('#fav-count').textContent = APP.favorites.size; }

function closeModal(){ q('#modal').classList.remove('open'); q('#modal').innerHTML=''; }

function openCustomizeThenCheckout(categoryId, subId, productId) {
  const cat = APP.catalogue.categories.find(c=>c.id===categoryId);
  const sub = (cat.subcategories||[]).find(s=>s.id===subId);
  const product = (sub.products||[]).find(p=>p.id===productId);
  if(!product) return;
  openProductModal(product);
  // Buy now -> redirect to PayPal for this demo
  setTimeout(()=>{
    const buyBtn = q('.buy-now');
    if(buyBtn) buyBtn.addEventListener('click', ()=> {
      const customization = collectCustomization(q('#modal'));
      addToCart(product, customization);
      // client-side post-purchase message simulation
      window.open(product.paymentLink, '_blank');
      setTimeout(()=>toast('Payment window opened. Order will be processed within 48 hours.'), 400);
    });
  }, 200);
}

function openCustomizeThenCheckoutForProduct(product) {
  openProductModal(product);
  setTimeout(()=>{
    const buyBtn = q('.buy-now');
    if(buyBtn) buyBtn.addEventListener('click', ()=> {
      const customization = collectCustomization(q('#modal'));
      addToCart(product, customization);
      window.open(product.paymentLink, '_blank');
      setTimeout(()=>toast('Payment window opened. Order will be processed within 48 hours.'), 400);
    });
  },200);
}

// Cart UI
function showCart() {
  const cartModal = q('#modal');
  cartModal.innerHTML = `
    <div class="modal-card">
      <button class="modal-close" title="Close">✕</button>
      <div class="modal-body cart-body">
        <h3>Your Cart</h3>
        <div class="cart-items">${APP.cart.map((it, idx)=>`
          <div class="cart-item">
            <img src="${(it.images||[])[0]||''}" alt="" />
            <div class="cart-item-info">
              <strong>${it.name}</strong>
              <small>${Object.entries(it.options||{}).map(([k,v])=>`${k}: ${v}`).join(' • ')}</small>
              <div class="cart-item-qty">Qty: <input data-idx="${idx}" class="qty-input" type="number" min="1" value="${it.quantity}"/></div>
              <div>${formatPrice(it.price * it.quantity, APP.currency)}</div>
            </div>
            <button class="remove" data-idx="${idx}">Remove</button>
          </div>`).join('')}</div>
        <div class="cart-actions">
          <div class="cart-total">Total: ${formatPrice(APP.cart.reduce((s,i)=>s+i.price*i.quantity,0), APP.currency)}</div>
          <div class="cart-buttons">
            <button id="checkoutBtn">Checkout</button>
            <button id="clearCart">Clear Cart</button>
          </div>
        </div>
      </div>
    </div>
  `;
  cartModal.classList.add('open');
  cartModal.querySelector('.modal-close').addEventListener('click', closeModal);
  qa('.remove').forEach(b => b.addEventListener('click', (ev)=>{
    const idx = parseInt(b.dataset.idx);
    APP.cart.splice(idx,1); saveState(); showCart(); renderCartCount();
  }));
  qa('.qty-input').forEach(inp => inp.addEventListener('change', ()=>{
    const idx = parseInt(inp.dataset.idx);
    const v = Math.max(1, parseInt(inp.value) || 1);
    APP.cart[idx].quantity = v; saveState(); showCart(); renderCartCount();
  }));
  q('#clearCart').addEventListener('click', ()=>{ APP.cart = []; saveState(); showCart(); renderCartCount(); });
  q('#checkoutBtn').addEventListener('click', async ()=>{
    if(APP.cart.length === 0){ toast('Cart is empty'); return; }
    // For static site - open each item's paypal link in separate windows (simple approach)
    // Better: integrate with PayPal cart / server-side in future.
    APP.cart.forEach(it => {
      window.open(it.paymentLink, '_blank');
    });
    toast('Checkout opened for each item. Orders are processed within 48 hours after payment confirmation.');
  });
}

// Favorites toggle
function toggleFavorite(id) {
  if(APP.favorites.has(id)) APP.favorites.delete(id); else APP.favorites.add(id);
  saveState(); renderFavCount();
}

// About page & Contact
function renderAbout() {
  const root = q('#content');
  const about = APP.catalogue.siteInfo.about;
  root.innerHTML = `
    <section class="about-page">
      <div class="about-left">
        <h2>${about.title}</h2>
        <p class="about-text">${about.text}</p>
      </div>
      <div class="about-right">
        <img src="Herbal soap + face cream + small wax candle.png" alt="team & bundles" onerror="this.style.opacity=.06"/>
      </div>
    </section>
  `;
}

function renderContact() {
  const root = q('#content');
  root.innerHTML = `
    <section class="contact-page">
      <h2>Contact Us</h2>
      <form id="contactForm" action="https://formspree.io/f/FORM_SPREE_ID" method="POST">
        <label>Name <input name="name" required></label>
        <label>Email <input name="email" type="email" required></label>
        <label>Message <textarea name="message" rows="5" required></textarea></label>
        <button type="submit">Send Message</button>
      </form>
    </section>
  `;
  // Note: replace FORM_SPREE_ID in index.html with your real id
}

// Small utilities
function toast(msg) {
  const t = document.createElement('div'); t.className='toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=> t.classList.add('visible'),20);
  setTimeout(()=> { t.classList.remove('visible'); setTimeout(()=>t.remove(),300); }, 3500);
}
function capitalize(s){ return s[0]?.toUpperCase()+s.slice(1) || s; }

// --- App Init
async function loadCatalogue() {
  try {
    const r = await fetch('/catalogue.json');
    APP.catalogue = await r.json();
    APP.currency = detectCurrency();
    renderHeader();
    renderHome();
    loadState();
    renderCartCount();
    renderFavCount();
    attachGlobalHandlers();
  } catch (err) {
    q('#content').innerHTML = `<div class="error">Error loading catalogue. Please ensure /catalogue.json is present and valid in site root.</div>`;
    console.error('Catalogue load error', err);
  }
}

function attachGlobalHandlers() {
  q('#cartBtn').addEventListener('click', showCart);
  q('#favoritesBtn').addEventListener('click', ()=> {
    // simple favorites listing modal
    const modal = q('#modal');
    modal.innerHTML = `<div class="modal-card"><button class="modal-close">✕</button><div class="modal-body"><h3>Favorites</h3><div class="fav-list">${Array.from(APP.favorites).map(id=>`<div>${id}</div>`).join('')||'<p>No favorites yet</p>'}</div></div></div>`;
    modal.classList.add('open');
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
  });
  // nav handlers
  document.addEventListener('click', e => {
    if(e.target.matches('[data-nav]')) {
      navigateTo(e.target.dataset.nav);
    }
  });
}

function navigateTo(section) {
  if(section === 'home') renderHome();
  else if(section === 'catalogue') renderCategoriesGrid();
  else if(section === 'about') renderAbout();
  else if(section === 'contact') renderContact();
  else renderHome();
}

// initialize
document.addEventListener('DOMContentLoaded', ()=> loadCatalogue());
