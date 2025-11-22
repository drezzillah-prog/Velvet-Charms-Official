// catalogue-driven shop script for Velvet Charms
// Features: loads catalogue.json, renders nav + categories, product cards,
// details modal with personalization form, Add to Cart, Cart modal, favorites,
// locale price formatting with approximate EUR/RON conversion, post-pay message.

const FORM_ACTION = "https://formspree.io/f/YOUR_FORMSPREE_ID"; // <-- Replace with your Formspree endpoint
const CONTACT_EMAIL = "rosalinda.mauve@gmail.com"; // contact fallback

// Basic approximate conversion rates (display only; not for accounting)
const RATES = {
  EUR: 0.92, // 1 USD -> EUR (approx)
  RON: 4.5   // 1 USD -> RON (approx)
};

let catalogue = null;
let cart = JSON.parse(localStorage.getItem("vc_cart") || "[]");
let favorites = JSON.parse(localStorage.getItem("vc_favs") || "[]");
let userLocale = navigator.language || "en-US";

function fmtPriceUSD(v) {
  return v.toFixed(2) + " $";
}
function formatPriceForLocale(v) {
  // Choose currency by language hints
  if (/^ro\b/i.test(userLocale)) {
    return "≈ " + (v * RATES.RON).toFixed(2) + " RON";
  } else if (/^fr|^de|^es|^it|^nl|^pt\b/i.test(userLocale)) {
    return "≈ " + (v * RATES.EUR).toFixed(2) + " €";
  } else {
    // default USD locale formatting
    return v.toLocaleString(userLocale, { style: "currency", currency: "USD", minimumFractionDigits:2 });
  }
}

function qsel(s){return document.querySelector(s);}
function qall(s){return Array.from(document.querySelectorAll(s));}

async function loadCatalogue() {
  try {
    const res = await fetch("/catalogue.json");
    if(!res.ok) throw new Error("catalogue.json not loaded");
    catalogue = await res.json();
    renderSite();
  } catch (e) {
    console.error(e);
    showCatalogError();
  }
}

function showCatalogError(){
  const main = qsel("#main");
  main.innerHTML = `<div class="error">Error loading catalogue. Please ensure <code>/catalogue.json</code> is present in the site root.</div>`;
}

// NAV build
function renderNav() {
  const nav = qsel("#nav-categories");
  nav.innerHTML = "";
  const ul = document.createElement("ul");
  ul.className = "nav-cat-list";
  catalogue.categories.forEach(cat => {
    const li = document.createElement("li");
    li.className = "nav-cat-item";
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = cat.name;
    a.dataset.cat = cat.id;
    a.onclick = (ev) => { ev.preventDefault(); renderCategory(cat.id); }
    li.appendChild(a);

    // add dropdown for subcategories
    if (cat.subcategories && cat.subcategories.length) {
      const drop = document.createElement("div");
      drop.className = "nav-subcat";
      cat.subcategories.forEach(sc => {
        const sa = document.createElement("a");
        sa.href = "#";
        sa.textContent = sc.name;
        sa.onclick = (ev) => { ev.preventDefault(); renderSubcategory(cat.id, sc.id); }
        drop.appendChild(sa);
      });
      li.appendChild(drop);
    }
    ul.appendChild(li);
  });
  nav.appendChild(ul);
}

// Main page render
function renderSite() {
  renderNav();
  renderHeader();
  // show catalogue overview (categories grid)
  const main = qsel("#main");
  main.innerHTML = `<div class="categories-grid" id="categories-grid"></div>`;
  const grid = qsel("#categories-grid");
  catalogue.categories.forEach(cat => {
    const card = document.createElement("div");
    card.className = "category-card";
    const img = document.createElement("img");
    img.alt = cat.name;
    img.src = cat.categoryImage || cat.banner || "top banner picture for candles.png";
    img.loading = "lazy";
    const h = document.createElement("h3");
    h.textContent = cat.name;
    card.appendChild(img);
    card.appendChild(h);
    card.onclick = () => renderCategory(cat.id);
    grid.appendChild(card);
  });
  updateCartCount();
}

// header / hero
function renderHeader(){
  qsel("#site-title").textContent = catalogue.siteInfo.name + " ❄️";
  qsel("#site-tagline").textContent = catalogue.siteInfo.tagline;
  qsel("#about-text").innerHTML = `<h2>${catalogue.siteInfo.about.title}</h2><p class="about-text">${catalogue.siteInfo.about.text}</p>`;
  // About modal image and style adjustments done via CSS
}

