// script.js - dynamic product rendering and UI interactions

const PRODUCTS_JSON = 'products.json';
let products = [];
let cart = [];
let currency = 'USD';
let rates = {USD:1};

async function init(){
  await loadProducts();
  detectLocale();
  renderHome();
  setupListeners();
}

async function loadProducts(){
  try{
    const res = await fetch(PRODUCTS_JSON + '?t='+Date.now());
    products = await res.json();
  }catch(e){
    console.error('Failed to load products.json', e);
    products = [];
  }
}

function setupListeners(){
  document.getElementById('currencyToggle').addEventListener('click', toggleCurrency);
}

function toggleCurrency(){
  currency = (currency === 'USD') ? 'EUR' : 'USD';
  document.getElementById('currencyToggle').innerText = currency;
  renderHome();
}

async function detectLocale(){
  try{
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
    // optional: fetch rates from exchangerate.host (no key)
    const r = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=EUR,USD');
    const data = await r.json();
    rates = { USD:1, EUR: data.rates.EUR || 0.95 };
  }catch(e){
    rates = {USD:1, EUR:0.95};
  }
}

function priceForDisplay(usd){
  if(currency === 'USD') return `$${usd.toFixed(2)}`;
  const eur = usd * (rates.EUR || 0.95);
  return `€${eur.toFixed(2)}`;
}

function renderHome(){
  const grid = document.getElementById('productGrid');
  document.getElementById('productsTitle').innerText = 'Coming Soon — Preorder Your Favorites';
  // choose a representative subset (first 8) for coming soon
  const toShow = products.filter(p => p.category && p.category.startsWith('Coming Soon')).slice(0,8);
  // fallback if none
  const fallback = products.slice(0,8);
  renderGrid(toShow.length?toShow:fallback);
}

function renderGrid(items){
  const container = document.getElementById('productGrid');
  container.innerHTML = '';
  items.forEach(p => {
    const card = document.createElement('div'); card.className='product-card';
    const img = document.createElement('img');
    img.src = p.image || 'placeholder.png';
    img.alt = p.name;
    img.onerror = ()=>img.src='placeholder.png';
    card.appendChild(img);

    const h3 = document.createElement('h3'); h3.innerText = p.name;
    card.appendChild(h3);
    const desc = document.createElement('p'); desc.innerText = p.description || '';
    card.appendChild(desc);

    const actions = document.createElement('div'); actions.className='product-actions';
    const love = document.createElement('button'); love.className='love-btn'; love.innerText='★';
    love.onclick = ()=>toggleWish(p.id,love);
    actions.appendChild(love);

    const view = document.createElement('button'); view.innerText='View';
    view.onclick = ()=>openProductModal(p.id);
    actions.appendChild(view);

    const buy = document.createElement('button'); buy.innerText='Buy';
    buy.onclick = ()=>{ if(p.paypal) window.open(p.paypal,'_blank'); else alert('No payment link for this product yet.');};
    actions.appendChild(buy);

    card.appendChild(actions);
    container.appendChild(card);
  });
}

// wishlist
function toggleWish(id,btn){
  let wish = JSON.parse(localStorage.getItem('vc_wish')||'[]');
  if(wish.includes(id)){ wish = wish.filter(x=>x!==id); btn.style.background='transparent'; }
  else { wish.push(id); btn.style.background='gold'; }
  localStorage.setItem('vc_wish', JSON.stringify(wish));
}

// product modal
function openProductModal(id){
  const p = products.find(x=>x.id===id);
  if(!p) return;
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div style="display:flex;gap:1rem;flex-wrap:wrap">
      <img src="${p.image || 'placeholder.png'}" style="width:300px;height:300px;object-fit:cover;border-radius:8px" onerror="this.src='placeholder.png'"/>
      <div style="flex:1">
        <h2>${p.name}</h2>
        <p style="color:#d6c9b6">${p.description||''}</p>
        <p><strong>${priceForDisplay(p.price_usd || 0)}</strong></p>
        <p>Product ID: <code>${p.id}</code></p>
        <div style="display:flex;gap:.5rem;margin-top:1rem">
          <button onclick="addToCart('${p.id}')">Add to cart (demo)</button>
          <button onclick="openCustomizeForm('${p.id}')">Customize this product</button>
          ${p.paypal ? `<button onclick="window.open('${p.paypal}','_blank')">Buy (PayPal)</button>` : ''}
        </div>
      </div>
    </div>
  `;
  document.getElementById('productModal').classList.remove('hidden');
}

function closeProductModal(){ document.getElementById('productModal').classList.add('hidden'); }

// cart demo
function addToCart(id){
  const p = products.find(x=>x.id===id);
  if(!p) return alert('Product not found');
  cart.push(p);
  renderCart();
  alert('Added to demo cart');
}
function renderCart(){
  const container = document.getElementById('cartItems');
  container.innerHTML = '';
  let total = 0;
  cart.forEach((p,i)=>{
    const row = document.createElement('div'); row.style.marginBottom='8px';
    row.innerHTML = `<div style="display:flex;justify-content:space-between"><div>${p.name}</div><div>${priceForDisplay(p.price_usd||0)}</div></div>`;
    container.appendChild(row);
    total += p.price_usd||0;
  });
  document.getElementById('cartTotal').innerText = priceForDisplay(total);
  document.getElementById('cartDrawer').classList.remove('hidden');
}

function openCart(){ document.getElementById('cartDrawer').classList.remove('hidden'); }
function closeCart(){ document.getElementById('cartDrawer').classList.add('hidden'); }

// customization form (opens new window with prefilled details or scrolls to contact)
function openCustomizeForm(productId){
  closeProductModal();
  // populate general form with product id and message hint
  const form = document.getElementById('generalForm');
  if(form){
    form.querySelector('textarea').value = `I want to customize product ${productId} - details:\n`;
    window.location.hash='#contact';
    scrollToSection('contact');
  } else {
    alert('Customization form not found. Please use contact form.');
  }
}

function scrollToSection(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.scrollIntoView({behavior:'smooth',block:'start'});
}

// initial render of categories (helper)
function renderCategory(name){
  // filter by category prefix
  const cols = products.filter(p => p.category && p.category.startsWith(name));
  if(cols.length === 0){
    // try direct match
    const direct = products.filter(p => p.category === name);
    if(direct.length === 0){
      document.getElementById('productsTitle').innerText = 'Category not found';
      renderGrid([]);
      return;
    } else renderGrid(direct);
  } else {
    document.getElementById('productsTitle').innerText = name;
    renderGrid(cols);
  }
}

// init
init();
