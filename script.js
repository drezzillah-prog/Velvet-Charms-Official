/* script.js — full site client logic: render catalogue, modal details, cart, wishlist, personalization, contact (Formspree) */

/* ---------- Utilities ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const formatPrice = (p, cur = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(p);

/* ---------- App state ---------- */
const STATE = {
  catalogue: null,
  currentCategoryId: null,
  currentSubcategoryId: null,
  currentProduct: null,
  cart: JSON.parse(localStorage.getItem('vc_cart') || '[]'),
  wishlist: JSON.parse(localStorage.getItem('vc_wishlist') || '[]'),
  formspreeEndpoint: 'https://formspree.io/f/REPLACE_WITH_YOUR_FORM_ID' // <-- REPLACE with your Formspree ID
};

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  loadCatalogue();
  restoreCartAndWishlist();
});

/* ---------- Load Catalogue JSON ---------- */
async function loadCatalogue() {
  try {
    const res = await fetch('/catalogue.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Catalogue not found');
    const json = await res.json();
    STATE.catalogue = json;
    renderSiteInfo();
    renderCategories();
    renderHero();
  } catch (err) {
    console.error(err);
    showError('Error loading catalogue. Please ensure /catalogue.json is present in site root.');
  }
}

/* ---------- UI Rendering ---------- */
function renderSiteInfo() {
  const si = STATE.catalogue.siteInfo;
  $('#site-title').textContent = si.name;
  $('#site-tagline').textContent = si.tagline;
  $('#about-text').textContent = si.about?.text || '';
}

function renderHero() {
  // if candle banner exists, show small banner
  const topBanner = STATE.catalogue.categories?.find(c => c.banner)?.banner;
  if (topBanner) {
    const hero = $('#hero-banner');
    hero.style.backgroundImage = `url("${escapeFilename(topBanner)}")`;
    hero.classList.remove('hidden');
  }
}

/* Categories nav + tiles */
function renderCategories() {
  const catNav = $('#categories-list');
  const grid = $('#catalogue-grid');
  catNav.innerHTML = '';
  grid.innerHTML = '';

  (STATE.catalogue.categories || []).forEach(cat => {
    // nav
    const li = document.createElement('li');
    li.className = 'cat-nav-item';
    li.innerHTML = `<button data-cat="${cat.id}" class="cat-btn">${escapeHtml(cat.name)}</button>`;
    catNav.appendChild(li);
    // tile
    const tile = document.createElement('div');
    tile.className = 'cat-tile';
    const thumb = cat.categoryImage || (cat.banner || '');
    tile.innerHTML = `
      <div class="cat-thumb" style="background-image: url('${escapeFilename(thumb)}')"></div>
      <div class="cat-info">
        <h3>${escapeHtml(cat.name)}</h3>
        <button class="open-cat" data-cat="${cat.id}">Open</button>
      </div>
    `;
    grid.appendChild(tile);
  });

  // attach listeners
  $$('.cat-btn').forEach(b => b.addEventListener('click', (e) => {
    const id = e.currentTarget.dataset.cat;
    openCategory(id);
  }));
  $$('.open-cat').forEach(b => b.addEventListener('click', (e) => {
    const id = e.currentTarget.dataset.cat;
    openCategory(id);
  }));
}

