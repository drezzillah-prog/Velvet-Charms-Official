document.addEventListener('DOMContentLoaded', () => {
    const catalogueContainer = document.getElementById('catalogue-container');
    const productGrid = document.querySelector('.product-grid');
    const categoryTitle = document.getElementById('category-title');

    // -----------------------------------------
    // UNIVERSAL SAFE FETCH FUNCTION
    // -----------------------------------------
    async function safeFetch(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return await response.json();
        } catch (err) {
            console.error(`❌ ERROR loading ${url}:`, err);
            return null;
        }
    }

    // -----------------------------------------
    // LOAD CATALOGUE (MAIN INDEX)
    // -----------------------------------------
    async function loadCatalogue() {
        const catalogue = await safeFetch('/data/catalogue.json');
        if (!catalogue) {
            catalogueContainer.innerHTML = "<p>Error loading catalogue.</p>";
            return;
        }

        catalogueContainer.innerHTML = "";

        Object.keys(catalogue).forEach(category => {
            const categoryBox = document.createElement('a');
            categoryBox.className = 'category-box';
            categoryBox.href = `catalogue.html?category=${category}`;
            categoryBox.innerHTML = `
                <div class="cat-box">
                    <h3>${category.replace(/_/g, ' ').toUpperCase()}</h3>
                    <p>View items →</p>
                </div>
            `;
            catalogueContainer.appendChild(categoryBox);
        });
    }

    // -----------------------------------------
    // LOAD ITEMS FOR CATEGORY PAGE
    // -----------------------------------------
    async function loadCategoryPage() {
        const params = new URLSearchParams(window.location.search);
        const category = params.get("category");
        if (!category) return;

        categoryTitle.textContent = category.replace(/_/g, " ").toUpperCase();

        const catalogue = await safeFetch('/data/catalogue.json');
        if (!catalogue || !catalogue[category]) {
            productGrid.innerHTML = "<p>Category not found.</p>";
            return;
        }

        const dataFile = catalogue[category];
        const items = await safeFetch(dataFile);

        if (!items || !Array.isArray(items)) {
            productGrid.innerHTML = "<p>Unable to load items.</p>";
            return;
        }

        productGrid.innerHTML = "";

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'product-card';

            const imgSrc = item.images?.[0] || item.image || "";

            card.innerHTML = `
                <img src="${imgSrc}" alt="${item.name}">
                <h3>${item.name}</h3>
                <p>${item.description || ""}</p>
                <p class="price">${item.price ? `$${item.price}` : ""}</p>
            `;

            productGrid.appendChild(card);
        });
    }

    // -----------------------------------------
    // DETECT WHICH PAGE WE ARE ON
    // -----------------------------------------
    const isCataloguePage = window.location.pathname.includes("catalogue.html");

    if (isCataloguePage) {
        loadCategoryPage();
    } else if (catalogueContainer) {
        loadCatalogue();
    }
});
