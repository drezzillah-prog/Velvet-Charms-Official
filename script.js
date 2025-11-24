// script.js - full catalogue handling, modal, cart, wishlist, checkout total
// NOTE: if you want PayPal payments to go to a different PayPal email, change PAYPAL_BUSINESS_EMAIL below.

const PAYPAL_BUSINESS_EMAIL = 'rosalinda.mauve@gmail.com'; // <--- Replace if needed

window.appState = {
  catalogue: null,
  cart: [],
  wishlist: []
};

// helper: format price
function formatPrice(v){
  return `USD ${Number(v).toFixed(2)}`;
}

// load catalogue.json
async function loadCatalogue(){
  try{
    const res = await fetch('catalogue.json', {cache: "no-cache"});
    if(!res.ok) throw new Error('catalogue.json not found');
    const j = await res.json();
    window.appState.catalogue = j;
    return j;
  }catch(err){
    console.error('Error loading catalogue:', err);
    window.appState.catalogue = null;
    return null;
  }
}

// persist cart + wishlist
function saveCartAndWishlist(){
  localStorage.setItem('vc_cart', JSON.stringify(window.appState.cart || []));
  localStorage.setItem('vc_wish', JSON.stringify(window.appState.wishlist || []));
}
function restoreCartAndWishlist(){
  try{
    const c = JSON.parse(localStorage.getItem('vc_cart')||'[]');
    const w = JSON.parse(localStorage.getItem('vc_wish')||'[]');
    window.appState.cart = Array.isArray(c)?c:[];
    window.appState.wishlist = Array.isArray(w)?w:[];
  }catch(e){
    window.appState.cart = [];
    window.appState.wishlist = [];
  }
}

// render helpers
function findProductById(id){
  const cat = window.appState.catalogue && window.appState.catalogue.categories;
  if(!cat) return null;
  for(const c of cat){
    // top-level products
    if(c.products){
      for(const p of c.products) if(p.id===id) return p;
    }
    // subcategories
    if(c.subcategories){
      for(const sc of c.subcategories){
        if(sc.products){
          for(const p of sc.products) if(p.id===id) return p;
        }
      }
    }
  }
  return null;
}

function renderFeaturedTiles(){
  const dest = document.getElementById('featuredTiles');
  if(!dest) return;
  dest.innerHTML = '';
  const cats = window.appState.catalogue.categories.slice(0,6);
  for(const c of cats){
    const tile = document.createElement('div');
    tile.className='card';
    const imgSrc = c.categoryImage || c.banner || (c.subcategories && c.subcategories[0] && c.subcategories[0].products && c.subcategories[0].products[0] && c.subcategories[0].products[0].images && c.subcategories[0].products[0].images[0]) || '';
    tile.innerHTML = `
      <img src="${encodeURI(imgSrc)}" alt="${c.name}">
      <h4>${c.name}</h4>
      <p class="muted">${c.subcategories?c.subcategories.length+' subcategories':''}</p>
      <div style="margin-top:8px"><button class="btn primary" data-cat="${c.id}">Open</button></div>
    `;
    dest.appendChild(tile);
  }
  dest.querySelectorAll('button[data-cat]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const id = e.currentTarget.dataset.cat;
      if(window.renderCataloguePage) window.renderCataloguePage(id);
      location.href = 'catalogue.html';
    });
  });
}

