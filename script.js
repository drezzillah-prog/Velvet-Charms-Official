// script.js - full client-side rendering for static site
const DATA_SRC = 'catalogue.json';

// utility
function q(sel) { return document.querySelector(sel); }
function ell(tag, cls, txt){ const e = document.createElement(tag); if(cls) e.className = cls; if(txt!==undefined) e.textContent = txt; return e; }

let CATALOG = null;

async function loadCatalog(){
  if(CATALOG) return CATALOG;
  const res = await fetch(DATA_SRC);
  CATALOG = await res.json();
  return CATALOG;
}

function buildMainNav(categories){
  const nav = q('#main-nav');
  nav.innerHTML = '';
  const aHome = document.createElement('a');
  aHome.href = 'index.html';
  aHome.textContent = 'Home';
  nav.appendChild(aHome);
  const aCat = document.createElement('a');
  aCat.href = 'catalogue.html';
  aCat.textContent = 'Catalogue';
  nav.appendChild(aCat);
  const aAbout = document.createElement('a');
  aAbout.href = 'about.html';
  aAbout.textContent = 'About';
  nav.appendChild(aAbout);
  const aContact = document.createElement('a');
  aContact.href = 'contact.html';
  aContact.textContent = 'Contact';
  nav.appendChild(aContact);
}

function imageExists(src){
  // can't reliably check existence cross-origin; rely on correct filenames in repo.
  return src;
}

function renderProductCard(product){
  const card = ell('article','card product-card');
  const img = ell('img','thumb');
  img.src = product.images && product.images[0] ? imageExists(product.images[0]) : 'seasonal candle.png';
  img.alt = product.name;
  card.appendChild(img);

  const body = ell('div','card-body');
  body.appendChild(ell('h3',null,product.name));
  body.appendChild(ell('p','price',`${product.price} ${product.currency}`));
  const btn = ell('a','btn','View');
  btn.href = `product.html?id=${encodeURIComponent(product.id)}`;
  body.appendChild(btn);
  card.appendChild(body);
  return card;
}

function renderProductsGrid(products, containerId='product-list'){
  const out = q(`#${containerId}`);
  if(!out) return;
  out.innerHTML = '';
  if(products.length===0){
    out.appendChild(ell('p',null,'No products found.'));
    return;
  }
  products.forEach(p => out.appendChild(renderProductCard(p)));
}

function findProductById(id){
  return CATALOG.products.find(p => p.id === id);
}

function renderProductDetail(product){
  const container = q('#product-detail');
  if(!container) return;
  container.innerHTML = '';

  const wrapper = ell('div','product-wrap');
  const gallery = ell('div','gallery');
  if(product.images && product.images.length){
    product.images.forEach(src => {
      const im = ell('img','gallery-img');
      im.src = imageExists(src);
      im.alt = product.name;
      gallery.appendChild(im);
    });
  } else {
    const im = ell('img','gallery-img');
    im.src = 'seasonal candle.png';
    gallery.appendChild(im);
  }

  const info = ell('div','product-info');
  info.appendChild(ell('h2',null,product.name));
  info.appendChild(ell('p','desc',product.description || ''));
  info.appendChild(ell('p','price',`${product.price} ${product.currency}`));

  // options if any
  if(product.options){
    Object.keys(product.options).forEach(opt => {
      const lines = product.options[opt];
      const label = ell('label',null,opt.charAt(0).toUpperCase()+opt.slice(1));
      const select = document.createElement('select');
      select.name = opt;
      lines.forEach(li => {
        const o = document.createElement('option');
        o.value = li;
        o.textContent = li;
        select.appendChild(o);
      });
      info.appendChild(label);
      info.appendChild(select);
    });
  }

  // PayPal link
  const buyArea = ell('div','buy-area');
  const paypal = ell('a','btn btn-paypal','Buy with PayPal');
  paypal.href = product.paypalLink || '#';
  paypal.target = '_blank';
  buyArea.appendChild(paypal);
  info.appendChild(buyArea);

  // Customization / extra details + attachment
  const customBox = ell('div','custom-box');
  customBox.appendChild(ell('h3',null,'Customization & files'));
  customBox.appendChild(ell('p',null,'If you want custom text, reference images or instructions, enter details below. You can attach one file (image/pdf) to share ideas. Files are not uploaded to a server by this static page — implement server-side handling if you want to receive uploads.'));

  const form = ell('form','custom-form');
  form.id = 'custom-form';

  const textarea = document.createElement('textarea');
  textarea.name = 'customNote';
  textarea.placeholder = 'Describe your customization (size, color, personalization, photo reference etc.)';
  form.appendChild(textarea);

  const fileLabel = ell('label',null,'Attach a file (optional)');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.name = 'attachment';
  fileInput.accept = 'image/*,application/pdf';
  fileInput.id = 'attachment';
  form.appendChild(fileLabel);
  form.appendChild(fileInput);

  const preview = ell('div','file-preview');
  preview.id = 'file-preview';
  form.appendChild(preview);

  const infoNote = ell('p','small','When you click the PayPal button, include your customization note in the PayPal notes or message to seller. If you need server-side uploads, I can add a small upload endpoint later.');
  form.appendChild(infoNote);

  // Local client-side capture (for UX)
  fileInput.addEventListener('change', (e) => {
    const fp = q('#file-preview');
    fp.innerHTML = '';
    const f = e.target.files[0];
    if(!f) return;
    const p = ell('p',null,`${f.name} (${Math.round(f.size/1024)} KB)`);
    fp.appendChild(p);
    if(f.type.startsWith('image/')){
      const img = ell('img','file-thumb');
      img.src = URL.createObjectURL(f);
      img.onload = () => URL.revokeObjectURL(img.src);
      fp.appendChild(img);
    } else {
      fp.appendChild(ell('p',null,'File ready for upload (server not configured)'));
    }
  });

  customBox.appendChild(form);
  info.appendChild(customBox);

  wrapper.appendChild(gallery);
  wrapper.appendChild(info);
  container.appendChild(wrapper);
}

