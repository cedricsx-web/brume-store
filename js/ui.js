const UI = {

  showLoader()  { document.getElementById('loader').classList.add('active'); document.getElementById('products-grid').style.opacity = '0.2'; },
  hideLoader()  { document.getElementById('loader').classList.remove('active'); document.getElementById('products-grid').style.opacity = '1'; },
  showError(msg){ const el = document.getElementById('error-banner'); el.textContent = msg; el.classList.add('active'); setTimeout(()=>el.classList.remove('active'),5000); },
  showStockWarning() { this.showError('Stock mis à jour — votre panier a été ajusté.'); },

  renderCategories(cats) {
    const nav = document.getElementById('category-nav');
    nav.appendChild(this._catBtn(null,'Tout voir',true));
    cats.forEach(c => nav.appendChild(this._catBtn(c.categories_id, c.categories_name)));
  },
  _catBtn(id, label, active=false) {
    const btn = document.createElement('button');
    btn.className = 'cat-btn' + (active?' active':'');
    btn.dataset.catId = id ?? 'all';
    btn.textContent = label;
    btn.addEventListener('click', () => Store.filterByCategory(id));
    return btn;
  },
  setActiveCategory(id) {
    document.querySelectorAll('.cat-btn').forEach(btn => {
      btn.classList.toggle('active',
        id === null ? btn.dataset.catId === 'all' : btn.dataset.catId == id
      );
    });
  },

  renderProducts(products, stock) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';
    if (!products.length) {
      grid.innerHTML = '<p class="no-products">Aucun produit dans cette catégorie.</p>';
      return;
    }
    products.forEach(p => grid.appendChild(this._productCard(p, stock[p.product_id] ?? 0)));
  },

  _productCard(p, qty) {
    const price    = parseFloat(p.product_price);
    const sale     = p.product_discount_price ? parseFloat(p.product_discount_price) : null;
    const oos      = qty === 0;
    const low      = qty > 0 && qty <= 3;

    const card = document.createElement('div');
    card.className = 'product-card' + (oos ? ' out-of-stock' : '');
    card.dataset.productId = p.product_id;

    card.innerHTML = `
      <div class="product-img-wrap">
        <img src="${p.product_image}" alt="${p.product_model}" loading="lazy" />
        ${p.tag === 'new'  ? '<span class="product-badge">Nouveau</span>' : ''}
        ${p.tag === 'sale' ? '<span class="product-badge sale">Soldes</span>' : ''}
        ${oos              ? '<span class="product-badge oos">Rupture</span>' : ''}
        ${low              ? `<span class="stock-low">Plus que ${qty}</span>` : ''}
        <div class="product-overlay">
          <button class="product-overlay-btn" data-id="${p.product_id}" ${oos?'disabled':''}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            ${oos ? 'Rupture de stock' : 'Ajouter au panier'}
          </button>
        </div>
      </div>
      <div class="product-info">
        <div class="product-name">${p.product_model}</div>
        <div class="product-maker">${p.product_brand}</div>
        <div class="product-price">
          ${sale ? `<span class="old-price">${fmt(price)}</span>${fmt(sale)}` : fmt(price)}
        </div>
      </div>`;

    card.querySelector('.product-overlay-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      if (oos) return;
      Store.addToCart(p.product_id);
      const btn = e.currentTarget;
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ Ajouté';
      setTimeout(() => { btn.innerHTML = orig; }, 900);
    });

    return card;
  },

  updateStockBadges(stock) {
    document.querySelectorAll('.product-card').forEach(card => {
      const id  = parseInt(card.dataset.productId);
      const qty = stock[id] ?? 0;
      const oos = qty === 0;
      card.classList.toggle('out-of-stock', oos);
      const btn = card.querySelector('.product-overlay-btn');
      if (btn) {
        btn.disabled = oos;
        if (oos) btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> Rupture de stock';
      }
      const lowBadge = card.querySelector('.stock-low');
      if (lowBadge) lowBadge.style.display = (qty > 0 && qty <= 3) ? '' : 'none';
    });
  },

  /* ── CART ── */
  renderCart(cart, total, count) {
    const badge  = document.getElementById('cart-count');
    const body   = document.getElementById('cart-body');
    const footer = document.getElementById('cart-footer');
    badge.textContent = count;
    badge.classList.toggle('visible', count > 0);

    if (!cart.length) {
      body.innerHTML = `<div class="cart-empty"><span class="cart-empty-icon">🛒</span><p>Panier vide</p><small>Ajoutez des produits pour commencer</small></div>`;
      footer.style.display = 'none';
      return;
    }

    body.innerHTML = cart.map(item => {
      const price = parseFloat(item.product.product_discount_price || item.product.product_price);
      const avail = Store.stock[item.product.product_id] ?? 0;
      return `
        <div class="cart-item" data-id="${item.product.product_id}">
          <div class="cart-item-img"><img src="${item.product.product_image}" alt="${item.product.product_model}" /></div>
          <div>
            <p class="cart-item-brand">${item.product.product_brand}</p>
            <p class="cart-item-name">${item.product.product_model}</p>
            <p class="cart-item-price">${fmt(price * item.qty)}</p>
          </div>
          <div class="cart-item-qty">
            <button class="qty-btn" data-id="${item.product.product_id}" data-delta="-1">−</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn" data-id="${item.product.product_id}" data-delta="1" ${item.qty>=avail?'disabled':''}>+</button>
          </div>
          <button class="cart-remove" data-id="${item.product.product_id}">×</button>
        </div>`;
    }).join('');

    body.querySelectorAll('.qty-btn').forEach(b => b.addEventListener('click', () => Store.updateQty(parseInt(b.dataset.id), parseInt(b.dataset.delta))));
    body.querySelectorAll('.cart-remove').forEach(b => b.addEventListener('click', () => Store.removeFromCart(parseInt(b.dataset.id))));

    footer.style.display = '';
    document.getElementById('cart-total').textContent = fmt(total);
  },

  animateCartBadge() {
    const b = document.getElementById('cart-count');
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  },
  flashCartItem(id) {
    const el = document.querySelector(`.cart-item[data-id="${id}"]`);
    if (el) { el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'),600); }
  },

  openCart()   { document.getElementById('cart-panel').classList.add('open'); document.getElementById('cart-overlay').classList.add('active'); },
  closeCart()  { document.getElementById('cart-panel').classList.remove('open'); document.getElementById('cart-overlay').classList.remove('active'); },
  toggleCart() { document.getElementById('cart-panel').classList.contains('open') ? this.closeCart() : this.openCart(); },

  showCheckoutLoading() {
    const btn = document.getElementById('checkout-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Redirection…';
  },
  hideCheckoutLoading() {
    const btn = document.getElementById('checkout-btn');
    btn.disabled = false;
    btn.textContent = 'Commander — paiement sécurisé';
  }
};

function fmt(n) {
  return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(n);
}