function renderCataloguePage(filterCategoryId){
  const categoriesEl = document.getElementById('categoriesList');
  const grid = document.getElementById('catalogueGrid');
  if(!categoriesEl || !grid) return;
  categoriesEl.innerHTML = '';
  grid.innerHTML = '';

  const catList = window.appState.catalogue.categories;
  // categories sidebar
  for(const c of catList){
    const el = document.createElement('div');
    el.innerHTML = `<h4>${c.name}</h4>`;
    // list subcategories or link
    const ul = document.createElement('ul');
    if(c.subcategories){
      for(const sc of c.subcategories){
        const li = document.createElement('li');
        li.innerHTML = `<button class="link-btn" data-sc="${sc.id}">${sc.name}</button>`;
        ul.appendChild(li);
      }
    } else if(c.products){
      const li = document.createElement('li');
      li.innerHTML = `<button class="link-btn" data-cat="${c.id}">View products</button>`;
      ul.appendChild(li);
    }
    el.appendChild(ul);
    categoriesEl.appendChild(el);
  }

  // render all products (or a category)
  function pushProductCard(p, parentCategoryName){
    const card = document.createElement('div');
    card.className = 'card';
    const img = p.images && p.images[0] ? p.images[0] : '';
    card.innerHTML = `
      <img src="${encodeURI(img)}" alt="${p.name}">
      <h4>${p.name}</h4>
      <div class="muted">${p.description?p.description:''}</div>
      <div style="margin-top:8px"><span class="price">${formatPrice(p.price || 0)}</span></div>
      <div class="actions">
        <button class="btn ghost" data-details="${p.id}">Details</button>
        <button class="btn primary" data-add="${p.id}">Buy</button>
        <button class="btn" data-love="${p.id}">♡</button>
      </div>
    `;
    grid.appendChild(card);
  }

  for(const c of catList){
    // top-level products
    if(!filterCategoryId || filterCategoryId === c.id){
      if(c.products) for(const p of c.products) pushProductCard(p, c.name);
      if(c.subcategories){
        for(const sc of c.subcategories){
          if(!filterCategoryId || filterCategoryId === sc.id || filterCategoryId === c.id){
            if(sc.products) for(const p of sc.products) pushProductCard(p, sc.name || c.name);
          }
        }
      }
    }
  }

  // attach events
  grid.querySelectorAll('[data-details]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = e.currentTarget.getAttribute('data-details');
      openDetailsModal(id);
    });
  });
  grid.querySelectorAll('[data-add]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = e.currentTarget.getAttribute('data-add');
      addToCart(id,1);
    });
  });
  grid.querySelectorAll('[data-love]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = e.currentTarget.getAttribute('data-love');
      toggleWishlist(id);
    });
  });

  // sidebar interactions
  document.querySelectorAll('.link-btn').forEach(b=>{
    b.addEventListener('click', (ev)=>{
      const sc = ev.currentTarget.dataset.sc;
      const cat = ev.currentTarget.dataset.cat;
      // re-render filtering by subcategory id (simple implementation)
      if(sc){
        // clear grid and push only that subcategory's products
        grid.innerHTML='';
        for(const c of catList){
          if(c.subcategories){
            for(const sub of c.subcategories){
              if(sub.id === sc){
                for(const p of sub.products) pushProductCard(p, sub.name);
              }
            }
          }
        }
      } else if(cat){
        grid.innerHTML='';
        for(const c of catList){
          if(c.id === cat && c.products){
            for(const p of c.products) pushProductCard(p, c.name);
          }
        }
      }
    });
  });
}

// modal and details
function openDetailsModal(productId){
  const p = findProductById(productId);
  if(!p) return;
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  content.innerHTML = '';
  const gallery = document.createElement('div');
  gallery.className='product-gallery';
  for(const img of (p.images||[])){
    const im = document.createElement('img');
    im.src = encodeURI(img);
    im.style.maxWidth='180px';
    im.style.objectFit='cover';
    im.style.margin='6px';
    gallery.appendChild(im);
  }

  const html = `
    <div style="display:flex;gap:18px;flex-wrap:wrap">
      <div style="flex:1;min-width:220px">${gallery.outerHTML}</div>
      <div style="flex:1;min-width:220px">
        <h3>${p.name}</h3>
        <p>${p.description || ''}</p>
        <p><strong>Price: </strong>${formatPrice(p.price||0)}</p>
        ${p.options? `<div><strong>Options:</strong><div>${Object.keys(p.options).map(k=>`<div>${k}: ${p.options[k].join(', ')}</div>`).join('')}</div></div>` : ''}
        <div style="margin-top:10px">
          <label>Quantity <input id="modalQty" type="number" min="1" value="1" style="width:60px"/></label>
        </div>
        <div style="margin-top:10px">
          <button id="modalAdd" class="btn primary">Add to cart</button>
        </div>
      </div>
    </div>
  `;
  content.innerHTML = html;

  // open modal
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden','false');

  // close handlers
  const close = () => {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden','true');
  };
  document.getElementById('modalClose') && document.getElementById('modalClose').addEventListener('click', close);
  document.getElementById('modalClose2') && document.getElementById('modalClose2').addEventListener('click', close);
  document.querySelectorAll('.modal-backdrop').forEach(b => b.addEventListener('click', close));
  document.addEventListener('keydown', function escHandler(e){
    if(e.key === 'Escape'){ close(); document.removeEventListener('keydown', escHandler); }
  });

  document.getElementById('modalAdd').addEventListener('click', ()=>{
    const q = Number(document.getElementById('modalQty').value || 1);
    addToCart(p.id, q);
    close();
  });
}

// cart functions
function addToCart(productId, qty=1){
  const p = findProductById(productId);
  if(!p) return;
  const existing = window.appState.cart.find(i=>i.id===productId);
  if(existing){
    existing.qty += qty;
  }else{
    window.appState.cart.push({id:productId, qty: qty});
  }
  saveCartAndWishlist();
  renderCartUI();
  alert('Added to cart');
}
function removeFromCart(productId){
  window.appState.cart = window.appState.cart.filter(i=>i.id!==productId);
  saveCartAndWishlist();
  renderCartUI();
}
function setCartQty(productId, qty){
  const it = window.appState.cart.find(i=>i.id===productId);
  if(it) it.qty = qty;
  saveCartAndWishlist();
  renderCartUI();
}
function toggleWishlist(productId){
  const idx = window.appState.wishlist.indexOf(productId);
  if(idx===-1) window.appState.wishlist.push(productId);
  else window.appState.wishlist.splice(idx,1);
  saveCartAndWishlist();
  renderWishlistUI();
}

