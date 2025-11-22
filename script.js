/* script.js - Velvet Charms
   - Assumes catalogue.json is in site root
   - Smart gallery: limit images per product (maxGalleryImages)
*/

const maxGalleryImages = 10; // Option 2: smart gallery cap

// Utility
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const qs = (el, sel) => el.querySelector(sel);

// State
let catalogue = null;
let cart = JSON.parse(localStorage.getItem('vc_cart') || '[]');
let wishlist = JSON.parse(localStorage.getItem('vc_wishlist') || '[]');
let currentProduct = null;

// Init
document.addEventListener('DOMContentLoaded', init);

async function init(){
  try {
    catalogue = await (await fetch('/catalogue.json')).json();
  } catch (e) {
    console.error('Failed loading catalogue.json', e);
    showError('Error loading catalogue. Please check that /catalogue.json is present and valid in site root.');
    return;
  }

  setupHeader();
  renderHome();
  renderCatalogue();
  setupCartUI();
  setupContactForm();
  setupThemeToggle(); // placeholder if you later add toggle
  beautifyUI();
}

function showError(msg){
  const err = $('#error');
  if(err) err.textContent = msg;
  else alert(msg);
}

// Header & nav
function setupHeader(){
  const nav = $('#nav-categories');
  nav.innerHTML = ''; // build catalogue dropdown
  catalogue.categories.forEach(cat => {
    const li = document.createElement('li');
    li.className = 'nav-cat';
    li.innerHTML = <button class="cat-btn" data-cat="${cat.id}">${cat.name}</button>;
    nav.appendChild(li);
  });

  // Nav click
  $('#nav-categories').addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-btn');
    if(!btn) return;
    const catId = btn.dataset.cat;
    openCategory(catId);
  });

  // Home link
  $('#home-link').addEventListener('click', (e) => {
    e.preventDefault();
    renderHome();
  });

  // About link
  $('#about-link').addEventListener('click', (e) => {
    e.preventDefault();
    renderAbout();
  });

  // Contact link
  $('#contact-link').addEventListener('click', (e) => {
    e.preventDefault();
    scrollToSection('#contact-section');
  });
}

// Render pages
function renderHome(){
  $('#page-title').textContent = catalogue.siteInfo?.name || 'Velvet Charms';
  $('#hero-tagline').textContent = catalogue.siteInfo?.tagline || '';
  $('#hero-sub').textContent = 'Personalized, artisan-made pieces — created with love by our team of 12 art students.';
  $('#main-content').innerHTML = `
    <section class="home-intro">
      <div class="intro-left">
        <h2>Handcrafted Treasures</h2>
        <p class="lead">Personalized, artisan-made pieces — created with love by our team of 12 art students.</p>
        <div class="hero-actions">
          <button id="explore-catalogue" class="btn primary">Explore Catalogue</button>
          <button id="open-about" class="btn">About Us</button>
        </div>
      </div>
      <div class="intro-right">
        <img src="${catalogue.categories[0]?.banner || 'top banner picture for candles.png'}" alt="Candles banner" class="hero-image">
      </div>
    </section>
    <section id="featured-grid" class="featured-grid"></section>
  `;

  $('#explore-catalogue').addEventListener('click', () => openCategory(catalogue.categories[0].id));
  $('#open-about').addEventListener('click', (e) => { e.preventDefault(); renderAbout(); });

  // Show a few featured categories
  const grid = $('#featured-grid');
  catalogue.categories.slice(0,6).forEach(cat => {
    const img = cat.categoryImage || (cat.subcategories && cat.subcategories[0] && cat.subcategories[0].products && cat.subcategories[0].products[0] && cat.subcategories[0].products[0].images && cat.subcategories[0].products[0].images[0]) || 'top banner picture for candles.png';
    const card = document.createElement('div');
    card.className = 'feature-card';
    card.innerHTML = `
      <img src="${img}" alt="${cat.name}">
      <h3>${cat.name}</h3>
      <button class="btn small" data-cat="${cat.id}">Open</button>
    `;
    grid.appendChild(card);
    card.querySelector('button').addEventListener('click', () => openCategory(cat.id));
  });
}

// About
function renderAbout(){
  document.title = 'About — Velvet Charms';
  $('#main-content').innerHTML = `
    <section class="about">
      <div class="about-inner">
        <h2>${catalogue.siteInfo.about.title}</h2>
        <p class="about-text large">${catalogue.siteInfo.about.text}</p>
        <p class="about-extra">Payments are taken online prior to production. Orders are processed within 48 hours after payment confirmation.</p>
      </div>
    </section>
  `;
}

