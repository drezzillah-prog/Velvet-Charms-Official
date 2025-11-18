/* script.js - catalogue loader & UI */
const CATALOGUE_PATH = './catalogue.json';
const PLACEHOLDER = './top banner picture for candles.png'; // fallback if file missing (you have this file)

const el = id => document.getElementById(id);
const encode = (p) => encodeURI(p);

/* Helper: create element */
function create(tag, attrs = {}, text) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if(k === 'class') e.className = v;
    else if(k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v);
  });
  if(text) e.textContent = text;
  return e;
}

/* Load catalogue JSON */
async function loadCatalogue() {
  try {
    const res = await fetch(CATALOGUE_PATH);
    if(!res.ok) throw new Error('Catalogue not found');
    const data = await res.json();
    window.catalogue = data;
    populateNav(data);
    populateSidebar(data);
    populateHeroBanner(data);
    listProducts(data);
    setupSearch();
  } catch (err) {
    console.error('Error loading catalogue:', err);
    const errEl = create('div', {class:'error'}, 'Error loading catalogue. Check catalogue.json path and file names.');
    document.querySelector('#catalogue-main').prepend(errEl);
    errEl.style.display = 'block';
  }
}

/* Hero banner: pick candles banner if available */
function populateHeroBanner(data) {
  const banner = document.getElementById('hero-banner');
  const possible = 'top banner picture for candles.png';
  banner.src = encode(possible);
  banner.onerror = () => { banner.src = PLACEHOLDER; };
}

/* Build top nav */
function populateNav(data) {
  const nav = document.getElementById('main-nav');
  nav.innerHTML = '';
  (data.categories || []).forEach(cat=>{
    const a = create('a',{href:'#catalogue', 'data-cat':cat.id}, cat.title);
    a.addEventListener('click', (e)=>{
      e.preventDefault();
      filterByCategory(cat.id);
      // set active
      nav.querySelectorAll('a').forEach(x=>x.classList.remove('active'));
      a.classList.add('active');
    });
    nav.appendChild(a);
  });
}

/* Sidebar categories (clickable) */
function populateSidebar(data) {
  const list = document.getElementById('category-list');
  list.innerHTML='';
  (data.categories || []).forEach(cat=>{
    const btn = create('button', {class:''}, cat.title);
    btn.addEventListener('click', ()=> {
      // toggle active
      list.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      filterByCategory(cat.id);
    });
    list.appendChild(btn);
  });
}

/* Build catalogue grid of all items */
function listProducts(data, filter={}) {
  const grid = document.getElementById('catalogue-grid');
  grid.innerHTML = '';
  const items = [];

  (data.categories || []).forEach(cat=>{
    (cat.subgroups || []).forEach(sub=>{
      (sub.items || []).forEach(item=>{
        // annotate with category / subgroup for filtering
        item._category = cat.id;
        item._subgroup = sub.id;
        items.push(item);
      });
    });
  });

  // apply optional filters: category or subgroup or search
  let filtered = items;
  if(filter.category) filtered = filtered.filter(i=>i._category === filter.category);
  if(filter.subgroup) filtered = filtered.filter(i=>i._subgroup === filter.subgroup);
  if(filter.q) {
    const q = filter.q.toLowerCase();
    filtered = filtered.filter(i=> (i.name || '').toLowerCase().includes(q) || (i._category||'').includes(q) || (i._subgroup||'').includes(q));
  }

  if(filtered.length === 0) {
    grid.innerHTML = '<p style="padding:12px;background:#fff;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,0.06)">No products found.</p>';
    return;
  }

  filtered.forEach(product => {
    const card = create('article',{class:'product-item'});
    const img = create('img', {alt:product.name});
    // use first image or placeholder
    const first = (product.images && product.images.length) ? product.images[0] : PLACEHOLDER;
    img.src = encode(first);
    img.onerror = () => { img.src = encode(PLACEHOLDER); };
    card.appendChild(img);

    card.appendChild(create('h3',{}, product.name));
    const desc = create('p',{}, product.description ? product.description : (product._subgroup || '').toUpperCase());
    card.appendChild(desc);

    const price = create('p', {class:'price'}, `${formatPrice(product.price_usd)}`);
    card.appendChild(price);

    const actions = create('div', {class:'actions'});
    const buy = create('a', {href: product.paypal || '#', class:'buy', target:'_blank', rel:'noopener'}, 'Buy');
    const details = create('button', {class:'details'}, 'Details');
    details.addEventListener('click', ()=> openProductDetail(product));
    actions.appendChild(buy);
    actions.appendChild(details);
    card.appendChild(actions);
    grid.appendChild(card);
  });
}

