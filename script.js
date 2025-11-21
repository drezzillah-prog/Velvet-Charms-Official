/* ------------------------------------
   VELVET CHARMS — SCRIPT.JS
   Fully rewritten, stable version
--------------------------------------- */

let catalogue = null;

// DOM references
const mainView = document.getElementById("homeView");
const catalogueView = document.getElementById("catalogueView");
const aboutView = document.getElementById("aboutView");
const contactView = document.getElementById("contactView");
const productsContainer = document.getElementById("productsContainer");
const categoriesContainer = document.getElementById("categoriesContainer");
const subcategoriesContainer = document.getElementById("subcategoriesContainer");

// Modal
const modal = document.getElementById("detailsModal");
const modalContent = document.getElementById("modalContent");
const modalClose = document.getElementById("modalClose");

// Christmas theme toggle
const christmasToggle = document.getElementById("christmasToggle");


// ------------------------
// LOAD CATALOGUE.JSON
// ------------------------
async function loadCatalogue() {
    try {
        const res = await fetch("catalogue.json?cache=" + Date.now());
        if (!res.ok) throw new Error("Missing or invalid catalogue.json");

        catalogue = await res.json();
        renderCategories();
    } catch (e) {
        productsContainer.innerHTML = `
            <div class="error-box">
                <h2>Error loading catalogue.</h2>
                <p>Please ensure catalogue.json exists in the site root.</p>
            </div>
        `;
    }
}


// ------------------------
// NAVIGATION
// ------------------------
function showView(view) {
    mainView.style.display = "none";
    catalogueView.style.display = "none";
    aboutView.style.display = "none";
    contactView.style.display = "none";

    if (view === "home") mainView.style.display = "block";
    if (view === "catalogue") catalogueView.style.display = "block";
    if (view === "about") aboutView.style.display = "block";
    if (view === "contact") contactView.style.display = "block";

    window.scrollTo(0, 0);
}

document.getElementById("navHome").onclick = () => showView("home");
document.getElementById("navCatalogue").onclick = () => showView("catalogue");
document.getElementById("navAbout").onclick = () => showView("about");
document.getElementById("navContact").onclick = () => showView("contact");


// ------------------------
// RENDER CATEGORIES
// ------------------------
function renderCategories() {
    categoriesContainer.innerHTML = "";
    catalogue.categories.forEach(cat => {
        const div = document.createElement("div");
        div.className = "category-item";
        div.textContent = cat.name;

        div.onclick = () => renderSubcategories(cat.id);

        categoriesContainer.appendChild(div);
    });
}


// ------------------------
// RENDER SUBCATEGORIES
// ------------------------
function renderSubcategories(categoryId) {
    const category = catalogue.categories.find(c => c.id === categoryId);

    if (!category) return;

    subcategoriesContainer.innerHTML = "";
    productsContainer.innerHTML = "";

    if (category.subcategories) {
        category.subcategories.forEach(sub => {
            const div = document.createElement("div");
            div.className = "subcategory-item";
            div.textContent = sub.name;

            div.onclick = () => renderProducts(categoryId, sub.id);

            subcategoriesContainer.appendChild(div);
        });
    }

    // If category has products directly
    if (category.products) {
        renderProducts(categoryId, null);
    }
}


// ------------------------
// RENDER PRODUCTS
// ------------------------
function renderProducts(categoryId, subcategoryId) {
    const category = catalogue.categories.find(c => c.id === categoryId);

    let products = [];

    if (subcategoryId) {
        const sub = category.subcategories.find(s => s.id === subcategoryId);
        if (sub) products = sub.products || [];
    } else {
        products = category.products || [];
    }

    productsContainer.innerHTML = "";

    products.forEach(prod => {
        const card = document.createElement("div");
        card.className = "product-card";

        const img = prod.images && prod.images[0]
            ? prod.images[0]
            : "placeholder.png";

        card.innerHTML = `
            <img src="${img}" class="product-img" loading="lazy" />

            <h3>${prod.name}</h3>

            <p class="price">$${prod.price.toFixed(2)}</p>

            <div class="product-buttons">
                <button class="details-btn" data-id="${prod.id}">Details</button>
                <a href="${prod.paymentLink}" target="_blank" class="buy-btn">Buy</a>
            </div>
        `;

        productsContainer.appendChild(card);
    });

    // Attach event listeners for Details buttons
    document.querySelectorAll(".details-btn").forEach(btn => {
        btn.onclick = () => openProductDetails(btn.dataset.id);
    });
}


// ------------------------
// PRODUCT DETAILS MODAL
// ------------------------
function openProductDetails(productId) {
    let product;

    // search entire catalogue
    for (const c of catalogue.categories) {
        if (c.products) {
            product = c.products.find(p => p.id === productId);
        }
        if (!product && c.subcategories) {
            for (const s of c.subcategories) {
                if (s.products) {
                    const found = s.products.find(p => p.id === productId);
                    if (found) product = found;
                }
            }
        }
    }

    if (!product) return;

    modalContent.innerHTML = `
        <h2>${product.name}</h2>

        <div class="modal-gallery">
            ${product.images
                .map(img => `<img src="${img}" class="modal-img" loading="lazy">`)
                .join("")}
        </div>

        <p class="modal-price">$${product.price.toFixed(2)}</p>
        <p>${product.description}</p>

        <a href="${product.paymentLink}" target="_blank" class="modal-buy-btn">Buy Now</a>
    `;

    modal.style.display = "flex";
}

modalClose.onclick = () => (modal.style.display = "none");

window.onclick = e => {
    if (e.target === modal) modal.style.display = "none";
};


// ------------------------
// CHRISTMAS MODE
// ------------------------
christmasToggle.onclick = () => {
    document.body.classList.toggle("christmas");
};


// ------------------------
// START
// ------------------------
loadCatalogue();
showView("home");
