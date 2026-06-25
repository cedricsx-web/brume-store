/**
 * ui.js — All DOM rendering, no business logic here
 */

const UI = {

  /* ── LOADER ──────────────────────────────────── */

  showLoader() {
    document.getElementById('loader').classList.add('active');
    document.getElementById('products-grid').style.opacity = '0.3';
  },

  hideLoader() {
    document.getElementById('loader').classList.remove('active');
    document.getElementById('products-grid').style.opacity = '1';
  },

  showError(msg) {
    const el = document.getElementById('error-banner');
    el.textContent = msg;
    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 5000);
  },

  showStockWarning() {
    this.showError('Le stock de certains articles a changé. Votre panier a été mis à jour.');
  },

  /* ── CATEGORIES ──────────────────────────────── */

  renderCategories(categories) {
    const nav = document.getElementById('category-nav');
    // "Tout" button
    const allBtn = this._catBtn(null, 'Tout voir');
    allBtn.classList.add('active');
    nav.appendChild(allBtn);
    categories.forEach(cat => {
      nav.appendChild(this._catBtn(cat.categories_id, cat.categories_name));
    });
  },

  _catBtn(id, label) {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.dataset.catId = id ?? 'all';
    btn.textContent = label;
    btn.addEventListener('click', () => Store.filterByCategory(id));
    return btn;
  },

  setActiveCategory(categoryId) {
    document.querySelectorAll('.cat-btn').forEach(btn => {
      const isAll = categoryId === null && btn.dataset.catId === 'all';
      const isMatch = btn.dataset.catId == categoryId;
      btn.classList.toggle('active', isAll || isMatch);
    });
  },

  /* ── PRODUCTS ────────────────────────────────── */

  renderProducts(products, stock) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    if (products.length === 0) {
      grid.innerHTML = '<p class="no-products">Aucun produit dans cette catégorie.</p>';
      return;
    }

    products.forEach(p => {
      grid.appendChild(this._productCard(p, stock[p.product_id] ?? 0));
    });
  },

  _productCard(p, stockQty) {
    const price     = parseFloat(p.product_price);
    const salePrice = p.product_discount_price ? parseFloat(p.product_discount_price) : null;
    const outOfStock = stockQty === 0;
    const lowStock   = stockQty > 0 && stockQty <= 3;

    const card = document.createElement('div');
    card.className = 'product-card' + (outOfStock ? ' out-of-stock' : '');
    card.dataset.productId = p.product_id;

    card.innerHTML = `
      <div class="product-img-wrap">
        <div class="product-emoji" style="background:${p.product_img_bg}">${p.product_emoji}</div>
        <div class="product-emoji-hover" style="background:${p.product_img_bg_hover}">${p.product_emoji_hover}</div>
        ${this._badge(p.tag, outOfStock)}
        ${this._stockBadge(stockQty)}
        <button
          class="product-add-btn"
          data-id="${p.product_id}"
          ${outOfStock ? 'disabled' : ''}
          aria-label="Ajouter ${p.product_model} au panier"
        >
          ${outOfStock ? 'Rupture de stock' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> Ajouter au panier'}
        </button>
      </div>
      <div class="product-info">
        <p class="product-brand">${p.product_brand}</p>
        <h3 class="product-name">${p.product_model}</h3>
        <p class="product-description">${p.product_description}</p>
        <div class="product-price-row">
          ${salePrice
            ? `<span class="price-old">${fmt(price)}</span><span class="price-sale">${fmt(salePrice)}</span>`
            : `<span class="price">${fmt(price)}</span>`
          }
        </div>
      </div>
    `;

    card.querySelector('.product-add-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      Store.addToCart(p.product_id);
      btnAddAnim(e.currentTarget);
    });

    return card;
  },

  _badge(tag, outOfStock) {
    if (outOfStock) return `<span class="badge badge-oos">Rupture</span>`;
    if (tag === 'new')  return `<span class="badge badge-new">Nouveau</span>`;
    if (tag === 'sale') return `<span class="badge badge-sale">Soldes</span>`;
    return '';
  },

  _stockBadge(qty) {
    if (qty === 0 || qty > 3) return '';
    return `<span class="stock-badge" data-stock="${qty}">Plus que ${qty}</span>`;
  },

  updateStockBadges(stock) {
    document.querySelectorAll('.product-card').forEach(card => {
      const id  = parseInt(card.dataset.productId);
      const qty = stock[id] ?? 0;
      const btn = card.querySelector('.product-add-btn');
      const stockBadge = card.querySelector('.stock-badge');
      const topBadge   = card.querySelector('.badge');

      // update out-of-stock state
      card.classList.toggle('out-of-stock', qty === 0);
      if (btn) {
        btn.disabled = qty === 0;
        btn.innerHTML = qty === 0
          ? 'Rupture de stock'
          : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> Ajouter au panier';
      }

      // update low stock badge
      if (stockBadge) {
        if (qty > 0 && qty <= 3) {
          stockBadge.textContent = `Plus que ${qty}`;
          stockBadge.style.display = '';
        } else {
          stockBadge.style.display = 'none';
        }
      }
    });
  },

  /* ── CART ────────────────────────────────────── */

  renderCart(cart, total, itemCount) {
    // Badge in header
    const badge = document.getElementById('cart-count');
    badge.textContent = itemCount;
    badge.classList.toggle('visible', itemCount > 0);

    // Cart panel
    const body = document.getElementById('cart-body');
    const footer = document.getElementById('cart-footer');

    if (cart.length === 0) {
      body.innerHTML = `
        <div class="cart-empty">
          <span class="cart-empty-icon">🛒</span>
          <p>Votre panier est vide</p>
          <small>Ajoutez des produits pour commencer</small>
        </div>`;
      footer.style.display = 'none';
      return;
    }

    body.innerHTML = cart.map(item => {
      const price = parseFloat(item.product.product_discount_price || item.product.product_price);
      const lineTotal = price * item.qty;
      const available = Store.stock[item.product.product_id] ?? 0;
      return `
        <div class="cart-item" data-id="${item.product.product_id}">
          <div class="cart-item-img" style="background:${item.product.product_img_bg}">
            ${item.product.product_emoji}
          </div>
          <div class="cart-item-info">
            <p class="cart-item-brand">${item.product.product_brand}</p>
            <p class="cart-item-name">${item.product.product_model}</p>
            <p class="cart-item-price">${fmt(lineTotal)}</p>
          </div>
          <div class="cart-item-qty">
            <button class="qty-btn" data-id="${item.product.product_id}" data-delta="-1" aria-label="Diminuer">−</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn" data-id="${item.product.product_id}" data-delta="1"
              ${item.qty >= available ? 'disabled' : ''} aria-label="Augmenter">+</button>
          </div>
          <button class="cart-remove" data-id="${item.product.product_id}" aria-label="Supprimer">×</button>
        </div>`;
    }).join('');

    // Bind events
    body.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.updateQty(parseInt(btn.dataset.id), parseInt(btn.dataset.delta));
      });
    });
    body.querySelectorAll('.cart-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.removeFromCart(parseInt(btn.dataset.id));
      });
    });

    // Footer
    footer.style.display = '';
    document.getElementById('cart-total').textContent = fmt(total);
  },

  flashCartItem(productId, reason) {
    const item = document.querySelector(`.cart-item[data-id="${productId}"]`);
    if (item) {
      item.classList.add('flash');
      setTimeout(() => item.classList.remove('flash'), 600);
    }
  },

  animateCartBadge() {
    const badge = document.getElementById('cart-count');
    badge.classList.remove('pop');
    void badge.offsetWidth; // reflow
    badge.classList.add('pop');
  },

  /* ── CART PANEL OPEN/CLOSE ───────────────────── */

  openCart()  { document.getElementById('cart-panel').classList.add('open'); document.getElementById('cart-overlay').classList.add('active'); },
  closeCart() { document.getElementById('cart-panel').classList.remove('open'); document.getElementById('cart-overlay').classList.remove('active'); },
  toggleCart() {
    const isOpen = document.getElementById('cart-panel').classList.contains('open');
    isOpen ? this.closeCart() : this.openCart();
  },

  /* ── CHECKOUT LOADING ────────────────────────── */

  showCheckoutLoading() {
    const btn = document.getElementById('checkout-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Redirection…';
  },

  hideCheckoutLoading() {
    const btn = document.getElementById('checkout-btn');
    btn.disabled = false;
    btn.textContent = 'Commander — payer sur Hiboutik';
  }
};

/* ── HELPERS ──────────────────────────────────── */

function fmt(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

function btnAddAnim(btn) {
  btn.classList.add('added');
  const orig = btn.innerHTML;
  btn.innerHTML = '✓ Ajouté';
  setTimeout(() => {
    btn.innerHTML = orig;
    btn.classList.remove('added');
  }, 900);
}
