// script.js (module)
const CATALOG_URL = 'catalogue.json';
let CATALOG = null;
let PRODUCTS = [];
const CART_KEY = 'vc_cart_v1';
const WISH_KEY = 'vc_wish_v1';
const FREE_SHIPPING_THRESHOLD = 300; // USD
let userCurrency = 'USD';

// Helpers
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const fmt = (n, cur='USD') => new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(n);

// Storage
function saveCart(c){ localStorage.setItem(CART_KEY, JSON.stringify(c)); }
function loadCart(){ return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
function saveWish(w){ localStorage.setItem(WISH_KEY, JSON.stringify(w)); }
function loadWish(){ return JSON.parse(localStorage.getItem(WISH_KEY) || '[]'); }

// Load catalogue
async function loadCatalogue(){
  CATALOG = await (await fetch(CATALOG_URL)).json();
  PRODUCTS = CATALOG.products || [];
  renderCategories();
  renderProducts();
  renderFeatured();
  updateCartUI();
  updateWishUI();
  addFloatingDecor();
}

// Detect currency via locale
function detectCurrency(){
  const locale = navigator.language || 'en-US';
  if(locale.startsWith('ro')) userCurrency='RON';
  else if(locale.startsWith('en-GB')) userCurrency='GBP';
  else if(/^(fr|de|it|es|nl|pt)/.test(locale)) userCurrency='EUR';
  else userCurrency='USD';
}

// UI rendering
function renderCategories(){
  const container = $('#categoriesList');
  if(!container) return;
  container.innerHTML = '';
  CATALOG.categories.forEach(cat=>{
    const el = document.createElement('div');
    el.className = 'category-block';
    el.innerHTML = `<h4>${cat.name}</h4>`;
    const subs = CATALOG.subcategories.filter(s => s.category === cat.id);
    subs.forEach(s => {
      const b = document.createElement('button');
      b.className = 'subcat-btn';
      b.textContent = s.name;
      b.onclick = () => renderProducts({category:cat.id, subcategory:s.id});
      el.appendChild(b);
    });
    container.appendChild(el);
  });
}

// Products grid
function renderProducts({q, category, subcategory} = {}){
  const grid = $('#productsGrid');
  if(!grid) return;
  let list = PRODUCTS.slice();
  if(q) {
    const Q = q.toLowerCase();
    list = list.filter(p => (p.name + ' ' + p.description + ' ' + (p.options?JSON.stringify(p.options):'')).toLowerCase().includes(Q));
  }
  if(category) list = list.filter(p => p.category === category);
  if(subcategory) list = list.filter(p => p.subcategory === subcategory);
  grid.innerHTML = '';
  list.forEach(p => {
    const card = document.createElement('div'); card.className='product-card';
    const img = document.createElement('img'); img.src = p.images && p.images[0] ? p.images[0] : 'data/placeholder.png';
    const h4 = document.createElement('h4'); h4.textContent = p.name;
    const desc = document.createElement('p'); desc.textContent = p.description;
    const price = document.createElement('div'); price.className='price'; price.textContent = fmt(p.price, p.currency || userCurrency);
    const actions = document.createElement('div'); actions.className='actions';
    const view = document.createElement('button'); view.className = 'btn'; view.textContent = 'View & Buy'; view.onclick = () => openProductModal(p.id);
    const wish = document.createElement('button'); wish.className = 'btn secondary'; wish.textContent = '♡'; wish.onclick = () => toggleWish(p.id);
    actions.appendChild(view); actions.appendChild(wish);
    card.appendChild(img); card.appendChild(h4); card.appendChild(desc); card.appendChild(price); card.appendChild(actions);
    grid.appendChild(card);
  });
}

// Product modal
function openProductModal(id){
  const p = PRODUCTS.find(x => x.id === id);
  if(!p) return;
  const modal = $('#modal');
  const content = modal.querySelector('.modal-card > div') || modal.querySelector('#modalContent') || document.createElement('div');
  content.innerHTML = `
    <div class="product-modal-grid" style="display:flex;gap:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:260px;">
        ${(p.images||[]).map(i => `<img style="width:100%;border-radius:8px;margin-bottom:6px" src="${i}">`).join('')}
      </div>
      <div style="flex:1;min-width:260px;">
        <h2>${p.name}</h2>
        <p>${p.description}</p>
        <div class="price">${fmt(p.price, userCurrency)}</div>
        ${renderOptionsHTML(p.options)}
        <div style="margin-top:12px">
          <button id="addCartBtn" class="btn">Add to cart</button>
          <button id="buyNowBtn" class="btn secondary">Buy now (PayPal)</button>
        </div>
      </div>
    </div>
  `;
  // place content inside modal card
  const modalCard = modal.querySelector('.modal-card');
  modalCard.querySelector('#modalContent')?.remove();
  const wrapper = document.createElement('div'); wrapper.id='modalContent'; wrapper.innerHTML = content.innerHTML;
  modalCard.appendChild(wrapper);
  modal.classList.remove('hidden');

  modal.querySelector('.modal-close').onclick = () => modal.classList.add('hidden');
  $('#addCartBtn').onclick = () => { addToCart(id, 1); modal.classList.add('hidden'); };
  $('#buyNowBtn').onclick = () => { addToCart(id,1); proceedToCheckout(); };
}

function renderOptionsHTML(options){
  if(!options) return '';
  let s = '<div class="options">';
  for(const k in options){
    s += `<label>${k}: <select name="${k}">${options[k].map(o=>`<option value="${o}">${o}</option>`).join('')}</select></label>`;
  }
  s += '</div>';
  return s;
}

// Cart
function addToCart(id, qty=1){
  const cart = loadCart();
  const existing = cart.find(i => i.id === id);
  if(existing) existing.qty += qty; else cart.push({ id, qty });
  saveCart(cart); updateCartUI();
  alert('Added to cart');
}
function updateCartUI(){
  const cart = loadCart();
  const totalQty = cart.reduce((s,i)=>s + i.qty, 0);
  $$('#cartCount, #cartCount2').forEach(el => el && (el.textContent = totalQty));
}

// Open cart
function toggleCartPanel(){
  const panel = $('#cartPanel');
  if(!panel) return;
  if(panel.classList.contains('hidden')) renderCartPanel();
  panel.classList.toggle('hidden');
}

function renderCartPanel(){
  const panel = $('#cartPanel');
  const cart = loadCart();
  if(!panel) return;
  if(cart.length === 0){ panel.innerHTML = '<h3>Your cart</h3><p>Empty</p>'; return; }

  let html = '<h3>Your cart</h3><div class="cart-items">';
  let subtotal = 0;
  let largest = 'small';
  cart.forEach(it => {
    const p = PRODUCTS.find(x=>x.id===it.id);
    if(!p) return;
    subtotal += p.price * it.qty;
    if(p.weightCategory === 'large') largest = 'large';
    else if(p.weightCategory === 'medium' && largest !== 'large') largest = 'medium';
    html += `<div class="cart-row"><strong>${p.name}</strong> x ${it.qty} — ${fmt(p.price * it.qty, p.currency || userCurrency)}</div>`;
  });
  const shipping = calculateShipping(subtotal, largest);
  const shippingDisplay = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : shipping;
  const total = subtotal + shippingDisplay;
  html += `</div><div class="cart-summary">Subtotal: ${fmt(subtotal, userCurrency)}<br>Shipping: ${ subtotal>=FREE_SHIPPING_THRESHOLD ? '<strong>FREE</strong>' : fmt(shippingDisplay, userCurrency) }<br><strong>Total: ${fmt(total, userCurrency)}</strong></div>`;
  html += `<div class="cart-actions"><button id="checkoutBtn" class="btn">Checkout (PayPal)</button></div>`;
  panel.innerHTML = html;
  $('#checkoutBtn').onclick = () => proceedToCheckout();
}

// Shipping logic (Option 1: largest item)
function calculateShipping(subtotal, largestCategory){
  // region detection
  const region = detectRegionGroup();
  const matrix = {
    "R1": {small:4, medium:6, large:10},
    "R2": {small:7, medium:10, large:18},
    "R3": {small:9, medium:12, large:24},
    "R4": {small:12, medium:16, large:35},
    "R5": {small:14, medium:18, large:38},
    "R6": {small:15, medium:20, large:40},
    "R7": {small:16, medium:22, large:42}
  };
  const cat = largestCategory || 'small';
  const rates = matrix[region] || matrix.R5;
  return rates[cat];
}

function detectRegionGroup(){
  const locale = navigator.language || 'en-US';
  if(locale.startsWith('ro')) return 'R1';
  if(locale.startsWith('en-US')||locale.startsWith('en-CA')) return 'R5';
  if(/^(fr|de|it|es|nl|pt|pl|cz|hu)/.test(locale)) return 'R2';
  if(locale.startsWith('en-GB')||/^(se|no|fi|dk|ch)/.test(locale)) return 'R3';
  return 'R5';
}

// Checkout -> create PayPal order (includes shipping)
async function proceedToCheckout(){
  const cart = loadCart();
  if(!cart || cart.length === 0){ alert('Cart is empty'); return; }
  const items = cart.map(ci => {
    const p = PRODUCTS.find(x=>x.id===ci.id);
    return { id: p.id, name: p.name, price: Number(p.price), qty: ci.qty, currency: p.currency || userCurrency };
  });
  // compute subtotal and largest
  let subtotal = 0;
  let largest = 'small';
  items.forEach(it => {
    subtotal += it.price * it.qty;
    const p = PRODUCTS.find(x=>x.id===it.id);
    if(p.weightCategory === 'large') largest = 'large';
    else if(p.weightCategory === 'medium' && largest !== 'large') largest = 'medium';
  });
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : calculateShipping(subtotal, largest);

  // choose currency for PayPal: use detected currency; ensure PayPal supports it.
  const currency = userCurrency || 'USD';

  // call serverless create_order
  try {
    const res = await fetch('/api/paypal/create_order', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ items, shipping, currency })
    });
    const data = await res.json();
    if(data && data.approvalUrl){
      // redirect to PayPal approval
      window.location.href = data.approvalUrl;
    } else {
      console.error('create_order failure', data);
      alert('Could not create PayPal order. Check console.');
    }
  } catch (err) {
    console.error('checkout error', err);
    alert('Checkout error. Try again.');
  }
}

