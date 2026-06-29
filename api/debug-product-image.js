/**
 * Debug: check what image fields exist in products
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
    const prodsRes = await fetch(`https://${ACCOUNT}.hiboutik.com/api/products/`, { headers });
    const allProds = await prodsRes.json();
    
    // Get a visible product with image
    const visible = allProds.find(p => 
      (p.product_display_www == 1 || p.product_display_www === '1') &&
      p.product_arch !== 1 && p.product_arch !== '1'
    );
    
    if (!visible) {
      return res.status(200).json({ error: 'No visible products' });
    }
    
    // Show all keys
    const allKeys = Object.keys(visible).sort();
    const imageFields = allKeys.filter(k => k.includes('image') || k.includes('img') || k.includes('photo'));
    
    return res.status(200).json({
      product_id: visible.product_id,
      product_model: visible.product_model,
      all_keys: allKeys,
      image_related_keys: imageFields,
      all_fields: visible
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
