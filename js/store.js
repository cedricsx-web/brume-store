const Store = {
  products: [],
  categories: [],  // tree with subcategories
  stock: {},
  cart: [],
  activeCategory: null,
  stopStockSync: null,

  async init() {
    UI.showLoader();
    try {
      const [products, categories, stock] = await Promise.all([
        API.getProducts(),
        API.getCategories(),
        API.getStock()
      ]);
      this.products   = products;
      this.categories = categories;
      this.stock      = stock;

      UI.renderCategories(categories);
      UI.renderProducts(products, stock);

      // Show soldes banner only if sale products exist
      const hasSale = products.some(p => p.tag === 'sale');
      const banner = document.getElementById('promo-banner');
      const divider = document.getElementById('promo-divider');
      if (banner) banner.style.display = hasSale ? '' : 'none';
      if (divider) divider.style.display = hasSale ? '' : 'none';
      this.stopStockSync = startStockSync(this.onStockUpdate.bind(this));
    } catch (err) {
      console.error('Store init error:', err);
      UI.hideLoader();
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
    UI.animateCartBadge();
    this.renderCart();
  },

  removeFromCart(productId) {
    this.cart = this.cart.filter(i => i.product.product_id !== productId);
    this.renderCart();
  },

  updateQty(productId, delta) {
    const item = this.cart.find(i => i.product.product_id === productId);
    if (!item) return;
    const available = this.stock[productId] ?? 99;
    const newQty = item.qty + delta;
    if (newQty <= 0) { this.removeFromCart(productId); }
    else if (newQty > available) { UI.flashCartItem(productId); }
    else { item.qty = newQty; this.renderCart(); }
  },

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
    this.activeCategory = 'sale';
    const filtered = this.products.filter(p => p.tag === 'sale');
    UI.renderProducts(filtered, this.stock);
    UI.setActiveCategory(null);
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
