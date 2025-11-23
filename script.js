/* script.js - Velvet Charms
  Responsibilities:
  - Load /catalogue.json
  - Render categories, subcategories, products
  - Modal product details with images gallery
  - Simple cart & favorites (client-side localStorage)
  - PayPal link buttons (opens paypal url with selection info in new tab)
  - Currency formatting based on browser locale (no exchange live)
  - Contact form via Formspree (use your formspree ID in contactFormAction)
  - Christmas theme loads by default (styles toggled via class)
*/

/* ================== CONFIG =================== */
const contactFormAction = "https://formspree.io/f/your_formspree_id"; // <-- replace with real id if needed
const cataloguePath = "./catalogue.json";
const currencyLocale = navigator.language || "en-US";
const defaultCurrency = "USD";
const christmasDefault = true;

/* ================== STATE =================== */
let catalogue = null;
let cart = JSON.parse(localStorage.getItem("vc_cart") || "[]");
let favorites = JSON.parse(localStorage.getItem("vc_favs") || "[]");

/* ================== UTILITIES =================== */
function formatPrice(amount) {
  try {
    return new Intl.NumberFormat(currencyLocale, { style: "currency", currency: defaultCurrency }).format(amount);
  } catch (e) {
    return `$${amount.toFixed(2)}`;
  }
}

function el(tag, cls = "", attrs = {}) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  return node;
}

/* ================== LOAD CATALOGUE =================== */
async function loadCatalogue() {
  try {
    const res = await fetch(cataloguePath, {cache: "no-store"});
    if (!res.ok) throw new Error("Catalogue not found");
    catalogue = await res.json();
    renderSite();
  } catch (err) {
    showError(`Error loading catalogue. Please ensure /catalogue.json exists and is valid in site root.`);
    console.error(err);
  }
}

/* ================== RENDER SITE =================== */
function renderSite() {
  document.title = `${catalogue.siteInfo.name} — ${catalogue.siteInfo.tagline}`;
  // header
  renderHeader();
  // categories & catalogue
  renderCatalogue();
  // about
  renderAbout();
  // cart & fav counts
  updateUICounts();
  // wire contact form
  wireContactForm();
}

/* Header */
function renderHeader() {
  const headerTitle = document.querySelector("#site-title");
  if (headerTitle) headerTitle.textContent = catalogue.siteInfo.name + " ❄️";

  const tagline = document.querySelector("#site-tagline");
  if (tagline) tagline.textContent = catalogue.siteInfo.tagline;

  // Build nav categories dropdown under catalogue
  const dropdown = document.querySelector("#catalogue-dropdown");
  if (dropdown) {
    dropdown.innerHTML = "";
    for (const cat of catalogue.categories) {
      const item = el("li", "dd-item");
      const a = el("a", "link");
      a.href = "#";
      a.textContent = cat.name;
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        showCategory(cat.id);
      });
      item.appendChild(a);
      dropdown.appendChild(item);
    }
  }

  // Christmas theme on by default if configured
  if (christmasDefault) document.body.classList.add("theme-christmas");
}

/* Catalogue rendering */
function renderCatalogue() {
  const container = document.querySelector("#catalogue-root");
  if (!container) return;
  container.innerHTML = "";

  // show hero/banner
  const hero = el("div", "hero");
  const bannerImg = catalogue.siteInfo.banner || catalogue.banner || null;
  if (bannerImg) {
    const img = el("img", "hero-img", { src: catalogue.banner || catalogue.siteInfo.banner || "./top banner picture for candles.png", alt: "banner" });
    hero.appendChild(img);
  }
  const heroText = el("div", "hero-text");
  heroText.innerHTML = `<h1>${catalogue.siteInfo.name}</h1><p>${catalogue.siteInfo.tagline}</p>`;
  hero.appendChild(heroText);
  container.appendChild(hero);

  // categories tiles
  const categoriesWrap = el("div", "categories-grid");
  for (const cat of catalogue.categories) {
    const card = el("div", "cat-card");
    const img = el("img", "cat-thumb", { src: cat.categoryImage || cat.banner || (cat.subcategories && cat.subcategories[0] && cat.subcategories[0].products && cat.subcategories[0].products[0] && cat.subcategories[0].products[0].images ? cat.subcategories[0].products[0].images[0] : ""), alt: cat.name });
    const title = el("h3", "cat-name");
    title.textContent = cat.name;
    const btn = el("button", "btn btn-sm");
    btn.textContent = "Open";
    btn.addEventListener("click", () => showCategory(cat.id));
    card.appendChild(img);
    card.appendChild(title);
    card.appendChild(btn);
    categoriesWrap.appendChild(card);
  }
  container.appendChild(categoriesWrap);

  // initial: show first category
  if (catalogue.categories[0]) {
    showCategory(catalogue.categories[0].id);
  }
}