// Category page render
function renderCategory(catId) {
  const cat = catalogue.categories.find(c => c.id === catId);
  if(!cat) return;
  const main = qsel("#main");
  main.innerHTML = `
    <div class="category-header">
      <img src="${cat.banner || cat.categoryImage || 'top banner picture for candles.png'}" alt="${cat.name}" loading="lazy"/>
      <div>
        <h2>${cat.name}</h2>
        ${cat.subcategories && cat.subcategories.length ? `<p class="subhint">Choose a subcategory below</p>` : ""}
      </div>
    </div>
    <div class="subcat-list" id="subcat-list"></div>
    <div id="products-grid" class="products-grid"></div>
  `;

  // subcategory list
  const scList = qsel("#subcat-list");
  if (cat.subcategories && cat.subcategories.length) {
    cat.subcategories.forEach(sc => {
      const btn = document.createElement("button");
      btn.className = "chip";
      btn.textContent = sc.name;
      btn.onclick = () => renderSubcategory(catId, sc.id);
      scList.appendChild(btn);
    });
    // open first subcategory by default
    renderSubcategory(catId, cat.subcategories[0].id);
  } else {
    // render products directly if none
    renderProducts(catId, null);
  }
}

// Subcategory page render
function renderSubcategory(catId, subcatId) {
  const cat = catalogue.categories.find(c => c.id === catId);
  const sc = cat.subcategories.find(s => s.id === subcatId);
  qsel("#products-grid").innerHTML = `<h3 class="sc-title">${sc.name}</h3><div class="products-list" id="products-list"></div>`;
  const container = qsel("#products-list");
  sc.products.forEach(p => {
    const card = productCard(p, cat, sc);
    container.appendChild(card);
  });
}

// product card creation
function productCard(p, cat, sc){
  const card = document.createElement("div");
  card.className = "product-card";
  const img = document.createElement("img");
  img.src = p.images && p.images.length ? p.images[0] : "wax_candle_small.png";
  img.alt = p.name;
  img.loading = "lazy";
  img.onerror = () => { img.style.opacity = 0.6; }
  const h = document.createElement("h4"); h.textContent = p.name;
  const price = document.createElement("div"); price.className="price";
  price.textContent = formatPriceForLocale(p.price || 0);
  const btns = document.createElement("div"); btns.className = "product-actions";
  const details = document.createElement("button"); details.className="btn details-btn"; details.textContent="Details";
  details.onclick = (ev) => { ev.preventDefault(); openDetailsModal(p, cat, sc); };
  const buy = document.createElement("button"); buy.className="btn buy-btn"; buy.textContent="Buy";
  buy.onclick = (ev) => { ev.preventDefault(); addToCartFromCard(p); };
  const fav = document.createElement("button"); fav.className="btn fav-btn"; fav.textContent = favorites.includes(p.id) ? "♥" : "♡";
  fav.onclick = () => { toggleFav(p.id, fav); };
  btns.appendChild(details);
  btns.appendChild(buy);
  btns.appendChild(fav);
  card.appendChild(img);
  card.appendChild(h);
  card.appendChild(price);
  card.appendChild(btns);
  return card;
}

function toggleFav(pid, btn) {
  const idx = favorites.indexOf(pid);
  if(idx === -1) favorites.push(pid); else favorites.splice(idx,1);
  localStorage.setItem("vc_favs", JSON.stringify(favorites));
  btn.textContent = favorites.includes(pid) ? "♥" : "♡";
}

// DETAILS modal (with personalization)
function openDetailsModal(product, cat, sc) {
  const modal = qsel("#details-modal");
  modal.style.display = "block";
  qsel("#details-close").onclick = () => modal.style.display = "none";
  const gallery = qsel("#details-gallery"); gallery.innerHTML = "";
  (product.images || []).forEach((src, i) => {
    const im = document.createElement("img");
    im.src = src;
    im.loading = "lazy";
    im.className = "details-thumb";
    gallery.appendChild(im);
  });
  qsel("#details-title").textContent = product.name;
  qsel("#details-desc").textContent = product.description || "";
  qsel("#details-price").textContent = formatPriceForLocale(product.price || 0);
  // build personalization form
  const form = qsel("#personalization-form");
  form.innerHTML = `
    <label>Choose scent / aroma (if available)</label>
    ${product.options && product.options.scent ? `<select name="scent" id="p_scent">${product.options.scent.map(s => `<option value="${s}">${s}</option>`).join("")}</select>` : ""}
    ${product.options && product.options.intensity ? `<label>Intensity</label><select name="intensity" id="p_int">${product.options.intensity.map(i=>`<option>${i}</option>`).join("")}</select>` : ""}
    <label>Personalization notes (size, names, details)</label>
    <textarea id="p_notes" placeholder="Add any details or attach images after checkout..."></textarea>
    <label>Upload up to 3 images (optional)</label>
    <input type="file" id="p_images" accept="image/*" multiple />
    <div class="modal-actions">
      <button id="personalize-add" class="btn">Add to Cart</button>
      <button id="personalize-buy" class="btn primary">Buy Now</button>
    </div>
  `;
  // handlers
  qsel("#personalize-add").onclick = (e) => {
    e.preventDefault();
    const personalization = collectPersonalization(product.id);
    addToCart(product, personalization);
    modal.style.display = "none";
    showToast("Added to cart");
  };
  qsel("#personalize-buy").onclick = (e) => {
    e.preventDefault();
    const personalization = collectPersonalization(product.id);
    // Save personalization to a temporary order and open PayPal link in new tab
    window.open(product.paymentLink || "#", "_blank");
    modal.style.display = "none";
    showPostPaymentNotice();
  };
}

