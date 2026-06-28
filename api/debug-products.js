/**
 * Debug endpoint — shows raw product count and display_www filter
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
    const rawProducts = await productsRes.json();

    const total = rawProducts.length;
    const displayWww1 = rawProducts.filter(p => p.product_display_www == 1 || p.product_display_www === '1').length;
    const notArchived = rawProducts.filter(p => p.product_arch !== 1 && p.product_arch !== '1').length;
    const final = rawProducts.filter(p => p.product_arch !== 1 && p.product_arch !== '1' && (p.product_display_www == 1 || p.product_display_www === '1')).length;

    return res.status(200).json({
      total_products: total,
      display_www_equals_1: displayWww1,
      not_archived: notArchived,
      final_filtered: final,
      sample: rawProducts.slice(0, 3).map(p => ({
        id: p.product_id,
        name: p.product_model,
        display_www: p.product_display_www,
        arch: p.product_arch
      }))
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