/* Show category view: subcategories and products */
function openCategory(catId) {
  const category = STATE.catalogue.categories.find(c => c.id === catId);
  if (!category) return;
  STATE.currentCategoryId = catId;

  // title
  $('#main-title').textContent = category.name;

  // render subcategories list
  const sublist = $('#subcategories-list');
  sublist.innerHTML = '';
  if (category.subcategories && category.subcategories.length) {
    category.subcategories.forEach(s => {
      const li = document.createElement('li');
      li.innerHTML = `<button class="sub-btn" data-sub="${s.id}" data-cat="${catId}">${escapeHtml(s.name)}</button>`;
      sublist.appendChild(li);
    });
  } else {
    sublist.innerHTML = `<li class="muted">No subcategories</li>`;
  }

  // render product cards for whole category (all subcats)
  const cards = $('#products-cards');
  cards.innerHTML = '';
  if (category.subcategories) {
    category.subcategories.forEach(sub => {
      if (!sub.products) return;
      sub.products.forEach(p => {
        cards.appendChild(renderProductCard(p, category, sub));
      });
    });
  }
  // also support categories with direct products array (like phone_cases)
  if (category.products) {
    category.products.forEach(p => cards.appendChild(renderProductCard(p, category, null)));
  }

  // attach subcategory listeners
  $$('.sub-btn').forEach(b => b.addEventListener('click', (e) => {
    const subId = e.currentTarget.dataset.sub;
    openSubcategory(catId, subId);
  }));

  // show the catalogue area
  $('#catalogue-area').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* Open a subcategory (render only its products) */
function openSubcategory(catId, subId) {
  const category = STATE.catalogue.categories.find(c => c.id === catId);
  const sub = category?.subcategories?.find(s => s.id === subId);
  if (!sub) return;
  STATE.currentSubcategoryId = subId;
  $('#main-title').textContent = `${category.name} — ${sub.name}`;
  const cards = $('#products-cards');
  cards.innerHTML = '';
  if (sub.products) sub.products.forEach(p => cards.appendChild(renderProductCard(p, category, sub)));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* Product Card */
function renderProductCard(product, category, subcategory) {
  const card = document.createElement('article');
  card.className = 'product-card';
  const img = (product.images && product.images[0]) ? escapeFilename(product.images[0]) : '';
  card.innerHTML = `
    <div class="product-image" style="background-image: url('${img}')"></div>
    <div class="product-body">
      <h4>${escapeHtml(product.name)}</h4>
      <div class="price">${formatPrice(product.price, STATE.catalogue.siteInfo.currency)}</div>
      <div class="card-actions">
        <button class="details-btn" data-id="${product.id}">Details</button>
        <button class="add-wish" data-id="${product.id}" title="Add to wishlist">❤</button>
        <button class="add-cart" data-id="${product.id}">Add</button>
      </div>
    </div>
  `;
  // listeners
  card.querySelector('.details-btn').addEventListener('click', () => openDetails(product, category, subcategory));
  card.querySelector('.add-wish').addEventListener('click', () => toggleWishlist(product));
  card.querySelector('.add-cart').addEventListener('click', () => quickAddToCart(product));
  return card;
}

/* ---------- Details modal (product + personalization) ---------- */
function openDetails(prod, category, subcategory) {
  STATE.currentProduct = { prod, category, subcategory };
  const modal = $('#product-modal');
  modal.querySelector('.modal-title').textContent = prod.name;
  modal.querySelector('.modal-price').textContent = formatPrice(prod.price, STATE.catalogue.siteInfo.currency);
  modal.querySelector('.modal-desc').textContent = prod.description || '';
  // images carousel
  const imgs = modal.querySelector('.modal-images');
  imgs.innerHTML = '';
  (prod.images || []).forEach((f, i) => {
    const imgEl = document.createElement('img');
    imgEl.src = escapeFilename(f);
    imgEl.alt = `${prod.name} ${i+1}`;
    imgEl.className = 'modal-thumb';
    imgs.appendChild(imgEl);
  });
  // options selector
  const optionsWrap = modal.querySelector('.modal-options');
  optionsWrap.innerHTML = '';
  const opts = prod.options || {};
  Object.keys(opts).forEach(k => {
    const sel = document.createElement('select');
    sel.name = k;
    sel.innerHTML = `<option value="">Choose ${escapeHtml(k)}</option>` + (opts[k].map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join(''));
    const label = document.createElement('label');
    label.textContent = `${k}:`;
    label.appendChild(sel);
    optionsWrap.appendChild(label);
  });

  // personalization form: text + multiple file upload
  const pform = modal.querySelector('#personalization-form');
  pform.reset();
  modal.querySelector('#personalization-preview').innerHTML = '';

  // attach upload preview handler
  pform.querySelector('#personalization-files').onchange = (e) => {
    previewFiles(e.target.files, '#personalization-preview');
  };

  // Add to Cart handler
  modal.querySelector('#modal-add-to-cart').onclick = () => {
    const formData = new FormData(pform);
    const personalization = {
      text: formData.get('personal-note') || '',
      files: []
    };
    const files = pform.querySelector('#personalization-files').files;
    // read files as base64 strings for in-memory preview + storing to localStorage
    const readers = [];
    for (let i=0;i<files.length;i++){
      readers.push(readFileAsDataURL(files[i]));
    }
    Promise.all(readers).then(dataUrls => {
      personalization.files = dataUrls;
      const selections = {};
      optionsWrap.querySelectorAll('select').forEach(s => { if (s.value) selections[s.name] = s.value; });
      addToCart(prod, 1, selections, personalization);
      closeModal();
      showToast('Added to cart');
      renderCartUI();
    });
  };

  // Buy direct handler: opens PayPal link (new tab) but still collects personalization via a quick saving step
  modal.querySelector('#modal-buy-now').onclick = () => {
    // save any personalization before proceeding
    const formData = new FormData(pform);
    const personalization = { text: formData.get('personal-note') || '' };
    // don't wait for files to finish; user intent is to buy — allow
    addToCart(prod, 1, {}, personalization, { skipToast:true });
    // open PayPal link in new tab
    window.open(prod.paymentLink || '#', '_blank');
    closeModal();
    renderCartUI();
  };

  // show modal
  modal.classList.add('open');
}

/* modal helpers */
function closeModal() {
  $('#product-modal').classList.remove('open');
}
$('#product-modal .modal-close').addEventListener('click', closeModal);
$('#product-modal .modal-backdrop').addEventListener('click', closeModal);

/* preview file list to container */
function previewFiles(files, containerSel) {
  const container = document.querySelector(containerSel);
  container.innerHTML = '';
  Array.from(files).forEach(f => {
    const fr = new FileReader();
    fr.onload = e => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'preview-thumb';
      container.appendChild(img);
    };
    fr.readAsDataURL(f);
  });
}

/* read file as dataURL -> Promise */
function readFileAsDataURL(file) {
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = e => resolve({ name: file.name, data: e.target.result });
    fr.readAsDataURL(file);
  });
}

