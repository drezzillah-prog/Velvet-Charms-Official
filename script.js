/* script.js - loads products.json and renders the catalogue with galleries & modal details.
   Expects products.json in same directory and images filenames exactly as in repo.
*/

const CATEGORY_ORDER = [
  { key: "Candles", label: "Candles" },
  { key: "Soaps", label: "Soaps" },
  { key: "Creams", label: "Creams" },
  { key: "Knitted & Braided", label: "Knitted & Braided" },
  { key: "Felted Animals", label: "Felted Animals" },
  { key: "Epoxy & Clay Creations", label: "Epoxy & Clay Creations" },
  { key: "Hair Accessories", label: "Hair Accessories" },
  { key: "Perfumes", label: "Perfumes" },
  { key: "Artworks", label: "Artworks" },
  { key: "Leather Bags", label: "Leather Bags" },
  { key: "Home Decor", label: "Home Decor" },
  { key: "Bundles", label: "Bundles" }
];

let products = [];

async function loadProducts() {
  try {
    const res = await fetch("products.json");
    products = await res.json();
    renderAccordion();
  } catch (err) {
    console.error("Failed to load products.json", err);
    document.querySelector("#catalogue").innerHTML = "<p style='color:#900'>Error loading catalogue.</p>";
  }
}

function groupByCategory(list) {
  const map = {};
  list.forEach(p => {
    const cat = p.mainCategory || p.category || "Other";
    if (!map[cat]) map[cat] = [];
    map[cat].push(p);
  });
  return map;
}

function renderAccordion() {
  const grouped = groupByCategory(products);
  const container = document.getElementById("accordion");
  container.innerHTML = "";

  CATEGORY_ORDER.forEach(catObj => {
    const items = grouped[catObj.key] || [];
    const panel = document.createElement("div");
    panel.className = "panel";

    const header = document.createElement("div");
    header.className = "panel-header";
    header.innerHTML = `<h3>${catObj.label}</h3><div><small>${items.length} items</small></div>`;
    header.addEventListener("click", () => togglePanel(panel));
    panel.appendChild(header);

    const body = document.createElement("div");
    body.className = "panel-body";

    if (items.length === 0) {
      body.innerHTML = `<p style="color:#666">No items yet in this category.</p>`;
    } else {
      const grid = document.createElement("div");
      grid.className = "product-list";
      items.forEach(prod => grid.appendChild(createProductCard(prod)));
      body.appendChild(grid);
    }

    panel.appendChild(body);
    container.appendChild(panel);
  });
}

// Close other panels (only one open at a time).
function togglePanel(panel) {
  const all = document.querySelectorAll(".panel");
  all.forEach(p => {
    if (p === panel) {
      const body = p.querySelector(".panel-body");
      const opened = body.style.display === "block";
      // close all
      document.querySelectorAll(".panel .panel-body").forEach(b => b.style.display = "none");
      if (!opened) body.style.display = "block";
    } else {
      p.querySelector(".panel-body").style.display = "none";
    }
  });
}

