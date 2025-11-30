/* translations.js — Velvet Charms
   Multilingual UI translations: EN / FR / IT / RO
   Product names stay in English (brand consistency).
   Descriptions are translated.
*/

const TRANSLATIONS = {
  en: {
    ui: {
      nav_home: "Home",
      nav_catalogue: "Catalogue",
      nav_about: "About",
      nav_contact: "Contact",

      search_placeholder: "Search products…",
      filters: "Filters",
      filter_category: "Category",
      filter_price: "Price",
      filter_scent: "Scent / Aroma / Variant",
      filter_reset: "Reset Filters",

      add_to_cart: "Add to Cart",
      qty: "Qty",
      details: "Details",
      view_product: "View Product",
      out_of_stock: "Out of Stock",

      cart_title: "Your Cart",
      cart_empty: "Your cart is empty.",
      cart_total: "Total",
      checkout: "Checkout",
      continue_shopping: "Continue Shopping",

      newsletter_title: "Newsletter Signup",
      newsletter_email: "Your email",
      newsletter_btn: "Subscribe",

      contact_title: "Contact Us",
      contact_name: "Your name",
      contact_msg: "Your message",
      contact_btn: "Send Message",

      related_products: "Related Products",

      delivery_estimate: "Estimated delivery:",
      days: "days",

      free_shipping_note: "Free shipping on orders over",

      lang_switch: "Language",
      dark_mode: "Dark Mode",
      light_mode: "Light Mode",
    },

    delivery: {
      ro: "Romania",
      eu: "Europe",
      world: "Worldwide"
    }
  },

  fr: {
    ui: {
      nav_home: "Accueil",
      nav_catalogue: "Catalogue",
      nav_about: "À propos",
      nav_contact: "Contact",

      search_placeholder: "Rechercher des produits…",
      filters: "Filtres",
      filter_category: "Catégorie",
      filter_price: "Prix",
      filter_scent: "Parfum / Arôme / Variante",
      filter_reset: "Réinitialiser",

      add_to_cart: "Ajouter au panier",
      qty: "Qté",
      details: "Détails",
      view_product: "Voir le produit",
      out_of_stock: "Rupture de stock",

      cart_title: "Votre Panier",
      cart_empty: "Votre panier est vide.",
      cart_total: "Total",
      checkout: "Payer",
      continue_shopping: "Continuer vos achats",

      newsletter_title: "Inscription à la newsletter",
      newsletter_email: "Votre e-mail",
      newsletter_btn: "S’abonner",

      contact_title: "Nous contacter",
      contact_name: "Votre nom",
      contact_msg: "Votre message",
      contact_btn: "Envoyer",

      related_products: "Produits similaires",

      delivery_estimate: "Livraison estimée :",
      days: "jours",

      free_shipping_note: "Livraison gratuite dès",

      lang_switch: "Langue",
      dark_mode: "Mode sombre",
      light_mode: "Mode clair",
    },

    delivery: {
      ro: "Roumanie",
      eu: "Europe",
      world: "International"
    }
  },

  it: {
    ui: {
      nav_home: "Home",
      nav_catalogue: "Catalogo",
      nav_about: "Chi siamo",
      nav_contact: "Contatto",

      search_placeholder: "Cerca prodotti…",
      filters: "Filtri",
      filter_category: "Categoria",
      filter_price: "Prezzo",
      filter_scent: "Profumo / Aroma / Variante",
      filter_reset: "Reimposta",

      add_to_cart: "Aggiungi al carrello",
      qty: "Qtà",
      details: "Dettagli",
      view_product: "Vedi prodotto",
      out_of_stock: "Non disponibile",

      cart_title: "Il tuo carrello",
      cart_empty: "Il carrello è vuoto.",
      cart_total: "Totale",
      checkout: "Paga",
      continue_shopping: "Continua gli acquisti",

      newsletter_title: "Iscriviti alla newsletter",
      newsletter_email: "La tua email",
      newsletter_btn: "Iscriviti",

      contact_title: "Contattaci",
      contact_name: "Il tuo nome",
      contact_msg: "Il tuo messaggio",
      contact_btn: "Invia",

      related_products: "Prodotti correlati",

      delivery_estimate: "Consegna stimata:",
      days: "giorni",

      free_shipping_note: "Spedizione gratuita sopra",

      lang_switch: "Lingua",
      dark_mode: "Modalità scura",
      light_mode: "Modalità chiara",
    },

    delivery: {
      ro: "Romania",
      eu: "Europa",
      world: "Internazionale"
    }
  },

  ro: {
    ui: {
      nav_home: "Acasă",
      nav_catalogue: "Catalog",
      nav_about: "Despre noi",
      nav_contact: "Contact",

      search_placeholder: "Caută produse…",
      filters: "Filtre",
      filter_category: "Categorie",
      filter_price: "Preț",
      filter_scent: "Aromă / Variantă",
      filter_reset: "Resetează",

      add_to_cart: "Adaugă în coș",
      qty: "Cant.",
      details: "Detalii",
      view_product: "Vezi produs",
      out_of_stock: "Stoc epuizat",

      cart_title: "Coșul tău",
      cart_empty: "Coșul este gol.",
      cart_total: "Total",
      checkout: "Plătește",
      continue_shopping: "Continuă cumpărăturile",

      newsletter_title: "Abonare la newsletter",
      newsletter_email: "Email-ul tău",
      newsletter_btn: "Abonează-te",

      contact_title: "Contactează-ne",
      contact_name: "Numele tău",
      contact_msg: "Mesajul tău",
      contact_btn: "Trimite",

      related_products: "Produse similare",

      delivery_estimate: "Livrare estimată:",
      days: "zile",

      free_shipping_note: "Transport gratuit peste",

      lang_switch: "Limbă",
      dark_mode: "Mod întunecat",
      light_mode: "Mod deschis",
    },

    delivery: {
      ro: "România",
      eu: "Europa",
      world: "Internațional"
    }
  }
};

// Auto-detect browser language
function getPreferredLanguage(){
  const browser = navigator.language.slice(0,2).toLowerCase();
  if (["en","fr","it","ro"].includes(browser)) return browser;
  return "en";
}

// Active language
let ACTIVE_LANG = getPreferredLanguage();

// Translate the entire UI
function applyTranslations(){
  const t = TRANSLATIONS[ACTIVE_LANG]?.ui;

  if (!t) return;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (t[key]) el.textContent = t[key];
  });

  // placeholders
  document.querySelectorAll("[data-i18n-ph]").forEach(el => {
    const key = el.dataset.i18n_ph;
    if (t[key]) el.placeholder = t[key];
  });
}

// Switch language manually
function switchLanguage(lang){
  if (!["en","fr","it","ro"].includes(lang)) return;
  ACTIVE_LANG = lang;
  localStorage.setItem("site_lang", lang);
  applyTranslations();
}

// On load
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("site_lang");
  if (saved && ["en","fr","it","ro"].includes(saved)){
    ACTIVE_LANG = saved;
  }
  applyTranslations();
});
