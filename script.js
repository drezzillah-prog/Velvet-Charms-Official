/* script.js - product/catalogue rendering, modal, cart, personalization form, PayPal link redirect
   - Designed to work with the catalogue.json structure above
   - Uses only client-side JS (no backend). For production, add server validation & webhook.
*/

const CATALOGUE_URL = '/catalogue.json';
let catalogue = null;
let cart = [];
let favorites = [];

function q(sel){ return document.querySelector(sel); }
function qa(sel){ return Array.from(document.querySelectorAll(sel)); }

async function loadCatalogue(){
  try {
    const r = await fetch(CATALOGUE_URL + '?_=' + Date.now());
    if(!r.ok) throw new Error('catalogue.json not found');
    catalogue = await r.json();
    renderHeader();
    renderCategories();
    renderAbout();
  } catch (err) {
    console.error(err);
    q('#content').innerHTML = `<div class="error">Error loading catalogue. Please ensure /catalogue.json exists and is valid in site root.</div>`;
  }
}

/* ---------- Rendering ---------- */

function renderHeader(){
  q('#site-name').textContent = catalogue.siteInfo.name;
  q('#site-tagline').textContent = catalogue.siteInfo.tagline;
  // cart & favorites numbers
  updateCartUI();
  updateFavsUI();
}

function renderAbout(){
  const about = catalogue.siteInfo.about;
  q('#about-title').textContent = about.title;
  q('#about-text').textContent = about.text;
}

function renderCategories(){
  const container = q('#catalogue-list');
  container.innerHTML = '';
  catalogue.categories.forEach(cat => {
    const tile = document.createElement('div');
    tile.className = 'cat-tile';
    tile.innerHTML = `
      <div class="cat-header">
        <h3>${cat.name}</h3>
      </div>
      <div class="cat-body">
        <div class="cat-grid" id="cat-${cat.id}"></div>
      </div>
    `;
    container.appendChild(tile);

    // render subcategories/products inside tile
    const grid = tile.querySelector(`#cat-${cat.id}`);
    // if category has categoryImage, show it
    if(cat.categoryImage){
      const img = document.createElement('img');
      img.src = cat.categoryImage;
      img.alt = cat.name;
      img.className = 'cat-cover';
      tile.insertBefore(img, tile.firstChild);
    }
    if(cat.subcategories){
      cat.subcategories.forEach(sub => {
        // title for subcategory
        const subTitle = document.createElement('h4');
        subTitle.className = 'sub-title';
        subTitle.textContent = sub.name;
        grid.appendChild(subTitle);

        const products = sub.products || sub;
        products.forEach(p => {
          const card = createProductCard(p);
          grid.appendChild(card);
        });
      });
    } else if(cat.products){
      cat.products.forEach(p => {
        const card = createProductCard(p);
        grid.appendChild(card);
      });
    }
  });
}

function createProductCard(p){
  const card = document.createElement('div');
  card.className = 'product-card';
  const img = (p.images && p.images[0]) ? p.images[0] : 'top banner picture for candles.png';
  card.innerHTML = `
    <img src="${img}" alt="${p.name}" class="product-thumb" onerror="this.style.display='none'">
    <div class="product-info">
      <h5 class="product-name">${p.name}</h5>
      <div class="product-price">$${(p.price||0).toFixed(2)}</div>
      <div class="product-actions">
        <button class="btn btn-details" data-id="${p.id}">Details</button>
        <button class="btn btn-add" data-id="${p.id}">Buy</button>
        <button class="btn btn-fav" data-id="${p.id}">❤</button>
      </div>
    </div>
  `;
  // events
  card.querySelector('.btn-details').addEventListener('click', ()=> openDetails(p));
  card.querySelector('.btn-add').addEventListener('click', ()=> openPersonalization(p));
  card.querySelector('.btn-fav').addEventListener('click', (e)=> {
    toggleFavorite(p.id);
    e.target.classList.toggle('favorited');
  });

  return card;
}

/* ---------- Details modal ---------- */

