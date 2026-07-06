const Store = {
  products: [],
  categories: [],  // tree with subcategories
  stock: {},
  cart: [],
  activeCategory: null,
  stopStockSync: null,

  // ── CACHE CONFIG ──
  _CACHE_KEY: 'brume_catalog',
  _CACHE_TTL: 5 * 60 * 1000, // 5 min — after this, refresh in background

  _saveCache(products, categories) {
    try {
      localStorage.setItem(this._CACHE_KEY, JSON.stringify({
        ts: Date.now(), products, categories
      }));
    } catch {}
  },

  _loadCache() {
    try {
      const raw = localStorage.getItem(this._CACHE_KEY);
      if (!raw) return null;
      const c = JSON.parse(raw);
      if (!c.products || !c.categories) return null;
      return c;
    } catch { return null; }
  },

  async init() {
    UI.showLoader();
    this._loadCartFromStorage();

    // 1) Try to render from cache immediately
    const cache = this._loadCache();
    if (cache) {
      this.products   = cache.products;
      this.categories = cache.categories;
      const cacheHasSale = this.products.some(p => parseFloat(p.product_discount_price) > 0);
      UI.renderCategories(this.categories, cacheHasSale);
      UI.renderProducts(this._homeSelection(this.products, this.categories, this.stock), this.stock);
      UI.setActiveCategory('selection');
      this._hydrateCartFromIds();
      this.renderCart();
      UI.hideLoader();
    }

    // 2) Fetch fresh data (in parallel)
    try {
      const [products, categories, stock] = await Promise.all([
        API.getProducts(),
        API.getCategories(),
        API.getStock()
      ]);
      this.products   = products;
      this.categories = categories;
      this.stock      = stock;
      this._saveCache(products, categories);

      // Re-render with fresh data (instant — data already in memory)
      UI.renderCategories(categories);
      // Only re-render products if user hasn't navigated away from selection
      if (this.activeCategory === 'selection' || this.activeCategory === null) {
        UI.renderProducts(this._homeSelection(products, categories, stock), stock);
        this.activeCategory = 'selection';
      } else {
        this.filterByCategory(this.activeCategory);
      }
      UI.setActiveCategory(this.activeCategory);

      this._hydrateCartFromIds();
      this.renderCart();

      // Ré-affiche le nav avec le bouton "Soldes" si au moins un produit a un prix remisé réel
      const hasSale = products.some(p => parseFloat(p.product_discount_price) > 0);
      UI.renderCategories(categories, hasSale);
      UI.setActiveCategory(this.activeCategory);

      this.stopStockSync = startStockSync(this.onStockUpdate.bind(this));
    } catch (err) {
      console.error('Store init error:', err);
      // If we had no cache either, show error
      if (!cache) UI.showError('Erreur de chargement. Rechargez la page.');
    } finally {
      UI.hideLoader();
    }
  },

  onStockUpdate(newStock) {
    this.stock = newStock;
    UI.updateStockBadges(newStock);
    this.syncCartWithStock(newStock);
  },

  syncCartWithStock(stock) {
    let changed = false;
    this.cart = this.cart.map(item => {
      const available = stock[item.product.product_id] ?? 0;
      if (item.qty > available) { changed = true; return { ...item, qty: available }; }
      return item;
    }).filter(item => item.qty > 0);
    if (changed) { UI.showStockWarning(); this.renderCart(); }
  },

  // Collect all category IDs under a given node (recursively)
  _getAllCategoryIds(tree, targetId) {
    const ids = [];
    const search = (nodes) => {
      for (const node of nodes) {
        if (node.id === targetId) {
          // Found it — collect this node and all its descendants
          const collect = (n) => {
            ids.push(n.id);
            if (n.subcategories) n.subcategories.forEach(collect);
          };
          collect(node);
          return true;
        }
        if (node.subcategories && search(node.subcategories)) return true;
      }
      return false;
    };
    search(tree);
    return ids;
  },

  // Build a curated homepage selection: 1 product per root category, max 8 total
  _homeSelection(products, categories, stock) {
    const selected = [];
    const seen = new Set();

    const addProduct = (p) => {
      if (!seen.has(p.product_id)) {
        seen.add(p.product_id);
        selected.push(p);
      }
    };

    for (const cat of categories) {
      if (selected.length >= 8) break;

      // Collect all category IDs under this root (including subcategories)
      const ids = this._getAllCategoryIds(categories, cat.id);
      const catProducts = products.filter(p => ids.includes(p.product_category));

      if (catProducts.length === 0) continue;

      // Préfère un produit en stock ; si toute la catégorie est en rupture,
      // on retombe sur le premier produit trouvé plutôt que de sauter la catégorie.
      const inStock = catProducts.find(p => (stock?.[p.product_id] ?? 99) > 0);
      addProduct(inStock || catProducts[0]);
    }

    return selected.slice(0, 8);
  },

  filterBySelection() {
    this.activeCategory = 'selection';
    const filtered = this._homeSelection(this.products, this.categories, this.stock);
    UI.renderProducts(filtered, this.stock);
    UI.setActiveCategory('selection');
  },

  filterByCategory(categoryId) {
    this.activeCategory = categoryId;
    let filtered;
    if (categoryId === null) {
      filtered = this.products;
    } else {
      // Get all descendant category IDs so clicking "Japon" shows all sub-sub products
      const ids = this._getAllCategoryIds(this.categories, categoryId);
      // ids includes the clicked category itself + all its children recursively
      filtered = this.products.filter(p => ids.includes(p.product_category));
    }
    UI.renderProducts(filtered, this.stock);
    UI.setActiveCategory(categoryId);
  },

  filterBySubCategory(subCategoryId) {
    this.filterByCategory(subCategoryId);
  },

  addToCart(productId) {
    const product = this.products.find(p => p.product_id === productId);
    if (!product) return;
    const available = this.stock[productId] ?? 99; // if no stock management, allow adding
    const existing = this.cart.find(i => i.product.product_id === productId);
    if (existing) {
      if (existing.qty >= available) { UI.flashCartItem(productId); return; }
      existing.qty++;
    } else {
      this.cart.push({ product, qty: 1 });
    }
    this._saveCartToStorage();
    UI.animateCartBadge();
    this.renderCart();
  },

  removeFromCart(productId) {
    this.cart = this.cart.filter(i => i.product.product_id !== productId);
    this._saveCartToStorage();
    this.renderCart();
  },

  updateQty(productId, delta) {
    const item = this.cart.find(i => i.product.product_id === productId);
    if (!item) return;
    const available = this.stock[productId] ?? 99;
    const newQty = item.qty + delta;
    if (newQty <= 0) { this.removeFromCart(productId); }
    else if (newQty > available) { UI.flashCartItem(productId); }
    else { item.qty = newQty; this._saveCartToStorage(); this.renderCart(); }
  },

  // ── PERSISTANCE PANIER (localStorage) ──────────────
  // Le panier vit en mémoire avec des objets produit complets.
  // localStorage ne stocke que { product_id, qty } pour rester léger,
  // puis on "hydrate" avec les vrais objets produit une fois chargés.

  _saveCartToStorage() {
    const lightCart = this.cart.map(i => ({ product_id: i.product.product_id, qty: i.qty }));
    localStorage.setItem('brume_cart', JSON.stringify(lightCart));
  },

  _loadCartFromStorage() {
    try {
      const raw = localStorage.getItem('brume_cart');
      this._pendingCartIds = raw ? JSON.parse(raw) : [];
    } catch { this._pendingCartIds = []; }
  },

  // Called after this.products is loaded — converts { product_id, qty } into full cart items
  _hydrateCartFromIds() {
    if (!this._pendingCartIds || !this._pendingCartIds.length) return;
    this._pendingCartIds.forEach(({ product_id, qty }) => {
      // Comparaison en string : localStorage stocke des strings, l'API Hiboutik des nombres
      const product = this.products.find(p => String(p.product_id) === String(product_id));
      if (!product) return;
      const existing = this.cart.find(i => String(i.product.product_id) === String(product_id));
      if (existing) existing.qty = qty;
      else this.cart.push({ product, qty });
    });
    this._pendingCartIds = [];
    this._saveCartToStorage(); // re-sync localStorage avec les IDs résolus
  },

  // Ajoute un produit au panier localStorage — voir aussi addToLocalCart() dans cms.js
  // (utilisé depuis article.html qui ne charge pas store.js)

  getTotal() {
    return this.cart.reduce((sum, item) => {
      const price = parseFloat(item.product.product_discount_price || item.product.product_price);
      return sum + price * item.qty;
    }, 0);
  },

  getItemCount() {
    return this.cart.reduce((sum, i) => sum + i.qty, 0);
  },

  renderCart() {
    UI.renderCart(this.cart, this.getTotal(), this.getItemCount());
  },

  filterBySale() {
    this.activeCategory = 'soldes';
    const filtered = this.products.filter(p => parseFloat(p.product_discount_price) > 0);
    UI.renderProducts(filtered, this.stock);
    UI.setActiveCategory('soldes');
  },

  async checkout() {
    if (this.cart.length === 0) return;
    UI.showCheckoutLoading();

    // Encode cart as product_id:qty pairs
    const cartParam = this.cart
      .map(item => item.product.product_id + ':' + item.qty)
      .join(',');

    // Redirect to Hiboutik — the injected JS there catches brume_cart and fills the cart
    window.location.href =
      'https://brumeconceptstore.hiboutik.com/myshop/?brume_cart=' + encodeURIComponent(cartParam);
  }
};
