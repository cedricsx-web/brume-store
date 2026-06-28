const UI = {

  /* ── LOADER ── */
  showLoader()  { document.getElementById('loader').classList.add('active'); document.getElementById('products-grid').style.opacity = '0.2'; },
  hideLoader()  { document.getElementById('loader').classList.remove('active'); document.getElementById('products-grid').style.opacity = '1'; },
  showError(msg){ const el = document.getElementById('error-banner'); el.textContent = msg; el.classList.add('active'); setTimeout(()=>el.classList.remove('active'),5000); },
  showStockWarning() { this.showError('Stock mis à jour — votre panier a été ajusté.'); },

  /* ── CATEGORIES (recursive) ── */
  renderCategories(tree) {
    const nav = document.getElementById('category-nav');
    nav.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'cat-btn active';
    allBtn.dataset.catId = 'all';
    allBtn.textContent = 'Tout voir';
    allBtn.addEventListener('click', () => Store.filterByCategory(null));
    nav.appendChild(allBtn);
    tree.forEach(cat => nav.appendChild(this._catItem(cat, 0)));
  },

  _catItem(cat, depth) {
    const hasSubs = cat.subcategories && cat.subcategories.length > 0;
    const wrapper = document.createElement('div');
    wrapper.className = 'cat-wrapper';
    wrapper.style.marginLeft = depth > 0 ? (depth * 8) + 'px' : '0';

    const btn = document.createElement('button');
    btn.className = 'cat-btn' + (depth > 0 ? ' cat-btn-sub' : '');
    btn.dataset.catId = cat.id;
    btn.innerHTML = cat.name + (hasSubs ? ' <span class="cat-arrow">▾</span>' : '');
    btn.addEventListener('click', (e) => {
      Store.filterByCategory(cat.id);
      if (hasSubs) {
        e.stopPropagation();
        const sub = wrapper.querySelector('.cat-sub');
        if (sub) sub.classList.toggle('open');
      }
    });
    wrapper.appendChild(btn);

    if (hasSubs) {
      const sub = document.createElement('div');
      sub.className = 'cat-sub';
      cat.subcategories.forEach(s => sub.appendChild(this._catItem(s, depth + 1)));
      wrapper.appendChild(sub);
    }
    return wrapper;
  },

  setActiveCategory(id) {
    document.querySelectorAll('.cat-btn').forEach(btn => {
      btn.classList.toggle('active',
        id === null ? btn.dataset.catId === 'all' : btn.dataset.catId == id
      );
    });
  },

  /* ── PRODUCTS ── */
  renderProducts(products, stock) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';
    if (!products.length) {
      grid.innerHTML = '<p class="no-products">Aucun produit dans cette catégorie.</p>';
      return;
    }
    products.forEach(p => grid.appendChild(this._productCard(p, stock[p.product_id] ?? 99)));
  },

  _productCard(p, qty) {
    const price = parseFloat(p.product_price);
    const sale  = p.product_discount_price ? parseFloat(p.product_discount_price) : null;
    const oos   = qty === 0;

    const card = document.createElement('div');
    card.className = 'product-card' + (oos ? ' out-of-stock' : '');
    card.dataset.productId = p.product_id;

    card.innerHTML = `
      <div class="product-img-wrap" role="button" tabindex="0" aria-label="Voir ${p.product_model}">
        <img src="${p.product_image}" alt="${p.product_model}" loading="lazy"
          style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
        <div class="product-img-placeholder" style="display:none;position:absolute;inset:0;align-items:center;justify-content:center;background:${getFallbackGradient(p.product_id)};font-size:32px;color:rgba(242,238,231,0.15);font-family:var(--serif);letter-spacing:0.08em;font-weight:300;">Brüme</div>
        ${p.tag === 'new'  ? '<span class="product-badge">Nouveau</span>' : ''}
        ${p.tag === 'sale' ? '<span class="product-badge sale">Soldes</span>'  : ''}
        ${oos              ? '<span class="product-badge oos">Rupture</span>'  : ''}
        <div class="product-overlay">
          <button class="product-overlay-btn view-btn" data-id="${p.product_id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            Voir le produit
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

    // Click anywhere on card → open modal
    card.querySelector('.product-img-wrap').addEventListener('click', () => UI.openModal(p, qty));
    card.querySelector('.product-img-wrap').addEventListener('keydown', e => { if(e.key==='Enter') UI.openModal(p, qty); });
    card.querySelector('.view-btn').addEventListener('click', e => { e.stopPropagation(); UI.openModal(p, qty); });

    return card;
  },

  updateStockBadges(stock) {
    document.querySelectorAll('.product-card').forEach(card => {
      const id  = parseInt(card.dataset.productId);
      const qty = stock[id] ?? 99;
      card.classList.toggle('out-of-stock', qty === 0);
    });
  },

  /* ── PRODUCT MODAL ── */
  openModal(p, qty) {
    const price = parseFloat(p.product_price);
    const sale  = p.product_discount_price ? parseFloat(p.product_discount_price) : null;
    const oos   = qty === 0;

    document.getElementById('modal-img').src = p.product_image;
    document.getElementById('modal-img').onerror = function() {
      this.style.display = 'none';
      document.getElementById('modal-img-placeholder').style.display = 'flex';
      document.getElementById('modal-img-placeholder').style.background = getFallbackGradient(p.product_id);
    };
    document.getElementById('modal-img-placeholder').style.display = 'none';
    document.getElementById('modal-name').textContent   = p.product_model;
    document.getElementById('modal-brand').textContent  = p.product_brand;
    const rawDesc = p.product_description || '';
    const modalDesc = document.getElementById('modal-desc');
    if (!rawDesc.trim()) {
      modalDesc.innerHTML = '<p class="desc-empty">Aucune description disponible.</p>';
    } else if (rawDesc.includes('<')) {
      modalDesc.innerHTML = rawDesc;
    } else {
      modalDesc.innerHTML = formatDescription(rawDesc);
    }
    document.getElementById('modal-price').innerHTML    = sale
      ? `<span class="old-price">${fmt(price)}</span> <span class="price-sale">${fmt(sale)}</span>`
      : fmt(price);

    const addBtn = document.getElementById('modal-add-btn');
    addBtn.disabled = oos;
    addBtn.textContent = oos ? 'Rupture de stock' : 'Ajouter au panier';
    addBtn.onclick = () => {
      if (!oos) {
        Store.addToCart(p.product_id);
        addBtn.textContent = '✓ Ajouté !';
        setTimeout(() => { addBtn.textContent = 'Ajouter au panier'; }, 1200);
      }
    };

    document.getElementById('product-modal').classList.add('open');
    document.getElementById('modal-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeModal() {
    document.getElementById('product-modal').classList.remove('open');
    document.getElementById('modal-overlay').classList.remove('active');
    document.body.style.overflow = '';
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
      const avail = Store.stock[item.product.product_id] ?? 99;
      return `
        <div class="cart-item" data-id="${item.product.product_id}">
          <div class="cart-item-img">
            <img src="${item.product.product_image}" alt="${item.product.product_model}"
              onerror="this.style.display='none'" />
          </div>
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
    btn.innerHTML = '<span class="spinner"></span> Redirection vers le paiement…';
  },
  hideCheckoutLoading() {
    const btn = document.getElementById('checkout-btn');
    btn.disabled = false;
    btn.textContent = 'Commander — paiement sécurisé';
  }
};

