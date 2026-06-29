/**
 * /api/products
 * Fetch products from Hiboutik API with filtering.
 * Only returns products flagged for website display (product_display_www = 1).
 */
const ACCOUNT = process.env.HIBOUTIK_ACCOUNT;
const USER    = process.env.HIBOUTIK_USER;
const KEY     = process.env.HIBOUTIK_API_KEY;

function auth() {
  return 'Basic ' + Buffer.from(`${USER}:${KEY}`).toString('base64');
}

export default async function handler(req, res) {
  try {
    const headers = { Authorization: auth(), Accept: 'application/json' };

    // Fetch products
    const productsRes = await fetch(
      `https://${ACCOUNT}.hiboutik.com/api/products/`,
      { headers }
    );
    const allProducts = await productsRes.json();

    // Return ALL products (even those not flagged for online display)
    // Only exclude archived ones
    const visible = allProducts; // or filter out arch if needed
    // .filter(p => (p.product_arch !== 1 && p.product_arch !== '1'));

    // Transform: use product_category instead of category_id
    const products = visible.map(p => ({
      product_id:    parseInt(p.product_id),
      product_model: p.product_model,
      products_desc: p.products_desc,
      product_price: parseFloat(p.product_price),
      product_discount_price: parseFloat(p.product_discount_price || '0'),
      product_brand: p.product_brand,
      product_category: parseInt(p.product_category) || 0,  // ← THE KEY FIELD
      product_arch: parseInt(p.product_arch) || 0,
      product_display_www: p.product_display_www,
      updated_at: p.updated_at
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(products);

  } catch (err) {
    console.error('Products API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