function formatPrice(p) {
  if (p === undefined || p === null) return '—';
  return `${Number(p).toFixed(2)} USD`;
}

/* Filter by category id */
function filterByCategory(catId) {
  listProducts(window.catalogue, {category: catId});
  // populate subgroup filter dropdown
  const sel = document.getElementById('filter-subgroup');
  sel.innerHTML = '<option value="">All subgroups</option>';
  const cat = (window.catalogue.categories || []).find(c=>c.id === catId);
  if(cat) {
    (cat.subgroups || []).forEach(sg => {
      const opt = document.createElement('option'); opt.value = sg.id; opt.textContent = sg.title;
      sel.appendChild(opt);
    });
  }
}

/* Search setup */
function setupSearch() {
  el('search').addEventListener('input', (e)=>{
    const q = e.target.value.trim();
    listProducts(window.catalogue, { q });
  });
  el('filter-subgroup').addEventListener('change', (e)=>{
    const sg = e.target.value;
    if(sg === '') listProducts(window.catalogue);
    else listProducts(window.catalogue, { subgroup: sg });
  });
}

/* Product detail modal (accordion-style) - only one open at once */
function openProductDetail(product) {
  const container = el('product-detail');
  container.innerHTML = '';
  container.classList.add('open');
  container.setAttribute('aria-hidden','false');

  const closeBtn = create('button',{class:'btn'},'Close');
  closeBtn.style.float='right';
  closeBtn.addEventListener('click', () => {
    container.classList.remove('open');
    container.setAttribute('aria-hidden','true');
  });

  const title = create('h3',{}, product.name);
  const meta = create('div',{class:'meta'}, `${formatPrice(product.price_usd)} • ${product._category || ''} / ${product._subgroup || ''}`);

  // gallery main image
  const gallery = create('div',{class:'gallery'});
  const mainImg = create('img',{alt:product.name});
  const mainSrc = (product.images && product.images.length) ? product.images[0] : PLACEHOLDER;
  mainImg.src = encode(mainSrc);
  mainImg.onerror = ()=> mainImg.src = encode(PLACEHOLDER);
  gallery.appendChild(mainImg);

  // description & variants
  const description = create('p',{}, product.description || '');
  const variantsWrap = create('div',{class:'variants'});
  // size variant
  if(product.variants && product.variants.size_ml) {
    const selSize = create('select', {});
    product.variants.size_ml.forEach(s=> selSize.appendChild(create('option', {value:s}, s + ' ml')));
    variantsWrap.appendChild(selSize);
  }
  // scents
  if(product.variants && product.variants.scents) {
    const selScent = create('select', {});
    selScent.appendChild(create('option',{value:''}, 'Choose scent'));
    product.variants.scents.forEach(s=> selScent.appendChild(create('option', {value:s}, s)));
    variantsWrap.appendChild(selScent);
  }
  // intensity
  if(product.variants && product.variants.intensity) {
    const selInt = create('select', {});
    selInt.appendChild(create('option',{value:''}, 'Choose intensity'));
    product.variants.intensity.forEach(i=> selInt.appendChild(create('option',{value:i}, i)));
    variantsWrap.appendChild(selInt);
  }

  // thumbs
  const thumbs = create('div',{class:'thumbs'});
  (product.images || []).slice(0,10).forEach(imgName => {
    const t = create('img', {alt:'thumb'});
    t.src = encode(imgName);
    t.onerror = () => t.src = encode(PLACEHOLDER);
    t.addEventListener('click', ()=> { mainImg.src = encode(imgName); });
    thumbs.appendChild(t);
  });

  // actions
  const buyLink = create('a', {href: product.paypal || '#', target:'_blank', rel:'noopener', class:'btn'}, 'Buy with PayPal');
  buyLink.style.marginRight = '8px';

  const addToCartBtn = create('button', {class:'btn'}, 'Add to cart');
  addToCartBtn.addEventListener('click', ()=> {
    alert(`Added "${product.name}" to cart (demo).`);
  });

  container.appendChild(closeBtn);
  container.appendChild(title);
  container.appendChild(meta);
  container.appendChild(gallery);
  container.appendChild(thumbs);
  container.appendChild(description);
  container.appendChild(variantsWrap);
  container.appendChild(create('div',{style:'margin-top:12px;display:flex;gap:8px;'}, null));
  container.appendChild(buyLink);
  container.appendChild(addToCartBtn);

  // Close when clicking outside (optional)
  setTimeout(()=> { window.scrollTo({top:document.body.scrollHeight, behavior:'smooth'}); }, 50);
}

/* Initialize */
loadCatalogue();
