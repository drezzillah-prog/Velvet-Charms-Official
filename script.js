// =====================
// AUTO CURRENCY DETECTION
// =====================
const userLocale = navigator.language || "en-US";
const currencyMapping = {
  "de": "EUR",
  "fr": "EUR",
  "es": "EUR",
  "it": "EUR",
  "ro": "RON",
  "hu": "HUF",
  "pl": "PLN",
  "uk": "GBP",
  "us": "USD",
  "default": "EUR"
};

const region = userLocale.split("-")[1]?.toLowerCase() || "default";
const currency = currencyMapping[region] || currencyMapping["default"];

// Static fallback conversion (can be replaced with API)
const exchangeRates = {
  "EUR": 1,
  "RON": 5,
  "HUF": 390,
  "PLN": 4.4,
  "GBP": 0.85,
  "USD": 1.1
};

function convertPrice(basePrice) {
  return (basePrice * exchangeRates[currency]).toFixed(2);
}

// =====================
// MISSING IMAGE MAPPING
// (You told me exactly which → I mapped them 1:1)
// =====================
const imageMapping = {
  "gift_herbal_exfoliating_soap_set": [
    "Gift Herbal Exfoliating Soap Set (3 pcs).png",
    "Gift Herbal Exfoliating Soap Set (3 pcs) 2.png",
    "Gift Herbal Exfoliating Soap Set (3 pcs) 3.png",
    "Gift Herbal Exfoliating Soap Set (3 pcs) 4.png"
  ],
  "gift_fruit_flower_soap_set": [
    "Gift Fruit shaped Flower shaped Soap Set (3 pcs).png"
  ],
  "matching_winter_set_beanie_scarf_mittens": [
    "Matching Winter Set — Beanie + Scarf + Mittens.png"
  ],
  "relax_restore_set": [
    "Gift Herbal Exfoliating Soap Set (3 pcs) 1.png"
  ]
};

// =====================
// LOAD & RENDER CATALOGUE
// =====================
async function loadCatalogue() {
  const response = await fetch("catalogue.json");
  const catalogue = await response.json();
  renderCatalogue(catalogue);
}

function renderCatalogue(catalogue) {
  const container = document.getElementById("product-sections");
  container.innerHTML = "";

  catalogue.forEach(category => {
    const section = document.createElement("section");
    section.className = "category-section";

    const title = document.createElement("h2");
    title.textContent = category.category;
    section.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "product-grid";

    category.items.forEach(product => {
      const card = document.createElement("div");
      card.className = "product-card";

      // Missing image fallback here:
      const assignedImages = product.images?.length ? product.images : imageMapping[product.id] || [];

      card.innerHTML = `
        <img src="${assignedImages[0] || 'placeholder.png'}" class="product-img" />
        <h3>${product.name}</h3>
        <p class="price">${convertPrice(product.price)} ${currency}</p>
        <button class="view-btn" data-id="${product.id}">View</button>
      `;

      grid.appendChild(card);
    });

    section.appendChild(grid);
    container.appendChild(section);
  });

  attachProductModal(catalogue);
}

// =====================
// PRODUCT MODAL WITH CUSTOMIZATION FORM
// =====================
function attachProductModal(catalogue) {
  const modal = document.getElementById("product-modal");
  const modalContent = document.getElementById("modal-content");
  const closeModal = document.getElementById("modal-close");

  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const productId = btn.dataset.id;

      const product = catalogue
        .flatMap(c => c.items)
        .find(i => i.id === productId);

      const imgs = product.images?.length ? product.images : imageMapping[product.id] || [];

      modalContent.innerHTML = `
        <h2>${product.name}</h2>

        <div class="modal-images">
          ${imgs.map(img => `<img src="${img}">`).join("")}
        </div>

        <p class="modal-price">${convertPrice(product.price)} ${currency}</p>

        ${
          product.scentOptions || product.intensityOptions
            ? `<p>This product has scent/intensity options and does NOT allow custom uploads.</p>`
            : `
              <h3>Optional customization</h3>

              <label>Upload reference image (optional):</label>
              <input type="file" id="custom-file">

              <label>Additional notes:</label>
              <textarea id="custom-notes" placeholder="Write any extra instructions"></textarea>
            `
        }

        <button id="paypal-btn">Buy on PayPal</button>
      `;

      modal.classList.add("open");
    });
  });

  closeModal.addEventListener("click", () => modal.classList.remove("open"));
}

// =====================
// INIT
// =====================
loadCatalogue();
