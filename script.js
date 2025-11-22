// Complete catalogue with all product images from GitHub
const catalogue = [
  // Example: Add all products similarly from GitHub with correct images
  {
    category: "Soaps",
    subcategory: "Gift Herbal / Exfoliating Soap Set (3 pcs)",
    name: "Gift Herbal / Exfoliating Soap Set (3 pcs)",
    images: [
      "Gift Herbal Exfoliating Soap Set (3 pcs).png",
      "Gift Herbal Exfoliating Soap Set (3 pcs) 2.png",
      "Gift Herbal Exfoliating Soap Set (3 pcs) 3.png",
      "Gift Herbal Exfoliating Soap Set (3 pcs) 4.png"
    ],
    customizable: true,
    price: "auto",
    description: "Optional: Add text or upload an image for customization."
  },
  {
    category: "Soaps",
    subcategory: "Gift Fruit / Flower Soap Set (3 pcs)",
    name: "Gift Fruit / Flower Soap Set (3 pcs)",
    images: ["Gift Fruit shaped Flower shaped Soap Set (3 pcs).png"],
    customizable: true,
    price: "auto",
    description: "Optional: Add text or upload an image for customization."
  },
  {
    category: "Knitted Items",
    subcategory: "Matching Winter Set — Beanie + Scarf + Mittens",
    name: "Matching Winter Set — Beanie + Scarf + Mittens",
    images: ["Matching Winter Set — Beanie + Scarf + Mittens.png"],
    customizable: true,
    price: "auto",
    description: "Optional: Add text or upload an image for customization."
  },
  {
    category: "Gift Sets",
    subcategory: "Relax & Restore Set — Herbal soap + face cream + small wax candle",
    name: "Relax & Restore Set — Herbal soap + face cream + small wax candle",
    images: ["Gift Herbal Exfoliating Soap Set (3 pcs) 1.png"],
    customizable: true,
    price: "auto",
    description: "Optional: Add text or upload an image for customization."
  },
  // ... Add ALL other products similarly from your GitHub with correct images
];

// Region-based pricing
function getPrice(price) {
  const region = navigator.language || 'en-US';
  // Placeholder logic; replace with real API/geolocation if needed
  if (price !== "auto") return price;

  if (region.includes('ro')) return "RON 125"; 
  if (region.includes('de')) return "€28"; 
  return "$25";
}

const container = document.getElementById("product-catalogue");
catalogue.forEach(product => {
  const card = document.createElement("div");
  card.className = "product-card";

  card.innerHTML = `
    <img src="${product.images[0]}" alt="${product.name}">
    <h2>${product.name}</h2>
    <p>${product.description}</p>
    <p>Price: ${getPrice(product.price)}</p>
    ${product.customizable ? `
      <form class="customize-form">
        <textarea placeholder="Optional: Notes for customization"></textarea>
        <input type="file" accept="image/*">
        <button type="submit">Add customization</button>
      </form>
    ` : ''}
  `;

  container.appendChild(card);
});

// Christmas Snowflakes Animation
const canvas = document.getElementById('snowflakes');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const snowflakes = [];
for (let i = 0; i < 100; i++) {
  snowflakes.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 4 + 1,
    d: Math.random() * 1
  });
}

function drawSnowflakes() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  snowflakes.forEach(f => {
    ctx.moveTo(f.x, f.y);
    ctx.arc(f.x, f.y, f.r, 0, Math.PI*2, true);
  });
  ctx.fill();
  updateSnowflakes();
}

function updateSnowflakes() {
  snowflakes.forEach(f => {
    f.y += Math.cos(f.d) + 1 + f.r / 2;
    f.x += Math.sin(f.d) * 2;

    if (f.y > canvas.height) {
      f.x = Math.random() * canvas.width;
      f.y = 0;
    }
  });
  requestAnimationFrame(drawSnowflakes);
}

drawSnowflakes();

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});
