// Catalogue data will be in catalogue.json
let catalogue = {}; // will fetch from catalogue.json

// Cart and Wishlist
let cart = [];
let wishlist = [];

// Load catalogue JSON
fetch('catalogue.json')
    .then(response => response.json())
    .then(data => {
        catalogue = data;
        displayCategory('paintings');
    });

// Menu click
document.querySelectorAll('#menu a').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const category = link.getAttribute('data-category');
        displayCategory(category);
    });
});

// Search functionality
document.getElementById('search').addEventListener('input', e => {
    const query = e.target.value.toLowerCase();
    const currentCategory = document.querySelector('#menu a.active')?.getAttribute('data-category') || 'paintings';
    displayCategory(currentCategory, query);
});

// Display products by category and optional search query
function displayCategory(categoryId, query = '') {
    const container = document.getElementById('catalogue-container');
    container.innerHTML = '';
    const category = catalogue.categories.find(cat => cat.id === categoryId);
    if (!category) return;

    // Flatten subcategories
    let products = [];
    category.subcategories.forEach(sub => {
        sub.products.forEach(prod => {
            prod.subcategory = sub.name;
            products.push(prod);
        });
    });

    if (query) {
        products = products.filter(p => 
            p.name.toLowerCase().includes(query) || 
            p.description.toLowerCase().includes(query)
        );
    }

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.images[0]}" alt="${product.name}">
            <div class="product-info">
                <h3>${product.name}</h3>
                <p>Price: $${product.price}</p>
                <p>Size: ${product.size || 'Standard'}</p>
                <button class="view-details" data-id="${product.id}">View Details</button>
            </div>
        `;
        container.appendChild(card);
    });

    document.querySelectorAll('.view-details').forEach(btn => {
        btn.addEventListener('click', e => {
            const prodId = e.target.getAttribute('data-id');
            openProductModal(prodId);
        });
    });
}

// Modal elements
const modal = document.getElementById('product-modal');
const modalClose = modal.querySelector('.close');
const modalImages = document.getElementById('modal-images');
const modalName = document.getElementById('modal-name');
const modalDescription = document.getElementById('modal-description');
const modalPrice = document.getElementById('modal-price');
const modalSize = document.getElementById('modal-size');
const modalCustomization = document.getElementById('modal-customization');
const modalAddCart = document.getElementById('modal-add-cart');
const modalAddWishlist = document.getElementById('modal-add-wishlist');
const modalPaypal = document.getElementById('modal-paypal');

modalClose.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

// Snowflakes
function createSnowflake() {
    const snowflake = document.createElement('div');
    snowflake.className = 'snowflake';
    snowflake.style.left = Math.random() * window.innerWidth + 'px';
    snowflake.style.fontSize = Math.random() * 10 + 10 + 'px';
    snowflake.style.animationDuration = Math.random() * 5 + 5 + 's';
    snowflake.innerHTML = '❄';
    document.getElementById('snowflakes').appendChild(snowflake);
    setTimeout(() => snowflake.remove(), 10000);
}
setInterval(createSnowflake, 200);
// Open product modal
function openProductModal(prodId) {
    const product = findProductById(prodId);
    if (!product) return;

    modalImages.innerHTML = '';
    product.images.forEach((img, idx) => {
        const imgEl = document.createElement('img');
        imgEl.src = img;
        imgEl.alt = product.name + ' image ' + (idx + 1);
        imgEl.addEventListener('click', () => {
            modal.querySelector('.main-image')?.remove();
            const mainImg = document.createElement('img');
            mainImg.src = img;
            mainImg.alt = product.name;
            mainImg.className = 'main-image';
            mainImg.style.width = '100%';
            mainImg.style.height = '300px';
            mainImg.style.objectFit = 'cover';
            modalImages.prepend(mainImg);
        });
        modalImages.appendChild(imgEl);
    });

    // Set default main image
    const mainImg = document.createElement('img');
    mainImg.src = product.images[0];
    mainImg.alt = product.name;
    mainImg.className = 'main-image';
    mainImg.style.width = '100%';
    mainImg.style.height = '300px';
    mainImg.style.objectFit = 'cover';
    modalImages.prepend(mainImg);

    modalName.textContent = product.name;
    modalDescription.textContent = product.description;
    modalPrice.textContent = `Price: $${product.price}`;
    modalSize.textContent = `Size: ${product.size || 'Standard'}`;
    modalCustomization.value = '';

    modalAddCart.onclick = () => {
        const custom = modalCustomization.value;
        addToCart(product, custom);
        modal.style.display = 'none';
    };
    modalAddWishlist.onclick = () => {
        const custom = modalCustomization.value;
        addToWishlist(product, custom);
        modal.style.display = 'none';
    };
    modalPaypal.href = product.paymentLink;

    modal.style.display = 'flex';
}

// Find product by ID
function findProductById(id) {
    for (let cat of catalogue.categories) {
        for (let sub of cat.subcategories) {
            for (let prod of sub.products) {
                if (prod.id === id) return prod;
            }
        }
    }
    return null;
}

// Cart & Wishlist Functions
function addToCart(product, customization) {
    cart.push({ product, customization });
    alert(`${product.name} added to cart.`);
}

function addToWishlist(product, customization) {
    wishlist.push({ product, customization });
    alert(`${product.name} added to wishlist.`);
}

// Display Cart/Wishlist Summary
document.getElementById('cart-summary').addEventListener('click', () => {
    let text = 'Cart:\n';
    cart.forEach((item, i) => {
        text += `${i+1}. ${item.product.name} - $${item.product.price}`;
        if(item.customization) text += ` (Customization: ${item.customization})`;
        text += '\n';
    });
    alert(text || 'Cart is empty.');
});

document.getElementById('wishlist-summary').addEventListener('click', () => {
    let text = 'Wishlist:\n';
    wishlist.forEach((item, i) => {
        text += `${i+1}. ${item.product.name} - $${item.product.price}`;
        if(item.customization) text += ` (Customization: ${item.customization})`;
        text += '\n';
    });
    alert(text || 'Wishlist is empty.');
});

// Filters by subcategory
function filterBySubcategory(subcatName) {
    const currentCategory = document.querySelector('#menu a.active')?.getAttribute('data-category');
    displayCategory(currentCategory, '');
    const container = document.getElementById('catalogue-container');
    Array.from(container.children).forEach(card => {
        const prod = findProductById(card.querySelector('.view-details').dataset.id);
        if(prod.subcategory !== subcatName) card.style.display = 'none';
    });
}

