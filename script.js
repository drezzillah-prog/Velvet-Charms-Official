document.addEventListener("DOMContentLoaded", function () {
    // Ensure elements are available
    const menuToggle = document.querySelector(".menu-toggle");
    const menu = document.querySelector(".site-header nav");
    const scrollTopButton = document.querySelector("#scrollTop");
    const cartIcon = document.querySelector("#cartBtn3, #cartBtn4, #favoritesBtn2, #favoritesBtn3");
    const cartDropdown = document.querySelector(".cart-panel");

    // Menu toggle for small screens
    if (menuToggle && menu) {
        menuToggle.addEventListener("click", () => {
            menu.classList.toggle("active");
        });
    }

    // Scroll to top functionality
    if (scrollTopButton) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 200) {
                scrollTopButton.style.display = "block";
            } else {
                scrollTopButton.style.display = "none";
            }
        });

        scrollTopButton.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    // Shopping cart icon toggle
    if (cartIcon && cartDropdown) {
        cartIcon.addEventListener("click", () => {
            cartDropdown.classList.toggle("visible");
        });
    }
});
