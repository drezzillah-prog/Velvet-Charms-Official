/* script.js - Velvet Charms: Catalogue loader, modal, cart-ish quick buy (PayPal links) */
/* Assumes catalogue.json is in root. Loads categories, builds dropdown, product grid, gallery modal, and handles PayPal button links. Christmas theme loads by default. */

const APP = {
  catalogueUrl: '/catalogue.json',
  data: null,
  elems: {
    headerCat: null,
    catList: null,
    grid: null,
    modal: null,
    modalContent: null,
    aboutBtn: null
  }
};

function q(sel){ return document.querySelector(sel); }
function qa(sel){ return document.querySelectorAll(sel); }

async function loadCatalogue(){
  try{
    const res = await fetch(APP.catalogueUrl + '?_=' + Date.now());
    if(!res.ok) throw new Error('catalogue.json not found');
    APP.data = await res.json();
    buildHeader(); buildCategories(); showHome();
  } catch(err){
    console.error('Error loading catalogue:', err);
    const grid = APP.elems.grid || q('#main-grid');
    if(grid) grid.innerHTML = `<div class="error">Error loading catalogue. Please ensure /catalogue.json exists and is valid.</div>`;
  }
}

/* build header dropdown for categories */
function buildHeader(){
  const header = q('#catalogue-dropdown');
  if(!header) return;
  header.innerHTML = '';
  const list = document.createElement('ul');
  list.className = 'cat-dropdown-list';
  APP.data.categories.forEach(cat=>{
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = cat.name;
    a.dataset.cat = cat.id;
    a.addEventListener('click', (e)=>{
      e.preventDefault(); openCategory(cat.id);
    });
    li.appendChild(a);
    list.appendChild(li);
  });
  header.appendChild(list);
}

/* build categories section (thumbnail cards) */
function buildCategories(){
  const container = q('#categories');
  if(!container) return;
  container.innerHTML = '';
  APP.data.categories.forEach(cat=>{
    const card = document.createElement('div');
    card.className = 'cat-card';
    const img = document.createElement('img');
    img.alt = cat.name;
    img.src = cat.categoryImage || cat.banner || 'top banner picture for candles.png';
    const h = document.createElement('h3');
    h.textContent = cat.name;
    card.appendChild(img);
    card.appendChild(h);
    card.addEventListener('click', ()=> openCategory(cat.id));
    container.appendChild(card);
  });
}

/* open a category by id */
function openCategory(catId){
  const cat = APP.data.categories.find(c=>c.id===catId);
  if(!cat) return;
  q('#main-title').textContent = cat.name;
  q('#main-subtitle').textContent = cat.description || '';
  renderCategoryProducts(cat);
  window.scrollTo({top: 200, behavior:'smooth'});
}

/* render products for the opened category */
function renderCategoryProducts(cat){
  const grid = q('#main-grid');
  grid.innerHTML = '';
  // If subcategories, show subcategory tiles first
  if(cat.subcategories && cat.subcategories.length){
    cat.subcategories.forEach(sub=>{
      const subSec = document.createElement('section');
      subSec.className = 'subcategory';
      const title = document.createElement('h4');
      title.textContent = sub.name;
      subSec.appendChild(title);

      const row = document.createElement('div');
      row.className = 'product-row';
      (sub.products || []).forEach(prod => {
        row.appendChild(buildProductCard(prod, sub, cat));
      });
      subSec.appendChild(row);
      grid.appendChild(subSec);
    });
  } else if (cat.products && cat.products.length){
    const row = document.createElement('div');
    row.className = 'product-row';
    cat.products.forEach(prod=> row.appendChild(buildProductCard(prod, null, cat)));
    grid.appendChild(row);
  } else {
    grid.innerHTML = '<p class="empty">No products found in this category.</p>';
  }
}