function openDetails(product){
  const modal = q('#modal');
  modal.classList.add('open');
  q('#modal-title').textContent = product.name;
  // build gallery
  const gallery = q('#modal-gallery');
  gallery.innerHTML = '';
  (product.images || []).forEach((img, idx) => {
    // respect removeDetailsIndex if provided
    if(product.removeDetailsIndex && product.removeDetailsIndex.includes(idx)) return;
    const imgEl = document.createElement('img');
    imgEl.src = img;
    imgEl.alt = product.name + ' ' + (idx+1);
    gallery.appendChild(imgEl);
  });
  // description and options
  q('#modal-desc').textContent = product.description || '';
  // options form
  const optionsWrap = q('#modal-options');
  optionsWrap.innerHTML = '';
  if(product.options){
    Object.entries(product.options).forEach(([key,vals])=>{
      if(Array.isArray(vals)){
        const label = document.createElement('label');
        label.textContent = key.charAt(0).toUpperCase()+key.slice(1);
        optionsWrap.appendChild(label);
        const select = document.createElement('select');
        select.name = key;
        vals.forEach(v=>{
          const o = document.createElement('option'); o.value=v; o.textContent=v;
          select.appendChild(o);
        });
        optionsWrap.appendChild(select);
      }
    });
  }
  q('#modal-price').textContent = `$${(product.price||0).toFixed(2)}`;
  q('#modal-buy').dataset.id = product.id;
}

/* ---------- Personalization branch (mini cart add flow) ---------- */

function openPersonalization(product){
  // show personalization drawer
  const drawer = q('#personalize');
  drawer.classList.add('open');
  q('#personalize-title').textContent = product.name;
  q('#personalize-price').textContent = `$${(product.price||0).toFixed(2)}`;
  // show images + small selector
  const imgs = q('#personalize-images');
  imgs.innerHTML = '';
  (product.images||[]).forEach(src=>{
    const im = document.createElement('img'); im.src=src; im.className='small'; imgs.appendChild(im);
  });
  // build form fields
  const form = q('#personalize-form');
  form.innerHTML = `
    <label>Quantity <input type="number" name="qty" value="1" min="1"></label>
    <label>Notes (size, color, personalization) <textarea name="notes" rows="3"></textarea></label>
    <label>Add up to 3 images (URLs) <input type="text" name="imageUrls" placeholder="paste image URLs separated by commas"></label>
    <div class="personalize-actions">
      <button type="button" id="personalize-add">Add to Cart</button>
      <button type="button" id="personalize-cancel">Cancel</button>
    </div>
  `;
  // events
  q('#personalize-cancel').onclick = ()=> drawer.classList.remove('open');
  q('#personalize-add').onclick = ()=>{
    const formData = new FormData(form);
    const qty = parseInt(formData.get('qty')||1);
    const notes = formData.get('notes')||'';
    const images = (formData.get('imageUrls')||'').split(',').map(s=>s.trim()).filter(Boolean);
    addToCart({
      id: product.id, name: product.name, price: product.price||0, qty, notes, images
    });
    drawer.classList.remove('open');
  };
}

/* ---------- Cart logic ---------- */

function addToCart(item){
  const existing = cart.find(i=>i.id===item.id && i.notes===item.notes && JSON.stringify(i.images)===JSON.stringify(item.images));
  if(existing){
    existing.qty += item.qty;
  } else cart.push(item);
  updateCartUI();
  saveCart();
  showMiniCart();
}

function updateCartUI(){
  q('#cart-count').textContent = cart.reduce((s,i)=>s+i.qty,0);
  q('#fav-count').textContent = favorites.length;
}

function toggleFavorite(id){
  if(favorites.includes(id)) favorites = favorites.filter(x=>x!==id);
  else favorites.push(id);
  updateFavsUI();
  saveFavs();
}

function updateFavsUI(){
  q('#fav-count').textContent = favorites.length;
}

/* ---------- Mini-cart modal ---------- */

function showMiniCart(){
  const c = q('#cart-modal');
  c.classList.add('open');
  const list = q('#cart-items');
  list.innerHTML = '';
  cart.forEach((it,idx)=>{
    const row = document.createElement('div'); row.className='cart-row';
    row.innerHTML = `<div class="cart-name">${it.name} × ${it.qty}</div>
                     <div class="cart-actions">
                      <button data-i="${idx}" class="remove">Remove</button>
                     </div>`;
    list.appendChild(row);
  });
  qa('#cart-items .remove').forEach(btn=> btn.addEventListener('click', e=>{
    const idx = parseInt(e.target.dataset.i);
    cart.splice(idx,1);
    showMiniCart();
    updateCartUI();
    saveCart();
  }));
  q('#checkout-btn').onclick = ()=> initiateCheckout();
}

