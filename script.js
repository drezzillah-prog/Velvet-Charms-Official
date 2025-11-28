document.addEventListener("DOMContentLoaded", function () {
    // Menu toggle for small screens
    const menuToggle = document.querySelector(".menu-toggle");
    const menu = document.querySelector(".site-header nav");
    menuToggle.addEventListener("click", () => {
        menu.classList.toggle("active");
    });

    // Scroll to top functionality
    const scrollTopButton = document.querySelector("#scrollTop");
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

    // Shopping cart icon toggle
    const cartIcon = document.querySelector(".cart-icon");
    const cartDropdown = document.querySelector(".cart-dropdown");
    cartIcon.addEventListener("click", () => {
        cartDropdown.classList.toggle("visible");
    });
});
