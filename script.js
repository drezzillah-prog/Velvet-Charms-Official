/* ---------- Velvet Charms - script.js ---------- */
/* Multi-page shared script: catalogue rendering, modal/details, cart, wishlist, personalization uploads
   Assumptions:
   - catalogue.json is in the site root (same folder)
   - image filenames in catalogue.json are exactly the files you uploaded to GitHub / site root
   - PayPal links are per-product as provided in catalogue.json
*/

/* APP namespace to avoid polluting global scope */
window.APP = (function () {
  const state = {
    catalogue: null,
    cart: [],         // {productId, qty, personalization:{text, files (data urls)}} - multiple entries allowed
    wishlist: [],     // productId[]
  };

  /* --- Utilities --- */
  function $(sel){ return document.querySelector(sel); }
  function $all(sel){ return Array.from(document.querySelectorAll(sel)); }
  function safeEncodeURI(name){ try { return encodeURI(name); } catch(e){ return name; } }
  function getImagePath(filename){
    if(!filename) return 'epoxy_decorative_tray_1.png';
    return safeEncodeURI(filename);
  }

  /* --- Storage (localStorage) --- */
  function loadStorage(){
    try{
      const savedCart = JSON.parse(localStorage.getItem('vc_cart')||'[]');
      const savedWishlist = JSON.parse(localStorage.getItem('vc_wishlist')||'[]');
      state.cart = Array.isArray(savedCart)? savedCart : [];
      state.wishlist = Array.isArray(savedWishlist)? savedWishlist : [];
    }catch(e){
      state.cart = [];
      state.wishlist = [];
    }
  }
  function saveStorage(){
    localStorage.setItem('vc_cart', JSON.stringify(state.cart));
    localStorage.setItem('vc_wishlist', JSON.stringify(state.wishlist));
    updateCounters();
  }

  /* --- Counters --- */
  function updateCounters(){
    const cartCount = state.cart.reduce((s,it)=> s + (it.qty||1), 0);
    const favCount = state.wishlist.length;
    document.getElementById('cart-count') && (document.getElementById('cart-count').textContent = cartCount);
    document.getElementById('fav-count') && (document.getElementById('fav-count').textContent = favCount);
    document.getElementById('cart-count-2') && (document.getElementById('cart-count-2').textContent = cartCount);
    document.getElementById('fav-count-2') && (document.getElementById('fav-count-2').textContent = favCount);
  }

  /* --- Load catalogue.json --- */
  function loadCatalogue(){
    return fetch('catalogue.json').then(r=>{
      if(!r.ok) throw new Error('catalogue.json missing or not reachable');
      return r.json();
    }).then(json=>{
      state.catalogue = json;
      return json;
    });
  }

  /* --- Helpers to find a product by id --- */
  function findProductById(pid){
    if(!state.catalogue) return null;
    for(const cat of state.catalogue.categories || []){
      if(cat.products){
        const p = (cat.products || []).find(x=>x.id === pid);
        if(p) return p;
      }
      if(cat.subcategories){
        for(const sub of cat.subcategories){
          if(sub.products){
            const p = (sub.products || []).find(x=>x.id === pid);
            if(p) return p;
          }
        }
      }
    }
    return null;
  }

  /* --- Render catalogue and filters --- */
  function renderCategoryFilters(){
    const wrap = document.getElementById('category-filters');
    if(!wrap || !state.catalogue) return;
    wrap.innerHTML = '';
    state.catalogue.categories.forEach(cat=>{
      const btn = document.createElement('button');
      btn.className = 'btn secondary';
      btn.textContent = cat.name;
      btn.onclick = ()=> {
        renderCatalogue({ filterCategoryId: cat.id });
        // scroll to product grid
        setTimeout(()=>{ document.getElementById('catalogue-grid') && document.getElementById('catalogue-grid').scrollIntoView({behavior:'smooth'}); },50);
      };
      wrap.appendChild(btn);
    });

    document.getElementById('filter-all') && (document.getElementById('filter-all').onclick = ()=> renderCatalogue());
  }

  function buildProductCard(product, catName, subName){
    const el = document.createElement('div');
    el.className = 'product';
    const img = document.createElement('img');
    img.alt = product.name;
    img.src = product.images && product.images[0] ? getImagePath(product.images[0]) : 'epoxy_decorative_tray_1.png';
    img.onerror = function(){ this.src = 'epoxy_decorative_tray_1.png'; };
    el.appendChild(img);

    const title = document.createElement('h4'); title.textContent = product.name;
    el.appendChild(title);

    const desc = document.createElement('div'); desc.style.fontSize='13px'; desc.style.color='#666'; desc.textContent = product.description || (catName || '') + (subName ? ' — ' + subName : '');
    el.appendChild(desc);

    const price = document.createElement('div'); price.className='price'; price.textContent = formatPrice(product.price);
    el.appendChild(price);

    const controls = document.createElement('div'); controls.style.display='flex'; controls.style.gap='8px'; controls.style.marginTop='auto';
    const detailsBtn = document.createElement('button'); detailsBtn.className='btn secondary'; detailsBtn.textContent='Details';
    detailsBtn.onclick = ()=> openProductModal(product);
    controls.appendChild(detailsBtn);

    const buyBtn = document.createElement('button'); buyBtn.className='btn'; buyBtn.textContent='Buy';
    buyBtn.onclick = ()=> {
      openProductModal(product, { focusOnBuy:true });
    };
    controls.appendChild(buyBtn);

    const heartBtn = document.createElement('button'); heartBtn.className='heart'; heartBtn.innerHTML = '❤';
    heartBtn.onclick = ()=>{
      toggleWishlist(product.id);
      heartBtn.style.opacity = state.wishlist.includes(product.id) ? '1' : '0.4';
    };
    controls.appendChild(heartBtn);

    el.appendChild(controls);

    return el;
  }

  function formatPrice(v){
    const cur = (state.catalogue && state.catalogue.siteInfo && state.catalogue.siteInfo.currency) || 'USD';
    return (v != null) ? (cur + ' ' + Number(v).toFixed(2)) : '';
  }

  function renderCatalogue(opts){
    opts = opts || {};
    const grid = document.getElementById('catalogue-grid');
    if(!grid) return;
    grid.innerHTML = '';
    if(!state.catalogue){
      grid.innerHTML = '<div style="padding:18px;color:#a00">Catalogue not loaded.</div>';
      return;
    }

    const q = (document.getElementById('catalogue-search') && document.getElementById('catalogue-search').value || '').toLowerCase();

    const targetCatId = opts.filterCategoryId || null;
    // Flatten products with category info
    const items = [];
    state.catalogue.categories.forEach(cat=>{
      if(cat.products){
        cat.products.forEach(p=> items.push({product:p, catName:cat.name, subName:null, catId:cat.id}));
      }
      if(cat.subcategories){
        cat.subcategories.forEach(sub=>{
          (sub.products || []).forEach(p=> items.push({product:p, catName:cat.name, subName:sub.name, catId:cat.id}));
        });
      }
    });

    let filtered = items;
    if(targetCatId){
      filtered = filtered.filter(it=> it.catId === targetCatId);
    }
    if(q){
      filtered = filtered.filter(it=>{
        const t = (it.product.name || '') + ' ' + (it.product.description || '') + ' ' + (it.catName || '') + ' ' + (it.subName || '');
        return t.toLowerCase().includes(q);
      });
    }

    if(filtered.length === 0){
      grid.innerHTML = '<div style="padding:18px;color:#666">No products found.</div>';
      return;
    }

    filtered.forEach(item=>{
      const card = buildProductCard(item.product, item.catName, item.subName);
      grid.appendChild(card);
    });

    // open category if hash present
    if(location.hash){
      const catId = decodeURIComponent(location.hash.slice(1));
      if(catId){
        // scroll to first product of that category (simple approach: re-render with filter)
        // Note: developers wanted linking to categories; we already handle filterCategoryId
      }
    }
  }

  /* --- Product Modal (details + personalization form) --- */
  function openProductModal(product, opts){
    opts = opts || {};
    // create modal DOM
    const root = document.getElementById('modal-root');
    root.innerHTML = '';
    root.classList.remove('hide');

    const backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop';
    const modal = document.createElement('div'); modal.className = 'modal';

    // left: gallery
    const left = document.createElement('div'); left.className = 'gallery';
    const mainImg = document.createElement('img'); mainImg.src = product.images && product.images[0] ? getImagePath(product.images[0]) : 'epoxy_decorative_tray_1.png';
    mainImg.onerror = function(){ this.src='epoxy_decorative_tray_1.png'; };
    left.appendChild(mainImg);

    const thumbs = document.createElement('div'); thumbs.style.display='flex'; thumbs.style.gap='8px'; thumbs.style.marginTop='8px'; thumbs.style.flexWrap='wrap';
    (product.images || []).forEach(fn=>{
      const t = document.createElement('img');
      t.src = getImagePath(fn);
      t.style.width = '64px'; t.style.height='64px'; t.style.objectFit='cover'; t.style.borderRadius='8px'; t.style.cursor='pointer';
      t.onerror = function(){ this.src='epoxy_decorative_tray_1.png'; };
      t.onclick = ()=> mainImg.src = getImagePath(fn);
      thumbs.appendChild(t);
    });
    left.appendChild(thumbs);

    // right: details + personalization form
    const right = document.createElement('div');

    const title = document.createElement('h3'); title.textContent = product.name;
    right.appendChild(title);
    const price = document.createElement('div'); price.className='price'; price.textContent = formatPrice(product.price);
    right.appendChild(price);

    if(product.description){
      const desc = document.createElement('p'); desc.style.marginTop='8px'; desc.style.color='#666'; desc.textContent = product.description;
      right.appendChild(desc);
    }

    // Options (if any)
    if(product.options){
      Object.keys(product.options).forEach(optKey=>{
        const optWrap = document.createElement('div'); optWrap.className='option';
        const label = document.createElement('label'); label.textContent = optKey + ':';
        const select = document.createElement('select'); select.name = 'option_' + optKey;
        product.options[optKey].forEach(v=>{
          const o = document.createElement('option'); o.value = v; o.textContent = v;
          select.appendChild(o);
        });
        optWrap.appendChild(label);
        optWrap.appendChild(select);
        right.appendChild(optWrap);
      });
    }

    // Personalization form
    const form = document.createElement('form'); form.id = 'personalize-form';
    form.style.display = 'grid'; form.style.gap = '8px'; form.style.marginTop = '10px';

    const noteLabel = document.createElement('label'); noteLabel.textContent = 'Personalization notes';
    const notes = document.createElement('textarea'); notes.name = 'personal_notes'; notes.placeholder = 'Tell us what to change, add references, sizes, colors...'; notes.rows = 4; notes.style.padding='8px';
    form.appendChild(noteLabel); form.appendChild(notes);

    const uploadLabel = document.createElement('label'); uploadLabel.textContent = 'Upload reference images (multiple allowed)';
    const upload = document.createElement('input'); upload.type = 'file'; upload.accept = 'image/*'; upload.multiple = true; upload.name = 'personal_images';
    upload.style.padding='6px';
    form.appendChild(uploadLabel); form.appendChild(upload);

    // Add to cart button (saves personalization) and quick Pay button
    const btns = document.createElement('div'); btns.style.display='flex'; btns.style.gap='8px'; btns.style.marginTop='8px';
    const addToCartBtn = document.createElement('button'); addToCartBtn.type='button'; addToCartBtn.className='btn'; addToCartBtn.textContent='Add to cart';
    const payNowBtn = document.createElement('button'); payNowBtn.type='button'; payNowBtn.className='btn secondary'; payNowBtn.textContent='Pay now';

    btns.appendChild(addToCartBtn);
    btns.appendChild(payNowBtn);
    form.appendChild(btns);

    // Close button
    const closeBtn = document.createElement('button'); closeBtn.type='button'; closeBtn.className='btn secondary'; closeBtn.textContent='Close';
    closeBtn.style.marginTop='8px';
    form.appendChild(closeBtn);

    right.appendChild(form);

    modal.appendChild(left);
    modal.appendChild(right);
    backdrop.appendChild(modal);
    root.appendChild(backdrop);

    // Handlers
    closeBtn.onclick = ()=> { root.classList.add('hide'); root.innerHTML=''; };
    backdrop.onclick = (e)=> { if(e.target === backdrop) { root.classList.add('hide'); root.innerHTML=''; } };

    function readFilesAsDataUrls(files){
      return Promise.all(Array.from(files || []).map(f=>{
        return new Promise((res,rej)=>{
          const fr = new FileReader();
          fr.onload = ()=> res({name:f.name, data: fr.result});
          fr.onerror = ()=> rej();
          fr.readAsDataURL(f);
        });
      }));
    }

    addToCartBtn.onclick = async ()=>{
      addToCartBtn.disabled = true;
      const uploaded = upload.files && upload.files.length ? await readFilesAsDataUrls(upload.files) : [];
      // Generate cart entry
      const cartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        qty: 1,
        paymentLink: product.paymentLink || '',
        personalization: {
          notes: notes.value || '',
          images: uploaded
        }
      };
      state.cart.push(cartItem);
      saveStorage();
      addToCartBtn.disabled = false;
      alert('Added to cart. Open the cart (🛒) top-right to review and pay.');
      root.classList.add('hide'); root.innerHTML='';
      renderCartDrawer(); // refresh
    };

    payNowBtn.onclick = async ()=>{
      // If they included personalization, save first then open paypal
      payNowBtn.disabled = true;
      const uploaded = upload.files && upload.files.length ? await readFilesAsDataUrls(upload.files) : [];
      // Save as single entry temporarily to local storage so artists have the info
      const tmpItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        qty: 1,
        paymentLink: product.paymentLink || '',
        personalization: { notes: notes.value || '', images: uploaded }
      };
      state.cart.push(tmpItem);
      saveStorage();
      renderCartDrawer();
      // open paymentLink in new tab
      if(product.paymentLink){
        window.open(product.paymentLink, '_blank');
        alert((state.catalogue && state.catalogue.siteInfo && state.catalogue.siteInfo.postPurchaseMessage) || 'Payment opened. Thank you.');
      } else {
        alert('No payment link set for this product.');
      }
      root.classList.add('hide'); root.innerHTML='';
      payNowBtn.disabled = false;
    };
  }

  /* --- Wishlist toggle --- */
  function toggleWishlist(pid){
    const idx = state.wishlist.indexOf(pid);
    if(idx === -1) state.wishlist.push(pid);
    else state.wishlist.splice(idx,1);
    saveStorage();
  }

  /* --- Cart Drawer (render) --- */
  function renderCartDrawer(){
    const root = document.getElementById('drawer-root');
    root.classList.remove('hide');
    root.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'drawer';

    const title = document.createElement('h3'); title.textContent = 'Your Cart';
    wrapper.appendChild(title);

    if(state.cart.length === 0){
      const p = document.createElement('div'); p.style.padding='8px 0'; p.textContent = 'Cart is empty';
      wrapper.appendChild(p);
      const close = document.createElement('button'); close.className='btn secondary'; close.textContent='Close';
      close.onclick = ()=> { root.classList.add('hide'); root.innerHTML=''; };
      wrapper.appendChild(close);
      root.appendChild(wrapper);
      return;
    }

    state.cart.forEach((it, idx)=>{
      const item = document.createElement('div'); item.style.borderBottom='1px solid #f1f1f1'; item.style.padding='10px 0';
      const h = document.createElement('div'); h.style.display='flex'; h.style.justifyContent='space-between';
      const name = document.createElement('div'); name.textContent = it.name;
      const price = document.createElement('div'); price.textContent = formatPrice(it.price);
      h.appendChild(name); h.appendChild(price);
      item.appendChild(h);

      if(it.personalization && (it.personalization.notes || (it.personalization.images && it.personalization.images.length))){
        const pers = document.createElement('div'); pers.style.fontSize='13px'; pers.style.color='#666';
        pers.textContent = 'Personalization: ' + (it.personalization.notes ? it.personalization.notes.slice(0,80) : '') + (it.personalization.images && it.personalization.images.length ? ' (images attached)' : '');
        item.appendChild(pers);
      }

      const actions = document.createElement('div'); actions.style.display='flex'; actions.style.gap='8px'; actions.style.marginTop='8px';
      const payBtn = document.createElement('button'); payBtn.className='btn'; payBtn.textContent='Pay';
      payBtn.onclick = ()=>{
        if(it.paymentLink) window.open(it.paymentLink, '_blank');
        else alert('No payment link for this item.');
      };
      const removeBtn = document.createElement('button'); removeBtn.className='btn secondary'; removeBtn.textContent='Remove';
      removeBtn.onclick = ()=>{
        state.cart.splice(idx,1); saveStorage(); renderCartDrawer();
      };
      actions.appendChild(payBtn); actions.appendChild(removeBtn);
      item.appendChild(actions);

      wrapper.appendChild(item);
    });

    const notes = document.createElement('div'); notes.style.marginTop='12px'; notes.style.fontSize='13px'; notes.style.color='#666';
    notes.textContent = 'Tip: You can add items with personalization to the cart; pay each item to complete the order. Our email will receive personalization details so we can craft your order.';
    wrapper.appendChild(notes);

    const clearAll = document.createElement('button'); clearAll.className='btn secondary'; clearAll.textContent='Clear cart';
    clearAll.style.marginTop='12px';
    clearAll.onclick = ()=> { if(confirm('Clear cart?')) { state.cart = []; saveStorage(); renderCartDrawer(); } };
    wrapper.appendChild(clearAll);

    const close = document.createElement('button'); close.className='btn'; close.textContent='Close';
    close.style.marginTop='12px'; close.onclick = ()=> { root.classList.add('hide'); root.innerHTML=''; };
    wrapper.appendChild(close);

    root.appendChild(wrapper);
  }

  /* --- Init / restore --- */
  function restoreCartAndWishlist(){
    loadStorage();
    updateCounters();
  }

  /* --- Init catalogue page (catalogue.html) --- */
  function initCatalogue(){
    loadCatalogue().then(()=>{
      renderCategoryFilters();
      renderCatalogue();
      // search
      const search = document.getElementById('catalogue-search');
      if(search){ search.addEventListener('input', ()=> renderCatalogue()); }
      // set up top buttons
      const favButtons = document.querySelectorAll('#favorites-btn, #favorites-btn-2, #fav-top');
      favButtons.forEach(b=> b && (b.onclick = ()=> {
        // show wishlist
        const root = document.getElementById('drawer-root'); root.classList.remove('hide'); root.innerHTML='';
        const wrapper = document.createElement('div'); wrapper.className='drawer';
        wrapper.appendChild(Object.assign(document.createElement('h3'), { textContent: 'Wishlist' }));
        if(state.wishlist.length === 0) wrapper.appendChild(Object.assign(document.createElement('div'), { textContent: 'No favorites yet.' }));
        state.wishlist.forEach(pid=>{
          const p = findProductById(pid);
          const row = document.createElement('div'); row.style.display='flex'; row.style.gap='8px'; row.style.alignItems='center'; row.style.marginTop='8px';
          const img = document.createElement('img'); img.src = p && p.images && p.images[0] ? getImagePath(p.images[0]) : 'epoxy_decorative_tray_1.png';
          img.style.width='56px'; img.style.height='56px'; img.style.objectFit='cover'; img.style.borderRadius='8px';
          const txt = document.createElement('div'); txt.style.flex='1'; txt.innerHTML = '<strong>' + (p ? p.name : pid) + '</strong><br>' + (p ? formatPrice(p.price) : '');
          const add = document.createElement('button'); add.className='btn'; add.textContent='Add to cart';
          add.onclick = ()=> { if(p){ state.cart.push({ id:p.id, name:p.name, price:p.price, qty:1, paymentLink:p.paymentLink||'', personalization:{notes:'', images:[]} }); saveStorage(); renderCartDrawer(); } };
          const rm = document.createElement('button'); rm.className='btn secondary'; rm.textContent='Remove';
          rm.onclick = ()=> { const idx = state.wishlist.indexOf(pid); if(idx>-1) state.wishlist.splice(idx,1); saveStorage(); initCatalogue(); };
          row.appendChild(img); row.appendChild(txt); row.appendChild(add); row.appendChild(rm);
          wrapper.appendChild(row);
        });
        const close = document.createElement('button'); close.className='btn'; close.textContent='Close'; close.style.marginTop='10px'; close.onclick = ()=> root.classList.add('hide');
        wrapper.appendChild(close);
        root.appendChild(wrapper);
      }) );

      const cartBtns = document.querySelectorAll('#cart-btn, #cart-btn-2, #cart-top');
      cartBtns.forEach(b=> b && (b.onclick = ()=> renderCartDrawer()));

    }).catch(err=>{
      console.error('Failed to load catalogue:', err);
      document.getElementById('catalogue-grid') && (document.getElementById('catalogue-grid').innerHTML = '<div style="padding:18px;color:#a00">Error loading catalogue. Please ensure /catalogue.json exists and is valid in site root.</div>');
    });

    restoreCartAndWishlist();
  }

  /* --- Public API --- */
  return {
    initCatalogue: initCatalogue,
    openProductModal: openProductModal,
    renderCartDrawer: renderCartDrawer,
    restoreCartAndWishlist: restoreCartAndWishlist,
    state: state,
    loadCatalogue: loadCatalogue
  };
})();

/* --- Auto-run for pages that just need restore and catalogue loaded --- */
document.addEventListener('DOMContentLoaded', function () {
  // restore counters across pages
  if(window.APP && APP.restoreCartAndWishlist) APP.restoreCartAndWishlist();

  // If this is a catalogue page, APP.initCatalogue will be called by page-specific inline script.
  // If index.html, we already had a small script that calls fetch; but we can also prepare shared behavior here.
});
