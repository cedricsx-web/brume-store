/**
 * /api/stock.js — Vercel Serverless Function
 * Fetches stock levels from Hiboutik.
 * Returns flat object: { product_id: quantity }
 *
 * Hiboutik endpoint: GET /stock_available/warehouse_id/{id}
 */

const ACCOUNT = process.env.HIBOUTIK_ACCOUNT;
const USER    = process.env.HIBOUTIK_USER;
const KEY     = process.env.HIBOUTIK_API_KEY;
const TOKEN   = process.env.BRUME_TOKEN;
const WH_ID   = process.env.HIBOUTIK_WAREHOUSE_ID || '1';

export default async function handler(req, res) {
  if (req.headers['x-brume-token'] !== TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const response = await fetch(
      `https://${ACCOUNT}.hiboutik.com/api/stock_available/warehouse_id/${WH_ID}`,
      {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${USER}:${KEY}`).toString('base64'),
          Accept: 'application/json'
        }
      }
    );

    if (!response.ok) throw new Error(`Stock fetch failed: ${response.status}`);

    const rawStock = await response.json();

    // Hiboutik returns: [{ product_id, product_size, stock_available, ... }]
    // We sum across sizes per product_id
    const stock = {};
    if (Array.isArray(rawStock)) {
      rawStock.forEach(item => {
        const id  = parseInt(item.product_id);
        const qty = parseInt(item.stock_available ?? 0);
        stock[id] = (stock[id] || 0) + qty;
      });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json(stock);

  } catch (err) {
    console.error('Stock proxy error:', err);
    return res.status(500).json({ error: 'Failed to fetch stock' });
  }
}