// Category view
function openCategory(catId){
  const cat = catalogue.categories.find(c => c.id === catId);
  if(!cat) return;
  document.title = ${cat.name} — Velvet Charms;
  const subcats = cat.subcategories || [];
  const productsDirect = cat.products || [];
  $('#main-content').innerHTML = `
    <section class="category-header">
      <h2>${cat.name}</h2>
      ${cat.categoryImage ? <img class="category-thumb" src="${cat.categoryImage}" alt="${cat.name}"> : ''}
      <p class="category-intro">${cat.description || ''}</p>
    </section>
    <section id="subcategories-list" class="subcategories-list"></section>
  `;

  const container = $('#subcategories-list');

  // Render subcategories or direct products
  if(subcats.length){
    subcats.forEach(sub => {
      const box = document.createElement('div');
      box.className = 'subcat-box';
      const subImg = sub.categoryImage || (sub.products && sub.products[0] && sub.products[0].images && sub.products[0].images[0]) || '';
      box.innerHTML = `
        <div class="subcat-head">
          <h3>${sub.name}</h3>
          ${subImg ? <img src="${subImg}" alt="${sub.name}" class="subcat-img"> : ''}
        </div>
        <div class="products-grid" data-sub="${sub.id}"></div>
      `;
      container.appendChild(box);
      renderProductsGrid(sub.products || [], box.querySelector('.products-grid'));
    });
  }

  if(productsDirect.length){
    const directBox = document.createElement('div');
    directBox.className = 'subcat-box';
    directBox.innerHTML = <div class="products-grid"></div>;
    container.appendChild(directBox);
    renderProductsGrid(productsDirect, directBox.querySelector('.products-grid'));
  }
}

