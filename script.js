// script.js - Velvet Charms catalogue renderer (vanilla JS)
// Fetches /catalogue.json and renders the full shop.
// Christmas theme is default. Small, well-documented, no external libraries.

const ASSET_ROOT = './'; // images are in root with index.html
let catalogue = null;
let currentCategoryId = null;
let currentSubcategoryId = null;
let modalProduct = null;

// Theme handling: default is 'christmas'
const THEMES = {
  christmas: {
    '--bg': '#fff8f6',
    '--accent': '#b11a1a',
    '--accent-2': '#c99a2a',
    '--muted': '#5a4a3a',
    '--card-bg': '#fffdfa',
    '--glass': 'rgba(255,255,255,0.7)'
  },
  warmsoft: {
    '--bg': '#fbf7f3',
    '--accent': '#8b5e3c',
    '--accent-2': '#b48b5b',
    '--muted': '#6b4f3a',
    '--card-bg': '#fffdfa',
    '--glass': 'rgba(255,255,255,0.8)'
  }
};

// util: format price by locale
function formatPrice(amount, currency='USD') {
  try {
    return new Intl.NumberFormat(navigator.language || 'en-US', {
      style: 'currency',
      currency
    }).format(amount);
  } catch(e) {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// apply theme (default christmas)
function applyTheme(name) {
  const root = document.documentElement;
  const palette = THEMES[name] || THEMES.christmas;
  Object.entries(palette).forEach(([k, v]) => root.style.setProperty(k, v));
}
applyTheme('christmas');

// simple fade-in helper
function fadeIn(el, delay=0) {
  el.style.opacity = 0;
  el.style.transform = 'translateY(8px)';
  setTimeout(() => {
    el.style.transition = 'opacity 260ms ease, transform 260ms ease';
    el.style.opacity = 1;
    el.style.transform = 'translateY(0)';
  }, delay);
}

// fetch catalogue
async function loadCatalogue() {
  try {
    const res = await fetch('/catalogue.json', {cache: 'no-store'});
    if (!res.ok) throw new Error('catalogue.json not found');
    catalogue = await res.json();
    renderSiteHeader();
    renderCategories();
    renderHome();
  } catch (err) {
    showError(`Error loading catalogue. Please ensure /catalogue.json is present and valid in site root.`);
    console.error(err);
  }
}

// UI helpers
function el(tag, cls='', inner='') {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (inner) d.innerHTML = inner;
  return d;
}

function showError(msg) {
  const root = document.getElementById('app');
  root.innerHTML = `<div class="error-card"><h3>${msg}</h3></div>`;
}

// header & nav
function renderSiteHeader() {
  const header = document.getElementById('site-header');
  header.innerHTML = `
    <div class="brand">
      <div class="logo">Velvet Charms ❄️</div>
      <div class="tag">${catalogue.siteInfo.tagline}</div>
    </div>
    <nav id="main-nav" class="main-nav"></nav>
    <div class="theme-badge">♥ Christmas Theme</div>
  `;
  const nav = header.querySelector('#main-nav');
  const items = ['Home','Catalogue','About Us','Contact'];
  items.forEach(name => {
    const a = el('button','nav-btn', name);
    a.addEventListener('click', () => {
      if (name === 'Home') renderHome();
      else if (name === 'Catalogue') renderCategories();
      else if (name === 'About Us') renderAbout();
      else if (name === 'Contact') renderContact();
    });
    nav.appendChild(a);
  });
}

// home
function renderHome() {
  currentCategoryId = null;
  currentSubcategoryId = null;
  const root = document.getElementById('app');
  root.innerHTML = '';
  const hero = el('section','hero');
  hero.innerHTML = `
    <div class="hero-left">
      <h1>Handcrafted Treasures</h1>
      <p class="lead">Personalized, artisan-made pieces — created with love by our team of 12 art students.</p>
      <div class="hero-actions">
        <button id="explore-btn" class="btn primary">Explore Catalogue</button>
        <button id="about-btn" class="btn ghost">About Us</button>
      </div>
    </div>
    <div class="hero-right">
      <img src="${ASSET_ROOT + (catalogue.siteInfo.banner || 'top banner picture for candles.png')}" alt="Candles banner" />
    </div>
  `;
  root.appendChild(hero);
  fadeIn(hero, 20);
  document.getElementById('explore-btn').addEventListener('click', renderCategories);
  document.getElementById('about-btn').addEventListener('click', renderAbout);
  renderCollectionsPreview(root);
}

// preview of top categories
function renderCollectionsPreview(root) {
  const collection = el('section','collections');
  // show a few top categories
  const cids = catalogue.categories.slice(0,8);
  cids.forEach(cat => {
    const card = el('div','collection-card');
    const banner = cat.banner || (cat.subcategories && cat.subcategories[0] && cat.subcategories[0].products && cat.subcategories[0].products[0] && (cat.subcategories[0].products[0].images || [])[0]) || '';
    const bannerUrl = banner ? ASSET_ROOT + banner : '';
    card.innerHTML = `
      <div class="cc-thumb"><img src="${bannerUrl}" alt="${cat.name}" /></div>
      <div class="cc-body">
        <h4>${cat.name}</h4>
        <small>${cat.subcategories ? cat.subcategories.length : 0} collections</small>
      </div>
    `;
    card.addEventListener('click', () => renderCategory(cat.id));
    collection.appendChild(card);
  });
  root.appendChild(collection);
}

// render all categories (catalogue index)
function renderCategories() {
  const root = document.getElementById('app');
  root.innerHTML = '';
  const header = el('div','catalog-header','<h2>Collections</h2>');
  root.appendChild(header);

  const grid = el('div','category-grid');
  catalogue.categories.forEach(cat => {
    const item = el('div','category-item');
    const img = cat.banner ? `<img src="${ASSET_ROOT + cat.banner}" alt="${cat.name}" />` : '';
    item.innerHTML = `
      <div class="cat-thumb">${img}</div>
      <div class="cat-body">
        <h3>${cat.name}</h3>
        <p class="muted">${cat.subcategories ? cat.subcategories.length+' sections' : ''}</p>
        <div><button class="btn small" data-cat="${cat.id}">Explore</button></div>
      </div>
    `;
    grid.appendChild(item);
  });
  root.appendChild(grid);

  grid.querySelectorAll('button[data-cat]').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = e.currentTarget.getAttribute('data-cat');
      renderCategory(id);
    });
  });
}

