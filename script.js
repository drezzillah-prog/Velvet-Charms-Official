/* script.js - Velvet Charms
   Loads catalogue.json, renders site sections, product details, gallery, and PayPal flow.
*/

(async function(){
  const ROOT = document;
  const CATALOGUE_PATH = '/catalogue.json';
  let catalogue = null;
  const maxGallery = 10;

  // Utility: fetch JSON file
  async function loadCatalogue(){
    try {
      const r = await fetch(CATALOGUE_PATH + '?t=' + Date.now());
      if(!r.ok) throw new Error('Catalogue not found on server.');
      const json = await r.json();
      return json;
    } catch(err) {
      console.error('Failed to load catalogue:', err);
      return null;
    }
  }

  // Currency helper: Map locale to currency for display only
  function localeToCurrency(locale){
    if(!locale) locale = navigator.language || 'en-US';
    // Basic mapping
    if(locale.startsWith('en-US') || locale.startsWith('en-')) return 'USD';
    if(locale.startsWith('fr') || locale.startsWith('de') || locale.startsWith('es') || locale.startsWith('it')) return 'EUR';
    if(locale.startsWith('ro')) return 'RON';
    return 'USD';
  }

  function formatPrice(amount, currencyCode){
    // show currency symbol using Intl
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amount);
    } catch(e) {
      return `${amount} ${currencyCode}`;
    }
  }

  // DOM references
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

  // Create menu and basic site skeleton from catalogue
  function renderSite(siteInfo){
    if(siteInfo && siteInfo.name){
      document.title = siteInfo.name + ' — ' + (siteInfo.tagline || '');
      const brand = document.querySelector('#brand-name');
      if(brand) brand.textContent = siteInfo.name + ' ❄️';
      const tagline = document.querySelector('#brand-tagline');
      if(tagline) tagline.textContent = siteInfo.tagline || '';
      // About section text
      const aboutTitle = document.querySelector('#about-title');
      const aboutText = document.querySelector('#about-text');
      if(aboutTitle) aboutTitle.textContent = (siteInfo.about && siteInfo.about.title) || 'About';
      if(aboutText) aboutText.innerHTML = (siteInfo.about && siteInfo.about.text) || '';
    }
  }

  // Build main menu from categories (simple)
  function buildMenu(categories){
    const menu = document.querySelector('#catalogue-menu');
    if(!menu) return;
    // clear
    menu.innerHTML = '';
    categories.forEach(cat => {
      const li = document.createElement('li');
      li.className = 'menu-item';
      li.innerHTML = `<button class="menu-btn" data-cat="${cat.id}">${cat.name}</button>`;
      menu.appendChild(li);
    });

    // About and Contact are separate static top nav
    document.querySelectorAll('.menu-btn').forEach(b => {
      b.addEventListener('click', () => {
        const selected = b.dataset.cat;
        renderCategory(selected);
      });
    });
  }

  // Render a category page (list subcategories)
  function renderCategory(catId){
    const cat = catalogue.categories.find(c => c.id === catId);
    if(!cat) {
      showError('Category not found.');
      return;
    }
    const cWrap = document.querySelector('#catalogue .content-inner');
    cWrap.innerHTML = `<h2>${cat.name}</h2>`;
    // show banner if present
    if(cat.banner) {
      cWrap.innerHTML += `<div class="category-banner"><img alt="${cat.name} banner" src="${cat.banner}" loading="lazy"></div>`;
    }
    // iterate subcats or direct products
    if(cat.subcategories && cat.subcategories.length){
      cat.subcategories.forEach(sub => {
        const elSub = document.createElement('section');
        elSub.className = 'subcat';
        elSub.innerHTML = `<h3>${sub.name}</h3><div class="product-grid" id="grid-${sub.id}"></div>`;
        cWrap.appendChild(elSub);
        const grid = elSub.querySelector(`#grid-${sub.id}`);
        // products list
        const products = sub.products || sub.products === undefined ? sub.products : [];
        if(Array.isArray(sub.products)) {
          sub.products.forEach(p => {
            grid.appendChild(buildProductCard(p, sub.name, cat.id));
          });
        }
      });
    } else if (cat.products && cat.products.length){
      const grid = document.createElement('div'); grid.className = 'product-grid';
      cat.products.forEach(p => grid.appendChild(buildProductCard(p, cat.name, cat.id)));
      cWrap.appendChild(grid);
    }

    // scroll to catalogue view
    window.location.hash = '#catalogue';
  }

  // product card element
  function buildProductCard(p, subname, catid){
    const card = document.createElement('article');
    card.className = 'product-card';
    const img = (p.images && p.images.length) ? p.images[0] : 'placeholder.png';
    const price = p.price || 0;
    card.innerHTML = `
      <div class="pc-image"><img src="${img}" alt="${p.name}" loading="lazy"></div>
      <div class="pc-body">
        <h4>${p.name}</h4>
        <div class="pc-price" data-price="${price}">${formatPrice(price, catalogue.siteInfo.defaultCurrency)}</div>
        <p class="pc-desc">${p.description || ''}</p>
        <div class="pc-actions">
          <button class="btn view-btn" data-id="${p.id}">Details</button>
          ${p.paymentLink ? `<a class="btn buy-btn" target="_blank" rel="noopener" data-id="${p.id}" href="${p.paymentLink}">Buy</a>` : `<button class="btn buy-btn disabled" disabled>No PayPal</button>`}
        </div>
      </div>
    `;
    // add listeners
    card.querySelector('.view-btn').addEventListener('click', () => openProductModal(p));
    const buyEl = card.querySelector('.buy-btn');
    if(buyEl && buyEl.href){
      buyEl.addEventListener('click', (e) => {
        // on buy click show confirmation modal after redirect opened
        setTimeout(() => {
          showOrderConfirmation(p);
        }, 400);
      });
    }
    return card;
  }

  // Modal helpers
  function openProductModal(prod){
    // populate modal content
    el.modalTitle.textContent = prod.name;
    const body = el.modalContent;
    body.innerHTML = '';
    // gallery
    const galleryWrap = document.createElement('div');
    galleryWrap.className = 'modal-gallery';
    const images = (prod.images || []).slice(0, maxGallery);
    if(images.length === 0) images.push('placeholder.png');
    const mainImg = document.createElement('img');
    mainImg.className = 'main-gallery-img';
    mainImg.src = images[0];
    mainImg.alt = prod.name;
    galleryWrap.appendChild(mainImg);
    const thumbs = document.createElement('div');
    thumbs.className = 'thumbs';
    images.forEach((src, idx) => {
      const t = document.createElement('img');
      t.className = 'thumb';
      t.src = src;
      t.alt = prod.name + ' ' + (idx+1);
      t.loading = 'lazy';
      t.addEventListener('click', ()=> mainImg.src = src);
      thumbs.appendChild(t);
    });
    galleryWrap.appendChild(thumbs);
    body.appendChild(galleryWrap);

    // price and options
    const priceDiv = document.createElement('div');
    priceDiv.className = 'modal-price';
    priceDiv.innerText = `${formatPrice(prod.price || 0, catalogue.siteInfo.defaultCurrency)}`;
    body.appendChild(priceDiv);

    if(prod.options){
      const opts = document.createElement('div');
      opts.className = 'modal-options';
      for(const k in prod.options){
        const optGroup = document.createElement('div'); optGroup.className = 'opt-group';
        optGroup.innerHTML = `<label>${k.charAt(0).toUpperCase()+k.slice(1)}</label>`;
        const sel = document.createElement('select'); sel.name = k;
        prod.options[k].forEach(o => {
          const option = document.createElement('option'); option.value = o; option.innerText = o;
          sel.appendChild(option);
        });
        optGroup.appendChild(sel);
        opts.appendChild(optGroup);
      }
      body.appendChild(opts);
    }

    // description and buy
    const desc = document.createElement('p'); desc.className = 'modal-desc'; desc.innerText = prod.description || '';
    body.appendChild(desc);

    const actions = document.createElement('div'); actions.className = 'modal-actions';
    if(prod.paymentLink){
      const buyBtn = document.createElement('a');
      buyBtn.className = 'btn buy-now';
      buyBtn.href = prod.paymentLink;
      buyBtn.target = '_blank';
      buyBtn.rel = 'noopener';
      buyBtn.innerText = 'Buy on PayPal';
      buyBtn.addEventListener('click', () => {
        setTimeout(()=> showOrderConfirmation(prod), 500);
      });
      actions.appendChild(buyBtn);
    } else {
      const noPay = document.createElement('button'); noPay.className='btn disabled'; noPay.innerText = 'No payment link';
      actions.appendChild(noPay);
    }
    const closeBtn = document.createElement('button'); closeBtn.className = 'btn close-modal'; closeBtn.innerText = 'Close';
    closeBtn.addEventListener('click', hideModal);
    actions.appendChild(closeBtn);
    body.appendChild(actions);

    showModal();
  }

  function showModal(){
    document.body.classList.add('modal-open');
    el.modal.classList.add('open');
  }

  function hideModal(){
    document.body.classList.remove('modal-open');
    el.modal.classList.remove('open');
  }

  // On-buy confirmation (after they click PayPal button)
  function showOrderConfirmation(product){
    const msg = `Thank you! Your order for "${product.name}" has been received. We will start processing it within 48 hours and you'll receive a confirmation email when production begins.`;
    alert(msg);
  }

  function showError(msg){
    const target = document.querySelector('#main-content');
    target.innerHTML = `<div class="error-card"><strong>Error loading catalogue.</strong><p>${msg}</p></div>`;
  }

  // Top-level: render entire catalogue landing page with categories as clickable menu
  function renderCatalogueLanding(catalogueObj){
    const root = document.querySelector('#catalogue .content-inner');
    root.innerHTML = '';
    catalogueObj.categories.forEach(cat => {
      const section = document.createElement('section');
      section.className = 'landing-cat';
      section.innerHTML = `<h3>${cat.name}</h3><div class="landing-subcats"></div>`;
      root.appendChild(section);
      const subWrap = section.querySelector('.landing-subcats');
      // display subcategory names as buttons
      if(cat.subcategories && cat.subcategories.length){
        cat.subcategories.forEach(sub => {
          const btn = document.createElement('button');
          btn.className = 'subcat-btn';
          btn.innerText = sub.name;
          btn.addEventListener('click', ()=> renderCategory(cat.id));
          subWrap.appendChild(btn);
        });
      } else if(cat.products && cat.products.length){
        const btn = document.createElement('button');
        btn.className = 'subcat-btn';
        btn.innerText = 'View ' + cat.name;
        btn.addEventListener('click', ()=> renderCategory(cat.id));
        subWrap.appendChild(btn);
      }
    });
  }

  // Contact form handling (basic: no backend)
  function initContact(){
    const form = document.querySelector('#contact-form');
    if(!form) return;
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const name = form.querySelector('[name=name]').value.trim();
      const email = form.querySelector('[name=email]').value.trim();
      const msg = form.querySelector('[name=message]').value.trim();
      if(!name || !email || !msg) {
        alert('Please fill all fields.');
        return;
      }
      // Show local confirmation (no backend)
      alert('Thanks ' + name + '! Your message has been received. We will reply by email.');
      form.reset();
    });
  }

  function initNavButtons(){
    // catalogue button
    const catBtn = document.querySelector('#nav-catalogue');
    if(catBtn) catBtn.addEventListener('click', (e) => {
      e.preventDefault();
      renderCatalogueLanding(catalogue);
      window.location.hash = '#catalogue';
    });
    const aboutBtn = document.querySelector('#nav-about');
    if(aboutBtn) aboutBtn.addEventListener('click', (e) => { e.preventDefault(); window.location.hash = '#about-us'; });
    const contactBtn = document.querySelector('#nav-contact');
    if(contactBtn) contactBtn.addEventListener('click', (e) => { e.preventDefault(); window.location.hash = '#contact'; });
  }

  // some small accessibility / keyboard close
  function initModalCloseOnEsc(){
    document.addEventListener('keydown', (e) => {
      if(e.key === 'Escape') hideModal();
    });
  }

  // Theme toggle (Christmas visuals)
  function initThemeToggle(){
    const toggle = document.querySelector('#christmas-toggle');
    if(!toggle) return;
    toggle.addEventListener('change', (e) => {
      if(e.target.checked) document.body.classList.add('christmas-mode');
      else document.body.classList.remove('christmas-mode');
    });
  }

  // Boot
  catalogue = await loadCatalogue();
  if(!catalogue){
    showError('Please ensure /catalogue.json exists and is valid in site root.');
    return;
  }

  // Render site info
  renderSite(catalogue.siteInfo);

  // Build left menu
  buildMenu(catalogue.categories);

  // initial landing
  renderCatalogueLanding(catalogue);

  // initialize listeners
  initContact();
  initNavButtons();
  initModalCloseOnEsc();
  initThemeToggle();

  // show about if hash is about
  if(window.location.hash === '#about-us') window.scrollTo({top:0, behavior:'smooth'});

  // Region / currency helper note insert
  const curNote = document.querySelector('#currency-note');
  if(curNote){
    const locale = navigator.language || 'en-US';
    const code = localeToCurrency(locale);
    curNote.innerText = `Prices are shown in ${catalogue.siteInfo.defaultCurrency}. Shoppers in ${locale} will see locale-formatted prices; currency conversion is approximate and not a live exchange.`;
  }

  console.log('Catalogue loaded and site initialized.');

})();
