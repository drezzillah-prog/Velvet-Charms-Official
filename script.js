/* script.js — Velvet Charms final (robust & path-safe)
   IMPORTANT: keep this file at root and load as /script.js (we referenced it that way in HTML).
*/

'use strict';

const APP = (function(){
  const CATALOG_URL = '/catalogue.json'; // ABSOLUTE path to root to avoid relative path issues
  const STORAGE_KEY = 'vc_cart_v1';
  const WISHLIST_KEY = 'vc_wishlist_v1';
  const LANG_KEY = 'vc_lang_v1';
  const THEME_KEY = 'vc_theme_v1';
  const FREE_SHIPPING_THRESHOLD = 300; // USD
  const SHIPPING_DEFAULT = 16; // demo
  let catalogue = null;
  let cart = { items: [] };
  let wishlist = [];
  let ACTIVE_LANG = localStorage.getItem(LANG_KEY) || (navigator.language || 'en').slice(0,2);

  /* ---------- Helpers ---------- */
  function $(s, ctx=document){ return ctx.querySelector(s); }
  function $all(s, ctx=document){ return Array.from(ctx.querySelectorAll(s)); }
  function formatCurrency(v){ return `USD ${Number(v||0).toFixed(2)}`; }
  function saveCart(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); renderCartCount(); }
  function loadCart(){ try { const r=localStorage.getItem(STORAGE_KEY); if(r) cart=JSON.parse(r); } catch(e){ cart={items:[]}; } }
  function saveWishlist(){ localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist)); renderWishlistCount(); }
  function loadWishlist(){ try { const r=localStorage.getItem(WISHLIST_KEY); if(r) wishlist=JSON.parse(r); } catch(e){ wishlist=[]; } }
  function detectLang(){ try{ const nav=window.navigator; const lang=(nav.languages && nav.languages[0])||nav.language||'en'; const s=lang.slice(0,2); if(['en','fr','it','ro'].includes(s)) return s; return 'en'; } catch(e){ return 'en'; } }

  /* ---------- Catalogue load (robust) ---------- */
  async function loadCatalogue(){
    if(catalogue) return catalogue;
    try{
      const res = await fetch(CATALOG_URL, { cache: 'no-cache' });
      if(!res.ok) throw new Error('catalogue fetch failed ' + res.status);
      catalogue = await res.json();
      if(!Array.isArray(catalogue.products)){
        const prods = [];
        (catalogue.categories||[]).forEach(cat=>{
          (cat.subcategories||[]).forEach(sub=>{
            (sub.products||[]).forEach(p=> prods.push(p));
          });
        });
        if(prods.length) catalogue.products = prods;
        else catalogue.products = catalogue.products || [];
      }
      catalogue.products.forEach(p => {
        if(!p.images || !Array.isArray(p.images)){
          if(p.image) p.images = [p.image];
          else p.images = [];
        }
      });
      return catalogue;
    } catch(err){
      console.error('Failed to load catalogue.json', err);
      catalogue = { products: [], categories: [] };
      return catalogue;
    }
  }

  function findProduct(id){
    if(!catalogue) return null;
    return catalogue.products.find(p => p.id === id);
  }

  /* ---------- UI Counters ---------- */
  function renderCartCount(){
    const c = cart.items.reduce((s,i)=>s+(i.qty||0),0);
    $all('#cartCount, #cartCountTop').forEach(el=>{ if(el) el.textContent = c; });
  }
  function renderWishlistCount(){
    const c = wishlist.length;
    $all('#favCount, #favCountTop').forEach(el=>{ if(el) el.textContent = c; });
  }

  /* ---------- Product card builder ---------- */
  function safeImage(src){
    if(!src) return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%23f3ede6" width="100%" height="100%"/><text fill="%238b0000" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="18">Image unavailable</text></svg>';
    // if src is an absolute path or a filename, keep it
    if(src.startsWith('http') || src.startsWith('/')) return src;
    return '/' + src;
  }

  function createProductCard(product){
    const article = document.createElement('article');
    article.className = 'product-card';
    const img = document.createElement('img');
    img.className = 'product-thumb';
    img.src = safeImage(product.images[0] || product.image || '');
    img.alt = product.name;
    const info = document.createElement('div'); info.className='product-info';
    const name = document.createElement('h4'); name.className='product-name'; name.textContent = product.name;
    const price = document.createElement('div'); price.className='product-price'; price.textContent = formatCurrency(product.price || 0);
    const desc = document.createElement('p'); desc.className='product-desc'; desc.textContent = product.description || '';
    const actions = document.createElement('div'); actions.className='product-actions';
    actions.innerHTML = `<label class="qty">Qty <input type="number" min="1" value="1" class="qty-input"></label>`;
    const optSel = document.createElement('select'); optSel.className='option-select hidden';
    if(product.options){
      const keys = Object.keys(product.options || {});
      if(keys.length){
        const vals = product.options[keys[0]];
        if(Array.isArray(vals) && vals.length){
          optSel.classList.remove('hidden');
          vals.forEach(v => { const o = document.createElement('option'); o.value=v; o.textContent=v; optSel.appendChild(o); });
        }
      }
    }
    const addBtn = document.createElement('button'); addBtn.className='btn add-to-cart'; addBtn.textContent='Add to cart';
    const viewBtn = document.createElement('button'); viewBtn.className='btn outline view-details'; viewBtn.textContent='Details';
    actions.appendChild(optSel); actions.appendChild(addBtn); actions.appendChild(viewBtn);
    info.appendChild(name); info.appendChild(price); info.appendChild(desc); info.appendChild(actions);
    article.appendChild(img); article.appendChild(info);

    addBtn.addEventListener('click', ()=> {
      const q = Number(article.querySelector('.qty-input').value || 1);
      const opt = optSel && !optSel.classList.contains('hidden') ? optSel.value : null;
      addToCart(product.id, q, opt);
      showMiniToast(`${product.name} added to cart`);
    });
    viewBtn.addEventListener('click', ()=> {
      window.location.href = `product.html?id=${encodeURIComponent(product.id)}`;
    });
    return article;
  }

  /* ---------- Render featured ---------- */
  async function renderFeatured(){
    await loadCatalogue();
    const mount = $('#featuredCarousel');
    if(!mount) return;
    mount.innerHTML='';
    const picks = (catalogue.products || []).slice(0,8);
    if(picks.length===0){ mount.innerHTML = '<div class="muted">No featured items configured.</div>'; return; }
    picks.forEach(p => mount.appendChild(createProductCard(p)));
  }

  /* ---------- Catalogue page rendering ---------- */
  async function renderCataloguePage(){
    await loadCatalogue();
    const catTree = $('#categoryTree');
    if(catTree && catalogue.categories && catalogue.categories.length){
      catTree.innerHTML = '';
      catalogue.categories.forEach(cat=>{
        const el = document.createElement('div'); el.className='cat';
        el.innerHTML = `<strong>${cat.name}</strong>`;
        (cat.subcategories || []).forEach(sub=>{
          const s = document.createElement('div'); s.className='subcat';
          s.innerHTML = `<button class="btn small subcatBtn" data-sub="${sub.id}">${sub.name}</button>`;
          el.appendChild(s);
        });
        catTree.appendChild(el);
      });
    } else if (catTree) {
      catTree.innerHTML = '<div class="muted">No categories defined.</div>';
    }

    const optFilter = $('#optionFilter');
    if(optFilter){
      optFilter.innerHTML = '<option value="all">Any</option>';
      const set = new Set();
      (catalogue.products || []).forEach(p=>{
        if(p.options) Object.values(p.options).forEach(arr => Array.isArray(arr) && arr.forEach(x => set.add(x)));
      });
      Array.from(set).sort().forEach(v=> { const o=document.createElement('option'); o.value=v; o.textContent=v; optFilter.appendChild(o); });
    }

    const results = $('#catalogueResults');
    if(!results) return;
    results.innerHTML='';
    const products = catalogue.products || [];
    if(products.length===0){ results.innerHTML = '<div class="muted">No products found.</div>'; return; }
    const chunkSize = 40;
    let idx = 0;
    function renderChunk(){
      const end = Math.min(idx + chunkSize, products.length);
      for(let i=idx;i<end;i++) results.appendChild(createProductCard(products[i]));
      idx = end;
      if(idx < products.length) setTimeout(renderChunk, 60);
    }
    renderChunk();

    $('#catalogueSearchBtn')?.addEventListener('click', applyCatalogueFilters);
    $('#catalogueSearch')?.addEventListener('keyup', (e)=>{ if(e.key==='Enter') applyCatalogueFilters(); });
    $('#priceFilter')?.addEventListener('change', applyCatalogueFilters);
    $('#optionFilter')?.addEventListener('change', applyCatalogueFilters);
    $('#sortSelect')?.addEventListener('change', applyCatalogueFilters);
    $('#resetFilters')?.addEventListener('click', ()=>{ $('#catalogueSearch').value=''; $('#priceFilter').value='all'; $('#optionFilter').value='all'; $('#sortSelect').value='default'; applyCatalogueFilters(); });
  }

  function applyCatalogueFilters(){
    if(!catalogue) return;
    let out = catalogue.products.slice();
    const q = ($('#catalogueSearch')?.value || '').trim().toLowerCase();
    if(q) out = out.filter(p => (p.name + ' ' + (p.description||'')).toLowerCase().includes(q));
    const priceVal = $('#priceFilter')?.value || 'all';
    if(priceVal !== 'all'){ const [min,max]=priceVal.split('-').map(Number); out = out.filter(p=>p.price>=min && p.price<=max); }
    const opt = $('#optionFilter')?.value || 'all';
    if(opt !== 'all'){ out = out.filter(p => p.options && Object.values(p.options).some(arr => Array.isArray(arr) && arr.includes(opt))); }
    const sort = $('#sortSelect')?.value || 'default'; if(sort==='price_asc') out.sort((a,b)=>a.price-b.price); if(sort==='price_desc') out.sort((a,b)=>b.price-a.price); if(sort==='name_asc') out.sort((a,b)=>a.name.localeCompare(b.name));
    const results = $('#catalogueResults'); results.innerHTML=''; if(out.length===0){ $('#noResults')?.classList.remove('hidden'); } else { $('#noResults')?.classList.add('hidden'); out.forEach(p=> results.appendChild(createProductCard(p))); }
  }

  /* ---------- Product page ---------- */
  async function renderProductPage(){
    await loadCatalogue();
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('id');
    if(!pid){ $('#productLoading') && ($('#productLoading').textContent='No product specified'); return; }
    const product = findProduct(pid);
    if(!product){ $('#productLoading') && ($('#productLoading').textContent='Product not found'); return; }
    $('#productLoading')?.classList.add('hidden');
    $('#productContent')?.classList.remove('hidden');
    $('#prodName').textContent = product.name;
    $('#prodPrice').textContent = formatCurrency(product.price || 0);
    $('#prodDescription').textContent = product.description || '';
    const carousel = $('#imageCarousel'); const thumbs = $('#imageThumbs');
    carousel.innerHTML=''; thumbs.innerHTML='';
    (product.images || []).forEach((src,i)=>{
      const img = document.createElement('img'); img.src = safeImage(src); img.alt = product.name + ' ' + (i+1); img.className='carousel-img'; if(i===0) img.classList.add('active');
      img.addEventListener('click', ()=>{ $all('.carousel-img',carousel).forEach(im=>im.classList.remove('active')); img.classList.add('active'); });
      carousel.appendChild(img);
      const t = document.createElement('img'); t.src=safeImage(src); t.className='thumb'; t.addEventListener('click', ()=>{ $all('.carousel-img',carousel).forEach(im=>im.classList.remove('active')); carousel.querySelectorAll('.carousel-img')[i].classList.add('active'); });
      thumbs.appendChild(t);
    });
    if(product.options){
      $('#optionSection')?.classList.remove('hidden'); const optSel = $('#prodOptions'); optSel.innerHTML=''; const k=Object.keys(product.options)[0]; (product.options[k]||[]).forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; optSel.appendChild(o); });
    } else { $('#optionSection')?.classList.add('hidden'); }
    $('#addToCartBtn')?.addEventListener('click', ()=>{ const qty = Number($('#prodQty').value||1); const opt = $('#prodOptions')?$('#prodOptions').value:null; addToCart(product.id, qty, opt); showMiniToast('Added to cart'); });
    $('#buyNowBtn')?.addEventListener('click', async ()=>{ const qty = Number($('#prodQty').value||1); const opt = $('#prodOptions')?$('#prodOptions').value:null; const tmp={items:[{id:product.id, qty, price:product.price, name:product.name}]}; try{ await startCheckout(tmp); }catch(e){ showModalError('Checkout failed.'); } });
  }

  /* ---------- Cart management ---------- */
  function addToCart(id, qty=1, option=null){
    const prod = findProduct(id);
    if(!prod) return;
    const existing = cart.items.find(it => it.id===id && (it.option || '') === (option||''));
    if(existing) existing.qty += qty;
    else cart.items.push({ id, qty, option: option||null, price: prod.price, name: prod.name });
    saveCart(); renderCartPanel();
  }
  function removeFromCart(index){ cart.items.splice(index,1); saveCart(); renderCartPanel(); }
  function updateCartItem(index, qty){ if(!cart.items[index]) return; cart.items[index].qty = qty; if(qty<=0) removeFromCart(index); saveCart(); renderCartPanel(); }
  function renderCartPanel(){
    const panel = $('#cartPanel'); if(!panel) return;
    panel.innerHTML = `<button id="cartClose" class="modal-close">✕</button><h3>Your cart</h3><div id="cartItems"></div><div class="cart-summary"><div>Subtotal: <span id="cartSubtotal">USD 0.00</span></div><div id="shippingRow">Shipping: <span id="cartShipping">USD 0.00</span></div><div class="total">Total: <strong id="cartTotal">USD 0.00</strong></div></div><div style="display:flex;gap:8px;margin-top:12px"><button id="continueShopping" class="btn outline">Continue shopping</button><button id="checkoutBtnInner" class="btn primary">Checkout (PayPal)</button></div>`;
    const itemsEl = $('#cartItems');
    itemsEl.innerHTML = '';
    cart.items.forEach((it, idx) => {
      const p = findProduct(it.id) || { name: it.name, images: [] };
      const row = document.createElement('div'); row.className='cart-row';
      row.innerHTML = `<div class="cart-thumb"><img src="${safeImage((p.images && p.images[0])||'')}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:6px"></div><div class="cart-info"><div class="cart-name">${p.name}${it.option? ' — ' + it.option : ''}</div><div class="cart-price">${formatCurrency(p.price || it.price || 0)} × ${it.qty}</div></div><div class="cart-actions"><input type="number" min="1" value="${it.qty}" class="cart-qty" data-idx="${idx}" style="width:64px;padding:6px;border-radius:6px;border:1px solid #ddd"><button class="btn small remove" data-idx="${idx}">Remove</button></div>`;
      itemsEl.appendChild(row);
    });
    $all('.cart-qty').forEach(i=> i.addEventListener('change', (e)=> updateCartItem(Number(e.target.dataset.idx), Number(e.target.value))));
    $all('.remove').forEach(b=> b.addEventListener('click', e => removeFromCart(Number(e.target.dataset.idx))));
    const totals = calcTotal();
    $('#cartSubtotal') && ($('#cartSubtotal').textContent = formatCurrency(totals.subtotal));
    $('#cartShipping') && ($('#cartShipping').textContent = formatCurrency(totals.shipping));
    $('#cartTotal') && ($('#cartTotal').textContent = formatCurrency(totals.total));
    $('#cartClose')?.addEventListener('click', ()=> toggleCartPanel());
    $('#checkoutBtnInner')?.addEventListener('click', async ()=> { try{ await startCheckout(); } catch(e){ showModalError('Checkout failed.'); } });
  }
  function calcSubtotal(){ return cart.items.reduce((s,it)=> s + (it.price || findProduct(it.id)?.price || 0) * it.qty, 0); }
  function calcShipping(subtotal){ if(subtotal >= FREE_SHIPPING_THRESHOLD) return 0; return SHIPPING_DEFAULT; }
  function calcTotal(){ const subtotal = calcSubtotal(); const shipping = calcShipping(subtotal); return { subtotal, shipping, total: subtotal + shipping }; }
  function toggleCartPanel(){ const p = $('#cartPanel'); if(!p) return; p.classList.toggle('hidden'); }

  /* ---------- Wishlist ---------- */
  function toggleWishlist(productId){
    const idx = wishlist.indexOf(productId);
    if(idx === -1) wishlist.push(productId); else wishlist.splice(idx,1);
    saveWishlist(); showMiniToast('Wishlist updated');
  }

  /* ---------- Checkout (calls server endpoints) ---------- */
  async function startCheckout(cartToSend = null){
    const items = (cartToSend && cartToSend.items) ? cartToSend.items : cart.items;
    if(!items || items.length===0){ showModalError('Cart is empty'); return; }
    const payload = { items: items.map(it=>({ id: it.id, name: it.name || findProduct(it.id)?.name, quantity: it.qty, unit_amount: { currency_code: 'USD', value: Number(it.price||findProduct(it.id)?.price||0).toFixed(2) } })), shipping: calcShipping(calcSubtotal()) };
    try{
      const resp = await fetch('/api/create-order', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ cart: payload }) });
      if(!resp.ok) { const t=await resp.text(); throw new Error('Create order failed: ' + t); }
      const data = await resp.json();
      if(!data.approveUrl || !data.orderID) throw new Error('Invalid create-order response');
      const popup = window.open(data.approveUrl, 'paypal_approval', 'width=900,height=700');
      if(!popup) { showModalError('Popup blocked. Please allow popups.'); return; }
      const poll = setInterval(async ()=>{
        if(popup.closed){
          clearInterval(poll);
          try{
            const cap = await fetch('/api/capture-order', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ orderID: data.orderID })});
            const capData = await cap.json();
            if(cap.ok || (capData && (capData.status === 'COMPLETED' || capData.status === 'APPROVED' || capData.status === 'captured'))){
              handleOrderSuccess(capData);
            } else {
              showModalError((capData && capData.message) ? capData.message : 'Payment not completed.');
            }
          } catch(err){ showModalError('Capture failed.'); }
        }
      }, 700);
    } catch(err){
      console.error(err);
      showModalError('Checkout error. Please try again.');
    }
  }

  function handleOrderSuccess(details){
    const modal = $('#orderModal') || createOrderModal();
    $('#orderModalTitle') && ($('#orderModalTitle').textContent = 'Thank you — order confirmed!');
    $('#orderSummaryText') && ($('#orderSummaryText').textContent = 'We have received your payment. Your order will be prepared and shipped soon.');
    $('#orderDetails') && ($('#orderDetails').innerHTML = `<p><strong>Order ID:</strong> ${details.id || details.orderID || '—'}</p><pre style="white-space:pre-wrap">${JSON.stringify(details, null, 2)}</pre>`);
    showModal('orderModal');
    cart = { items: [] }; saveCart(); renderCartPanel();
  }

  /* ---------- UI helpers ---------- */
  function showModal(idOrEl){
    const modal = (typeof idOrEl === 'string') ? document.getElementById(idOrEl) : idOrEl;
    if(!modal) return;
    modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false');
    modal.querySelectorAll('.modal-close, .modal-backdrop, #orderModalDone').forEach(el=> el.addEventListener('click', ()=> hideModal(modal)));
  }
  function hideModal(modal){ if(typeof modal === 'string') modal=document.getElementById(modal); if(!modal) return; modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); }
  function createOrderModal(){ const div = document.createElement('div'); div.id='orderModal'; div.className='modal hidden'; div.innerHTML = `<div class="modal-backdrop"></div><div class="modal-card"><button id="orderModalClose" class="modal-close">✕</button><h2 id="orderModalTitle">Order received</h2><div id="orderModalDesc"><p id="orderSummaryText"></p><div id="orderDetails"></div></div><footer><button id="orderModalDone" class="btn primary">Done</button></footer></div>`; document.body.appendChild(div); return div; }
  function showModalError(msg){
    const modal = document.getElementById('modal') || createGenericModal();
    const content = document.getElementById('modalContent');
    if(content) content.innerHTML = `<h3>Error</h3><p>${escapeHtml(msg)}</p><div style="text-align:right;margin-top:12px"><button id="closeModalBtn" class="btn">Close</button></div>`;
    showModal(modal);
    $('#closeModalBtn')?.addEventListener('click', ()=> hideModal(modal));
  }
  function createGenericModal(){ const d = document.createElement('div'); d.id='modal'; d.className='modal hidden'; d.innerHTML = `<div class="modal-backdrop"></div><div class="modal-card"><button class="modal-close">✕</button><div id="modalContent"></div></div>`; document.body.appendChild(d); return d; }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function showMiniToast(msg, t=2000){ const el = document.createElement('div'); el.className='mini-toast'; el.textContent = msg; document.body.appendChild(el); setTimeout(()=> el.classList.add('visible'), 20); setTimeout(()=>{ el.classList.remove('visible'); setTimeout(()=> el.remove(),300); }, t); }

  /* ---------- Theme & Language ---------- */
  function applySavedTheme(){ const t = localStorage.getItem(THEME_KEY); if(t === 'dark') document.body.classList.add('dark'); else document.body.classList.remove('dark'); }
  function toggleTheme(){ document.body.classList.toggle('dark'); localStorage.setItem(THEME_KEY, document.body.classList.contains('dark') ? 'dark' : 'light'); }
  function applyLanguage(lang){
    if(!window.TRANSLATIONS) return;
    if(!['en','fr','it','ro'].includes(lang)) lang='en';
    ACTIVE_LANG = lang; localStorage.setItem(LANG_KEY, lang);
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.dataset.i18n;
      const text = (window.TRANSLATIONS[lang] && window.TRANSLATIONS[lang].ui && window.TRANSLATIONS[lang].ui[key]) ? window.TRANSLATIONS[lang].ui[key] : el.textContent;
      el.textContent = text;
    });
  }

  /* ---------- Snow & floating decor ---------- */
  function createSnow(){
    const container = document.getElementById('snow'); if(!container) return;
    for(let i=0;i<36;i++){
      const f = document.createElement('div'); f.className='flake';
      const size = 3 + Math.random()*8;
      f.style.position='absolute';
      f.style.left = (Math.random()*100) + '%';
      f.style.top = (-10 - Math.random()*30) + 'px';
      f.style.width = size + 'px'; f.style.height = size + 'px';
      f.style.background = 'white'; f.style.opacity = (0.25 + Math.random()*0.6).toString();
      f.style.borderRadius = '50%';
      f.style.pointerEvents = 'none';
      f.style.animation = `fall ${8 + Math.random()*12}s linear infinite`;
      container.appendChild(f);
    }
    const style = document.createElement('style'); style.innerHTML = `@keyframes fall { to { transform: translateY(120vh); } }`; document.head.appendChild(style);
  }

  /* ---------- Init ---------- */
  async function appInit(){
    try{ await loadCatalogue(); } catch(e){ console.error(e); }
    loadCart(); loadWishlist();
    renderCartCount(); renderWishlistCount();
    renderFeatured();
    applySavedTheme();
    applyLanguage(localStorage.getItem(LANG_KEY) || detectLang());
    $all('.menu-toggle').forEach(b=> b.addEventListener('click', ()=> document.querySelector('.main-nav')?.classList.toggle('active')));
    $('#themeToggle')?.addEventListener('click', toggleTheme);
    const langSel = $('#langSelect');
    if(langSel){ langSel.value = localStorage.getItem(LANG_KEY) || ACTIVE_LANG; langSel.addEventListener('change', ()=> applyLanguage(langSel.value)); }
    $all('#cartBtn, #cartBtnTop').forEach(b=> b.addEventListener('click', ()=> toggleCartPanel()));
    $all('#favoritesBtn, #favoritesBtnTop').forEach(b=> b.addEventListener('click', ()=> showMiniToast('Wishlist is under development')));
    const news = document.getElementById('newsletterForm'); if(news) news.addEventListener('submit', ()=> showMiniToast('Subscribed — thank you!'));
    createSnow();
    renderCartPanel();
    $('#searchBtn')?.addEventListener('click', ()=> { const q = $('#searchInput')?.value || ''; window.location.href = `catalogue.html?search=${encodeURIComponent(q)}`; });
  }

  /* ---------- export ---------- */
  window.appInit = appInit;
  window.renderCataloguePage = renderCataloguePage;
  window.renderProductPage = renderProductPage;
  document.addEventListener('DOMContentLoaded', ()=> { if(window.appInit) window.appInit(); });

  return { addToCart, startCheckout };
})();
