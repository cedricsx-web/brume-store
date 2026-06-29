/**
 * Debug: shows all fields in a single product to find category keys
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
    const productsRes = await fetch(`https://${ACCOUNT}.hiboutik.com/api/products/`, { headers });
    const allProducts = await productsRes.json();
    
    // Get a visible product
    const visible = allProducts.find(p => 
      p.product_arch !== 1 && p.product_arch !== '1' && 
      (p.product_display_www == 1 || p.product_display_www === '1')
    );

    if (!visible) {
      return res.status(200).json({ error: 'No visible products found', sample: allProducts[0] });
    }

    // Show all keys in the product
    return res.status(200).json({
      product_id: visible.product_id,
      product_model: visible.product_model,
      all_keys: Object.keys(visible).sort(),
      all_fields: visible
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
