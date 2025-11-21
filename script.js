/* script.js - Velvet Charms site script
   - Loads catalogue.json
   - Renders categories and products
   - Product modal with gallery and buy link
   - Dropdown navigation and theme toggle
*/

(async function(){
  const catalogueUrl = '/catalogue.json';

  // DOM refs
  const catalogueSection = document.getElementById('catalogueSection');
  const categoryView = document.getElementById('categoryView');
  const categoryTitle = document.getElementById('categoryTitle');
  const productsGrid = document.getElementById('productsGrid');
  const productModal = document.getElementById('productModal');
  const modalClose = document.getElementById('modalClose');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalMainImg = document.getElementById('modalMainImg');
  const modalThumbs = document.getElementById('modalThumbs');
  const modalTitle = document.getElementById('modalTitle');
  const modalDesc = document.getElementById('modalDesc');
  const modalOptions = document.getElementById('modalOptions');
  const modalPrice = document.getElementById('modalPrice');
  const modalBuy = document.getElementById('modalBuy');
  const openCatalogueBtn = document.getElementById('openCatalogue');
  const openAboutBtn = document.getElementById('openAbout');
  const aboutSection = document.getElementById('aboutSection');
  const contactSection = document.getElementById('contactSection');
  const themeToggle = document.getElementById('themeToggle');
  const backToCatalogue = document.querySelector('.back-to-catalogue');

  let catalogue = null;

  // helpers
  function el(tag, props = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(props).forEach(([k,v])=>{
      if(k === 'class') e.className = v;
      else if(k === 'html') e.innerHTML = v;
      else e.setAttribute(k, String(v));
    });
    (Array.isArray(children)?children:[children]).flat().forEach(c=>{
      if(!c) return;
      if(typeof c === 'string') e.appendChild(document.createTextNode(c));
      else e.appendChild(c);
    });
    return e;
  }

  function hideSections() {
    document.getElementById('catalogueSection').classList.remove('hidden');
    categoryView.classList.add('hidden');
    aboutSection.classList.add('hidden');
    contactSection.classList.add('hidden');
    document.getElementById('catalogueSection').style.display = '';
  }

  // load catalogue.json
  try {
    const res = await fetch(catalogueUrl);
    if(!res.ok) throw new Error('catalogue.json not found');
    catalogue = await res.json();
  } catch (err) {
    console.error(err);
    catalogueSection.innerHTML = '<div class="error">Error loading catalogue. Please ensure /catalogue.json exists and is valid in site root.</div>';
    return;
  }

  // render categories
  function renderCategories(){
    catalogueSection.innerHTML = '';
    (catalogue.categories || []).forEach(cat=>{
      const img = cat.categoryImage || (cat.subcategories && cat.subcategories[0] && cat.subcategories[0].products && cat.subcategories[0].products[0] && cat.subcategories[0].products[0].images && cat.subcategories[0].products[0].images[0]) || 'top banner picture for candles.png';
      const subCount = cat.subcategories ? cat.subcategories.length : (cat.products?cat.products.length:0);
      const card = el('div',{class:'category-card'},[
        el('img',{src:img, alt:cat.name}),
        el('div',{},[
          el('h3',{},[cat.name]),
          el('p',{},[subCount + (subCount === 1 ? ' collection' : ' collections')]),
          el('div',{},[
            el('button',{class:'btn small', 'data-cat':cat.id},'View')
          ])
        ])
      ]);
      catalogueSection.appendChild(card);
    });

    // attach handlers
    catalogueSection.querySelectorAll('button[data-cat]').forEach(btn=>{
      btn.addEventListener('click', e=>{
        const catId = e.currentTarget.getAttribute('data-cat');
        openCategory(catId);
      });
    });
  }

  function findCategoryById(id){
    return catalogue.categories.find(c=>c.id === id);
  }

  // render products for category
  function openCategory(catId){
    const cat = findCategoryById(catId);
    if(!cat) return;
    document.getElementById('catalogueSection').style.display = 'none';
    categoryView.classList.remove('hidden');
    aboutSection.classList.add('hidden');
    contactSection.classList.add('hidden');
    categoryTitle.textContent = cat.name;
    productsGrid.innerHTML = '';

    // flatten subcategories -> products
    const subs = cat.subcategories || [];
    subs.forEach(sub=>{
      const header = el('h3',{class:'subcat-title'},[sub.name]);
      productsGrid.appendChild(header);
      const container = el('div',{class:'subcat-row'});
      (sub.products || []).forEach(prod=>{
        addProductCard(prod);
      });
    });

    // if cat has direct products (without subcategories)
    if(cat.products){
      (cat.products || []).forEach(prod=>{
        addProductCard(prod);
      });
    }

    // helper for product card
    function addProductCard(prod){
      // apply removeDetailsIndex to filter images displayed in details gallery
      const images = (prod.images || []).filter((_, i)=>!(prod.removeDetailsIndex && prod.removeDetailsIndex.includes(i)));
      const thumbnail = images[0] || 'top banner picture for candles.png';
      const card = el('div',{class:'product-card'},[
        el('img',{src:thumbnail, alt:prod.name}),
        el('h4',{},[prod.name]),
        el('div',{class:'price'},['$'+(prod.price||0).toFixed(2)]),
        el('p',{class:'muted'},[prod.description || '']),
        el('div',{},[
          el('button',{class:'btn small details', 'data-id':prod.id},'Details'),
          el('a',{class:'btn small', href:prod.paymentLink, target:'_blank'},'Buy')
        ])
      ]);
      productsGrid.appendChild(card);
    }

    // attach details handlers
    productsGrid.querySelectorAll('.details').forEach(btn=>{
      btn.addEventListener('click', e=>{
        const id = e.currentTarget.getAttribute('data-id');
        const prod = findProductById(id);
        if(prod) openProductModal(prod);
      });
    });
  }

  // Find product by id across categories
  function findProductById(id){
    for(const cat of (catalogue.categories||[])){
      if(cat.subcategories){
        for(const sub of cat.subcategories){
          if(sub.products){
            for(const p of sub.products){
              if(p.id === id) return p;
            }
          }
        }
      }
      if(cat.products){
        for(const p of cat.products){
          if(p.id === id) return p;
        }
      }
    }
    return null;
  }

  // product modal
  function openProductModal(prod){
    productModal.classList.remove('hidden');
    productModal.setAttribute('aria-hidden','false');

    const images = (prod.images || []).filter((_, i)=>!(prod.removeDetailsIndex && prod.removeDetailsIndex.includes(i)));
    const main = images[0] || 'top banner picture for candles.png';
    modalMainImg.src = main;
    modalMainImg.alt = prod.name;
    modalTitle.textContent = prod.name;
    modalDesc.textContent = prod.description || '';
    modalPrice.textContent = '$' + (prod.price || 0).toFixed(2);
    modalBuy.href = prod.paymentLink || '#';

    // options
    modalOptions.innerHTML = '';
    if(prod.options){
      Object.entries(prod.options).forEach(([optName,optVals])=>{
        const row = el('div',{class:'option-row'});
        row.appendChild(el('div',{class:'opt-label'},[optName.charAt(0).toUpperCase()+optName.slice(1)+': ']));
        optVals.forEach(v=>{
          const b = el('button',{class:'opt-btn', 'data-opt':optName, 'data-val':v},[v]);
          b.addEventListener('click', ()=>{
            // toggle active
            b.parentNode.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
            b.classList.add('active');
          });
          row.appendChild(b);
        });
        modalOptions.appendChild(row);
      });
    }

    // thumbs
    modalThumbs.innerHTML = '';
    images.forEach((src, idx)=>{
      const t = el('img',{src, alt: prod.name + ' ' + (idx+1)});
      if(idx === 0) t.classList.add('active');
      t.addEventListener('click', ()=>{
        modalMainImg.src = src;
        modalThumbs.querySelectorAll('img').forEach(im => im.classList.remove('active'));
        t.classList.add('active');
      });
      modalThumbs.appendChild(t);
    });
  }

  // close modal
  function closeModal(){
    productModal.classList.add('hidden');
    productModal.setAttribute('aria-hidden','true');
  }

  // nav handlers
  document.querySelectorAll('.main-nav a[data-nav]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      e.preventDefault();
      const nav = a.getAttribute('data-nav');
      if(nav === 'home'){
        document.getElementById('catalogueSection').style.display = '';
        categoryView.classList.add('hidden');
        aboutSection.classList.add('hidden');
        contactSection.classList.add('hidden');
      } else if(nav === 'about'){
        document.getElementById('catalogueSection').style.display = 'none';
        categoryView.classList.add('hidden');
        aboutSection.classList.remove('hidden');
        contactSection.classList.add('hidden');
      } else if(nav === 'contact'){
        document.getElementById('catalogueSection').style.display = 'none';
        categoryView.classList.add('hidden');
        aboutSection.classList.add('hidden');
        contactSection.classList.remove('hidden');
      } else if(nav === 'catalogue'){
        document.getElementById('catalogueSection').style.display = '';
        categoryView.classList.add('hidden');
        aboutSection.classList.add('hidden');
        contactSection.classList.add('hidden');
      }
    });
  });

  // catalogue dropdown links
  document.querySelectorAll('.dropdown a').forEach(a=>{
    a.addEventListener('click', e=>{
      e.preventDefault();
      const cat = a.getAttribute('data-cat');
      if(cat === 'about'){
        document.querySelector('[data-nav="about"]').click();
      } else if(cat === 'contact'){
        document.querySelector('[data-nav="contact"]').click();
      } else {
        openCategory(cat);
      }
    });
  });

  // theme toggle (Christmas default, allow toggle to inverse if user wants)
  themeToggle.addEventListener('click', ()=>{
    const isChristmas = document.body.classList.contains('christmas');
    if(isChristmas){
      document.body.classList.remove('christmas');
      themeToggle.textContent = 'Switch to Christmas Theme';
    } else {
      document.body.classList.add('christmas');
      themeToggle.textContent = '♥ Christmas Theme';
    }
  });

  // open catalogue CTA
  openCatalogueBtn.addEventListener('click', ()=> {
    document.getElementById('catalogueSection').style.display = '';
    categoryView.classList.add('hidden');
    aboutSection.classList.add('hidden');
    contactSection.classList.add('hidden');
    window.scrollTo({top:0,behavior:'smooth'});
  });

  openAboutBtn.addEventListener('click', ()=> {
    document.querySelector('[data-nav="about"]').click();
  });

  // close modal events
  modalClose.addEventListener('click', closeModal);
  modalCloseBtn.addEventListener('click', closeModal);
  window.addEventListener('keydown', (e)=> {
    if(e.key === 'Escape') closeModal();
  });
  productModal.addEventListener('click', (e)=>{
    if(e.target === productModal) closeModal();
  });

  // back-to-catalogue
  backToCatalogue.addEventListener('click', ()=>{
    document.getElementById('catalogueSection').style.display = '';
    categoryView.classList.add('hidden');
    aboutSection.classList.add('hidden');
    contactSection.classList.add('hidden');
    window.scrollTo({top:0,behavior:'smooth'});
  });

  // attach details buttons from initial load (for any additional view)
  document.addEventListener('click', (e)=>{
    if(e.target && e.target.matches && e.target.matches('.product-card .details, button.details')){
      e.preventDefault();
      const id = e.target.dataset.id;
      const prod = findProductById(id);
      if(prod) openProductModal(prod);
    }
  });

  // render top-level categories now
  renderCategories();

  // Show catalogue by default
  document.getElementById('catalogueSection').style.display = '';

  // make About text larger (additional beautify)
  document.querySelectorAll('.about-copy').forEach(n => n.style.fontSize = '1.3rem');

  // Additional small UX tweaks: make all images responsive and limited
  const style = document.createElement('style');
  style.innerHTML = `
    img{max-width:100%;height:auto}
    .product-card img{height:220px;object-fit:cover}
    .category-card img{width:120px;height:120px}
  `;
  document.head.appendChild(style);

})();
