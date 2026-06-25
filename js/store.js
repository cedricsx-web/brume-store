/**
 * store.js — Cart state, product rendering, checkout flow
 */

const Store = {
  products: [],
  categories: [],
  stock: {},
  cart: [],          // [{ product, qty }]
  activeCategory: null,
  stopStockSync: null,

  /* ── INIT ───────────────────────────────────── */

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
      this.stopStockSync = startStockSync(this.onStockUpdate.bind(this));
    } catch (e) {
      UI.showError('Impossible de charger les produits. Réessayez dans un instant.');
      console.error(e);
    } finally {
      UI.hideLoader();
    }
  },

  /* ── STOCK SYNC ─────────────────────────────── */

  onStockUpdate(newStock) {
    this.stock = newStock;
    UI.updateStockBadges(newStock);
    this.syncCartWithStock(newStock);
  },

  syncCartWithStock(stock) {
    // If something in cart is now out of stock, clamp qty
    let changed = false;
    this.cart = this.cart.map(item => {
      const available = stock[item.product.product_id] ?? 0;
      if (item.qty > available) {
        changed = true;
        return { ...item, qty: available };
      }
      return item;
    }).filter(item => item.qty > 0);

    if (changed) {
      UI.showStockWarning();
      this.renderCart();
    }
  },

  /* ── CATEGORY FILTER ─────────────────────────── */

  filterByCategory(categoryId) {
    this.activeCategory = categoryId;
    const filtered = categoryId === null
      ? this.products
      : this.products.filter(p => p.product_category === categoryId);
    UI.renderProducts(filtered, this.stock);
    UI.setActiveCategory(categoryId);
  },

  /* ── CART ────────────────────────────────────── */

  addToCart(productId) {
    const product = this.products.find(p => p.product_id === productId);
    if (!product) return;

    const available = this.stock[productId] ?? 0;
    if (available === 0) return;

    const existing = this.cart.find(i => i.product.product_id === productId);
    if (existing) {
      if (existing.qty >= available) {
        UI.flashCartItem(productId, 'max');
        return;
      }
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
    const available = this.stock[productId] ?? 0;
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      this.removeFromCart(productId);
    } else if (newQty > available) {
      UI.flashCartItem(productId, 'max');
    } else {
      item.qty = newQty;
      this.renderCart();
    }
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

  /* ── CHECKOUT ────────────────────────────────── */

  async checkout() {
    if (this.cart.length === 0) return;

    const cartPayload = this.cart.map(item => ({
      product_id:    item.product.product_id,
      product_model: item.product.product_model,
      qty:           item.qty,
      unit_price:    parseFloat(item.product.product_discount_price || item.product.product_price)
    }));

    UI.showCheckoutLoading();

    try {
      const result = await API.checkout(cartPayload, {});
      // Redirect to Hiboutik payment page
      window.location.href = result.payment_url;
    } catch (e) {
      UI.hideCheckoutLoading();
      UI.showError('Une erreur est survenue. Veuillez réessayer.');
      console.error(e);
    }
  }
};
