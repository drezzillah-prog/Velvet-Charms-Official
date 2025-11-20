/* ===========================
   Velvet Charms - script.js
   Replaces the entire old script.
   Responsibilities:
   - Fetch /catalogue.json
   - Render top menu, categories, subcategories, product grid
   - Open product detail modal with image gallery (up to 10 images shown)
   - Render product options (scent/intensity/aroma) only if provided
   - Honor product.removeDetails (array of filenames to omit from details)
   - PayPal button opens the configured payment link and shows "processed in 48h" notice
   - Locale-aware price formatting (prices are stored in USD)
   - Christmas-theme toggle / decoration class
   =========================== */

(() => {
  // ---------- Config ----------
  const CATALOGUE_PATH = '/catalogue.json'; // root catalogue file
  const IMAGE_ROOT = './'; // images are in root as you said
  const MAX_GALLERY_IMAGES = 10;
  const PROCESSING_NOTICE = 'Thanks — your order will be processed within 48 hours. You will receive an automated confirmation shortly.';

  // ---------- Helpers ----------
  const el = (selector, ctx = document) => ctx.querySelector(selector);
  const create = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v);
    }
    for (const c of children) {
      if (typeof c === 'string') node.appendChild(document.createTextNode(c));
      else if (c) node.appendChild(c);
    }
    return node;
  };

  // Format price (stored in USD) to user's locale but keep USD as currency.
  const userLocale = navigator.language || 'en-US';
  const priceFormatter = new Intl.NumberFormat(userLocale, { style: 'currency', currency: 'USD' });
  const formatPrice = (n) => priceFormatter.format(n);

  // safe image src encoder for filenames with spaces
  const imgSrc = (filename) => IMAGE_ROOT + encodeURIComponent(filename).replace(/%2F/g, '/');

  // Check if an array contains a string (case exact)
  const shouldSkipImage = (product, filename) => {
    if (!product.removeDetails || !Array.isArray(product.removeDetails)) return false;
    return product.removeDetails.includes(filename);
  };

  // ---------- Root UI containers (create or find) ----------
  const ensureRootContainers = () => {
    // find some expected elements or create placeholders
    if (!el('#nav-categories')) {
      const nav = create('nav', { id: 'nav-categories', class: 'nav-categories' });
      document.body.prepend(nav);
    }
    if (!el('#catalogue-root')) {
      const main = create('main', { id: 'catalogue-root', class: 'catalogue-root' });
      document.body.appendChild(main);
    }
    if (!el('#product-modal')) {
      // modal structure (hidden by default)
      const modal = create('div', { id: 'product-modal', class: 'product-modal hidden' });
      modal.innerHTML = `
        <div class="pm-backdrop" id="pm-backdrop"></div>
        <div class="pm-content" id="pm-content" role="dialog" aria-modal="true">
          <button id="pm-close" class="pm-close" aria-label="Close">&times;</button>
          <div id="pm-body"></div>
        </div>`;
      document.body.appendChild(modal);
    }
  };

  // ---------- Renderers ----------
  function renderMenu(siteInfo, categories) {
    const nav = el('#nav-categories');
    nav.innerHTML = ''; // clear
    // Top brand link
    const brand = create('div', { class: 'nav-brand' }, [
      create('a', { href: '/', text: siteInfo?.name || 'Velvet Charms', class: 'brand-link' }),
      create('span', { class: 'brand-tagline', text: siteInfo?.tagline || '' })
    ]);
    nav.appendChild(brand);

    // Menu list
    const ul = create('ul', { class: 'nav-list' });
    // Home link
    ul.appendChild(create('li', {}, [create('a', { href: '#', class: 'nav-link', 'data-cat': 'home', text: 'Home' })]));

    // categories
    categories.forEach(cat => {
      const li = create('li', {});
      const a = create('a', { href: '#', class: 'nav-link', 'data-cat': cat.id, text: cat.name });
      li.appendChild(a);
      ul.appendChild(li);
    });

    // About tab (new page)
    ul.appendChild(create('li', {}, [create('a', { href: '#', class: 'nav-link', 'data-cat': 'about', text: 'About' })]));

    nav.appendChild(ul);

    // Event delegation for clicks
    nav.addEventListener('click', (ev) => {
      const a = ev.target.closest('a.nav-link');
      if (!a) return;
      ev.preventDefault();
      const catId = a.dataset.cat;
      if (catId === 'home') renderHome(siteInfo, categories);
      else if (catId === 'about') renderAbout(siteInfo);
      else {
        const cat = categories.find(c => c.id === catId);
        if (cat) renderCategory(cat);
      }
      // small scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function renderHome(siteInfo, categories) {
    const root = el('#catalogue-root');
    root.innerHTML = '';

    // banner (uses siteInfo.banner if exists)
    const banner = create('section', { class: 'home-banner' }, [
      create('img', { src: imgSrc(siteInfo?.banner || 'top banner picture for candles.png'), alt: 'Banner', class: 'home-banner-img' })
    ]);
    root.appendChild(banner);

    // quick intro + featured categories (first row)
    const intro = create('section', { class: 'home-intro' });
    intro.appendChild(create('h1', { text: siteInfo?.name || 'Velvet Charms' }));
    intro.appendChild(create('p', { text: siteInfo?.tagline || 'Handmade to order.' }));
    root.appendChild(intro);

    // featured categories preview (first 6 or available)
    const preview = create('section', { class: 'home-preview' });
    const grid = create('div', { class: 'preview-grid' });
    categories.slice(0, 6).forEach(cat => {
      const card = create('div', { class: 'preview-card' }, [
        create('button', { class: 'preview-card-btn', 'data-cat': cat.id }, [
          create('img', { src: imgSrc(cat.banner || (cat.subcategories && cat.subcategories[0] && (cat.subcategories[0].products && cat.subcategories[0].products[0] && cat.subcategories[0].products[0].images && cat.subcategories[0].products[0].images[0])) || 'wax_candle_medium.jpg'), alt: cat.name }),
          create('span', { class: 'preview-card-title', text: cat.name })
        ])
      ]);
      grid.appendChild(card);
    });
    preview.appendChild(grid);
    root.appendChild(preview);

    // small footer note about currencies
    root.appendChild(create('section', { class: 'home-note' }, [
      create('p', { text: 'Prices are shown in USD. Payments are processed via PayPal and are billed in USD. For an estimate in your currency, please check your bank or PayPal conversion.' })
    ]));
  }

  function renderAbout(siteInfo) {
    const root = el('#catalogue-root');
    root.innerHTML = '';
    const aboutSec = create('section', { class: 'about-section' });
    aboutSec.appendChild(create('h2', { text: siteInfo?.about?.title || 'About Us' }));
    aboutSec.appendChild(create('p', { text: siteInfo?.about?.text || '' }));
    aboutSec.appendChild(create('p', { text: 'We dispatch from two hubs depending on your location: Frankfurt, Germany or Constanța, Romania.' }));
    root.appendChild(aboutSec);
  }

  function renderCategory(category) {
    const root = el('#catalogue-root');
    root.innerHTML = '';
    const header = create('header', { class: 'category-header' }, [
      create('h2', { text: category.name }),
      category.banner ? create('img', { src: imgSrc(category.banner), alt: category.name, class: 'category-banner' }) : null
    ]);
    root.appendChild(header);

    // If category has subcategories render subcategory tabs:
    if (category.subcategories && category.subcategories.length) {
      const tabs = create('div', { class: 'subcat-tabs' });
      category.subcategories.forEach((sc, idx) => {
        const t = create('button', { class: 'subcat-tab' + (idx === 0 ? ' active' : ''), 'data-subcat': sc.id, text: sc.name });
        tabs.appendChild(t);
      });
      root.appendChild(tabs);

      const productsContainer = create('section', { class: 'products-section', id: `products-${category.id}` });
      root.appendChild(productsContainer);

      // initial render first subcat
      renderSubcategory(category, category.subcategories[0]);

      // tab clicks
      tabs.addEventListener('click', (ev) => {
        const b = ev.target.closest('button.subcat-tab');
        if (!b) return;
        const subcatId = b.dataset.subcat;
        Array.from(tabs.children).forEach(x => x.classList.toggle('active', x === b));
        const subcat = category.subcategories.find(s => s.id === subcatId);
        if (subcat) renderSubcategory(category, subcat);
      });
    } else {
      // no subcats -> render products array directly (if category.products)
      const fakeSub = { id: category.id + '-all', name: 'All', products: category.products || [] };
      renderSubcategory(category, fakeSub);
    }
  }

  function renderSubcategory(category, subcat) {
    const container = el(`#products-${category.id}`) || el('#catalogue-root');
    container.innerHTML = '';

    const grid = create('div', { class: 'product-grid' });
    (subcat.products || []).forEach(product => {
      const card = create('article', { class: 'product-card', 'data-prod': product.id });
      const thumbImg = (product.images && product.images[0]) ? imgSrc(product.images[0]) : imgSrc('wax_candle_small.png');
      card.appendChild(create('img', { src: thumbImg, alt: product.name, class: 'product-thumb' }));
      card.appendChild(create('h3', { text: product.name }));
      card.appendChild(create('p', { class: 'product-price', text: formatPrice(product.price) }));
      const buyBtn = create('button', { class: 'btn-buy', text: 'Buy' });
      buyBtn.addEventListener('click', () => openProductModal(product, category, subcat));
      card.appendChild(buyBtn);

      grid.appendChild(card);
    });

    // If there are no products
    if ((subcat.products || []).length === 0) {
      container.appendChild(create('p', { text: 'No products available in this section.' }));
    } else {
      container.appendChild(grid);
    }
  }

  // ---------- Product Modal ----------
  function openProductModal(product, category = {}, subcat = {}) {
    const modal = el('#product-modal');
    const pmBody = el('#pm-body');
    pmBody.innerHTML = '';

    // Title + price
    pmBody.appendChild(create('h2', { text: product.name }));
    pmBody.appendChild(create('p', { class: 'pm-price', text: formatPrice(product.price) }));

    // Gallery (respect removeDetails)
    const images = (product.images || []).filter((fn) => !shouldSkipImage(product, fn)).slice(0, MAX_GALLERY_IMAGES);
    const gallery = create('div', { class: 'pm-gallery' });
    if (images.length === 0) {
      gallery.appendChild(create('img', { src: imgSrc('wax_candle_small.png'), alt: product.name }));
    } else {
      const mainImg = create('img', { src: imgSrc(images[0]), alt: product.name, class: 'pm-main-img' });
      gallery.appendChild(mainImg);

      if (images.length > 1) {
        const thumbs = create('div', { class: 'pm-thumbs' });
        images.forEach((fn, i) => {
          const t = create('img', { src: imgSrc(fn), class: 'pm-thumb', 'data-src': imgSrc(fn), alt: `${product.name} preview ${i+1}` });
          t.addEventListener('click', () => {
            mainImg.src = t.dataset.src;
          });
          thumbs.appendChild(t);
        });
        gallery.appendChild(thumbs);
      }
    }
    pmBody.appendChild(gallery);

    // Description
    pmBody.appendChild(create('p', { class: 'pm-desc', text: product.description || '' }));

    // Options (render only if present)
    const optionsWrapper = create('div', { class: 'pm-options' });
    const optionFields = {}; // hold selected option elements

    if (product.options) {
      // generic handler for arrays: scent, intensity, aroma, etc.
      for (const [optName, optVals] of Object.entries(product.options)) {
        if (!Array.isArray(optVals) || optVals.length === 0) continue;
        const field = create('div', { class: 'pm-option-field' });
        field.appendChild(create('label', { text: optName.charAt(0).toUpperCase() + optName.slice(1) + ':' }));
        const select = create('select', { class: 'pm-select', 'data-opt': optName });
        optVals.forEach(v => select.appendChild(create('option', { value: v, text: v })));
        field.appendChild(select);
        optionsWrapper.appendChild(field);
        optionFields[optName] = select;
      }
    }

    // Quantity input
    const qtyWrap = create('div', { class: 'pm-qty' }, [
      create('label', { text: 'Quantity:' }),
      create('input', { type: 'number', min: '1', value: '1', class: 'pm-qty-input', id: 'pm-qty-input' })
    ]);
    optionsWrapper.appendChild(qtyWrap);

    pmBody.appendChild(optionsWrapper);

    // PayPal / buy button
    const actions = create('div', { class: 'pm-actions' });
    const payBtn = create('button', { class: 'btn-pay', text: 'Pay with PayPal' });
    payBtn.addEventListener('click', () => {
      handlePayButton(product, optionFields);
    });

    // Quick buy note + shipping origin info
    const note = create('p', { class: 'pm-note', text: 'Billing in USD. Orders ship from Frankfurt (DE) or Constanța (RO) depending on proximity.' });

    actions.appendChild(payBtn);
    actions.appendChild(note);
    pmBody.appendChild(actions);

    // show modal
    modal.classList.remove('hidden');
  }

  function closeProductModal() {
    const modal = el('#product-modal');
    modal.classList.add('hidden');
    el('#pm-body').innerHTML = '';
  }

  // Pay button behavior: open product.paymentLink (if present) in new tab and show processing notice
  function handlePayButton(product, optionFields) {
    // Build a short summary to send optionally as part of the checkout query (PayPal links you provided are custom links,
    // many of them are PayPal payment pages that may not accept query strings — so we'll simply open the link in a new tab).
    if (!product.paymentLink) {
      alert('Payment link missing for this product. Please contact support.');
      return;
    }

    // Optional: collect selected options for later record (currently we just open the PayPal link)
    const selectedOptions = {};
    for (const [k, sel] of Object.entries(optionFields)) {
      selectedOptions[k] = sel.value;
    }
    const qty = parseInt(el('#pm-qty-input').value || '1', 10);

    // Open PayPal in new tab
    window.open(product.paymentLink, '_blank');

    // Show friendly confirmation on-site
    showProcessingNotice();

    // Close the modal after a short delay
    setTimeout(closeProductModal, 900);
  }

  function showProcessingNotice() {
    // small toast or alert
    const toast = create('div', { class: 'site-toast' }, [create('p', { text: PROCESSING_NOTICE })]);
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 500);
    }, 7000);
  }

  // ---------- Christmas theme toggle ----------
  function applyChristmasTheme(enable) {
    document.documentElement.classList.toggle('christmas-mode', !!enable);
  }

  // ---------- Init ----------
  async function init() {
    ensureRootContainers();

    // small Christmas mode control in top-right
    const topRight = create('div', { class: 'christmas-toggle' });
    topRight.innerHTML = `
      <label style="display:inline-flex;align-items:center;gap:.4rem">
        <input type="checkbox" id="christmas-checkbox"> <span>♥ Christmas Theme</span>
      </label>
    `;
    document.body.appendChild(topRight);
    el('#christmas-checkbox').addEventListener('change', (e) => applyChristmasTheme(e.target.checked));

    // fetch catalogue
    try {
      const resp = await fetch(CATALOGUE_PATH, { cache: 'no-store' });
      if (!resp.ok) throw new Error(`Failed to fetch catalogue: ${resp.status}`);
      const catalogue = await resp.json();

      // store for debugging
      window._velvetCatalogue = catalogue;

      const siteInfo = catalogue.siteInfo || {};
      const categories = catalogue.categories || [];

      // render menu and homepage
      renderMenu(siteInfo, categories);
      renderHome(siteInfo, categories);

      // global modal controls
      document.getElementById('pm-close').addEventListener('click', closeProductModal);
      document.getElementById('pm-backdrop').addEventListener('click', closeProductModal);

      // small keyboard handler for Escape
      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') closeProductModal();
      });

      // apply any default christmas if siteInfo.christmasDefault true
      if (siteInfo.christmasDefault) applyChristmasTheme(true);

      // small accessibility note - add aria-live for toast
      const al = create('div', { id: 'aria-live', 'aria-live': 'polite', style: 'position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden' });
      document.body.appendChild(al);

      console.info('Velvet Charms catalogue loaded successfully.');
    } catch (err) {
      console.error(err);
      const root = el('#catalogue-root');
      root.innerHTML = '<p class="error">Error loading catalogue. Please check that <code>/catalogue.json</code> is present and valid in the site root.</p>';
    }
  }

  // run
  document.addEventListener('DOMContentLoaded', init);
})();
