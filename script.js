/* ------------------------------------------------------
   script.js — Velvet Charms (Christmas Edition)
   OPTION B — Loads each category from separate JSON files
------------------------------------------------------- */

(function () {

  // Simple helper
  const $ = (sel, root = document) => root.querySelector(sel);

  // GLOBAL STATE
  window.CATALOG = null;
  window.cart = {};
  window.wishlist = {};

  // CATEGORY JSON LIST
  const CATEGORY_FILES = [
    "soaps.json",
    "candles.json",
    "wool.json",
    "epoxy.json",
    "hair.json",
    "bundles.json",
    "perfumes.json",
    "paintings.json"
  ];

  /* ------------------------------------------------------
     LOAD CATALOGUE (catalogue.json + category JSONs)
  ------------------------------------------------------- */

  async function loadCatalogue() {
    try {
      // Load main catalogue.json
      const catResp = await fetch("/data/catalogue.json", { cache: "no-store" });
      if (!catResp.ok) throw new Error("catalogue.json missing");
      const base = await catResp.json();

      // Load each category file
      for (let file of CATEGORY_FILES) {
        const resp = await fetch(`/data/${file}`, { cache: "no-store" });
        if (!resp.ok) {
          console.warn("Missing:", file);
          continue;
        }
        const section = await resp.json();

        // Inject this category data
        // Must match: section.id = category.id
        const target = base.categories.find(c => c.id === section.id);
        if (target) {
          target.subcategories = section.subcategories || [];
          target.products = section.products || [];
        }
      }

      window.CATALOG = base;
      return base;

    } catch (err) {
      console.error("Catalogue load failed:", err);
      const grid = $("#catalogueGrid");
      if (grid) grid.innerHTML = `<p class="error">Failed to load catalogue.</p>`;
    }
  }

  /* ------------------------------------------------------
     SNOWFALL — soft falling snowflakes
  ------------------------------------------------------- */

  function startSnowfall() {
    const snowflakeChars = ["❄", "✼", "✻"];
    setInterval(() => {
      const snow = document.createElement("div");
      snow.className = "snowflake";
      snow.textContent = snowflakeChars[Math.floor(Math.random() * snowflakeChars.length)];
      snow.style.left = Math.random() * 100 + "vw";
      snow.style.fontSize = (Math.random() * 10 + 10) + "px";
      snow.style.animationDuration = (Math.random() * 5 + 5) + "s";
      document.body.appendChild(snow);
      setTimeout(() => snow.remove(), 10000);
    }, 500);
  }

  /* ------------------------------------------------------
     UI HELPERS
  ------------------------------------------------------- */

  const fmt = n => `USD ${Number(n).toFixed(2)}`;

  const createImg = (src, alt = "", cls = "") => {
    const img = document.createElement("img");
    img.src = `/data/${src}`;
    img.alt = alt;
    if (cls) img.className = cls;
    img.onerror = () => { img.src = "/data/seasonal candle.png"; };
    return img;
  };

  function syncCountsToUI() {
    const count = Object.values(window.cart).reduce((s, x) => s + x.qty, 0);
    const fav = Object.keys(window.wishlist).length;

    ["cartCount", "cartCount2", "cartCount3", "cartCount4"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = count;
    });

    ["favCount", "favCount2", "favCount3", "favCount4"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = fav;
    });
  }

  /* ------------------------------------------------------
     CART RESTORE/PERSIST
  ------------------------------------------------------- */

  function restoreCart() {
    try {
      window.cart = JSON.parse(localStorage.getItem("vc_cart") || "{}");
    } catch {
      window.cart = {};
    }
    renderCartUI();
    syncCountsToUI();
  }

  function persistCart() {
    localStorage.setItem("vc_cart", JSON.stringify(window.cart));
    renderCartUI();
    syncCountsToUI();
  }

  function restoreWishlist() {
    try {
      window.wishlist = JSON.parse(localStorage.getItem("vc_wishlist") || "{}");
    } catch {
      window.wishlist = {};
    }
    syncCountsToUI();
  }

  function persistWishlist() {
    localStorage.setItem("vc_wishlist", JSON.stringify(window.wishlist));
    syncCountsToUI();
  }

  /* ------------------------------------------------------
     RENDER CATALOGUE PAGE
  ------------------------------------------------------- */

  window.renderCataloguePage = function () {
    const list = $("#categoriesList");
    const grid = $("#catalogueGrid");
    if (!list || !grid || !window.CATALOG) return;

    list.innerHTML = "";
    grid.innerHTML = "";

    window.CATALOG.categories.forEach(cat => {
      const b = document.createElement("button");
      b.className = "category-btn";
      b.textContent = cat.name;
      b.onclick = () => renderCategory(cat.id);
      list.appendChild(b);

      // Show category cards
      const card = document.createElement("article");
      card.className = "cat-card";

      const wrap = document.createElement("div");
      wrap.className = "cat-img";
      const preview =
        (cat.subcategories?.[0]?.products?.[0]?.images?.[0]) ||
        "seasonal candle.png";

      wrap.appendChild(createImg(preview, cat.name));

      const body = document.createElement("div");
      body.className = "cat-body";

      const h = document.createElement("h3");
      h.textContent = cat.name;

      const p = document.createElement("p");
      let count = 0;
      if (cat.subcategories) {
        count = cat.subcategories.reduce((s, sc) => s + (sc.products?.length || 0), 0);
      } else if (cat.products) count = cat.products.length;
      p.textContent = `${count} items`;

      const open = document.createElement("button");
      open.className = "btn small";
      open.textContent = "Open";
      open.onclick = () => renderCategory(cat.id);

      body.appendChild(h);
      body.appendChild(p);
      body.appendChild(open);

      card.appendChild(wrap);
      card.appendChild(body);

      grid.appendChild(card);
    });
  };

  /* ------------------------------------------------------
     RENDER CATEGORY
  ------------------------------------------------------- */

  function findCategory(id) {
    return window.CATALOG.categories.find(c => c.id === id);
  }

  function renderCategory(id) {
    const cat = findCategory(id);
    const grid = $("#catalogueGrid");
    if (!cat || !grid) return;

    grid.innerHTML = "";

    // Header
    const head = document.createElement("div");
    head.className = "category-header";

    const back = document.createElement("button");
    back.className = "btn small";
    back.textContent = "Back";
    back.onclick = renderCataloguePage;

    const title = document.createElement("h2");
    title.textContent = cat.name;

    head.appendChild(back);
    head.appendChild(title);
    grid.appendChild(head);

    // Subcategories
    if (cat.subcategories?.length) {
      cat.subcategories.forEach(sub => {
        const sec = document.createElement("section");
        sec.className = "subcategory";

        const h = document.createElement("h3");
        h.textContent = sub.name;

        const row = document.createElement("div");
        row.className = "product-row";

        (sub.products || []).forEach(p => row.appendChild(renderProduct(p)));

        sec.appendChild(h);
        sec.appendChild(row);
        grid.appendChild(sec);
      });
    }

    // Direct products
    if (cat.products?.length) {
      const row = document.createElement("div");
      row.className = "product-row";
      cat.products.forEach(p => row.appendChild(renderProduct(p)));
      grid.appendChild(row);
    }
  }

  /* ------------------------------------------------------
     RENDER PRODUCT CARD
  ------------------------------------------------------- */

  function renderProduct(product) {
    const card = document.createElement("article");
    card.className = "product-card";

    const wrap = document.createElement("div");
    wrap.className = "product-img";

    const img = product.images?.[0] || "seasonal candle.png";
    wrap.appendChild(createImg(img, product.name));
    card.appendChild(wrap);

    const body = document.createElement("div");
    body.className = "product-body";

    const h = document.createElement("h4");
    h.textContent = product.name;

    const d = document.createElement("p");
    d.className = "desc";
    d.textContent = product.description || "";

    const pr = document.createElement("div");
    pr.className = "price";
    pr.textContent = fmt(product.price);

    const controls = document.createElement("div");
    controls.className = "product-controls";

    const det = document.createElement("button");
    det.className = "btn";
    det.textContent = "Details";
    det.onclick = () => openProductDetails(product);

    const buy = document.createElement("button");
    buy.className = "btn primary";
    buy.textContent = "Buy";
    buy.onclick = () => addToCart(product, 1);

    const fav = document.createElement("button");
    fav.className = "icon-btn small";
    fav.textContent = "♡";
    fav.onclick = () => toggleWishlist(product);

    controls.appendChild(det);
    controls.appendChild(buy);
    controls.appendChild(fav);

    body.appendChild(h);
    body.appendChild(d);
    body.appendChild(pr);
    body.appendChild(controls);
    card.appendChild(body);

    return card;
  }

  /* ------------------------------------------------------
     PRODUCT MODAL
  ------------------------------------------------------- */

  function openProductDetails(product) {
    const modal = $("#modal");
    const content = $("#modalContent");
    if (!modal || !content) return;

    content.innerHTML = "";

    const h = document.createElement("h2");
    h.textContent = product.name;

    const wrap = document.createElement("div");
    wrap.className = "detail-images";

    (product.images || []).forEach(src =>
      wrap.appendChild(createImg(src, product.name, "detail-img"))
    );

    const d = document.createElement("p");
    d.textContent = product.description;

    const p = document.createElement("div");
    p.className = "price large";
    p.textContent = fmt(product.price);

    const qtyLabel = document.createElement("label");
    qtyLabel.textContent = "Quantity";

    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.min = "1";
    qtyInput.value = "1";

    qtyLabel.appendChild(qtyInput);

    const addBtn = document.createElement("button");
    addBtn.className = "btn primary";
    addBtn.textContent = "Add to cart";
    addBtn.onclick = () => {
      addToCart(product, parseInt(qtyInput.value));
      closeModal();
      toggleCartPanel(true);
    };

    const closeBtn = document.createElement("button");
    closeBtn.className = "btn secondary";
    closeBtn.textContent = "Close";
    closeBtn.onclick = closeModal;

    content.appendChild(h);
    content.appendChild(wrap);
    content.appendChild(d);
    content.appendChild(p);
    content.appendChild(qtyLabel);
    content.appendChild(addBtn);
    content.appendChild(closeBtn);

    modal.classList.remove("hidden");
  }

  function closeModal() {
    const modal = $("#modal");
    if (modal) modal.classList.add("hidden");
  }

  /* ------------------------------------------------------
     CART FUNCTIONS
  ------------------------------------------------------- */

  function addToCart(product, qty) {
    const id = product.id;
    if (!id) return;

    if (!window.cart[id]) {
      window.cart[id] = {
        productId: id,
        name: product.name,
        qty: 0,
        unitPrice: Number(product.price)
      };
    }
    window.cart[id].qty += qty;
    persistCart();
  }

  function removeFromCart(id) {
    delete window.cart[id];
    persistCart();
  }

  function changeQty(id, qty) {
    if (!window.cart[id]) return;
    window.cart[id].qty = qty;
    if (qty <= 0) delete window.cart[id];
    persistCart();
  }

  function computeTotal() {
    return Object.values(window.cart).reduce((s, it) =>
      s + it.unitPrice * it.qty, 0
    );
  }

  function renderCartUI() {
    const wrap = $("#cartItems");
    const total = $("#cartTotal");
    if (!wrap) return;

    wrap.innerHTML = "";

    const items = Object.values(window.cart);
    if (!items.length) {
      wrap.innerHTML = "<p>Your cart is empty.</p>";
      total.textContent = fmt(0);
      return;
    }

    items.forEach(it => {
      const row = document.createElement("div");
      row.className = "cart-row";

      const name = document.createElement("div");
      name.className = "cart-name";
      name.textContent = it.name;

      const qty = document.createElement("input");
      qty.type = "number";
      qty.value = it.qty;
      qty.min = "1";
      qty.onchange = () => changeQty(it.productId, parseInt(qty.value));

      const price = document.createElement("div");
      price.className = "cart-price";
      price.textContent = fmt(it.unitPrice);

      const rm = document.createElement("button");
      rm.className = "btn small";
      rm.textContent = "Remove";
      rm.onclick = () => removeFromCart(it.productId);

      row.appendChild(name);
      row.appendChild(qty);
      row.appendChild(price);
      row.appendChild(rm);

      wrap.appendChild(row);
    });

    total.textContent = fmt(computeTotal());
  }

  /* ------------------------------------------------------
     WISHLIST
  ------------------------------------------------------- */

  function toggleWishlist(p) {
    if (window.wishlist[p.id]) {
      delete window.wishlist[p.id];
    } else {
      window.wishlist[p.id] = p;
    }
    persistWishlist();
  }

  /* ------------------------------------------------------
     CHECKOUT — PayPal BUSINESS EMAIL INCLUDED
  ------------------------------------------------------- */

  window.handleCheckout = function () {
    const items = Object.values(window.cart);
    if (!items.length) {
      alert("Your cart is empty.");
      return;
    }

    const BUSINESS = encodeURIComponent("rosalinda.mauve@gmail.com");

    let url = `https://www.paypal.com/cgi-bin/webscr?cmd=_cart&upload=1&business=${BUSINESS}&currency_code=USD`;

    items.forEach((it, i) => {
      const n = i + 1;
      url += `&item_name_${n}=${encodeURIComponent(it.name)}`;
      url += `&amount_${n}=${encodeURIComponent(it.unitPrice.toFixed(2))}`;
      url += `&quantity_${n}=${encodeURIComponent(it.qty)}`;
    });

    window.open(url, "_blank");
  };

  /* ------------------------------------------------------
     PANEL CONTROL
  ------------------------------------------------------- */

  window.toggleCartPanel = function (show) {
    const panel = $("#cartPanel");
    if (!panel) return;
    if (show) panel.classList.remove("hidden");
    else panel.classList.add("hidden");
    renderCartUI();
  };

  /* ------------------------------------------------------
     INIT
  ------------------------------------------------------- */

  window.appInit = async function () {
    await loadCatalogue();
    restoreCart();
    restoreWishlist();
    syncCountsToUI();
    startSnowfall();
  };

})();
