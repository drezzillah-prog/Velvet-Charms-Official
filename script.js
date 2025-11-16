// script.js — client-side router + renderer
(async ()=> {
  const app = document.getElementById('app');
  const modal = document.getElementById('customModal');
  const closeModalBtn = document.getElementById('closeModal');
  const customForm = document.getElementById('customForm');
  const dynamicFields = document.getElementById('dynamicFields');
  const formProductId = document.getElementById('form_product_id');
  const formProductName = document.getElementById('form_product_name');

  // load products.json
  const resp = await fetch('products.json');
  if(!resp.ok){
    app.innerHTML = '<div class="hero"><h2>Shop</h2><p>Failed to load products. Make sure products.json exists in repo root.</p></div>';
    return;
  }
  const catalog = await resp.json();

  // simple region welcome (auto-detect)
  const region = (navigator.language || navigator.userLanguage || 'en').slice(0,2);
  const euroMsg = (region === 'fr' || region === 'de' || region === 'it' || region === 'ro') ? 'Prices shown in USD. PayPal will convert to local currency.' : 'Prices shown in USD.';
  
  // router: render based on hash
  function renderRoute(){
    const hash = location.hash || '#/home';
    // parse: #/category/subcategory/item
    const parts = hash.replace(/^#\//,'').split('/').filter(Boolean);
    if(parts.length === 0 || parts[0]==='home'){
      renderHome();
      return;
    }
    const [category, subcat, item] = parts;
    if(!item && !subcat){
      renderCategory(category);
      return;
    }
    if(category && subcat && !item){
      renderSubcategory(category, subcat);
      return;
    }
    if(category && subcat && item){
      renderItem(category, subcat, item);
      return;
    }
    renderHome();
  }

  // small helper: find cat/subcat/item
  function findCategory(id){ return catalog.categories.find(c=>c.id===id); }
  function findSubcategory(cat, id){ return cat?.subcategories?.find(s=>s.id===id); }
  function findItem(subcat, id){ return subcat?.items?.find(i=>i.id===id); }

  function renderHome(){
    document.title = 'Velvet Charms — Home';
    app.innerHTML = `
      <section class="hero">
        <div>
          <h2>Velvet Charms</h2>
          <p>${euroMsg} Handmade gifts — ready for preorder and custom work.</p>
          <button class="btn btn-primary" onclick="location.hash='#/candles'">Explore Candles</button>
        </div>
        <div style="max-width:420px;">
          <img src="${getImageOrPlaceholder('hero_craft.png')}" alt="Velvet Charms hero" style="width:100%;border-radius:12px">
        </div>
      </section>
      <section>
        <div class="section-title"><h3>Coming Soon — Preorder</h3></div>
        <div id="coming-grid" class="grid"></div>
      </section>
    `;
    // show first 8 coming-soon items (if exists)
    const coming = findCategory('coming-soon');
    const grid = document.getElementById('coming-grid');
    if(coming){
      const cards = [];
      coming.subcategories.forEach(s=>{
        s.items.forEach(it=>{
          cards.push(renderCard(it, s.title));
        });
      });
      grid.innerHTML = cards.join('');
    } else {
      grid.innerHTML = '<p class="small">No coming soon items found.</p>';
    }
  }

  function renderCategory(catId){
    const cat = findCategory(catId);
    if(!cat) { app.innerHTML = `<p>Category not found</p>`; return; }
    document.title = `Velvet Charms — ${cat.title}`;
    let html = `<div class="section-title"><h3>${cat.title}</h3></div>`;
    cat.subcategories.forEach(sub=>{
      html += `<h4 style="color:var(--gold)">${sub.title}</h4>`;
      html += `<div class="grid">`;
      sub.items.forEach(it=> html += renderCard(it, sub.title));
      html += `</div>`;
    });
    app.innerHTML = html;
  }

  function renderSubcategory(catId, subId){
    const cat = findCategory(catId);
    const sub = findSubcategory(cat, subId);
    if(!sub) { app.innerHTML = `<p>Subcategory not found</p>`; return; }
    document.title = `Velvet Charms — ${sub.title}`;
    let html = `<div class="section-title"><h3>${sub.title}</h3></div>`;
    html += `<div class="grid">`;
    sub.items.forEach(it=> html += renderCard(it, sub.title));
    html += `</div>`;
    app.innerHTML = html;
  }

  function renderItem(catId, subId, itemId){
    const cat = findCategory(catId);
    const sub = findSubcategory(cat, subId);
    const item = findItem(sub, itemId);
    if(!item) { app.innerHTML = `<p>Item not found</p>`; return; }
    document.title = `Velvet Charms — ${item.name}`;
    const img = getImageOrPlaceholder(item.image);
    app.innerHTML = `
      <div class="product-detail">
        <div class="product-gallery">
          <img src="${img}" alt="${item.name}" />
        </div>
        <div class="product-meta">
          <h2>${item.name}</h2>
          <p class="small">${item.description || ''}</p>
          <div class="buy">
            <div class="price">USD ${item.price_usd.toFixed(2)}</div>
            <div class="small">SKU: ${item.sku} • Product ID: ${item.id}</div>
            <div style="margin-top:10px">
              <a class="btn btn-primary" href="${item.paypal}" target="_blank" rel="noopener">Buy — PayPal</a>
              <button class="btn btn-ghost" data-product='${JSON.stringify({id:item.id,name:item.name})}' onclick="openCustomize(this)">Customize this product</button>
            </div>
            <div class="small" style="margin-top:10px">Payment is required online before production begins. PayPal handles currency conversion for buyers.</div>
          </div>
        </div>
      </div>
    `;
  }

  // small product card markup
  function renderCard(item, tag){
    const img = getImageOrPlaceholder(item.image);
    const slugParts = guessSlug(item);
    const url = `#/` + slugParts.join('/');
    return `
      <div class="card">
        <img src="${img}" alt="${item.name}" />
        <h4>${item.name}</h4>
        <p class="small">${tag || ''}</p>
        <div class="price">USD ${item.price_usd.toFixed(2)}</div>
        <div class="actions">
          <a class="btn btn-ghost" href="${url}">View</a>
          <a class="btn btn-primary" href="${item.paypal}" target="_blank" rel="noopener">Buy</a>
        </div>
      </div>
    `;
  }

  // Helpers to build slug [category, subcategory, item]
  function guessSlug(item){
    // item.id uses pattern like "wax-small-150" or "spiritual-full-200" — we'll search catalog
    for(const cat of catalog.categories){
      for(const sub of cat.subcategories || []){
        for(const it of sub.items || []){
          if(it.id === item.id){
            return [cat.id, sub.id, it.id];
          }
        }
      }
    }
    return ['products', item.id, item.id];
  }

  function getImageOrPlaceholder(name){
    if(!name) return 'placeholder.png';
    // if file exists relative to server, browser will load it; otherwise placeholder
    return name;
  }

  // customize modal flow
  window.openCustomize = function(button){
    const data = JSON.parse(button.getAttribute('data-product'));
    openModalForProduct(data.id, data.name);
  }

  function openModalForProduct(id, name){
    // find item object for dynamic fields
    let itemObj = null;
    for(const cat of catalog.categories){
      for(const sub of cat.subcategories || []){
        const found = sub.items?.find(i=>i.id===id);
        if(found) itemObj = {cat:cat.id, sub:sub.id, item:found};
      }
    }
    if(!itemObj) return alert('Product not found');

    formProductId.value = itemObj.item.id;
    formProductName.value = itemObj.item.name;
    document.getElementById('modalTitle').textContent = `Customize — ${itemObj.item.name}`;

    // build dynamic fields depending on category
    dynamicFields.innerHTML = '';
    // common fields: size (if applicable), scent, color, intensity, additional elements, notes
    if(itemObj.cat === 'candles'){
      dynamicFields.innerHTML += fieldHTML('Desired scent', 'scent', 'e.g. myrrh, lavender, cinnamon');
      dynamicFields.innerHTML += fieldHTML('Scent intensity', 'scent_intensity', 'Low / Medium / High');
      dynamicFields.innerHTML += fieldHTML('Color (optional)', 'color', 'e.g. cream, soft pink');
      dynamicFields.innerHTML += checkboxHTML('Glitter', 'glitter');
      dynamicFields.innerHTML += fieldHTML('Additional elements (dried flowers, charms)', 'add_elements', 'list items or upload image');
    } else if(itemObj.cat === 'soaps'){
      dynamicFields.innerHTML += fieldHTML('Scent', 'scent', 'lavender, citrus, coffee');
      dynamicFields.innerHTML += fieldHTML('Color', 'color', 'optional');
      dynamicFields.innerHTML += fieldHTML('Allergies / skin notes', 'allergies', 'e.g. nut allergy');
    } else if(itemObj.cat === 'knitted'){
      dynamicFields.innerHTML += selectHTML('Size','size',['S','M','L','XL','Custom']);
      dynamicFields.innerHTML += fieldHTML('Color','color','e.g. moss green');
      dynamicFields.innerHTML += selectHTML('Yarn type','yarn',['Merino','Acrylic','Cotton','Blend']);
    } else {
      // generic
      dynamicFields.innerHTML += fieldHTML('Details', 'details', 'Tell us how you want it customized.');
      dynamicFields.innerHTML += fieldHTML('Additional elements','add_elements','dried flowers, charms, etc.');
    }

    modal.setAttribute('aria-hidden','false');
  }

  function fieldHTML(label, name, placeholder=''){
    return `<label>${label}<input type="text" name="${name}" placeholder="${placeholder}" /></label>`;
  }
  function checkboxHTML(label, name){
    return `<label class="checkbox-inline"><input type="checkbox" name="${name}" value="yes" /> ${label}</label>`;
  }
  function selectHTML(label, name, options=[]){
    return `<label>${label}<select name="${name}">${options.map(o=>`<option value="${o}">${o}</option>`).join('')}</select></label>`;
  }

  closeModalBtn.addEventListener('click', ()=> modal.setAttribute('aria-hidden','true'));

  // Simple hash change listener
  window.addEventListener('hashchange', renderRoute);
  // initial render
  renderRoute();

  // small cart demo (not a real checkout)
  window.addEventListener('click', e=>{
    if(e.target.matches('.btn-primary[href]')) {
      // clicking a buy link sends to paypal in new tab
    }
  });

  // small helper: show free shipping progress (example)
  const freeValueElem = document.getElementById('free-remaining');
  if(freeValueElem){
    freeValueElem.textContent = `€${catalog.meta.freeShippingEuropeEUR}`;
  }

})();