// Render product grid for a subcategory
function renderProductsGrid(products, targetEl){
  targetEl.innerHTML = '';
  products.forEach(prod => {
    const thumb = prod.images && prod.images.length ? prod.images[0] : 'wax_candle_small.png';
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${thumb}" alt="${prod.name}" class="product-thumb">
      <div class="product-info">
        <h4 class="product-name">${prod.name}</h4>
        <div class="product-price">$${prod.price.toFixed(2)}</div>
        <div class="product-actions">
          <button class="btn small details-btn" data-id="${prod.id}">Details</button>
          <button class="btn small buy-btn" data-id="${prod.id}">Buy</button>
          <button class="wish-btn" data-id="${prod.id}" aria-label="Add to wishlist">❤</button>
        </div>
      </div>
    `;
    targetEl.appendChild(card);

    card.querySelector('.details-btn').addEventListener('click', () => openProductModal(prod));
    card.querySelector('.buy-btn').addEventListener('click', () => addToCartFromCard(prod));
    card.querySelector('.wish-btn').addEventListener('click', () => toggleWishlist(prod.id));
  });
}

// Modal product view (detail)
function openProductModal(product){
  currentProduct = product;
  // Create modal
  let modal = $('#product-modal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'product-modal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" id="modal-close">×</button>
        <div class="modal-body">
          <div class="modal-gallery"></div>
          <div class="modal-details">
            <h3 id="modal-title"></h3>
            <p id="modal-desc"></p>
            <div id="modal-options"></div>
            <form id="modal-custom-form">
              <h4>Customization</h4>
              <label>Notes (size, color or personalization)</label>
              <textarea name="customNotes" placeholder="Add details or photos will be requested on checkout" rows="3"></textarea>
              <label>Quantity</label>
              <input type="number" name="quantity" value="1" min="1" />
              <div class="modal-actions">
                <button class="btn primary" id="modal-add-cart">Add to cart</button>
                <a id="modal-pay-link" class="btn">Buy now</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Close handlers
    modal.querySelector('#modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if(e.target === modal) closeModal();
    });
  }

  // Fill modal
  $('#modal-title').textContent = product.name;
  $('#modal-desc').textContent = product.description || '';
  const optionsEl = $('#modal-options');
  optionsEl.innerHTML = '';

  // Options (scent/intensity/aroma)
  if(product.options){
    Object.keys(product.options).forEach(opt => {
      const values = product.options[opt];
      const wrapper = document.createElement('div');
      wrapper.className = 'option-row';
      wrapper.innerHTML = <label>${capitalize(opt)}</label>;
      const select = document.createElement('select');
      select.name = opt;
      values.forEach(v => {
        const o = document.createElement('option');
        o.value = v;
        o.textContent = v;
        select.appendChild(o);
      });
      wrapper.appendChild(select);
      optionsEl.appendChild(wrapper);
    });
  }

  // Gallery: respect removeDetailsIndex and limit images
  const gallery = $('.modal-gallery');
  gallery.innerHTML = '';
  let images = Array.isArray(product.images) ? product.images.slice() : [];
  if(product.removeDetailsIndex && product.removeDetailsIndex.length){
    // remove indices (1-based from user's notes) convert to 0-based
    const toRemove = product.removeDetailsIndex.map(i => i - 1);
    images = images.filter((_, idx) => !toRemove.includes(idx));
  }
  // cap images to maxGalleryImages
  images = images.slice(0, maxGalleryImages);
  if(images.length === 0) images = ['wax_candle_small.png'];

  const thumbs = document.createElement('div');
  thumbs.className = 'gallery-main';
  thumbs.innerHTML = `
    <div class="gallery-large"><img src="${images[0]}" alt="${product.name}" id="gallery-large-img"></div>
    <div class="gallery-thumbs"></div>
  `;
  gallery.appendChild(thumbs);
  const thumbsEl = gallery.querySelector('.gallery-thumbs');

  images.forEach((src, i) => {
    const t = document.createElement('button');
    t.className = 'thumb-btn';
    t.innerHTML = <img src="${src}" alt="${product.name} thumb ${i+1}">;
    t.addEventListener('click', () => {
      $('#gallery-large-img').src = src;
    });
    thumbsEl.appendChild(t);
  });

  // Modal add to cart
  $('#modal-add-cart').onclick = (e) => {
    e.preventDefault();
    const form = $('#modal-custom-form');
    const data = new FormData(form);
    const notes = data.get('customNotes') || '';
    const quantity = parseInt(data.get('quantity') || 1, 10);
    // collect selected options
    const options = {};
    Array.from(optionsEl.querySelectorAll('select')).forEach(s => options[s.name] = s.value);
    addToCart(product, quantity, options, notes);
    closeModal();
    renderCart();
  };

  // Pay now link -> PayPal link with name and price appended (simple)
  const payLink = $('#modal-pay-link');
  payLink.href = product.paymentLink || '#';
  payLink.target = '_blank';
  payLink.textContent = 'Buy now';

  // Show modal
  modal.classList.add('open');
}

// helpers
function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

function closeModal(){
  const modal = $('#product-modal');
  if(modal) modal.classList.remove('open');
}

// Cart functions
function addToCart(product, quantity = 1, options = {}, notes = ''){
  const item = {
    id: product.id,
    name: product.name,
    price: product.price,
    qty: quantity,
    options,
    notes,
    images: (product.images || []).slice(0,3)
  };
  // if same id+options, merge
  const existing = cart.find(c => c.id === item.id && JSON.stringify(c.options) === JSON.stringify(item.options) && c.notes === item.notes);
  if(existing){
    existing.qty += quantity;
  } else {
    cart.push(item);
  }
  saveCart();
  toast('Added to cart');
}

function addToCartFromCard(product){
  // quick add — defaults
  addToCart(product, 1, {}, '');
  renderCart();
}

function toggleWishlist(id){
  const idx = wishlist.indexOf(id);
  if(idx === -1) wishlist.push(id);
  else wishlist.splice(idx,1);
  localStorage.setItem('vc_wishlist', JSON.stringify(wishlist));
  renderWishlist();
  toast('Wishlist updated');
}

// Cart UI
function setupCartUI(){
  renderCart();
  $('#cart-toggle').addEventListener('click', (e) => {
    e.preventDefault();
    $('#cart-panel').classList.toggle('open');
  });
  $('#checkout-btn').addEventListener('click', () => openCheckout());
}

function renderCart(){
  localStorage.setItem('vc_cart', JSON.stringify(cart));
  const list = $('#cart-items');
  list.innerHTML = '';
  if(cart.length === 0){
    list.innerHTML = '<div class="empty">Your cart is empty</div>';
    $('#cart-total').textContent = '$0.00';
    return;
  }
  cart.forEach((it, i) => {
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div class="cart-thumb"><img src="${(it.images && it.images[0]) || 'wax_candle_small.png'}" alt="${it.name}"></div>
      <div class="cart-meta">
        <div class="cart-name">${it.name}</div>
        <div class="cart-opts">${JSON.stringify(it.options) !== '{}' ? JSON.stringify(it.options) : ''}</div>
        <div class="cart-notes">${it.notes ? 'Notes: ' + it.notes : ''}</div>
        <div class="cart-qty">
          <button class="qty-dec" data-i="${i}">−</button>
          <span>${it.qty}</span>
          <button class="qty-inc" data-i="${i}">+</button>
        </div>
      </div>
      <div class="cart-price">$${(it.price * it.qty).toFixed(2)}</div>
      <button class="cart-remove" data-i="${i}">×</button>
    `;
    list.appendChild(row);
  });

  // attach events
  $$('.qty-inc').forEach(b => b.addEventListener('click', () => {
    const i = parseInt(b.dataset.i,10); cart[i].qty++; saveCart(); renderCart();
  }));
  $$('.qty-dec').forEach(b => b.addEventListener('click', () => {
    const i = parseInt(b.dataset.i,10); if(cart[i].qty>1) cart[i].qty--; else cart.splice(i,1); saveCart(); renderCart();
  }));
  $$('.cart-remove').forEach(b => b.addEventListener('click', () => {
    const i = parseInt(b.dataset.i,10); cart.splice(i,1); saveCart(); renderCart();
  }));

  const total = cart.reduce((s,it)=>s + it.price*it.qty, 0);
  $('#cart-total').textContent = '$' + total.toFixed(2);
}