function createProductCard(prod) {
  const card = document.createElement("article");
  card.className = "product-item";

  const mainImg = (prod.images && prod.images.length) ? prod.images[0] : (prod.image || "");
  const imgWrap = document.createElement("div");
  imgWrap.className = "img-wrap";
  imgWrap.innerHTML = `<img loading="lazy" class="main-img" src="${mainImg}" alt="${escapeHTML(prod.name)}">`;

  // thumbs
  const thumbs = document.createElement("div");
  thumbs.className = "thumbs";
  (prod.images || []).slice(0,10).forEach((src, i) => {
    const t = document.createElement("img");
    t.src = src;
    t.loading = "lazy";
    if (i === 0) t.classList.add("active");
    t.addEventListener("click", () => {
      imgWrap.querySelector(".main-img").src = src;
      thumbs.querySelectorAll("img").forEach(x=>x.classList.remove("active"));
      t.classList.add("active");
    });
    thumbs.appendChild(t);
  });

  const title = document.createElement("h4");
  title.textContent = prod.name;

  const price = document.createElement("p");
  price.className = "price";
  price.textContent = `${formatPrice(prod.price_usd)}`;

  const actions = document.createElement("div");
  actions.className = "actions";

  const buy = document.createElement("a");
  buy.className = "btn btn-buy";
  buy.href = prod.paypal || "#";
  buy.target = "_blank";
  buy.rel = "noopener";
  buy.textContent = "Buy";

  const details = document.createElement("button");
  details.className = "btn btn-details";
  details.textContent = "Details";
  details.addEventListener("click", () => openModal(prod));

  actions.appendChild(buy);
  actions.appendChild(details);

  card.appendChild(imgWrap);
  if ((prod.images || []).length) card.appendChild(thumbs);
  card.appendChild(title);
  card.appendChild(price);
  card.appendChild(actions);

  return card;
}

function formatPrice(v) {
  if (v === undefined || v === null) return "";
  if (typeof v === "number") return `${v} USD`;
  return `${v} USD`;
}

function openModal(prod) {
  const modal = document.getElementById("modal");
  const body = document.getElementById("modal-body");
  body.innerHTML = "";

  const gallery = document.createElement("div");
  gallery.className = "product-gallery";

  const main = document.createElement("div");
  main.className = "gallery-main";
  const mainImg = document.createElement("img");
  mainImg.src = (prod.images && prod.images.length) ? prod.images[0] : (prod.image || "");
  mainImg.alt = prod.name;
  main.appendChild(mainImg);

  const info = document.createElement("div");
  info.className = "product-info";
  info.innerHTML = `<h2>${escapeHTML(prod.name)}</h2>
    <p style="font-weight:700">${formatPrice(prod.price_usd)}</p>
    <p>${escapeHTML(prod.description || "")}</p>`;

  // variants
  if (prod.variants) {
    const vWrap = document.createElement("div");
    vWrap.className = "variant-list";
    Object.entries(prod.variants).forEach(([k, arr]) => {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.innerHTML = `<strong>${k}:</strong> ${Array.isArray(arr) ? arr.join(", ") : String(arr)}`;
      vWrap.appendChild(chip);
    });
    info.appendChild(vWrap);
  }

  // images thumbnails (modal)
  const thumbsBox = document.createElement("div");
  thumbsBox.style.marginTop = "12px";
  (prod.images || []).slice(0,10).forEach(src => {
    const img = document.createElement("img");
    img.src = src;
    img.loading = "lazy";
    img.style.width = "64px";
    img.style.height = "64px";
    img.style.objectFit = "cover";
    img.style.marginRight = "8px";
    img.style.cursor = "pointer";
    img.style.borderRadius = "6px";
    img.addEventListener("click", () => mainImg.src = src);
    thumbsBox.appendChild(img);
  });

  // paypal / buy
  const buyBtn = document.createElement("a");
  buyBtn.className = "btn btn-buy";
  buyBtn.href = prod.paypal || "#";
  buyBtn.target = "_blank";
  buyBtn.rel = "noopener";
  buyBtn.textContent = "Buy via PayPal";

  info.appendChild(thumbsBox);
  info.appendChild(document.createElement("br"));
  info.appendChild(buyBtn);

  gallery.appendChild(main);
  gallery.appendChild(info);

  body.appendChild(gallery);

  document.getElementById("modal").classList.add("open");
  document.getElementById("modal").setAttribute("aria-hidden", "false");
}

function closeModal() {
  document.getElementById("modal").classList.remove("open");
  document.getElementById("modal").setAttribute("aria-hidden", "true");
  document.getElementById("modal-body").innerHTML = "";
}

document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("modal")) closeModal();
  });
});

// small util
function escapeHTML(s) {
  if (!s && s !== 0) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
