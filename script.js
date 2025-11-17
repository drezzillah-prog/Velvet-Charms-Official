/* script.js - dynamic renderer for products.json */

async function loadProducts() {
  try {
    const res = await fetch('products.json');
    const data = await res.json();
    renderAll(data);
  } catch (err) {
    console.error('Failed to load products.json', err);
  }
}

/* utility to create product card */
function createCard(product) {
  const card = document.createElement('div');
  card.className = 'product-item';

  const img = document.createElement('img');
  img.src = product.image || 'placeholder.png';
  img.alt = product.name || 'Product';

  const h3 = document.createElement('h3');
  h3.textContent = product.name;

  const pDesc = document.createElement('p');
  pDesc.textContent = product.description || '';

  const price = document.createElement('p');
  price.textContent = product.price_usd ? `${product.price_usd} USD` : 'Price on request';

  const meta = document.createElement('div');
  meta.className = 'card-meta';

  const buy = document.createElement('button');
  buy.className = 'btn btn-buy';
  buy.textContent = 'Buy';
  buy.onclick = () => {
    if (product.paypal && product.paypal !== 'TODO') {
      window.open(product.paypal, '_blank');
    } else {
      // fallback: open contact form or ask for customization
      alert('This item needs checkout setup. Please contact us to order: use the Contact section.');
      document.getElementById('contact').scrollIntoView({behavior: 'smooth'});
    }
  };

  const more = document.createElement('button');
  more.className = 'btn btn-secondary';
  more.textContent = 'Details';
  more.onclick = () => {
    alert(`${product.name}\n\n${product.description || 'No description.'}`);
  };

  meta.appendChild(buy);
  meta.appendChild(more);

  card.appendChild(img);
  card.appendChild(h3);
  card.appendChild(pDesc);
  card.appendChild(price);
  card.appendChild(meta);

  return card;
}

/* render grouped categories (non-epoxy) */
function renderGroup(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = ''; // clear
  if (!items || items.length === 0) {
    container.innerHTML = '<p style="color:#666">No items yet.</p>';
    return;
  }
  items.forEach(p => container.appendChild(createCard(p)));
}

/* render epoxy & clay subcategories */
function renderEpoxySubsections(items) {
  const wrapper = document.getElementById('epoxy-subsections');
  if (!wrapper) return;
  wrapper.innerHTML = '';
  if (!items || items.length === 0) {
    wrapper.innerHTML = '<p style="color:#666">No epoxy items yet.</p>';
    return;
  }

  // group by subcategory (fallback to 'General')
  const groups = items.reduce((acc, item) => {
    const key = item.subcategory || 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  Object.keys(groups).forEach(sub => {
    const header = document.createElement('div');
    header.className = 'subcategory-header';
    header.innerHTML = `<strong>${sub}</strong>`;
    wrapper.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'product-list';
    groups[sub].forEach(p => grid.appendChild(createCard(p)));
    wrapper.appendChild(grid);
  });
}

/* main render function — expects structure keys matching index.html ids */
function renderAll(data) {
  // Non-epoxy groups (ids)
  renderGroup('candles-products', data.candles || []);
  renderGroup('soaps-products', data.soaps || []);
  renderGroup('creams-products', data.creams || []);
  renderGroup('knitted-products', data.knitted || []);
  renderGroup('hair-accessories-products', data.hair_accessories || []);
  renderGroup('perfumes-products', data.perfumes || []);
  renderGroup('artworks-products', data.artworks || []);
  renderGroup('leather-bags-products', data.leather_bags || []);
  renderGroup('home-decor-products', data.home_decor || []);
  renderGroup('bundles-products', data.bundles || []);

  // epoxy & clay special handling
  renderEpoxySubsections(data.epoxy_and_clay || []);
}

/* start */
loadProducts();