/* ── HELPERS ── */
function fmt(n) {
  return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(n);
}

const FALLBACK_GRADIENTS = [
  'linear-gradient(145deg,#E2D9CC,#C8BBA8)',
  'linear-gradient(145deg,#CDD5D2,#A9B7B3)',
  'linear-gradient(145deg,#D9CFBF,#BFB09C)',
  'linear-gradient(145deg,#E8E0D5,#D0C5B5)',
  'linear-gradient(145deg,#CCC4B8,#AFA598)',
  'linear-gradient(145deg,#C8D0CC,#A8B5B0)',
  'linear-gradient(145deg,#D4CCB8,#BEB49E)',
  'linear-gradient(145deg,#B8C4B0,#8BA882)',
];
function getFallbackGradient(id) {
  return FALLBACK_GRADIENTS[id % FALLBACK_GRADIENTS.length];
}

/* ── DESCRIPTION FORMATTER ───────────────────────
 * Converts Hiboutik plain-text descriptions into
 * readable HTML with sections, bullets and paragraphs.
 */
function formatDescription(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  let html = '';
  let i = 0;

  // Skip first line if it's the product name (often repeated in description)
  // Detect: very short all-caps or matches product title pattern — skip silently

  while (i < lines.length) {
    const line = lines[i];

    // Section header — short line NOT starting with bullet,
    // followed by content, no period at end usually
    const nextLine = lines[i + 1] || '';
    const isHeader = line.length < 60
      && !line.startsWith('•')
      && !line.startsWith('-')
      && (nextLine.startsWith('•') || nextLine.startsWith('-') || nextLine.length > 40)
      && !line.endsWith('.');

    if (isHeader) {
      html += `<p class="desc-section">${line}</p>`;
      i++;
      continue;
    }

    // Bullet point group
    if (line.startsWith('•') || line.startsWith('-')) {
      html += '<ul>';
      while (i < lines.length && (lines[i].startsWith('•') || lines[i].startsWith('-'))) {
        const bulletText = lines[i].replace(/^[•\-]\s*/, '').trim();
        // Handle inline bullets separated by • on same line
        if (bulletText.includes(' • ')) {
          bulletText.split(' • ').forEach(b => {
            if (b.trim()) html += `<li>${b.trim()}</li>`;
          });
        } else {
          html += `<li>${bulletText}</li>`;
        }
        i++;
      }
      html += '</ul>';
      continue;
    }

    // Regular paragraph
    html += `<p>${line}</p>`;
    i++;
  }

  return html || '<p class="desc-empty">Aucune description disponible.</p>';
}
