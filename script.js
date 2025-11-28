document.addEventListener("DOMContentLoaded", function () {
    // Ensure elements are available
    const menuToggle = document.querySelector(".menu-toggle");
    const menu = document.querySelector(".site-header nav");
    const scrollTopButton = document.querySelector("#scrollTop");
    const cartIcon = document.querySelector(".cart-icon");
    const cartDropdown = document.querySelector(".cart-dropdown");

    // Only attach event listeners if elements exist
    if (menuToggle && menu) {
        menuToggle.addEventListener("click", () => {
            menu.classList.toggle("active");
        });
    }

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

    if (cartIcon && cartDropdown) {
        cartIcon.addEventListener("click", () => {
            cartDropdown.classList.toggle("visible");
        });
    }
});
