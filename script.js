/* script.js - Velvet Charms Updated */
(async function(){
  const ROOT = document;
  const CATALOGUE_PATH = '/catalogue.json';
  let catalogue = null;
  const maxGallery = 10;

  async function loadCatalogue(){
    try {
      const r = await fetch(CATALOGUE_PATH + '?t=' + Date.now());
      if(!r.ok) throw new Error('Catalogue not found.');
      return await r.json();
    } catch(err) {
      console.error('Failed to load catalogue:', err);
      return null;
    }
  }

  function localeToCurrency(locale){
    if(!locale) locale = navigator.language || 'en-US';
    if(locale.startsWith('en-US') || locale.startsWith('en-')) return 'USD';
    if(locale.startsWith('fr') || locale.startsWith('de') || locale.startsWith('es') || locale.startsWith('it')) return 'EUR';
    if(locale.startsWith('ro')) return 'RON';
    return 'USD';
  }

  function formatPrice(amount, currency){
    try {
      return new Intl.NumberFormat(undefined,{style:'currency',currency}).format(amount);
    } catch(e){ return `${amount} ${currency}`; }
  }

  const el = {
    headerMenu: document.querySelector('#main-menu'),
    mainContent: document.querySelector('#main-content'),
    catalogueSection: document.querySelector('#catalogue'),
    aboutSection: document.querySelector('#about-us'),
    contactForm: document.querySelector('#contact-form'),
    modal: document.querySelector('#product-modal'),
    modalContent: document.querySelector('#product-modal .modal-body'),
    modalTitle: document.querySelector('#product-modal .modal-title'),
    themeToggle: document.querySelector('#christmas-toggle')
  };

  function renderSite(siteInfo){
    if(!siteInfo) return;
    document.title = siteInfo.name + ' — ' + (siteInfo.tagline || '');
    const brand = document.querySelector('#brand-name');
    const tagline = document.querySelector('#brand-tagline');
    if(brand) brand.textContent = siteInfo.name + ' ❄️';
    if(tagline) tagline.textContent = siteInfo.tagline || '';
    const aboutTitle = document.querySelector('#about-title');
    const aboutText = document.querySelector('#about-text');
    if(aboutTitle) aboutTitle.textContent = (siteInfo.about?.title || 'About');
    if(aboutText) aboutText.innerHTML = (siteInfo.about?.text || '');
  }

  function buildMenu(categories){
    const menu = document.querySelector('#catalogue-menu');
    if(!menu) return;
    menu.innerHTML = '';
    categories.forEach(cat => {
      const li = document.createElement('li');
      li.className = 'menu-item';
      li.innerHTML = `<button class="menu-btn" data-cat="${cat.id}">${cat.name}</button>`;
      menu.appendChild(li);
    });
    document.querySelectorAll('.menu-btn').forEach(b => {
      b.addEventListener('click', () => renderCategory(b.dataset.cat));
    });
  }

  function renderCategory(catId){
    const cat = catalogue.categories.find(c => c.id === catId);
    if(!cat) return showError('Category not found.');
    const cWrap = document.querySelector('#catalogue .content-inner');
    cWrap.innerHTML = `<h2>${cat.name}</h2>`;
    if(cat.banner) cWrap.innerHTML += `<div class="category-banner"><img alt="${cat.name} banner" src="${cat.banner}" loading="lazy"></div>`;

    if(cat.subcategories?.length){
      cat.subcategories.forEach(sub => {
        const section = document.createElement('section');
        section.className = 'subcat';
        section.innerHTML = `<h3>${sub.name}</h3><div class="product-grid" id="grid-${sub.id}"></div>`;
        cWrap.appendChild(section);
        const grid = section.querySelector(`#grid-${sub.id}`);
        (sub.products||[]).forEach(p => grid.appendChild(buildProductCard(p, sub.name, cat.id)));
      });
    } else if(cat.products?.length){
      const grid = document.createElement('div'); grid.className='product-grid';
      cat.products.forEach(p => grid.appendChild(buildProductCard(p, cat.name, cat.id)));
      cWrap.appendChild(grid);
    }
    window.location.hash = '#catalogue';
  }

  function buildProductCard(p, subname, catid){
    const card = document.createElement('article');
    card.className = 'product-card';
    const img = (p.images?.length)? p.images[0] : 'placeholder.png';
    const price = p.price || 0;
    card.innerHTML = `
      <div class="pc-image"><img src="${img}" alt="${p.name}" loading="lazy"></div>
      <div class="pc-body">
        <h4>${p.name}</h4>
        <div class="pc-price" data-price="${price}">${formatPrice(price, catalogue.siteInfo.defaultCurrency)}</div>
        <p class="pc-desc">${p.description||''}</p>
        <div class="pc-actions">
          <button class="btn view-btn" data-id="${p.id}">Details</button>
          ${p.paymentLink?`<a class="btn buy-btn" target="_blank" rel="noopener" href="${p.paymentLink}">Buy</a>`:`<button class="btn buy-btn disabled" disabled>No PayPal</button>`}
        </div>
      </div>
    `;
    card.querySelector('.view-btn').addEventListener('click', ()=>openProductModal(p));
    return card;
  }

  function openProductModal(prod){
    el.modalTitle.textContent = prod.name;
    const body = el.modalContent;
    body.innerHTML = '';

    // Gallery
    const galleryWrap = document.createElement('div'); galleryWrap.className='modal-gallery';
    const mainImg = document.createElement('img'); mainImg.className='main-gallery-img';
    mainImg.src = prod.images?.[0] || 'placeholder.png';
    mainImg.alt = prod.name;
    galleryWrap.appendChild(mainImg);
    const thumbs = document.createElement('div'); thumbs.className='thumbs';
    (prod.images||[]).slice(0,maxGallery).forEach((src,idx)=>{
      const t = document.createElement('img'); t.className='thumb'; t.src=src; t.alt=`${prod.name} ${idx+1}`;
      t.addEventListener('click',()=> mainImg.src=src);
      thumbs.appendChild(t);
    });
    galleryWrap.appendChild(thumbs);
    body.appendChild(galleryWrap);

    const priceDiv = document.createElement('div'); priceDiv.className='modal-price';
    priceDiv.innerText = formatPrice(prod.price||0, catalogue.siteInfo.defaultCurrency);
    body.appendChild(priceDiv);

    if(prod.options){
      const opts = document.createElement('div'); opts.className='modal-options';
      Object.entries(prod.options).forEach(([k,v])=>{
        const group = document.createElement('div'); group.className='opt-group';
        const label = document.createElement('label'); label.innerText=k.charAt(0).toUpperCase()+k.slice(1);
        const sel = document.createElement('select'); sel.name=k;
        v.forEach(o=>{ const option=document.createElement('option'); option.value=o; option.innerText=o; sel.appendChild(option); });
        group.appendChild(label); group.appendChild(sel); opts.appendChild(group);
      });
      body.appendChild(opts);
    }

    const desc = document.createElement('p'); desc.className='modal-desc'; desc.innerText=prod.description||'';
    body.appendChild(desc);

    const actions = document.createElement('div'); actions.className='modal-actions';
    if(prod.paymentLink){
      const buyBtn = document.createElement('a'); buyBtn.className='btn buy-now'; buyBtn.href=prod.paymentLink; buyBtn.target='_blank'; buyBtn.rel='noopener'; buyBtn.innerText='Buy on PayPal';
      buyBtn.addEventListener('click',()=>setTimeout(()=>showOrderConfirmation(prod),500));
      actions.appendChild(buyBtn);
    } else { const noPay=document.createElement('button'); noPay.className='btn disabled'; noPay.innerText='No payment link'; actions.appendChild(noPay); }
    const closeBtn=document.createElement('button'); closeBtn.className='btn close-modal'; closeBtn.innerText='Close'; closeBtn.addEventListener('click',hideModal); actions.appendChild(closeBtn);
    body.appendChild(actions);

    showModal();
  }

  function showModal(){ document.body.classList.add('modal-open'); el.modal.classList.add('open'); }
  function hideModal(){ document.body.classList.remove('modal-open'); el.modal.classList.remove('open'); }

  function showOrderConfirmation(product){ alert(`Thank you! Your order for "${product.name}" has been received. We will start processing it within 48 hours.`); }
  function showError(msg){ document.querySelector('#main-content').innerHTML=`<div class="error-card"><strong>Error:</strong><p>${msg}</p></div>`; }

  function renderCatalogueLanding(catalogueObj){
    const root=document.querySelector('#catalogue .content-inner'); root.innerHTML='';
    catalogueObj.categories.forEach(cat=>{
      const section=document.createElement('section'); section.className='landing-cat';
      section.innerHTML=`<h3>${cat.name}</h3><div class="landing-subcats"></div>`; root.appendChild(section);
      const subWrap=section.querySelector('.landing-subcats');
      if(cat.subcategories?.length){
        cat.subcategories.forEach(sub=>{
          const btn=document.createElement('button'); btn.className='subcat-btn'; btn.innerText=sub.name;
          btn.addEventListener('click',()=>renderCategory(cat.id));
          subWrap.appendChild(btn);
        });
      } else if(cat.products?.length){
        const btn=document.createElement('button'); btn.className='subcat-btn'; btn.innerText='View '+cat.name; btn.addEventListener('click',()=>renderCategory(cat.id));
        subWrap.appendChild(btn);
      }
    });
  }

  function initContact(){
    const form=el.contactForm;
    if(!form) return;
    form.addEventListener('submit', ev=>{
      ev.preventDefault();
      const name=form.querySelector('[name=name]').value.trim();
      const email=form.querySelector('[name=email]').value.trim();
      const msg=form.querySelector('[name=message]').value.trim();
      if(!name||!email||!msg) return alert('Please fill all fields.');
      alert(`Thanks ${name}! Your message has been received.`);
      form.reset();
    });
  }

  function initNavButtons(){
    document.querySelector('#nav-catalogue')?.addEventListener('click', e=>{ e.preventDefault(); renderCatalogueLanding(catalogue); window.location.hash='#catalogue'; });
    document.querySelector('#nav-about')?.addEventListener('click', e=>{ e.preventDefault(); window.location.hash='#about-us'; });
    document.querySelector('#nav-contact')?.addEventListener('click', e=>{ e.preventDefault(); window.location.hash='#contact'; });
  }

  function initModalCloseOnEsc(){ document.addEventListener('keydown', e=>{ if(e.key==='Escape') hideModal(); }); }
  function initThemeToggle(){ el.themeToggle?.addEventListener('change', e=>{ document.body.classList.toggle('christmas-mode', e.target.checked); }); }

  catalogue = await loadCatalogue();
  if(!catalogue) return showError('Ensure /catalogue.json exists and is valid.');

  renderSite(catalogue.siteInfo);
  buildMenu(catalogue.categories);
  renderCatalogueLanding(catalogue);
  initContact(); initNavButtons(); initModalCloseOnEsc(); initThemeToggle();

  const curNote=document.querySelector('#currency-note');
  if(curNote){ const locale=navigator.language||'en-US'; const code=localeToCurrency(locale); curNote.innerText=`Prices shown in ${catalogue.siteInfo.defaultCurrency}. Locale-formatted prices may differ.`; }

  console.log('Catalogue loaded and initialized.');
})();