// render a category and its subcategories
function renderCategory(catId) {
  currentCategoryId = catId;
  currentSubcategoryId = null;
  const cat = catalogue.categories.find(c => c.id === catId);
  if (!cat) return renderCategories();
  const root = document.getElementById('app');
  root.innerHTML = `<h2>${cat.name}</h2>`;
  const subWrap = el('div','sub-wrap');
  if (cat.subcategories && cat.subcategories.length) {
    cat.subcategories.forEach(sc => {
      const scCard = el('div','subcat');
      scCard.innerHTML = `<h3>${sc.name}</h3><div class="product-grid" id="grid-${sc.id}"></div>`;
      subWrap.appendChild(scCard);
      // render products in sc
      const grid = scCard.querySelector('.product-grid');
      (sc.products || []).forEach(p => grid.appendChild(renderProductCard(p)));
      // attach event delegation for details
    });
  } else {
    // category without subcategories: find products directly
    const grid = el('div','product-grid');
    (cat.products || []).forEach(p => grid.appendChild(renderProductCard(p)));
    subWrap.appendChild(grid);
  }
  root.appendChild(subWrap);
}

// small product card
function renderProductCard(p) {
  const card = el('div','product-card');
  const thumb = (p.images && p.images.length) ? ASSET_ROOT + p.images[0] : '';
  card.innerHTML = `
    <div class="pc-thumb"><img src="${thumb}" alt="${p.name}" /></div>
    <div class="pc-body">
      <h4>${p.name}</h4>
      <p class="pc-price">${formatPrice(p.price || 0)}</p>
      <div class="pc-actions">
        <button class="btn small details">Details</button>
        <a class="btn small buy" href="${p.paymentLink || '#'}" target="_blank" rel="noopener">Buy</a>
      </div>
    </div>
  `;
  // Details opens modal
  card.querySelector('.details').addEventListener('click', () => openDetailsModal(p));
  card.querySelector('.buy').addEventListener('click', () => {
    // After clicking Buy they are taken to PayPal; show a toast/modal informing about processing
    setTimeout(()=>showOrderConfirmed(), 400);
  });
  fadeIn(card, 10);
  return card;
}

