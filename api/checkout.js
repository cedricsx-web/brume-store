/**
 * /api/checkout.js — Vercel Serverless Function
 *
 * Receives the cart from the browser, creates a sale in Hiboutik,
 * and returns the Hiboutik payment page URL.
 *
 * The customer is then redirected to that URL — the only moment
 * they ever touch hiboutik.com.
 *
 * Flow:
 *   1. Browser POSTs cart to /api/checkout
 *   2. We create a sale in Hiboutik (POST /api/sales/)
 *   3. We add each cart line to the sale (POST /api/sales/{id}/line_items/)
 *   4. We return the Hiboutik payment URL
 *   5. Browser redirects the customer there
 */

// Simple in-memory rate limiter — max 10 checkout attempts per IP per minute
const rateLimitMap = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const key = `${ip}:${Math.floor(now / 60000)}`; // per-minute bucket
  const count = (rateLimitMap.get(key) ?? 0) + 1;
  rateLimitMap.set(key, count);
  // Cleanup old keys occasionally
  if (rateLimitMap.size > 1000) {
    for (const [k] of rateLimitMap) {
      if (!k.endsWith(String(Math.floor(now / 60000)))) rateLimitMap.delete(k);
    }
  }
  return count > 10;
}

export default async function handler(req, res) {
  // Auth check
  const token = req.headers['x-brume-token'];
  if (token !== process.env.BRUME_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for'] ?? 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  const { cart, customerInfo } = req.body;

  // Validate cart
  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: 'Cart is empty or invalid' });
  }
  if (cart.some(item => !item.product_id || !item.qty || item.qty < 1)) {
    return res.status(400).json({ error: 'Invalid cart item' });
  }

  const account  = process.env.HIBOUTIK_ACCOUNT;
  const user     = process.env.HIBOUTIK_USER;
  const apiKey   = process.env.HIBOUTIK_API_KEY;
  const storeId  = process.env.HIBOUTIK_STORE_ID || '1';
  const auth     = 'Basic ' + Buffer.from(`${user}:${apiKey}`).toString('base64');
  const headers  = { 'Authorization': auth, 'Content-Type': 'application/json', 'Accept': 'application/json' };
  const base     = `https://${account}.hiboutik.com/api`;

  try {
    // ── STEP 1: Create a new sale in Hiboutik ──
    const saleRes = await fetch(`${base}/sales/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        store_id:       storeId,
        currency_id:    1,       // EUR
        sale_type:      'online',
        // customer_id: customerInfo.hiboutik_customer_id  ← add when customer accounts are implemented
      })
    });
    if (!saleRes.ok) throw new Error(`Create sale failed: ${saleRes.status}`);
    const sale = await saleRes.json();
    const saleId = sale.sale_id ?? sale.id;

    // ── STEP 2: Add each cart item as a line ──
    for (const item of cart) {
      const lineRes = await fetch(`${base}/sales/${saleId}/line_items/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          product_id: item.product_id,
          quantity:   item.qty,
          unit_price: item.unit_price
        })
      });
      if (!lineRes.ok) throw new Error(`Add line item failed: ${lineRes.status}`);
    }

    // ── STEP 3: Return the Hiboutik payment page URL ──
    // Hiboutik generates a unique payment URL per sale.
    const paymentUrl = `https://${account}.hiboutik.com/sale_payment/${saleId}/`;

    return res.status(200).json({ sale_id: saleId, payment_url: paymentUrl });

  } catch (err) {
    console.error('Checkout proxy error:', err);
    return res.status(500).json({ error: 'Checkout failed. Please try again.' });
  }
}