/* Display a category (subcategories + products) */
function showCategory(catId) {
  const container = document.querySelector("#catalogue-root");
  if (!container) return;
  container.querySelectorAll(".category-section").forEach(n => n.remove());

  const cat = catalogue.categories.find(c => c.id === catId);
  if (!cat) return;

  const section = el("div", "category-section");
  const heading = el("h2", "category-heading");
  heading.textContent = cat.name;
  section.appendChild(heading);

  // subcategories as tabs
  if (cat.subcategories && cat.subcategories.length) {
    const tabs = el("div", "subtabs");
    cat.subcategories.forEach((sub, idx) => {
      const tbtn = el("button", "tab-btn");
      tbtn.textContent = sub.name;
      tbtn.addEventListener("click", () => renderSubcategory(cat, sub));
      tabs.appendChild(tbtn);
      if (idx === 0) renderSubcategory(cat, sub);
    });
    section.appendChild(tabs);
  } else if (cat.products) {
    // fallback: category has top-level products
    const singleSub = { name: cat.name, products: cat.products };
    renderSubcategory(cat, singleSub, section);
  }

  document.querySelector("#catalogue-root").appendChild(section);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* Render subcategory products grid */
function renderSubcategory(cat, sub, parentSection) {
  const root = parentSection || document.querySelector(".category-section");
  // remove previous listings
  root.querySelectorAll(".products-grid").forEach(n => n.remove());

  const grid = el("div", "products-grid");
  for (const p of sub.products) {
    const card = el("div", "product-card");
    const img = el("img", "product-thumb", { src: p.images && p.images[0] ? p.images[0] : "", alt: p.name });
    const title = el("h4", "product-title");
    title.textContent = p.name;
    const price = el("div", "product-price");
    price.textContent = formatPrice(p.price || 0);
    const actions = el("div", "product-actions");
    const detailsBtn = el("button", "btn btn-primary details-btn");
    detailsBtn.textContent = "Details";
    detailsBtn.addEventListener("click", () => openProductModal(cat, sub, p));
    const buyBtn = el("button", "btn btn-accent buy-btn");
    buyBtn.textContent = "Buy";
    buyBtn.addEventListener("click", () => beginCheckout(p));
    const fav = el("button", "btn btn-fav");
    fav.innerHTML = favorites.includes(p.id) ? "♥" : "♡";
    fav.addEventListener("click", () => toggleFavorite(p, fav));
    actions.appendChild(detailsBtn);
    actions.appendChild(buyBtn);
    actions.appendChild(fav);
    card.appendChild(img);
    card.appendChild(title);
    card.appendChild(price);
    card.appendChild(actions);
    grid.appendChild(card);
  }
  root.appendChild(grid);
}

/* Toggle favorite */
function toggleFavorite(product, btn) {
  if (favorites.includes(product.id)) {
    favorites = favorites.filter(id => id !== product.id);
    btn.innerHTML = "♡";
  } else {
    favorites.push(product.id);
    btn.innerHTML = "♥";
  }
  localStorage.setItem("vc_favs", JSON.stringify(favorites));
  updateUICounts();
}

/* Begin checkout - show customization modal then allow add to cart */
function beginCheckout(product) {
  openProductModal(null, null, product, { startCheckout: true });
}

/* Cart operations */
function addToCart(product, quantity = 1, custom = {}) {
  cart.push({ productId: product.id, qty: quantity, custom });
  localStorage.setItem("vc_cart", JSON.stringify(cart));
  updateUICounts();
  alert("Added to cart. Open cart (top-right) to review and pay.");
}

/* Update counts in header */
function updateUICounts() {
  document.querySelectorAll(".cart-count").forEach(n => n.textContent = cart.length || 0);
  document.querySelectorAll(".fav-count").forEach(n => n.textContent = favorites.length || 0);
}

/* Modal product details */
function openProductModal(cat, sub, product, opts = {}) {
  const overlay = document.querySelector("#modal-overlay");
  const modal = document.querySelector("#product-modal");
  overlay.classList.add("visible");
  modal.classList.add("visible");
  // populate
  modal.querySelector(".modal-title").textContent = product.name;
  modal.querySelector(".modal-desc").textContent = product.description || "";
  modal.querySelector(".modal-price").textContent = formatPrice(product.price || 0);

  // gallery
  const gallery = modal.querySelector(".modal-gallery");
  gallery.innerHTML = "";
  if (product.images && product.images.length) {
    product.images.forEach((src, i) => {
      const img = el("img", "modal-img", { src, alt: product.name + " " + (i+1) });
      img.addEventListener("click", () => modal.querySelector(".modal-main-img").src = src);
      gallery.appendChild(img);
    });
    modal.querySelector(".modal-main-img").src = product.images[0];
  } else {
    modal.querySelector(".modal-main-img").src = "";
  }

  // options (scent/intensity/aroma)
  const optionsWrap = modal.querySelector(".modal-options");
  optionsWrap.innerHTML = "";

  if (product.options) {
    for (const [optName, optValues] of Object.entries(product.options)) {
      const row = el("div", "option-row");
      const label = el("label");
      label.textContent = optName.charAt(0).toUpperCase() + optName.slice(1);
      const select = el("select", "option-select");
      select.name = optName;
      for (const v of optValues) {
        const o = el("option");
        o.value = v;
        o.textContent = v;
        select.appendChild(o);
      }
      row.appendChild(label);
      row.appendChild(select);
      optionsWrap.appendChild(row);
    }
  }

  // quantity
  modal.querySelector(".modal-qty").value = 1;

  // add to cart vs buy now behavior
  const addButton = modal.querySelector(".modal-add");
  addButton.onclick = () => {
    const qty = parseInt(modal.querySelector(".modal-qty").value || "1", 10);
    // collect options
    const selects = modal.querySelectorAll(".option-select");
    const custom = {};
    selects.forEach(s => custom[s.name] = s.value);
    addToCart(product, qty, custom);
    closeModal();
  };

  const buyNow = modal.querySelector(".modal-buy");
  buyNow.onclick = () => {
    // redirect to PayPal link with product info; since we can't integrate full PayPal here, open provided paymentLink
    if (product.paymentLink) {
      window.open(product.paymentLink, "_blank");
    } else {
      alert("No direct payment link for this product. Add to cart and contact us to finalise payment.");
    }
  };

  // start checkout if requested
  if (opts.startCheckout) {
    // allow customization then add
  }
}

/* Close modal */
function closeModal() {
  document.querySelector("#modal-overlay").classList.remove("visible");
  document.querySelector("#product-modal").classList.remove("visible");
}

/* Search helpers (not requested but useful) */
function wireUI() {
  document.querySelectorAll(".modal-close").forEach(b => b.addEventListener("click", closeModal));
  document.querySelector("#modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "modal-overlay") closeModal();
  });

  // Cart open
  document.querySelectorAll(".open-cart").forEach(b => b.addEventListener("click", showCart));
}