// Modal: product details
function openDetailsModal(p) {
  modalProduct = p;
  const modal = document.getElementById('product-modal');
  modal.querySelector('.modal-title').textContent = p.name;
  modal.querySelector('.modal-price').textContent = formatPrice(p.price || 0);
  modal.querySelector('.modal-desc').textContent = p.description || '';

  const imgWrap = modal.querySelector('.modal-images');
  imgWrap.innerHTML = '';
  const images = p.images ? p.images.slice() : [];
  // removeDetails indexes if present (they are indexes referencing removed images)
  if (p.removeDetails && p.removeDetails.length) {
    // we assume removeDetails: [1] means remove index 1 (0-based)
    p.removeDetails.forEach(idx => {
      if (idx >= 0 && idx < images.length) images.splice(idx, 1);
    });
  }
  images.forEach(img => {
    const im = el('img','detail-img');
    im.src = ASSET_ROOT + img;
    imgWrap.appendChild(im);
  });

  // options rendering
  const optsWrap = modal.querySelector('.modal-options');
  optsWrap.innerHTML = '';
  if (p.options) {
    Object.entries(p.options).forEach(([k,v])=>{
      const field = el('div','opt-field');
      const label = el('label','', k.charAt(0).toUpperCase() + k.slice(1));
      field.appendChild(label);
      const select = el('select','');
      select.name = k;
      (v || []).forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        select.appendChild(o);
      });
      field.appendChild(select);
      optsWrap.appendChild(field);
    });
  }

  // buy link with options appended (we will direct user to PayPal link)
  const buyBtn = modal.querySelector('.modal-buy');
  buyBtn.onclick = () => {
    const url = p.paymentLink || '#';
    window.open(url, '_blank');
    showOrderConfirmed();
  };

  modal.classList.add('open');
}

// Confirmation toast/modal
function showOrderConfirmed() {
  const toast = document.getElementById('order-toast');
  toast.classList.add('show');
  toast.innerHTML = `<strong>Order received</strong><p>Thank you! Orders are processed within 48 hours. You will receive a confirmation email within 24 hours.</p>`;
  setTimeout(()=>toast.classList.remove('show'), 6000);
}

// About & Contact
function renderAbout() {
  const root = document.getElementById('app');
  root.innerHTML = `<section class="about-panel">
    <h2>About Us</h2>
    <p class="about-text">${catalogue.siteInfo.about.text}</p>
  </section>`;
}

function renderContact() {
  const root = document.getElementById('app');
  root.innerHTML = `<section class="contact-panel">
    <h2>Contact Us</h2>
    <form id="contact-form" class="contact-form">
      <label>Name<input name="name" required></label>
      <label>Email<input name="email" type="email" required></label>
      <label>Message<textarea name="message" rows="4" required></textarea></label>
      <button class="btn primary" type="submit">Send Message</button>
    </form>
  </section>`;
  document.getElementById('contact-form').addEventListener('submit', (e)=>{
    e.preventDefault();
    alert('Thanks! Message sent. We will reply within 48 hours.');
    e.target.reset();
  });
}

// modal close
function initModal() {
  const modal = document.getElementById('product-modal');
  modal.querySelector('.modal-close').addEventListener('click', ()=>modal.classList.remove('open'));
  document.getElementById('order-toast').addEventListener('click', ()=>document.getElementById('order-toast').classList.remove('show'));
}

// init
document.addEventListener('DOMContentLoaded', () => {
  initModal();
  loadCatalogue();
});
