// script.js
async function loadProducts(){
  try{
    const res = await fetch('products.json', {cache: "no-store"});
    const data = await res.json();
    renderGrid(data.products || []);
  }catch(err){
    console.error('Failed to load products.json', err);
    document.getElementById('product-grid').innerHTML = '<p style="color:#b33">Failed to load products. Make sure products.json exists in the repo root.</p>';
  }
}

function renderGrid(products){
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '';
  // show two rows of 4 columns — CSS grid handles wrapping/responsive
  products.forEach(p=>{
    const card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-media">
        <img src="${sanitize(p.image)}" alt="${escapeHtml(p.title)}" />
      </div>
      <div class="product-body">
        <div>
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.description || '')}</p>
        </div>
        <div class="actions">
          <div class="price">${p.price ? formatPrice(p.price) : ''}</div>
          ${p.paypal ? `<a class="buy-btn" href="${sanitize(p.paypal)}" target="_blank" rel="noopener">Buy — ${p.price?formatPrice(p.price):'Pay'}</a>` : `<button class="buy-btn" disabled>Not For Sale</button>`}
          <button class="wishlist" data-id="${p.id}" title="I love it">★</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  // wishlist toggle
  document.querySelectorAll('.wishlist').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      btn.classList.toggle('active');
      // store in localStorage
      const id = btn.getAttribute('data-id');
      const love = JSON.parse(localStorage.getItem('vc_love')||'[]');
      if(btn.classList.contains('active')){
        if(!love.includes(id)) love.push(id);
      } else {
        const idx = love.indexOf(id);
        if(idx>=0) love.splice(idx,1);
      }
      localStorage.setItem('vc_love', JSON.stringify(love));
    });
  });
}

function formatPrice(p){
  // currency base USD; show as $NN
  return typeof p === 'number' ? `$${p.toFixed(2)}` : p;
}

function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function sanitize(u){ return u ? u.replace(/[\r\n"]/g,'') : ''; }

// small helper — scroll to section
function scrollToSection(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.scrollIntoView({behavior:'smooth', block:'start'});
}

// simple region detect placeholder — returns countryCode or null
async function detectRegion(){
  // placeholder - you can wire a geo-ip service here later.
  // For now we try browser language as a soft hint:
  const lang = (navigator.language||'').split('-')[1] || (navigator.language||'').split('-')[0];
  return lang ? lang.toUpperCase() : null;
}

window.addEventListener('DOMContentLoaded', async ()=>{
  await loadProducts();
  // optional: read saved wishlist and set active
  const love = JSON.parse(localStorage.getItem('vc_love')||'[]');
  love.forEach(id=>{
    const btn = document.querySelector(`.wishlist[data-id="${id}"]`);
    if(btn) btn.classList.add('active');
  });
  // detect region (placeholder)
  const region = await detectRegion();
  if(region){
    console.info('Detected region (best-effort):', region);
    // you can add a UI label or currency adjustments here later
  }
});
