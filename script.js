// Load catalogue JSON
const catalogue = JSON.parse(document.getElementById('catalogue-data').textContent);

const aboutText = document.getElementById('about-text');
aboutText.textContent = catalogue.siteInfo.about.text;

// Header & catalogue dropdown
const catalogueBtn = document.getElementById('catalogue-btn');
const catalogueDropdown = document.getElementById('catalogue-dropdown');
const categoriesList = document.getElementById('categories-list');

catalogueBtn.addEventListener('click', () => {
  catalogueDropdown.classList.toggle('hidden');
});

// Render categories in dropdown
catalogue.categories.forEach(cat => {
  const li = document.createElement('li');
  li.classList.add('dd-item');
  const a = document.createElement('a');
  a.href="#";
  a.textContent = cat.name;
  a.addEventListener('click', () => {
    renderProducts(cat);
    catalogueDropdown.classList.add('hidden');
  });
  li.appendChild(a);
  categoriesList.appendChild(li);
});

// Products rendering
const productsGrid = document.getElementById('products-grid');

function renderProducts(category) {
  productsGrid.innerHTML = '';
  if(category.subcategories){
    category.subcategories.forEach(sub => {
      sub.products.forEach(prod => {
        const card = document.createElement('div');
        card.classList.add('product-card');
        const img = document.createElement('img');
        img.className = 'product-thumb';
        img.src = prod.images?.[0] || 'https://via.placeholder.com/160';
        img.alt = prod.name;
        card.appendChild(img);

        const title = document.createElement('h4');
        title.className = 'product-title';
        title.textContent = prod.name;
        card.appendChild(title);

        const price = document.createElement('p');
        price.className = 'product-price';
        price.textContent = `$${prod.price}`;
        card.appendChild(price);

        const btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.textContent = 'View';
        btn.addEventListener('click', () => openModal(prod));
        card.appendChild(btn);

        productsGrid.appendChild(card);
      });
    });
  } else if(category.products){
    category.products.forEach(prod => {
      const card = document.createElement('div');
      card.classList.add('product-card');
      const img = document.createElement('img');
      img.className = 'product-thumb';
      img.src = prod.images?.[0] || 'https://via.placeholder.com/160';
      img.alt = prod.name;
      card.appendChild(img);

      const title = document.createElement('h4');
      title.className = 'product-title';
      title.textContent = prod.name;
      card.appendChild(title);

      const price = document.createElement('p');
      price.className = 'product-price';
      price.textContent = `$${prod.price}`;
      card.appendChild(price);

      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = 'View';
      btn.addEventListener('click', () => openModal(prod));
      card.appendChild(btn);

      productsGrid.appendChild(card);
    });
  }
}

// Product modal
const modalOverlay = document.getElementById('modal-overlay');
const modalMainImg = modalOverlay.querySelector('.modal-main-img');
const modalGallery = modalOverlay.querySelector('.modal-gallery');
const modalTitle = modalOverlay.querySelector('.modal-title');
const modalDesc = modalOverlay.querySelector('.modal-desc');
const optionsContainer = document.getElementById('options-container');
const modalQty = modalOverlay.querySelector('.modal-qty');

function openModal(prod){
  modalOverlay.classList.add('visible');
  modalMainImg.src = prod.images?.[0] || 'https://via.placeholder.com/300';
  modalTitle.textContent = prod.name;
  modalDesc.textContent = prod.description || '';
  modalGallery.innerHTML = '';
  optionsContainer.innerHTML = '';

  if(prod.images?.length > 1){
    prod.images.forEach(imgSrc => {
      const img = document.createElement('img');
      img.src = imgSrc;
      img.alt = prod.name;
      img.addEventListener('click', ()=> modalMainImg.src = imgSrc);
      modalGallery.appendChild(img);
    });
  }

  if(prod.options){
    Object.entries(prod.options).forEach(([opt, values]) => {
      const row = document.createElement('div');
      row.className = 'option-row';
      const select = document.createElement('select');
      select.className = 'option-select';
      values.forEach(v => {
        const optEl = document.createElement('option');
        optEl.value = v;
        optEl.textContent = v;
        select.appendChild(optEl);
      });
      row.appendChild(select);
      optionsContainer.appendChild(row);
    });
  }
}

modalOverlay.addEventListener('click', e => {
  if(e.target===modalOverlay) modalOverlay.classList.remove('visible');
});

// Cart (simplified)
const cartBtn = document.getElementById('cart-btn');
const cartModal = document.getElementById('cart-modal');
const cartList = document.getElementById('cart-list');
let cart = [];

cartBtn.addEventListener('click', () => {
  cartModal.classList.toggle('hidden');
  renderCart();
});

function renderCart(){
  cartList.innerHTML = '';
  cart.forEach(item=>{
    const row = document.createElement('div');
    row.className = 'cart-row';
    const img = document.createElement('img');
    img.className = 'cart-thumb';
    img.src = item.image || 'https://via.placeholder.com/64';
    const info = document.createElement('div');
    info.className = 'cart-info';
    info.textContent = `${item.name} x ${item.qty} - $${item.price*item.qty}`;
    row.appendChild(img);
    row.appendChild(info);
    cartList.appendChild(row);
  });
}

document.getElementById('add-to-cart-btn').addEventListener('click', ()=>{
  const name = modalTitle.textContent;
  const price = parseFloat(modalDesc.textContent.match(/\$?(\d+\.?\d*)/)?.[1]||0);
  const qty = parseInt(modalQty.value);
  const image = modalMainImg.src;
  cart.push({name, price, qty, image});
  modalOverlay.classList.remove('visible');
  document.getElementById('cart-count').textContent = cart.reduce((a,b)=>a+b.qty,0);
});
