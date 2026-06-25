/**
 * api.js — Data layer for Brüme Store
 *
 * MODE SWITCHING (one line change):
 *   const USE_MOCK = true;   ← development, no API key needed
 *   const USE_MOCK = false;  ← production, calls /api/* proxy endpoints
 *
 * Proxy endpoints (vercel serverless functions in /api/):
 *   GET  /api/products    → Hiboutik GET /api/products/
 *   GET  /api/stock       → Hiboutik GET /api/stock/{id}  (all products)
 *   POST /api/checkout    → Hiboutik POST /api/sales/     → returns payment URL
 */

const USE_MOCK = true; // ← flip to false when API is ready

const API = {

  /* ── PRODUCTS ─────────────────────────────────────── */

  async getProducts() {
    if (USE_MOCK) {
      await delay(300); // simulate network
      return window.MOCK_PRODUCTS;
    }
    const res = await fetch('/api/products', {
      headers: { 'x-brume-token': window.BRUME_TOKEN }
    });
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },

  /* ── CATEGORIES ───────────────────────────────────── */

  async getCategories() {
    if (USE_MOCK) {
      await delay(100);
      return window.MOCK_CATEGORIES;
    }
    const res = await fetch('/api/categories', {
      headers: { 'x-brume-token': window.BRUME_TOKEN }
    });
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },

  /* ── STOCK ────────────────────────────────────────── */

  async getStock() {
    if (USE_MOCK) {
      await delay(200);
      return window.MOCK_STOCK;
    }
    const res = await fetch('/api/stock', {
      headers: { 'x-brume-token': window.BRUME_TOKEN }
    });
    if (!res.ok) throw new Error('Failed to fetch stock');
    return res.json();
  },

  /* ── CHECKOUT ─────────────────────────────────────── */
  /**
   * Sends the cart to Hiboutik and gets back the payment page URL.
   *
   * cart format:
   * [{ product_id, product_model, qty, unit_price }]
   *
   * Hiboutik response (real):
   * { sale_id, payment_url }
   *
   * Mock: simulates a 1.5s processing delay then returns a fake URL
   */
  async checkout(cart, customerInfo) {
    if (USE_MOCK) {
      await delay(1500);
      // In mock mode, just open the real Hiboutik shop as a stand-in
      return {
        sale_id: 'MOCK-' + Date.now(),
        payment_url: 'https://brumeconceptstore.hiboutik.com/myshop/'
      };
    }
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-brume-token': window.BRUME_TOKEN
      },
      body: JSON.stringify({ cart, customerInfo })
    });
    if (!res.ok) throw new Error('Checkout failed');
    return res.json(); // { sale_id, payment_url }
  }

};

/* ── STOCK POLLING ────────────────────────────────────
 * Refreshes stock every 60 seconds so the displayed
 * quantities stay in sync with Hiboutik in real time.
 * The store calls Store.startStockSync() on load.
 */
function startStockSync(onUpdate) {
  // immediate first load handled by store init
  const interval = setInterval(async () => {
    try {
      const stock = await API.getStock();
      onUpdate(stock);
    } catch (e) {
      console.warn('Stock sync failed:', e);
    }
  }, 60_000); // every 60s
  return () => clearInterval(interval); // returns cleanup fn
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