// Wishlist
function toggleWish(id){
  const w = loadWish();
  if(w.includes(id)) { const i = w.indexOf(id); w.splice(i,1); } else w.push(id);
  saveWish(w); updateWishUI();
}
function updateWishUI(){ const w = loadWish(); $$('#wishCount, #wishCount2').forEach(el=> el && (el.textContent = w.length)); }

// Featured
function renderFeatured(){
  const container = document.getElementById('featuredCarousel');
  if(!container) return;
  const featured = PRODUCTS.slice(0,8);
  featured.forEach(p => {
    const el = document.createElement('div'); el.className='featured-item';
    el.innerHTML = `<img src="${p.images[0]||'data/placeholder.png'}" style="width:100%;height:140px;object-fit:cover;border-radius:8px"><h4>${p.name}</h4><p>${fmt(p.price, p.currency||userCurrency)}</p>`;
    el.onclick = () => openProductModal(p.id);
    container.appendChild(el);
  });
}

// Floating decor + snow
function addFloatingDecor(){
  const container = document.createElement('div'); container.className='floating-decor';
  for(let i=0;i<18;i++){
    const el = document.createElement('div'); el.className='snowflake'; el.style.left = Math.random()*100+'%'; el.style.animationDuration = (6 + Math.random()*6)+'s'; el.style.top = (-10 - Math.random()*20)+'vh';
    el.textContent = '❄';
    el.style.fontSize = (10 + Math.random()*26)+'px';
    container.appendChild(el);
  }
  // a few gifts
  for(let j=0;j<6;j++){
    const g = document.createElement('div'); g.className='gift'; g.style.left = Math.random()*90+'%'; g.style.top = (5 + Math.random()*30)+'%'; g.style.opacity=0.9; container.appendChild(g);
  }
  document.body.appendChild(container);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  detectCurrency();
  loadCatalogue();
  // hook cart button toggles
  $$('#cartBtn, #cartBtn2').forEach(b => b && b.addEventListener('click', toggleCartPanel));
});
