const USE_MOCK = false;

const API = {

  async getProducts() {
    if (USE_MOCK) { await delay(300); return window.MOCK_PRODUCTS; }
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },

  async getCategories() {
    if (USE_MOCK) { await delay(100); return window.MOCK_CATEGORIES; }
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },

  async getStock() {
    if (USE_MOCK) { await delay(200); return window.MOCK_STOCK; }
    const res = await fetch('/api/stock');
    if (!res.ok) throw new Error('Failed to fetch stock');
    return res.json();
  },

  async checkout(cart, customerInfo = {}) {
    if (USE_MOCK) {
      await delay(1500);
      return { sale_id: 'MOCK-' + Date.now(), payment_url: 'https://brumeconceptstore.hiboutik.com/myshop/' };
    }
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart, customerInfo })
    });
    if (!res.ok) throw new Error('Checkout failed');
    return res.json();
  }
};

function startStockSync(onUpdate) {
  const interval = setInterval(async () => {
    try { const stock = await API.getStock(); onUpdate(stock); }
    catch (e) { console.warn('Stock sync failed:', e); }
  }, 60_000);
  return () => clearInterval(interval);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
