/* script.js - loads /catalogue.json exactly and renders UI (no changes to catalogue) */

(async function () {
  const CATALOGUE_PATH = '/catalogue.json';
  let catalogue = null;

  // DOM refs
  const el = {
    menu: document.querySelector('#catalogue-menu'),
    catalogueRoot: document.querySelector('#catalogue-root'),
    currencyNote: document.querySelector('#currency-note'),
    brandName: document.querySelector('#brand-name'),
    brandTag: document.querySelector('#brand-tagline'),
    aboutText: document.querySelector('#about-text'),
    heroImg: document.querySelector('#hero-img'),
    productModal: document.querySelector('#product-modal'),
    modalCard: document.querySelector('.modal-card'),
    modalTitle: document.querySelector('#modal-title'),
    modalDesc: document.querySelector('#modal-desc'),
    modalMainImg: document.querySelector('#modal-main-img'),
    modalThumbs: document.querySelector('#modal-thumbs'),
    modalOptions: document.querySelector('#modal-options'),
    modalBuy: document.querySelector('#modal-buy'),
    modalClose: document.querySelector('#modal-close'),
    modalCloseBtn: document.querySelector('#modal-close-btn'),
    navCatalogue: document.querySelector('#nav-catalogue'),
    navHome: document.querySelector('#nav-home'),
    navAbout: document.querySelector('#nav-about'),
    navContact: document.querySelector('#nav-contact'),
    exploreBtn: document.querySelector('#explore-catalogue'),
    contactForm: document.querySelector('#contact-form')
  };

  async function loadCatalogue() {
    try {
      const r = await fetch(CATALOGUE_PATH + '?t=' + Date.now());
      if (!r.ok) throw new Error('Catalogue not found');
      return await r.json();
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  function safeImg(src) {
    if (!src) return 'placeholder.png';
    // Use exact filename as provided.
    return src;
  }

  function formatPrice(amount, currency) {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
    } catch (e) {
      return amount + ' ' + (currency || '');
    }
  }

  function renderSiteInfo(siteInfo) {
    if (!siteInfo) return;
    if (siteInfo.name) el.brandName.textContent = siteInfo.name;
    if (siteInfo.tagline) el.brandTag.textContent = siteInfo.tagline;
    if (siteInfo.about && siteInfo.about.text) el.aboutText.innerHTML = `<p>${siteInfo.about.text}</p>`;
    // hero image fallback: use first available category image if present
    const firstCategory = catalogue.categories && catalogue.categories[0];
    const heroFile = (firstCategory && (firstCategory.categoryImage || firstCategory.banner)) || 'Matching Winter Set - Beanie + Scarf + Mittens.png';
    el.heroImg.src = safeImg(heroFile);
    el.currencyNote.innerText = `Prices shown in ${siteInfo.defaultCurrency || 'USD'}. Locale-formatted prices may differ.`;
  }

  function buildLeftMenu(categories) {
    if (!el.menu) return;
    el.menu.innerHTML = '';
    categories.forEach(cat => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = cat.name;
      btn.dataset.cat = cat.id;
      btn.addEventListener('click', () => renderCategory(cat.id));
      li.appendChild(btn);
      el.menu.appendChild(li);
    });
  }

  function renderLanding() {
    el.catalogueRoot.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'catalogue-grid';

    catalogue.categories.forEach(cat => {
      const card = document.createElement('div');
      card.className = 'cat-card';
      const img = document.createElement('img');

      // prefer categoryImage -> banner -> first product image -> placeholder
      const src = cat.categoryImage || cat.banner || (cat.subcategories && cat.subcategories[0] && cat.subcategories[0].products && cat.subcategories[0].products[0] && cat.subcategories[0].products[0].images && cat.subcategories[0].products[0].images[0]) || (cat.products && cat.products[0] && cat.products[0].images && cat.products[0].images[0]) || 'placeholder.png';
      img.src = safeImg(src);
      img.alt = cat.name;

      const info = document.createElement('div');
      info.className = 'cat-info';
      const h3 = document.createElement('h3'); h3.textContent = cat.name;
      const btn = document.createElement('button'); btn.className = 'btn'; btn.textContent = 'View'; btn.addEventListener('click', () => renderCategory(cat.id));
      info.appendChild(h3);
      info.appendChild(btn);

      card.appendChild(img);
      card.appendChild(info);
      grid.appendChild(card);
    });

    el.catalogueRoot.appendChild(grid);
    window.location.hash = '#catalogue';
  }

  function renderCategory(catId) {
    const cat = catalogue.categories.find(c => c.id === catId);
    if (!cat) {
      el.catalogueRoot.innerHTML = '<p>Category not found.</p>';
      return;
    }
    el.catalogueRoot.innerHTML = '';
    const title = document.createElement('h2'); title.textContent = cat.name;
    el.catalogueRoot.appendChild(title);

    // if subcategories exist
    if (Array.isArray(cat.subcategories) && cat.subcategories.length) {
      cat.subcategories.forEach(sub => {
        const section = document.createElement('section');
        section.className = 'subcard';
        const h3 = document.createElement('h3'); h3.textContent = sub.name;
        section.appendChild(h3);

        const productsGrid = document.createElement('div');
        productsGrid.className = 'products-grid';

        const products = Array.isArray(sub.products) ? sub.products : [];
        products.forEach(p => {
          productsGrid.appendChild(buildProductCard(p, cat.id, sub.id));
        });

        section.appendChild(productsGrid);
        el.catalogueRoot.appendChild(section);
      });
    } else if (Array.isArray(cat.products) && cat.products.length) {
      const productsGrid = document.createElement('div'); productsGrid.className = 'products-grid';
      cat.products.forEach(p => productsGrid.appendChild(buildProductCard(p, cat.id)));
      el.catalogueRoot.appendChild(productsGrid);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function buildProductCard(p, catId, subId) {
    const card = document.createElement('div'); card.className = 'product-card';
    const img = document.createElement('img');
    const imgSrc = (Array.isArray(p.images) && p.images[0]) || 'placeholder.png';
    img.src = safeImg(imgSrc);
    img.alt = p.name;

    const h4 = document.createElement('h4'); h4.textContent = p.name;
    const price = document.createElement('div'); price.className = 'price'; price.textContent = formatPrice(p.price || 0, (catalogue.siteInfo && catalogue.siteInfo.defaultCurrency) || 'USD');

    const actions = document.createElement('div'); actions.className = 'card-actions';
    const detailsBtn = document.createElement('button'); detailsBtn.className = 'btn'; detailsBtn.textContent = 'Details';
    detailsBtn.addEventListener('click', () => openProductModal(p));
    actions.appendChild(detailsBtn);

    if (p.paymentLink) {
      const buy = document.createElement('a');
      buy.className = 'btn';
      buy.href = p.paymentLink;
      buy.target = '_blank';
      buy.rel = 'noopener';
      buy.textContent = 'Buy';
      actions.appendChild(buy);
      // keep Buy link behavior unchanged
    } else {
      const nopay = document.createElement('button'); nopay.className = 'btn'; nopay.disabled = true; nopay.textContent = 'No Link';
      actions.appendChild(nopay);
    }

    card.appendChild(img);
    card.appendChild(h4);
    card.appendChild(price);
    if (p.description) {
      const desc = document.createElement('div'); desc.className = 'pc-desc'; desc.textContent = p.description;
      card.appendChild(desc);
    }
    card.appendChild(actions);
    return card;
  }

  // Modal
  function openProductModal(prod) {
    el.modalTitle.textContent = prod.name;
    el.modalDesc.textContent = prod.description || '';
    el.modalOptions.innerHTML = '';
    el.modalThumbs.innerHTML = '';

    // images
    const images = Array.isArray(prod.images) && prod.images.length ? prod.images : ['placeholder.png'];
    el.modalMainImg.src = safeImg(images[0]);
    el.modalMainImg.alt = prod.name;
    images.forEach(src => {
      const t = document.createElement('img');
      t.className = 'modal-thumb';
      t.src = safeImg(src);
      t.alt = prod.name;
      t.addEventListener('click', () => el.modalMainImg.src = safeImg(src));
      el.modalThumbs.appendChild(t);
    });

    // options (render select for arrays)
    if (prod.options && typeof prod.options === 'object') {
      for (const k in prod.options) {
        const val = prod.options[k];
        const label = document.createElement('label'); label.textContent = k.charAt(0).toUpperCase() + k.slice(1);
        if (Array.isArray(val)) {
          const sel = document.createElement('select'); sel.name = k;
          val.forEach(o => {
            const opt = document.createElement('option'); opt.value = o; opt.textContent = o;
            sel.appendChild(opt);
          });
          el.modalOptions.appendChild(label);
          el.modalOptions.appendChild(sel);
        } else {
          // if it's a flag object or something, display as text
          const note = document.createElement('div'); note.textContent = String(val);
          el.modalOptions.appendChild(label);
          el.modalOptions.appendChild(note);
        }
      }
    }

    // buy link
    if (prod.paymentLink) {
      el.modalBuy.href = prod.paymentLink;
      el.modalBuy.style.display = 'inline-block';
    } else {
      el.modalBuy.style.display = 'none';
    }

    // show modal
    el.productModal.classList.add('open');
    el.productModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    el.productModal.classList.remove('open');
    el.productModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // init contact form
  function initContact() {
    if (!el.contactForm) return;
    el.contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = this.querySelector('[name=name]').value.trim();
      const email = this.querySelector('[name=email]').value.trim();
      const msg = this.querySelector('[name=message]').value.trim();
      if (!name || !email || !msg) {
        alert('Please fill all fields.');
        return;
      }
      alert('Thanks ' + name + '! Your message has been received. We will reply by email.');
      this.reset();
    });
  }

  // navigation hooks
  function initNav() {
    if (el.navCatalogue) el.navCatalogue.addEventListener('click', (e) => { e.preventDefault(); renderLanding(); });
    if (el.navHome) el.navHome.addEventListener('click', (e) => { e.preventDefault(); renderLanding(); window.scrollTo({top:0, behavior:'smooth'}); });
    if (el.navAbout) el.navAbout.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('about-us').scrollIntoView({behavior:'smooth'});});
    if (el.navContact) el.navContact.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('contact').scrollIntoView({behavior:'smooth'});});
    if (el.exploreBtn) el.exploreBtn.addEventListener('click', ()=> { renderLanding(); document.querySelector('#catalogue-section').scrollIntoView({behavior:'smooth'}); });
  }

  // modal close handlers
  if (el.modalClose) el.modalClose.addEventListener('click', closeModal);
  if (el.modalCloseBtn) el.modalCloseBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  // boot
  catalogue = await loadCatalogue();
  if (!catalogue) {
    document.querySelector('#catalogue-root').innerHTML = '<div class="error">Failed to load catalogue.json</div>';
    return;
  }

  // render site info & menu & landing
  renderSiteInfo(catalogue.siteInfo || {});
  buildLeftMenu(catalogue.categories || []);
  renderLanding();

  // init
  initNav();
  initContact();

  console.log('Catalogue loaded and rendered.');
})();
