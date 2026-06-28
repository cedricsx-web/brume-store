/**
 * api.js — Data layer for Brüme Store
 *
 * Toggle:
 *   const USE_MOCK = true;   ← development (no API key needed)
 *   const USE_MOCK = false;  ← production (calls Vercel proxy)
 */

const USE_MOCK = false; // ← NOW LIVE

// This token must match BRUME_TOKEN in Vercel environment variables
// It's not a secret in the sense of a password — it just prevents
// random people from hammering your proxy endpoints.
const BRUME_TOKEN = 'brume-secret-2025'; // ← change this to match your Vercel env var

const HEADERS = { 'x-brume-token': BRUME_TOKEN };

const API = {

  /* ── PRODUCTS ─────────────────────────────── */
  async getProducts() {
    if (USE_MOCK) {
      await delay(300);
      return window.MOCK_PRODUCTS;
    }
    const res = await fetch('/api/products', { headers: HEADERS });
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },

  /* ── CATEGORIES ───────────────────────────── */
  async getCategories() {
    if (USE_MOCK) {
      await delay(100);
      return window.MOCK_CATEGORIES;
    }
    const res = await fetch('/api/categories', { headers: HEADERS });
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },

  /* ── STOCK ────────────────────────────────── */
  async getStock() {
    if (USE_MOCK) {
      await delay(200);
      return window.MOCK_STOCK;
    }
    const res = await fetch('/api/stock', { headers: HEADERS });
    if (!res.ok) throw new Error('Failed to fetch stock');
    return res.json();
  },

  /* ── CHECKOUT ─────────────────────────────── */
  async checkout(cart, customerInfo = {}) {
    if (USE_MOCK) {
      await delay(1500);
      return {
        sale_id: 'MOCK-' + Date.now(),
        payment_url: 'https://brumeconceptstore.hiboutik.com/myshop/'
      };
    }
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart, customerInfo })
    });
    if (!res.ok) throw new Error('Checkout failed');
    return res.json();
  }
};

/* ── STOCK POLLING ────────────────────────────
 * Refreshes stock every 60 seconds automatically.
 */
function startStockSync(onUpdate) {
  const interval = setInterval(async () => {
    try {
      const stock = await API.getStock();
      onUpdate(stock);
    } catch (e) {
      console.warn('Stock sync failed:', e);
    }
  }, 60_000);
  return () => clearInterval(interval);
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
