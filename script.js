// Fetch products from JSON
fetch('products.json')
    .then(response => response.json())
    .then(data => {
        displayProducts(data);
    })
    .catch(error => console.error('Error loading products:', error));

// Function to display products
function displayProducts(data) {
    const categories = ['candles', 'soaps', 'creams', 'knitted', 'accessories', 'bundles', 'epoxy'];
    categories.forEach(category => {
        const productContainer = document.getElementById(`${category}-products`);
        data[category].forEach(product => {
            const productDiv = document.createElement('div');
            productDiv.classList.add('product-item');
            productDiv.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>${product.price} USD</p>
                <button onclick="addToCart('${product.name}', '${product.price}', '${product.image}')">Buy</button>
            `;
            productContainer.appendChild(productDiv);
        });
    });
}

// Function to handle adding products to the cart
function addToCart(name, price, image) {
    console.log(`Added ${name} to cart at ${price}`);
    // You can implement cart logic here
}
