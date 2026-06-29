/**
 * Debug: shows how many products are in each category
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
    
    // Get products
    const productsRes = await fetch(`https://${ACCOUNT}.hiboutik.com/api/products/`, { headers });
    const allProducts = await productsRes.json();
    
    // Filter to visible only
    const visibleProducts = allProducts.filter(
      p => p.product_arch !== 1 && p.product_arch !== '1' && 
           (p.product_display_www == 1 || p.product_display_www === '1')
    );
    
    // Count products by category_id
    const catCounts = {};
    visibleProducts.forEach(p => {
      const catId = String(p.category_id || 0);
      catCounts[catId] = (catCounts[catId] || 0) + 1;
    });
    
    // Sort by count descending
    const sorted = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([catId, count]) => ({ category_id: catId, product_count: count }));

    return res.status(200).json({
      total_visible_products: visibleProducts.length,
      categories_with_products: Object.keys(catCounts).length,
      top_categories_by_product_count: sorted.slice(0, 20),
      all_categories: sorted
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