function saveCart(){ localStorage.setItem('vc_cart', JSON.stringify(cart)); }

function openCheckout(){
  if(cart.length === 0){
    toast('Cart empty — add items first');
    return;
  }
  // Build a lightweight checkout modal with a combined form that posts to Formspree
  const checkout = document.createElement('div');
  checkout.className = 'modal checkout';
  checkout.innerHTML = `
    <div class="modal-content">
      <button class="modal-close">×</button>
      <div class="modal-body small">
        <h3>Checkout</h3>
        <form id="checkout-form" method="POST" action="https://formspree.io/f/YOUR_FORMSPREE_ID">
          <label>Your name</label><input name="name" required />
          <label>Your email</label><input name="email" type="email" required />
          <label>Shipping country</label><input name="country" required />
          <label>Notes for order</label><textarea name="orderNotes" rows="3"></textarea>
          <input type="hidden" name="orderSummary" value='${JSON.stringify(cart)}' />
          <div class="modal-actions">
            <button class="btn primary" type="submit">Submit order & pay via PayPal</button>
            <button class="btn" type="button" id="checkout-cancel">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(checkout);
  checkout.classList.add('open');
  checkout.querySelector('.modal-close').addEventListener('click', () => checkout.remove());
  checkout.querySelector('#checkout-cancel').addEventListener('click', () => checkout.remove());
  // On submit, Formspree will email you. We instruct buyer to complete PayPal after sending form.
  // Add a message to user after submit via Formspree (they will see default response).
}

// Wishlist view
function renderWishlist(){
  // optional: show wishlist count
  $('#wishlist-count').textContent = wishlist.length;
}

// Contact / order form handler
function setupContactForm(){
  const contactForm = $('#contact-form');
  if(!contactForm) return;
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(contactForm);
    fetch('https://formspree.io/f/YOUR_FORMSPREE_ID', {
      method: 'POST',
      body: data,
      headers: { 'Accept': 'application/json' }
    }).then(res => {
      if(res.ok) {
        toast('Message sent. We will reply within 48h.');
        contactForm.reset();
      } else {
        toast('Error sending message.');
      }
    }).catch(err => {
      console.error(err);
      toast('Network error.');
    });
  });
}

// Small helpers & UI polish
function toast(msg, ms = 2500){
  let t = $('#toast');
  if(!t){
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=> t.classList.remove('show'), ms);
}

function scrollToSection(sel){
  const el = document.querySelector(sel);
  if(el) el.scrollIntoView({behavior:'smooth'});
}

function beautifyUI(){
  // Make sure details buttons are visible (fix issue of white-on-white etc.)
  document.documentElement.classList.add('vc-ready');
  // Render wishlist count
  renderWishlist();
}

// theme toggle placeholder
function setupThemeToggle(){
  // Christmas by default. If you later add toggle, change body class
  document.body.classList.add('theme-christmas');
}
