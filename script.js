/* ============================================================
   Velvet Charms — Main Script
   Handles catalogue loading, product rendering, modal display,
   options (scent, intensity, aroma), gallery slider,
   PayPal confirmation, Christmas theme, nav dropdown.
============================================================ */

let CATALOGUE = null;
let CURRENT_PRODUCT = null;

/* ----------------------
   Load Catalogue JSON
---------------------- */
async function loadCatalogue() {
    try {
        const response = await fetch("./catalogue.json?cache=" + Date.now());
        if (!response.ok) throw new Error("Catalogue not found");
        CATALOGUE = await response.json();
        renderCatalogue();
        renderCategoryMenu();
    } catch (err) {
        document.querySelector("#catalogue").innerHTML =
            `<div class="error">Error loading catalogue.<br>Please ensure <b>/catalogue.json</b> exists and is valid.</div>`;
    }
}

/* ----------------------
   Render Catalogue
---------------------- */
function renderCatalogue() {
    const container = document.querySelector("#catalogue");
    container.innerHTML = "";

    CATALOGUE.categories.forEach(category => {
        const catDiv = document.createElement("div");
        catDiv.className = "category";

        catDiv.innerHTML = `
            <h2>${category.name}</h2>
            <div class="category-image">
                <img src="${category.categoryImage || category.banner || "Herbal soap + face cream + small wax candle.png"}" onerror="this.style.display='none'">
            </div>
            <div class="subcategory-list"></div>
        `;

        container.appendChild(catDiv);

        const subList = catDiv.querySelector(".subcategory-list");

        // If category has subcategories
        if (category.subcategories) {
            category.subcategories.forEach(sub => {
                const subDiv = document.createElement("div");
                subDiv.className = "subcategory";

                subDiv.innerHTML = `
                    <h3>${sub.name}</h3>
                    <div class="products"></div>
                `;

                subList.appendChild(subDiv);

                const prodContainer = subDiv.querySelector(".products");
                sub.products.forEach(product => renderProduct(prodContainer, product));
            });
        }

        // If category has direct products (like Perfumes, Leather Bags)
        if (category.products) {
            const subDiv = document.createElement("div");
            subDiv.className = "subcategory";

            subDiv.innerHTML = `
                <div class="products"></div>
            `;

            subList.appendChild(subDiv);

            const prodContainer = subDiv.querySelector(".products");
            category.products.forEach(product => renderProduct(prodContainer, product));
        }
    });
}

/* ----------------------
   Render Single Product
---------------------- */
function renderProduct(container, product) {
    const div = document.createElement("div");
    div.className = "product-card";

    const firstImg = product.images?.[0] || "";

    div.innerHTML = `
        <div class="prod-img"><img src="${firstImg}" onerror="this.style.display='none'"></div>
        <h4>${product.name}</h4>
        <p class="price">$${product.price.toFixed(2)}</p>
        <button class="details-btn" onclick="openDetails('${product.id}')">Details</button>
        <a class="buy-btn" href="${product.paymentLink}" target="_blank">Buy</a>
    `;

    container.appendChild(div);
}

/* ----------------------
   Modal (Details)
---------------------- */
function openDetails(productId) {
    let product = null;

    CATALOGUE.categories.forEach(cat => {
        if (cat.subcategories) {
            cat.subcategories.forEach(sub => {
                const p = sub.products.find(x => x.id === productId);
                if (p) product = p;
            });
        }
        if (cat.products) {
            const p = cat.products.find(x => x.id === productId);
            if (p) product = p;
        }
    });

    if (!product) return;

    CURRENT_PRODUCT = product;

    const modal = document.querySelector("#detailsModal");
    const title = modal.querySelector(".modal-title");
    const price = modal.querySelector(".modal-price");
    const desc = modal.querySelector(".modal-description");
    const gallery = modal.querySelector(".modal-gallery");

    title.textContent = product.name;
    price.textContent = `$${product.price.toFixed(2)}`;
    desc.textContent = product.description || "";

    // Build gallery
    gallery.innerHTML = "";
    product.images.forEach(img => {
        const imgEl = document.createElement("img");
        imgEl.src = img;
        imgEl.onerror = () => { imgEl.style.display = "none"; };
        gallery.appendChild(imgEl);
    });

    // Build Options UI
    const optionsBox = modal.querySelector(".modal-options");
    optionsBox.innerHTML = "";

    if (product.options) {
        for (let key in product.options) {
            const values = product.options[key];

            const optDiv = document.createElement("div");
            optDiv.className = "option-block";

            const label = document.createElement("label");
            label.textContent = key.charAt(0).toUpperCase() + key.slice(1);

            const select = document.createElement("select");
            select.id = `${key}-option`;

            values.forEach(v => {
                const op = document.createElement("option");
                op.value = v;
                op.textContent = v;
                select.appendChild(op);
            });

            optDiv.appendChild(label);
            optDiv.appendChild(select);
            optionsBox.appendChild(optDiv);
        }
    }

    modal.style.display = "flex";
}

/* Close modal */
document.querySelector("#modalClose").onclick = () => {
    document.querySelector("#detailsModal").style.display = "none";
};

/* ----------------------
   Category Dropdown Nav
---------------------- */
function renderCategoryMenu() {
    const menu = document.querySelector("#catalogueDropdown");
    menu.innerHTML = "";

    CATALOGUE.categories.forEach(cat => {
        const btn = document.createElement("button");
        btn.textContent = cat.name;
        btn.onclick = () => scrollToCategory(cat.name);
        menu.appendChild(btn);
    });
}

function scrollToCategory(name) {
    const el = [...document.querySelectorAll(".category")]
        .find(c => c.querySelector("h2").textContent.trim() === name);

    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ----------------------
   PayPal Confirmation
---------------------- */
window.addEventListener("load", () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid")) {
        setTimeout(() => {
            alert("Thank you! Your payment was received successfully. We will begin crafting your order within 48 hours.");
        }, 500);
    }
});

/* ----------------------
   Background Christmas atmosphere
---------------------- */
document.body.classList.add("christmas-theme");

/* ----------------------
   Load catalogue on start
---------------------- */
loadCatalogue();
