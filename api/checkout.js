/**
 * /api/checkout.js — Vercel Serverless Function
 *
 * Creates a Hiboutik sale from the customer's cart,
 * then returns the Hiboutik payment page URL.
 *
 * Flow:
 *   1. POST /sales/           → create empty sale, get sale_id
 *   2. POST /sales/add_product/ → add each cart item
 *   3. Return payment URL     → https://{account}.hiboutik.com/sale/{sale_id}
 */

const ACCOUNT  = process.env.HIBOUTIK_ACCOUNT;
const USER     = process.env.HIBOUTIK_USER;
const KEY      = process.env.HIBOUTIK_API_KEY;
const TOKEN    = process.env.BRUME_TOKEN;
const STORE_ID = process.env.HIBOUTIK_STORE_ID || '1';

// Simple rate limiter: max 10 checkout requests per IP per minute
const rateLimitMap = new Map();
function isRateLimited(ip) {
  const bucket = `${ip}:${Math.floor(Date.now() / 60000)}`;
  const count = (rateLimitMap.get(bucket) ?? 0) + 1;
  rateLimitMap.set(bucket, count);
  if (rateLimitMap.size > 500) {
    const current = Math.floor(Date.now() / 60000);
    for (const [k] of rateLimitMap) {
      if (!k.endsWith(String(current))) rateLimitMap.delete(k);
    }
  }
  return count > 10;
}

export default async function handler(req, res) {
  if (req.headers['x-brume-token'] !== TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] ?? 'unknown';
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Trop de requêtes. Attendez un instant.' });

  const { cart } = req.body;
  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: 'Panier vide ou invalide' });
  }

  const authHeader = 'Basic ' + Buffer.from(`${USER}:${KEY}`).toString('base64');
  const jsonHeaders = { Authorization: authHeader, 'Content-Type': 'application/json', Accept: 'application/json' };
  const base = `https://${ACCOUNT}.hiboutik.com/api`;

  try {
    // Step 1: Create a new sale
    const saleRes = await fetch(`${base}/sales/`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        store_id:      parseInt(STORE_ID),
        currency_code: 'EUR'
      })
    });
    if (!saleRes.ok) throw new Error(`Create sale failed: ${saleRes.status}`);
    const sale = await saleRes.json();
    const saleId = sale.sale_id ?? sale.id;
    if (!saleId) throw new Error('No sale_id returned from Hiboutik');

    // Step 2: Add each product to the sale
    for (const item of cart) {
      const lineRes = await fetch(`${base}/sales/add_product/`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          sale_id:       saleId,
          product_id:    item.product_id,
          quantity:      item.qty,
          product_price: item.unit_price.toString(),
          size_id:       0
        })
      });
      if (!lineRes.ok) {
        console.warn(`Add product ${item.product_id} failed: ${lineRes.status}`);
      }
    }

    // Step 3: Return the Hiboutik payment URL
    // Hiboutik's online payment page for a sale
    const paymentUrl = `https://${ACCOUNT}.hiboutik.com/myshop/payment/${saleId}/`;

    return res.status(200).json({ sale_id: saleId, payment_url: paymentUrl });

  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Erreur lors de la commande. Réessayez.' });
  }
}
