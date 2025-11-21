document.addEventListener("DOMContentLoaded", () => {
  // Sample catalogue data embedded
  const catalogue = {
    siteInfo: {
      name: "Velvet Charms",
      tagline: "Where Art Meets Emotion — Handcrafted with love",
      defaultCurrency: "USD"
    },
    categories: [
      { id:"candles", name:"Candles", products:[{id:"c1",name:"Spiritual Candle",price:12,description:"Handcrafted spiritual candle",images:["https://via.placeholder.com/220x170"]}]},
      { id:"bodycare", name:"Body Care", products:[{id:"b1",name:"Cream",price:8,description:"Moisturizing cream",images:["https://via.placeholder.com/220x170"]}]},
      { id:"perfumes", name:"Perfumes", products:[{id:"p1",name:"Lavender Perfume",price:20,description:"Natural lavender perfume",images:["https://via.placeholder.com/220x170"]}]}
    ]
  };

  const el = {
    catalogueMenu: document.querySelector("#catalogue-menu"),
    contentInner: document.querySelector("#catalogue .content-inner"),
    modal: document.querySelector("#product-modal"),
    modalTitle: document.querySelector("#product-modal .modal-title"),
    modalBody: document.querySelector("#product-modal .modal-body"),
    modalClose: document.querySelector("#product-modal .modal-close"),
    exploreBtn: document.querySelector("#explore-catalogue"),
    contactForm: document.querySelector("#contact-form"),
    christmasToggle: document.querySelector("#christmas-toggle")
  };

  // Render menu
  catalogue.categories.forEach(cat => {
    const li = document.createElement("li");
    li.innerHTML = `<button class="subcat-btn">${cat.name}</button>`;
    li.querySelector("button").addEventListener("click", () => renderCategory(cat));
    el.catalogueMenu.appendChild(li);
  });

  // Render category
  function renderCategory(cat){
    el.contentInner.innerHTML = `<h2>${cat.name}</h2>`;
    const grid = document.createElement("div"); grid.className="product-grid";
    cat.products.forEach(p => {
      const card = document.createElement("div"); card.className="product-card";
      card.innerHTML = `
        <div class="pc-image"><img src="${p.images[0]}" alt="${p.name}"></div>
        <div class="pc-body">
          <h4>${p.name}</h4>
          <div class="pc-price">${p.price} ${catalogue.siteInfo.defaultCurrency}</div>
          <p class="pc-desc">${p.description}</p>
          <div class="pc-actions"><button class="btn view-btn">Details</button></div>
        </div>`;
      card.querySelector(".view-btn").addEventListener("click", () => openModal(p));
      grid.appendChild(card);
    });
    el.contentInner.appendChild(grid);
    location.hash="#catalogue";
  }

  // Modal
  function openModal(product){
    el.modalTitle.textContent = product.name;
    el.modalBody.innerHTML = `<p>${product.description}</p><p>Price: ${product.price} ${catalogue.siteInfo.defaultCurrency}</p>`;
    el.modal.classList.add("open");
  }
  el.modalClose.addEventListener("click", ()=> el.modal.classList.remove("open"));

  // Explore catalogue button
  el.exploreBtn.addEventListener("click", ()=> renderCategory(catalogue.categories[0]));

  // Contact form
  el.contactForm.addEventListener("submit", e=>{
    e.preventDefault();
    alert("Thank you! Message sent.");
    el.contactForm.reset();
  });

  // Christmas toggle
  el.christmasToggle.addEventListener("change", e=>{
    document.body.classList.toggle("christmas-mode", e.target.checked);
  });
});
