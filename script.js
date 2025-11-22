const catalogue = [
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
    price: "auto"
  },
  {
    category: "Soaps",
    subcategory: "Gift Fruit / Flower Soap Set (3 pcs)",
    name: "Gift Fruit / Flower Soap Set (3 pcs)",
    images: ["Gift Fruit shaped Flower shaped Soap Set (3 pcs).png"],
    customizable: true,
    price: "auto"
  },
  {
    category: "Knitted Items",
    subcategory: "Matching Winter Set — Beanie + Scarf + Mittens",
    name: "Matching Winter Set — Beanie + Scarf + Mittens",
    images: ["Matching Winter Set — Beanie + Scarf + Mittens.png"],
    customizable: true,
    price: "auto"
  },
  {
    category: "Gift Sets",
    subcategory: "Relax & Restore Set — Herbal soap + face cream + small wax candle",
    name: "Relax & Restore Set — Herbal soap + face cream + small wax candle",
    images: ["Gift Herbal Exfoliating Soap Set (3 pcs) 1.png"],
    customizable: true,
    price: "auto"
  }
];

const container = document.getElementById("product-catalogue");

function getPrice(price) {
  // automatic region detection placeholder
  return "$25"; // You can implement region-based detection
}

catalogue.forEach(product => {
  const card = document.createElement("div");
  card.className = "product-card";
  
  card.innerHTML = `
    <img src="${product.images[0]}" alt="${product.name}">
    <h2>${product.name}</h2>
    ${product.customizable ? `
      <form class="customize-form">
        <textarea placeholder="Optional notes for customization"></textarea>
        <input type="file" accept="image/*">
        <button type="submit">Add customization</button>
      </form>
    ` : ''}
    <p class="price">Price: ${getPrice(product.price)}</p>
  `;
  container.appendChild(card);
});

/* Snowflakes effect */
const canvas = document.createElement('canvas');
canvas.id = 'snow-canvas';
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.getElementById('snowflakes').appendChild(canvas);
const ctx = canvas.getContext('2d');

let snowflakes = [];
for (let i = 0; i < 150; i++) {
  snowflakes.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 4 + 1,
    color: Math.random() > 0.7 ? "#d14646" : Math.random() > 0.5 ? "#3c6b3c" : "white",
    d: Math.random() * 1
  });
}

function drawSnowflakes() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  snowflakes.forEach(f => {
    ctx.beginPath();
    ctx.fillStyle = f.color;
    ctx.arc(f.x, f.y, f.r, 0, Math.PI*2, true);
    ctx.fill();
  });
  updateSnowflakes();
}

function updateSnowflakes() {
  snowflakes.forEach(f => {
    f.y += Math.pow(f.d, 2) + 0.5;
    if (f.y > canvas.height) {
      f.y = 0;
      f.x = Math.random() * canvas.width;
    }
  });
  requestAnimationFrame(drawSnowflakes);
}

drawSnowflakes();
