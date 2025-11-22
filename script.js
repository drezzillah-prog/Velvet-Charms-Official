/* script.js - Velvet Charms
   Replaces older scripts with a single authoritative front-end.
   Requires: catalogue.json present in site root and images in same folder.
*/

(() => {
  // Utilities
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // Elements
  const brandEl = $('#brand');
  const taglineEl = $('#tagline');
  const navCatalogue = $('#nav-catalogue');
  const navList = $('#catalogue-list');
  const mainTitle = $('#main-title');
  const mainSubtitle = $('#main-subtitle');
  const content = $('#content');
  const detailsModal = $('#details-modal');
  const detailsClose = $('#details-close');
  const modalTitle = $('#modal-title');
  const modalImagesWrap = $('#modal-images');
  const modalThumbs = $('#modal-thumbs');
  const modalDesc = $('#modal-desc');
  const modalOptions = $('#modal-options');
  const modalPrice = $('#modal-price');
  const modalBuy = $('#modal-buy');
  const aboutBtn = $('#about-btn');
  const aboutModal = $('#about-modal');
  const aboutClose = $('#about-close');
  const contactForm = $('#contact-form');
  const themeSnow = $('#snow-canvas');

  let catalogue = null;
  let currentProduct = null;

  // Load catalogue.json
  async function loadCatalogue() {
    try {
      const res = await fetch('/catalogue.json', {cache: 'no-store'});
      if (!res.ok) throw new Error('catalogue.json not found');
      catalogue = await res.json();
      applySiteInfo();
      buildCatalogueMenu();
      renderHome();
    } catch (err) {
      console.error(err);
      content.innerHTML = `<div class="error">Error loading catalogue. Please ensure /catalogue.json exists and is valid in site root.</div>`;
    }
  }

  function applySiteInfo() {
    if (!catalogue.siteInfo) return;
    brandEl.textContent = catalogue.siteInfo.name || 'Velvet Charms';
    taglineEl.textContent = catalogue.siteInfo.tagline || '';
    // About text used by about modal
    const aboutText = (catalogue.siteInfo.about && catalogue.siteInfo.about.text) || '';
    $('#about-text').textContent = aboutText;
  }

  // Build the dropdown catalogue menu
  function buildCatalogueMenu() {
    navList.innerHTML = ''; // clear
    if (!catalogue.categories) return;
    catalogue.categories.forEach(cat => {
      const li = document.createElement('li');
      li.className = 'catalogue-cat';
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = cat.name;
      a.dataset.cat = cat.id;
      a.addEventListener('click', e => {
        e.preventDefault();
        renderCategory(cat.id);
      });
      li.appendChild(a);

      // build sub-list
      if (cat.subcategories && cat.subcategories.length) {
        const subUL = document.createElement('ul');
        subUL.className = 'catalogue-sub';
        cat.subcategories.forEach(sub => {
          const subLi = document.createElement('li');
          const subA = document.createElement('a');
          subA.href = '#';
          subA.textContent = sub.name;
          subA.dataset.sub = `${cat.id}||${sub.id}`;
          subA.addEventListener('click', e => {
            e.preventDefault();
            renderSubcategory(cat.id, sub.id);
          });
          subLi.appendChild(subA);
          subUL.appendChild(subLi);
        });
        li.appendChild(subUL);
      } else if (cat.products && cat.products.length) {
        // some categories have products directly
      }
      navList.appendChild(li);
    });
  }

  // Home render
  function renderHome() {
    mainTitle.textContent = catalogue.siteInfo.name;
    mainSubtitle.textContent = catalogue.siteInfo.tagline;
    // show featured categories (first 6)
    const featured = catalogue.categories.slice(0, 8);
    content.innerHTML = `<div class="grid categories-grid"></div>`;
    const grid = content.querySelector('.categories-grid');
    featured.forEach(cat => {
      const img = cat.categoryImage || cat.banner || (cat.subcategories && cat.subcategories[0] && cat.subcategories[0].products && cat.subcategories[0].products[0] && cat.subcategories[0].products[0].images && cat.subcategories[0].products[0].images[0]) || '';
      const card = document.createElement('div');
      card.className = 'cat-card';
      card.innerHTML = `
        <div class="cat-image-wrap"><img src="${img}" alt="${cat.name}" onerror="this.style.opacity=.4;"/></div>
        <h3>${cat.name}</h3>
        <p class="cat-sub">${(cat.subcategories && cat.subcategories.length) ? cat.subcategories.map(s=>s.name).slice(0,3).join(' • ') : ''}</p>
        <button class="btn btn-ghost" data-cat="${cat.id}">Explore</button>
      `;
      card.querySelector('button').addEventListener('click', ()=>renderCategory(cat.id));
      grid.appendChild(card);
    });
  }

  // Render whole category page
  function renderCategory(catId) {
    const cat = catalogue.categories.find(c => c.id === catId);
    if (!cat) return;
    content.innerHTML = `
      <div class="category-header">
        <div class="category-banner"><img src="${cat.banner || cat.categoryImage || ''}" alt="${cat.name}" onerror="this.style.opacity=.5"/></div>
        <div class="category-info">
          <h2>${cat.name}</h2>
          <p class="lead">${cat.description || ''}</p>
          <div class="subnav"></div>
        </div>
      </div>
      <div id="category-content"></div>
    `;
    const subnav = content.querySelector('.subnav');
    // Build subcategory links
    if (cat.subcategories && cat.subcategories.length) {
      cat.subcategories.forEach(sub => {
        const b = document.createElement('button');
        b.className = 'btn btn-mini';
        b.textContent = sub.name;
        b.addEventListener('click', ()=>renderSubcategory(catId, sub.id));
        subnav.appendChild(b);
      });
    } else {
      // direct products
      renderProductsList(cat, null);
      return;
    }
    // default: render first subcategory
    renderSubcategory(catId, cat.subcategories[0].id);
  }

  function renderSubcategory(catId, subId) {
    const cat = catalogue.categories.find(c => c.id === catId);
    if (!cat) return;
    const sub = (cat.subcategories || []).find(s => s.id === subId);
    if (!sub) return;
    const target = $('#category-content');
    target.innerHTML = `
      <h3 class="subcat-title">${sub.name}</h3>
      <div class="grid products-grid"></div>
    `;
    const grid = target.querySelector('.products-grid');
    (sub.products || []).forEach(prod => {
      const img = (prod.images && prod.images[0]) || '';
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <div class="product-image"><img src="${img}" alt="${prod.name}" /></div>
        <div class="product-body">
          <h4 class="product-title">${prod.name}</h4>
          <p class="product-price">$${Number(prod.price).toFixed(2)}</p>
          <div class="product-actions">
            <button class="btn btn-details" data-prod="${catId}||${subId}||${prod.id}">Details</button>
            <a class="btn btn-buy" target="_blank" rel="noopener" href="${prod.paymentLink}">Buy</a>
          </div>
        </div>
      `;
      card.querySelector('.btn-details').addEventListener('click', e=>{
        const key = e.currentTarget.dataset.prod;
        openDetailsByKey(key);
      });
      grid.appendChild(card);
    });
  }

  // Key: cat||sub||prod
  function openDetailsByKey(key) {
    const [catId, subId, prodId] = key.split('||');
    const cat = catalogue.categories.find(c => c.id === catId);
    if (!cat) return;
    const sub = cat.subcategories.find(s => s.id === subId);
    if (!sub) return;
    const prod = (sub.products || []).find(p => p.id === prodId);
    if (!prod) return;
    openProductModal(prod);
  }

  // Render product modal
  function openProductModal(prod) {
    currentProduct = prod;
    modalTitle.textContent = prod.name;
    modalDesc.textContent = prod.description || '';
    modalPrice.textContent = `$${Number(prod.price).toFixed(2)}`;
    // images carousel
    modalImagesWrap.innerHTML = '';
    modalThumbs.innerHTML = '';
    const imgs = prod.images || [];
    if (imgs.length === 0) {
      modalImagesWrap.innerHTML = `<div class="modal-img-empty">No image</div>`;
    } else {
      imgs.forEach((f, idx) => {
        const img = document.createElement('img');
        img.src = f;
        img.className = 'modal-main-img';
        img.dataset.index = idx;
        img.style.display = idx === 0 ? 'block' : 'none';
        img.onerror = () => { img.style.opacity = 0.5; };
        modalImagesWrap.appendChild(img);

        const t = document.createElement('img');
        t.src = f;
        t.className = 'modal-thumb';
        t.dataset.index = idx;
        t.addEventListener('click', () => showModalImage(idx));
        modalThumbs.appendChild(t);
      });
    }

    // Options
    modalOptions.innerHTML = '';
    if (prod.options) {
      for (const [name, vals] of Object.entries(prod.options)) {
        const wrapper = document.createElement('div');
        wrapper.className = 'option-row';
        const label = document.createElement('label');
        label.textContent = name.charAt(0).toUpperCase() + name.slice(1);
        const select = document.createElement('select');
        select.name = name;
        vals.forEach(v => {
          const opt = document.createElement('option');
          opt.value = v;
          opt.textContent = v;
          select.appendChild(opt);
        });
        wrapper.appendChild(label);
        wrapper.appendChild(select);
        modalOptions.appendChild(wrapper);
      }
    }

    // Remove unwanted detail images if requested (removeDetailsIndex)
    if (prod.removeDetailsIndex && prod.images && prod.images.length) {
      prod.removeDetailsIndex.sort((a,b)=>b-a).forEach(i => {
        // hide thumbnail + main image at that index
        const imgsAll = modalImagesWrap.querySelectorAll('.modal-main-img');
        if (imgsAll[i]) imgsAll[i].remove();
        const thumbsAll = modalThumbs.querySelectorAll('.modal-thumb');
        if (thumbsAll[i]) thumbsAll[i].remove();
      });
    }

    // Buy button action: opens PayPal link; we append selected options as query for your review
    modalBuy.onclick = () => {
      const link = prod.paymentLink || '#';
      // gather options
      const selects = Array.from(modalOptions.querySelectorAll('select'));
      const params = selects.map(s => `${encodeURIComponent(s.name)}=${encodeURIComponent(s.value)}`).join('&');
      let final = link;
      if (params) {
        // Try to append as query string — PayPal won't necessarily accept, but useful for record if you have server side.
        final = link.includes('?') ? `${link}&${params}` : `${link}?${params}`;
      }
      window.open(final, '_blank');
    };

    // show modal
    detailsModal.classList.add('open');
    setTimeout(()=> {
      detailsModal.classList.add('visible');
      // ensure first image is focused
      showModalImage(0);
    }, 10);
  }

  function showModalImage(index) {
    const imgs = modalImagesWrap.querySelectorAll('.modal-main-img');
    imgs.forEach((im, i) => im.style.display = i === index ? 'block' : 'none');
    const thumbs = modalThumbs.querySelectorAll('.modal-thumb');
    thumbs.forEach((t, i) => t.classList.toggle('active', i === index));
  }

  // Attach modal close handlers
  function bindModals() {
    detailsClose.addEventListener('click', closeDetails);
    detailsModal.addEventListener('click', (e)=>{
      if (e.target === detailsModal) closeDetails();
    });
    document.addEventListener('keydown', (e)=> {
      if (e.key === 'Escape') closeDetails();
    });
    aboutClose.addEventListener('click', ()=> {
      aboutModal.classList.remove('open','visible');
    });
    aboutBtn.addEventListener('click', ()=> {
      aboutModal.classList.add('open');
      setTimeout(()=>aboutModal.classList.add('visible'),10);
    });
  }

  function closeDetails() {
    detailsModal.classList.remove('visible');
    setTimeout(()=>detailsModal.classList.remove('open'), 250);
  }

  // Contact form
  function bindContact() {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = contactForm.querySelector('[name=name]').value.trim();
      const email = contactForm.querySelector('[name=email]').value.trim();
      const msg = contactForm.querySelector('[name=message]').value.trim();
      if (!name || !email) {
        alert('Please enter name and email.');
        return;
      }
      // Use mailto for immediate demo; for production integrate server or Formspree
      const subject = encodeURIComponent(`Velvet Charms Contact – ${name}`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${msg}`);
      window.location.href = `mailto:hello@velvetcharms.example?subject=${subject}&body=${body}`;
    });
  }

  // Small helpers for layout formatting (currency etc.)
  function beautifyPrices() {
    // If you want locale-based formatting in future, add here.
  }

  // Kickoff
  function init() {
    bindModals();
    bindContact();
    loadCatalogue();
    // Theme: snow canvas toggle is handled in CSS
  }

  // Start
  document.addEventListener('DOMContentLoaded', init);
})();