// render cart UI
function renderCartUI(){
  // update counts
  const cartCount = window.appState.cart.reduce((s,i)=>s+i.qty,0);
  document.querySelectorAll('#cartCount, #cartCount2, #cartCount').forEach(el=>{
    if(el) el.textContent = cartCount;
  });
  document.querySelectorAll('#favCount, #favCount2').forEach(el=>{
    if(el) el.textContent = window.appState.wishlist.length;
  });

  const cartPanel = document.getElementById('cartPanel');
  if(!cartPanel) return;

  const itemsEl = document.getElementById('cartItems');
  itemsEl.innerHTML = '';
  let total = 0;
  for(const item of window.appState.cart){
    const p = findProductById(item.id);
    if(!p) continue;
    const row = document.createElement('div');
    row.className = 'cart-row';
    const subtotal = (p.price||0) * item.qty;
    total += subtotal;
    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="flex:1">
          <div><strong>${p.name}</strong></div>
          <div style="font-size:13px">${formatPrice(p.price)} x ${item.qty}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <input type="number" min="1" value="${item.qty}" data-qty="${item.id}" style="width:64px"/>
          <button data-remove="${item.id}" class="btn">Remove</button>
        </div>
      </div>
    `;
    itemsEl.appendChild(row);
  }
  document.getElementById('cartTotal').textContent = formatPrice(total);

  // attach listeners for qty & remove
  itemsEl.querySelectorAll('input[data-qty]').forEach(input=>{
    input.addEventListener('change', e=>{
      const id = e.currentTarget.getAttribute('data-qty');
      const val = Number(e.currentTarget.value || 1);
      setCartQty(id, val);
    });
  });
  itemsEl.querySelectorAll('button[data-remove]').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = e.currentTarget.getAttribute('data-remove');
      removeFromCart(id);
    });
  });
}

// wishlist UI
function renderWishlistUI(){
  document.querySelectorAll('#favCount, #favCount2').forEach(el=>{
    if(el) el.textContent = window.appState.wishlist.length;
  });
}

// checkout: create PayPal single payment for total amount
function createPayPalCheckout(){
  const total = window.appState.cart.reduce((s,i)=>{
    const p = findProductById(i.id);
    return s + ((p && p.price) ? p.price * i.qty : 0);
  }, 0);
  const rounded = Number(total.toFixed(2));
  if(rounded <= 0){
    alert('Cart is empty');
    return;
  }
  // Build PayPal standard payment link (Buy Now with amount).
  // This will open PayPal and pre-fill amount — business email below must be set to your PayPal email.
  const business = encodeURIComponent(PAYPAL_BUSINESS_EMAIL);
  const amount = encodeURIComponent(String(rounded));
  const currency = 'USD';
  // Use PayPal payment button endpoint for a single amount:
  const url = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${business}&amount=${amount}&currency_code=${currency}&item_name=${encodeURIComponent('Velvet Charms Order')}`;
  window.open(url, '_blank');
}

// UI wiring and init
function attachUI(){
  // cart show/hide
  const cartBtn = document.getElementById('cartBtn') || document.getElementById('cartBtn2');
  const cartBtn2 = document.getElementById('cartBtn2');
  if(document.getElementById('cartBtn')) document.getElementById('cartBtn').addEventListener('click', ()=>{
    const panel = document.getElementById('cartPanel');
    panel.classList.toggle('hidden');
    renderCartUI();
  });
  if(document.getElementById('cartBtn2')) document.getElementById('cartBtn2').addEventListener('click', ()=>{
    const panel = document.getElementById('cartPanel');
    panel.classList.toggle('hidden');
    renderCartUI();
  });

  // checkout
  const checkoutBtn = document.getElementById('checkoutBtn');
  if(checkoutBtn) checkoutBtn.addEventListener('click', createPayPalCheckout);

  // favorites toggles
  document.querySelectorAll('[data-love]').forEach(b=>{
    b.addEventListener('click', e=>{
      toggleWishlist(e.currentTarget.getAttribute('data-love'));
    });
  });

  // modal close global
  document.querySelectorAll('.modal-close').forEach(b=>{
    b.addEventListener('click', ()=>{
      document.getElementById('modal').classList.add('hidden');
    });
  });

  // continue shopping
  const cont = document.getElementById('continueShopping');
  if(cont) cont.addEventListener('click', ()=> document.getElementById('cartPanel').classList.add('hidden'));
}

// initialize app
window.appInit = async function(){
  if(window.appState.catalogue) return;
  await loadCatalogue();
  restoreCartAndWishlist();
  attachUI();
  renderCartUI();
  renderWishlistUI();
};

// small helper fallback so index.js can call rendering
window.renderFeaturedTiles = renderFeaturedTiles;
window.renderCataloguePage = renderCataloguePage;
