const catalogue = {
  "products": [
    {
      "category": "Soaps",
      "subcategory": "Gift Herbal / Exfoliating Soap Set (3 pcs)",
      "name": "Gift Herbal / Exfoliating Soap Set (3 pcs)",
      "images": [
        "Gift Herbal Exfoliating Soap Set (3 pcs).png",
        "Gift Herbal Exfoliating Soap Set (3 pcs) 2.png",
        "Gift Herbal Exfoliating Soap Set (3 pcs) 3.png",
        "Gift Herbal Exfoliating Soap Set (3 pcs) 4.png"
      ],
      "customizable": true,
      "price": "auto",
      "description": "Optional: Add text or upload an image for customization."
    },
    {
      "category": "Soaps",
      "subcategory": "Gift Fruit / Flower Soap Set (3 pcs)",
      "name": "Gift Fruit / Flower Soap Set (3 pcs)",
      "images": ["Gift Fruit shaped Flower shaped Soap Set (3 pcs).png"],
      "customizable": true,
      "price": "auto",
      "description": "Optional: Add text or upload an image for customization."
    },
    {
      "category": "Knitted Items",
      "subcategory": "Matching Winter Set — Beanie + Scarf + Mittens",
      "name": "Matching Winter Set — Beanie + Scarf + Mittens",
      "images": ["Matching Winter Set — Beanie + Scarf + Mittens.png"],
      "customizable": true,
      "price": "auto",
      "description": "Optional: Add text or upload an image for customization."
    },
    {
      "category": "Gift Sets",
      "subcategory": "Relax & Restore Set — Herbal soap + face cream + small wax candle",
      "name": "Relax & Restore Set — Herbal soap + face cream + small wax candle",
      "images": ["Gift Herbal Exfoliating Soap Set (3 pcs) 1.png"],
      "customizable": true,
      "price": "auto",
      "description": "Optional: Add text or upload an image for customization."
    }
  ]
};

const catalogueContainer = document.getElementById('product-catalogue');

// Function to convert price based on region (mocked)
function getPrice(price) {
  // In a real setup, use geolocation or user locale
  return (price === "auto") ? "$25" : price; // Placeholder
}

// Render products
catalogue.products.forEach(product => {
  const card = document.createElement('div');
  card.className = 'product-card';

  const mainImage = product.images[0];
  const imagesHTML = product.images.map(img => `<img src="${img}" alt="${product.name}">`).join('');

  card.innerHTML = `
    <img src="${mainImage}" alt="${product.name}">
    <h2>${product.name}</h2>
    <p>${product.description || ''}</p>
    <p>Price: ${getPrice(product.price)}</p>
    ${product.customizable ? `
      <form class="customize-form">
        <textarea placeholder="Optional: Notes for customization"></textarea>
        <input type="file" accept="image/*">
        <button type="submit">Add customization</button>
      </form>
    ` : ''}
  `;

  catalogueContainer.appendChild(card);
});
