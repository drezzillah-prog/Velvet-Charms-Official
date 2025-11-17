// Load products
fetch('products.json')
    .then(response => response.json())
    .then(products => categorizeProducts(products))
    .catch(err => console.error("JSON load error:", err));


// Map JSON categories → website sections
const categoryMap = {
    "candles": ["Candles", "Candles / Spiritual", "Candles / Classic", "Candles / Divination", "Candles / Seasonal"],
    "soaps": ["Soaps"],
    "creams": ["Creams"],
    "knitted": ["Knitted & Braided", "Felted Animals"], // adjust if needed
    "accessories": ["Accessories", "Accessories / Jewelry"],
    "bundles": ["Bundles"],
    "epoxy": ["Epoxy", "Epoxy Resin", "Epoxy & Decorative Items"]
};


// Convert JSON array → grouped category object
function categorizeProducts(products) {
    const grouped = {
        candles: [],
        soaps: [],
        creams: [],
        knitted: [],
        accessories: [],
        bundles: [],
        epoxy: []
    };

    products.forEach(product => {
        for (let section in categoryMap) {
            if (categoryMap[section].includes(product.category)) {
                grouped[section].push(product);
                return;
            }
        }
    });

    displayProducts(grouped);
}


// Render products into each section
function displayProducts(grouped) {
    Object.keys(grouped).forEach(section => {
        const container = document.getElementById(`${section}-products`);
        const items = grouped[section];

        if (!container) return;

        items.forEach(product => {
            const div = document.createElement("div");
            div.classList.add("product-item");

            div.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>${product.price_usd} USD</p>
                <button onclick="buyNow('${product.paypal}')">Buy</button>
            `;

            container.appendChild(div);
        });
    });
}


// Direct PayPal purchase function
function buyNow(link) {
    window.open(link, "_blank"); // opens PayPal checkout
}