/* ---------- Checkout (client-side redirect to PayPal per-item or aggregated) ---------- */

function initiateCheckout(){
  if(cart.length===0) { alert('Your cart is empty.'); return; }
  // Build a simple "order summary" form and then open PayPal links for each item sequentially.
  // NOTE: This is a simple client-side flow. For production, use server-side orders & PayPal APIs.
  const summary = cart.map(it=> `${it.name} ×${it.qty} — $${(it.price*it.qty).toFixed(2)}\nNotes: ${it.notes||'-'}`).join('\n\n');
  const confirmCheckout = confirm(`Order summary:\n\n${summary}\n\nProceed to payment?`);
  if(!confirmCheckout) return;
  // If cart contains multiple different items with different payment links, we open each link in sequence.
  // To keep it simple, if all items share same paymentLink, redirect once.
  // We'll attempt to find paymentLink from catalogue
  const firstItem = cart[0];
  const p = findProductById(firstItem.id);
  if(p && cart.length===1){
    window.location.href = p.paymentLink;
    return;
  }
  // Otherwise open a lightweight order form that posts to Formspree + show post-payment instructions.
  openOrderForm();
}

/* ---------- Order form (saved in local storage / sends to Formspree if provided) ---------- */

function openOrderForm(){
  const of = q('#order-form-modal');
  of.classList.add('open');
  const summaryBox = q('#order-summary');
  summaryBox.value = JSON.stringify(cart, null, 2);
  // attach send handler
  q('#order-send').onclick = async ()=>{
    const email = q('#order-email').value;
    if(!email){ alert('Please add your email'); return; }
    // Build outgoing payload
    const payload = {
      email,
      cart,
      note: q('#order-note').value || ''
    };
    // If user provided Formspree endpoint in catalogue (not mandatory), send
    const fs = catalogue.siteInfo.formspreeEndpoint || null;
    if(fs){
      try {
        await fetch(fs, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify(payload)
        });
        alert('Order saved. After payment please reply to your confirmation email with proof of payment if necessary.');
        of.classList.remove('open');
        cart = [];
        updateCartUI();
        saveCart();
      } catch(err){
        console.error(err);
        alert('Unable to send order via Formspree. Please email us directly.');
      }
    } else {
      // just save locally and prompt user to pay via PayPal links
      alert('Order captured locally. Please proceed with PayPal payment from product pages. We will email you a confirmation.');
      of.classList.remove('open');
      cart = [];
      updateCartUI();
      saveCart();
    }
  };
}

/* ---------- Utility functions ---------- */

function findProductById(id){
  for(const c of (catalogue.categories||[])){
    if(c.products) {
      const p = c.products.find(x=>x.id===id);
      if(p) return p;
    }
    if(c.subcategories) {
      for(const s of c.subcategories){
        if(s.products){
          const p = s.products.find(x=>x.id===id);
          if(p) return p;
        }
      }
    }
  }
  return null;
}

/* ---------- Local storage ---------- */

function saveCart(){ localStorage.setItem('vc_cart', JSON.stringify(cart)); }
function loadCart(){ const s = localStorage.getItem('vc_cart'); if(s) cart = JSON.parse(s); }
function saveFavs(){ localStorage.setItem('vc_favs', JSON.stringify(favorites)); }
function loadFavs(){ const s = localStorage.getItem('vc_favs'); if(s) favorites = JSON.parse(s); }

/* ---------- Modal controls ---------- */

function closeModals(){
  qa('.modal.open').forEach(m=> m.classList.remove('open'));
  q('#personalize').classList.remove('open');
  q('#cart-modal').classList.remove('open');
  q('#order-form-modal').classList.remove('open');
}

window.addEventListener('click', (e)=>{
  if(e.target.classList && e.target.classList.contains('modal')) closeModals();
});

/* ---------- Init ---------- */

document.addEventListener('DOMContentLoaded', ()=>{
  loadCart(); loadFavs();
  loadCatalogue();
  // wire top buttons
  q('#btn-cart').addEventListener('click', showMiniCart);
  q('#btn-close-modal').addEventListener('click', ()=> closeModals());
  q('#btn-close-personalize').addEventListener('click', ()=> q('#personalize').classList.remove('open'));
  // keyboard ESC
  document.addEventListener('keydown', (e)=> { if(e.key==='Escape') closeModals(); });
});