/* Cart UI */
function showCart() {
  const cartModal = document.querySelector("#cart-modal");
  const overlay = document.querySelector("#modal-overlay");
  const list = cartModal.querySelector(".cart-list");
  list.innerHTML = "";
  if (!cart.length) {
    list.innerHTML = "<p>Your cart is empty.</p>";
  } else {
    cart.forEach((entry, idx) => {
      const prod = findProductById(entry.productId);
      if (!prod) return;
      const row = el("div", "cart-row");
      row.innerHTML = `<img src="${prod.images && prod.images[0] ? prod.images[0] : ''}" class="cart-thumb"><div class="cart-info"><strong>${prod.name}</strong><div>${formatPrice(prod.price)} x ${entry.qty}</div><div class="cart-custom">${entry.custom ? JSON.stringify(entry.custom) : ''}</div></div>`;
      const rem = el("button", "btn btn-danger");
      rem.textContent = "Remove";
      rem.addEventListener("click", () => {
        cart.splice(idx, 1);
        localStorage.setItem("vc_cart", JSON.stringify(cart));
        showCart();
        updateUICounts();
      });
      row.appendChild(rem);
      list.appendChild(row);
    });
    const total = cart.reduce((s, e) => {
      const p = findProductById(e.productId);
      return s + (p ? (p.price || 0) * e.qty : 0);
    }, 0);
    const totalRow = el("div", "cart-total");
    totalRow.innerHTML = `<strong>Total: ${formatPrice(total)}</strong>`;
    const checkout = el("button", "btn btn-accent");
    checkout.textContent = "Checkout (PayPal)";
    checkout.addEventListener("click", () => {
      // For now open the PayPal homepage — in production you'd create an order and redirect to PayPal checkout
      window.open("https://www.paypal.com", "_blank");
      alert("This will open PayPal. In production you should create a server-side order and redirect to PayPal Checkout. Also consider serverless webhook to confirm payments.");
    });
    list.appendChild(totalRow);
    list.appendChild(checkout);
  }

  overlay.classList.add("visible");
  cartModal.classList.add("visible");
}

/* Find product across catalogue */
function findProductById(id) {
  for (const cat of catalogue.categories) {
    if (cat.subcategories) {
      for (const sub of cat.subcategories) {
        if (sub.products) {
          for (const p of sub.products) {
            if (p.id === id) return p;
          }
        }
      }
    } else if (cat.products) {
      for (const p of cat.products) if (p.id === id) return p;
    }
  }
  return null;
}

/* Wire contact form */
function wireContactForm() {
  const form = document.querySelector("#contact-form");
  if (!form) return;
  form.action = contactFormAction;
  form.addEventListener("submit", (e) => {
    // Let Formspree handle it; add processing message
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    submit.textContent = "Sending...";
    setTimeout(() => {
      // restore (Formspree will actually do the send when form submits)
      submit.disabled = false;
      submit.textContent = "Send Message";
      alert("Contact form submitted (Formspree will deliver the message).");
    }, 800);
  });
}

/* Small error UI */
function showError(msg) {
  const elErr = document.querySelector("#error-box");
  if (elErr) {
    elErr.textContent = msg;
    elErr.style.display = "block";
  } else {
    alert(msg);
  }
}

/* Init */
window.addEventListener("DOMContentLoaded", () => {
  wireUI();
  loadCatalogue();
  // nav buttons
  document.querySelectorAll("[data-open-cart]").forEach(b => b.addEventListener("click", showCart));
});

/* Expose close functions to global (for inline HTML hooks) */
window.closeModal = closeModal;
window.openProductModal = openProductModal;
window.beginCheckout = beginCheckout;