/* build an individual product card */
function buildProductCard(prod, sub, cat){
  const card = document.createElement('article');
  card.className = 'product-card';
  const mainImg = (prod.images && prod.images[0]) ? prod.images[0] : (cat.categoryImage || 'wax_candle_small.png');
  const img = document.createElement('img');
  img.src = mainImg;
  img.alt = prod.name;
  img.loading = 'lazy';
  img.className = 'product-thumb';
  card.appendChild(img);

  const info = document.createElement('div');
  info.className = 'product-info';
  const h = document.createElement('h5'); h.textContent = prod.name; info.appendChild(h);
  const p = document.createElement('p'); p.className='price'; p.textContent = `$${prod.price.toFixed(2)}`; info.appendChild(p);

  const btns = document.createElement('div'); btns.className = 'card-buttons';
  const details = document.createElement('button');
  details.className = 'btn btn-details';
  details.textContent = 'Details';
  details.addEventListener('click', ()=> openProductModal(prod, cat));
  btns.appendChild(details);

  const buy = document.createElement('a');
  buy.className = 'btn btn-buy';
  buy.textContent = 'Buy';
  buy.href = prod.paymentLink || '#';
  buy.target = '_blank';
  btns.appendChild(buy);

  info.appendChild(btns);
  card.appendChild(info);
  return card;
}

/* modal for product details */
function openProductModal(prod, cat){
  const modal = q('#product-modal');
  const content = q('#product-modal .modal-body');
  modal.classList.add('open');

  // header
  q('#product-modal .modal-title').textContent = prod.name;
  // gallery
  const gallery = content.querySelector('.gallery');
  gallery.innerHTML = '';
  (prod.images || []).forEach((src, i)=>{
    const im = document.createElement('img');
    im.src = src;
    im.alt = prod.name + ' ' + (i+1);
    im.className = 'modal-img';
    gallery.appendChild(im);
  });
  // description
  content.querySelector('.desc').textContent = prod.description || '';
  // price and options
  const meta = content.querySelector('.meta');
  meta.innerHTML = `<div class="modal-price">$${(prod.price||0).toFixed(2)}</div>`;
  if(prod.options){
    for(const [k,vals] of Object.entries(prod.options)){
      const row = document.createElement('div');
      row.className = 'opt-row';
      const label = document.createElement('label'); label.textContent = k.charAt(0).toUpperCase() + k.slice(1);
      const sel = document.createElement('select');
      sel.name = k;
      vals.forEach(v=>{
        const o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o);
      });
      row.appendChild(label); row.appendChild(sel);
      meta.appendChild(row);
    }
  }

  // Buy link
  const buyBtn = content.querySelector('.modal-buy');
  buyBtn.href = prod.paymentLink || '#';
  buyBtn.target = '_blank';

  // close handlers
  q('#product-modal .close').onclick = ()=> modal.classList.remove('open');
}

/* About dialog open/close */
function openAbout(){
  const modal = q('#about-modal');
  modal.classList.add('open');
}
function closeAbout(){
  q('#about-modal').classList.remove('open');
}

/* small helper: render homepage */
function showHome(){
  q('#main-title').textContent = APP.data.siteInfo.name;
  q('#main-subtitle').textContent = APP.data.siteInfo.tagline;
  buildCategories();
  // Show first category products preview
  if(APP.data.categories && APP.data.categories.length){
    renderCategoryProducts(APP.data.categories[0]);
  }
}

/* attach DOM handlers */
function attachEvents(){
  APP.elems.headerCat = q('#catalogue-dropdown');
  APP.elems.grid = q('#main-grid');
  q('#logo').addEventListener('click', ()=> { showHome(); window.scrollTo({top:0, behavior:'smooth'}); });
  q('#about-link').addEventListener('click', (e)=>{ e.preventDefault(); openAbout(); });
  // modal: close by overlay
  qAll = qa;
  const modal = q('#product-modal');
  modal.addEventListener('click', (ev)=>{
    if(ev.target === modal || ev.target.classList.contains('close')) modal.classList.remove('open');
  });
  const aboutModal = q('#about-modal');
  aboutModal.addEventListener('click', (ev)=>{
    if(ev.target === aboutModal || ev.target.classList.contains('close')) aboutModal.classList.remove('open');
  });
}

/* small polyfill for querySelectorAll NodeList forEach in older browsers */
function qAll(sel){ return document.querySelectorAll(sel); }

/* init */
document.addEventListener('DOMContentLoaded', ()=>{
  APP.elems.grid = q('#main-grid');
  attachEvents();
  loadCatalogue();
});