/* ---------- Cart & Wishlist ---------- */
function restoreCartAndWishlist() {
  renderCartUI();
  renderWishlistUI();
}

function addToCart(product, qty=1, selections={}, personalization={}, opts={}) {
  const item = {
    id: product.id,
    name: product.name,
    price: product.price,
    qty,
    selections,
    personalization,
    paymentLink: product.paymentLink || null
  };
  // merge if already in cart with same options
  const key = JSON.stringify({id:item.id, sel:item.selections, per:item.personalization.text});
  let merged = false;
  for (let i=0;i<STATE.cart.length;i++){
    const c = STATE.cart[i];
    const ckey = JSON.stringify({id:c.id, sel:c.selections, per:c.personalization?.text});
    if (ckey === key){
      STATE.cart[i].qty += qty;
      merged = true;
      break;
    }
  }
  if (!merged) STATE.cart.push(item);
  localStorage.setItem('vc_cart', JSON.stringify(STATE.cart));
  if (!opts.skipToast) showToast('Product added to cart');
}

function quickAddToCart(product) {
  addToCart(product, 1, {}, { text: '' });
  renderCartUI();
}

function renderCartUI() {
  const cartCount = STATE.cart.reduce((s,i)=>s+i.qty,0);
  $('#cart-count').textContent = cartCount;
  const drawer = $('#cart-drawer .cart-items');
  drawer.innerHTML = '';
  if (STATE.cart.length === 0) drawer.innerHTML = '<div class="muted">Your cart is empty</div>';
  STATE.cart.forEach((it, idx) => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="ci-left">
        <div class="ci-title">${escapeHtml(it.name)}</div>
        <div class="ci-meta">${Object.keys(it.selections || {}).map(k=>`${k}: ${it.selections[k]}`).join(' • ') || ''}</div>
      </div>
      <div class="ci-right">
        <div class="ci-qty">x${it.qty}</div>
        <div class="ci-price">${formatPrice(it.price * it.qty, STATE.catalogue.siteInfo.currency)}</div>
        <button class="ci-remove" data-idx="${idx}">Remove</button>
      </div>
    `;
    drawer.appendChild(div);
    div.querySelector('.ci-remove').addEventListener('click', (e)=> {
      STATE.cart.splice(idx,1);
      localStorage.setItem('vc_cart', JSON.stringify(STATE.cart));
      renderCartUI();
    });
  });
  // total
  const total = STATE.cart.reduce((s,i)=>s + (i.price * i.qty), 0);
  $('#cart-total').textContent = formatPrice(total, STATE.catalogue.siteInfo.currency);

  // checkout handler
  $('#cart-checkout').onclick = () => {
    if (STATE.cart.length === 0) return showToast('Cart is empty');
    openCheckoutModal();
  };

  // toggle cart drawer
  $('#cart-toggle').onclick = () => {
    $('#cart-drawer').classList.toggle('open');
  };
}

/* Open checkout modal: shows order summary and PayPal links per-item, + final submit to record personalization via Formspree */
function openCheckoutModal(){
  const cm = $('#checkout-modal');
  const list = cm.querySelector('.order-list');
  list.innerHTML = '';
  STATE.cart.forEach((it, idx) => {
    const li = document.createElement('div');
    li.className = 'order-item';
    li.innerHTML = `
      <div><strong>${escapeHtml(it.name)}</strong> x${it.qty}</div>
      <div>${formatPrice(it.price * it.qty)}</div>
      <div class="small muted">${escapeHtml(it.personalization?.text || '')}</div>
      <div class="small"><a target="_blank" href="${it.paymentLink || '#'}">Pay item</a></div>
    `;
    list.appendChild(li);
  });
  cm.querySelector('.order-total').textContent = formatPrice(STATE.cart.reduce((s,i)=>s+i.price*i.qty,0));
  // Submit form button: sends order summary to Formspree for your records (you still need to collect payment via PayPal links)
  cm.querySelector('#checkout-submit-form').onclick = async () => {
    // prepare payload
    const payload = {
      order: STATE.cart,
      note: cm.querySelector('#checkout-note').value || ''
    };
    try {
      await fetch(STATE.formspreeEndpoint, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });
      showToast('Order saved. Please pay using the links shown (each item opens PayPal).');
      // Optionally empty cart for now:
      // STATE.cart = [];
      // localStorage.setItem('vc_cart', JSON.stringify(STATE.cart));
      // renderCartUI();
    } catch (err) {
      console.error(err);
      showToast('Could not send order form (Formspree). Replace your Formspree endpoint if needed.');
    }
  };

  cm.classList.add('open');
}
$('#checkout-modal .close').addEventListener('click', ()=> $('#checkout-modal').classList.remove('open'));

/* Wishlist */
function toggleWishlist(product) {
  const idx = STATE.wishlist.findIndex(i => i.id===product.id);
  if (idx >= 0) {
    STATE.wishlist.splice(idx,1);
  } else {
    STATE.wishlist.push({id:product.id, name: product.name});
  }
  localStorage.setItem('vc_wishlist', JSON.stringify(STATE.wishlist));
  renderWishlistUI();
}
function renderWishlistUI() {
  $('#wish-count').textContent = STATE.wishlist.length;
  const el = $('#wishlist-drawer .list');
  el.innerHTML = '';
  STATE.wishlist.forEach(w => {
    const row = document.createElement('div');
    row.className = 'wish-row';
    row.textContent = w.name;
    el.appendChild(row);
  });
  $('#wish-toggle').onclick = () => $('#wishlist-drawer').classList.toggle('open');
}

/* ---------- Contact form (Formspree) ---------- */
$('#contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const payload = {};
  for (const [k,v] of f.entries()) payload[k] = v;
  try {
    await fetch(STATE.formspreeEndpoint, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    showToast('Message sent. We will reply to your email shortly.');
    e.target.reset();
  } catch (err) {
    console.error(err);
    showToast('Could not send contact message — check Formspree endpoint.');
  }
});

/* ---------- Helpers & small UI niceties ---------- */
function escapeHtml(s='') {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function escapeFilename(fn='') {
  if (!fn) return '';
  // preserve exact filename but encode spaces and parentheses
  return fn.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g,'%29');
}

function initUI() {
  // toggle mobile nav
  $('#menu-toggle').addEventListener('click', ()=> document.body.classList.toggle('nav-open'));
  // close overlays
  $('#close-welcome').addEventListener('click', ()=> $('#welcome').classList.add('hidden'));
  // close product modal already set
  // global toasts
  const toastWrap = document.createElement('div');
  toastWrap.id = 'vc-toasts';
  document.body.appendChild(toastWrap);
  // cart toggle already bound via renderCartUI
}

/* tiny toast */
function showToast(msg, time=2200) {
  const t = document.createElement('div');
  t.className = 'vc-toast';
  t.textContent = msg;
  $('#vc-toasts').appendChild(t);
  setTimeout(()=> t.classList.add('visible'), 20);
  setTimeout(()=> { t.classList.remove('visible'); setTimeout(()=>t.remove(),300); }, time);
}

/* display minor error message */
function showError(msg){
  const e = $('#error-banner');
  e.textContent = msg;
  e.classList.remove('hidden');
}

/* ---------- Keyboard shortcuts: ESC closes modals ---------- */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    $('#cart-drawer').classList.remove('open');
    $('#wishlist-drawer').classList.remove('open');
    $('#checkout-modal').classList.remove('open');
  }
});
