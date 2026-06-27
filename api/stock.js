/**
 * /api/stock.js — Vercel Serverless Function
 *
 * Fetches stock levels for all products from Hiboutik.
 * Returns a flat object: { [product_id]: quantity }
 *
 * Hiboutik endpoint: GET /api/stock/{warehouse_id}/
 * Default warehouse_id = 1 (change if your client has multiple stores)
 */

export default async function handler(req, res) {
  const token = req.headers['x-brume-token'];
  if (token !== process.env.BRUME_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const account     = process.env.HIBOUTIK_ACCOUNT;
    const user        = process.env.HIBOUTIK_USER;
    const apiKey      = process.env.HIBOUTIK_API_KEY;
    const warehouseId = process.env.HIBOUTIK_WAREHOUSE_ID || '1';
    const auth        = 'Basic ' + Buffer.from(`${user}:${apiKey}`).toString('base64');

    const response = await fetch(
      `https://${account}.hiboutik.com/api/stock/${warehouseId}/`,
      { headers: { 'Authorization': auth, 'Accept': 'application/json' } }
    );

    if (!response.ok) throw new Error(`Hiboutik API error: ${response.status}`);

    const rawStock = await response.json();

    // Hiboutik returns: [{ product_id, stock_available, ... }]
    // We flatten to: { product_id: quantity }
    const stock = {};
    rawStock.forEach(item => {
      stock[item.product_id] = parseInt(item.stock_available ?? 0);
    });

    // Cache for 60 seconds — stock changes frequently
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json(stock);

  } catch (err) {
    console.error('Stock proxy error:', err);
    return res.status(500).json({ error: 'Failed to fetch stock' });
  }
}