async function route(){
  const path = location.pathname.split('/').pop();
  const data = await loadCatalog();
  buildMainNav(data.categories);

  // if we're on product page
  const urlParams = new URLSearchParams(location.search);
  if(path === 'product.html'){
    const id = urlParams.get('id');
    if(!id){ q('#product-detail').innerHTML = '<p>Product not found.</p>'; return; }
    const product = findProductById(id);
    if(!product){ q('#product-detail').innerHTML = '<p>Product not found.</p>'; return; }
    renderProductDetail(product);
    return;
  }

  // catalogue page
  if(path === '' || path === 'index.html' || path === 'catalogue.html'){
    // build category list
    const catList = q('#category-list');
    const categories = data.categories;
    if(catList){
      catList.innerHTML = '';
      categories.forEach(cat => {
        const li = ell('li');
        const a = ell('a',null,cat.name);
        a.href = `catalogue.html?cat=${encodeURIComponent(cat.id)}`;
        li.appendChild(a);
        catList.appendChild(li);
      });
    }

    // If specific category requested show its products
    const params = new URLSearchParams(location.search);
    const catParam = params.get('cat');
    let productsToShow = data.products.slice();
    if(catParam){
      const subcats = data.subcategories.filter(s => s.category === catParam).map(s => s.id);
      productsToShow = data.products.filter(p => {
        if(p.category === catParam) return true;
        if(subcats.includes(p.subcategory)) return true;
        return false;
      });
      q('#subcat-title').innerHTML = `<h2>${(data.categories.find(c=>c.id===catParam)||{name:catParam}).name}</h2>`;
    } else {
      q('#subcat-title').innerHTML = '<h2>All products</h2>';
    }

    renderProductsGrid(productsToShow, 'product-list');
    // also render small category cards on index page
    if(path === '' || path === 'index.html'){
      const catContainer = q('#categories');
      if(catContainer){
        catContainer.innerHTML = '';
        categories.forEach(cat => {
          const c = ell('div','cat-card');
          const img = ell('img');
          img.src = cat.banner ? cat.banner : 'seasonal candle.png';
          img.alt = cat.name;
          c.appendChild(img);
          const h = ell('h3',null,cat.name);
          c.appendChild(h);
          const link = ell('a','btn','Browse');
          link.href = `catalogue.html?cat=${encodeURIComponent(cat.id)}`;
          c.appendChild(link);
          catContainer.appendChild(c);
        });
      }
    }
    return;
  }
}

// run
route().catch(err => {
  console.error(err);
});