function collectPersonalization(pid) {
  const scent = qsel("#p_scent") ? qsel("#p_scent").value : null;
  const intensity = qsel("#p_int") ? qsel("#p_int").value : null;
  const notes = qsel("#p_notes") ? qsel("#p_notes").value : "";
  // Note: file uploads are not posted to server here; stored in session as filenames only
  const files = qsel("#p_images") ? Array.from(qsel("#p_images").files).slice(0,3).map(f => f.name) : [];
  return { scent, intensity, notes, images: files, pid, ts: Date.now() };
}

// CART functions
function addToCartFromCard(product) {
  // open details modal quickly to collect personalization if options exist
  if(product.options && (product.options.scent || product.options.intensity)) {
    openDetailsModal(product);
    return;
  }
  addToCart(product, { notes: "", images: [], ts: Date.now() });
  showToast("Added to cart");
}

function addToCart(product, personalization) {
  const item = {
    id: product.id,
    name: product.name,
    price: product.price,
    qty: 1,
    paymentLink: product.paymentLink,
    personalization
  };
  cart.push(item);
  localStorage.setItem("vc_cart", JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount(){
  qsel("#cart-count").textContent = cart.length;
}

function openCartModal(){
  const modal = qsel("#cart-modal");
  const list = qsel("#cart-list");
  list.innerHTML = "";
  if(cart.length===0) list.innerHTML = "<p>Your cart is empty.</p>";
  cart.forEach((it, idx) => {
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `<div><strong>${it.name}</strong><div class="cart-price">${formatPriceForLocale(it.price)}</div>
      <div class="cart-personal">Notes: ${escapeHtml(it.personalization.notes || "")}</div></div>
      <div class="cart-actions">
        <button class="btn" data-i="${idx}" onclick="decreaseQty(event)">-</button>
        <span>${it.qty}</span>
        <button class="btn" data-i="${idx}" onclick="increaseQty(event)">+</button>
        <button class="btn danger" data-i="${idx}" onclick="removeCartItem(event)">Remove</button>
      </div>`;
    list.appendChild(div);
  });
  qsel("#checkout-btn").onclick = checkoutCart;
  modal.style.display = "block";
  qsel("#cart-close").onclick = () => modal.style.display = "none";
}

function decreaseQty(e){
  const i = +e.target.dataset.i;
  if(cart[i].qty>1) cart[i].qty--;
  localStorage.setItem("vc_cart", JSON.stringify(cart));
  openCartModal();
  updateCartCount();
}
function increaseQty(e){
  const i = +e.target.dataset.i;
  cart[i].qty++;
  localStorage.setItem("vc_cart", JSON.stringify(cart));
  openCartModal();
  updateCartCount();
}
function removeCartItem(e){
  const i = +e.target.dataset.i;
  cart.splice(i,1);
  localStorage.setItem("vc_cart", JSON.stringify(cart));
  openCartModal();
  updateCartCount();
}

function checkoutCart(){
  if(cart.length===0) { showToast("Cart is empty"); return; }
  // Create a simple pre-checkout form summary and open first product PayPal (or ask user)
  // For now we'll guide user: we'll open PayPal links in new tabs one by one for each item (simple flow)
  cart.forEach(it => {
    if(it.paymentLink) window.open(it.paymentLink, "_blank");
  });
  showPostPaymentNotice();
  // Note: in production you'd integrate a proper cart checkout server-side or PayPal cart API
}

function showPostPaymentNotice(){
  const modal = qsel("#postpay-modal");
  modal.style.display = "block";
  qsel("#postpay-close").onclick = () => modal.style.display = "none";
}

// UTIL
function escapeHtml(s){ return String(s||"").replace(/[&<>"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }

function showToast(msg){
  const t = document.createElement("div"); t.className="toast"; t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=> t.classList.add("visible"), 10);
  setTimeout(()=> { t.classList.remove("visible"); setTimeout(()=>t.remove(),300); }, 2500);
}

// DETAILS modal close on outside click
window.onclick = function(e) {
  const dm = qsel("#details-modal");
  const cm = qsel("#cart-modal");
  if (e.target === dm) dm.style.display = "none";
  if (e.target === cm) cm.style.display = "none";
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // wire top buttons
  qsel("#btn-catalogue").onclick = () => renderSite();
  qsel("#btn-about").onclick = () => { document.querySelector('#main').scrollIntoView({behavior:'smooth'}); };
  qsel("#btn-contact").onclick = () => qsel("#contact-form-wrap").scrollIntoView({behavior:'smooth'});
  qsel("#cart-open").onclick = openCartModal;
  qsel("#fav-open").onclick = () => { alert("Favorites: " + (favorites.length ? favorites.join(", ") : "none")); };
  loadCatalogue();
});
