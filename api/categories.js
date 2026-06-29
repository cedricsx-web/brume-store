/**
 * /api/categories
 * Fetch categories from Hiboutik and build a tree.
 * Only include categories that have products flagged for display.
 */
const ACCOUNT = process.env.HIBOUTIK_ACCOUNT;
const USER    = process.env.HIBOUTIK_USER;
const KEY     = process.env.HIBOUTIK_API_KEY;

function auth() {
  return 'Basic ' + Buffer.from(`${USER}:${KEY}`).toString('base64');
}

function buildTree(allCats, parentId = 0) {
  return allCats
    .filter(c => c.parent === parentId)
    .sort((a, b) => a.position - b.position)
    .map(c => ({
      id: c.id,
      name: c.name,
      parent: c.parent,
      position: c.position,
      subcategories: buildTree(allCats, c.id)
    }));
}

export default async function handler(req, res) {
  try {
    const headers = { Authorization: auth(), Accept: 'application/json' };

    // Fetch both categories and products
    const [catsRes, prodsRes] = await Promise.all([
      fetch(`https://${ACCOUNT}.hiboutik.com/api/categories`, { headers }),
      fetch(`https://${ACCOUNT}.hiboutik.com/api/products/`, { headers })
    ]);

    const rawCats = await catsRes.json();
    const rawProds = await prodsRes.json();

    // Get all category IDs that have visible products
    const catIdsWithProducts = new Set();
    rawProds
      .filter(p => (p.product_display_www == 1 || p.product_display_www === '1') && 
                    p.product_arch !== 1 && p.product_arch !== '1')
      .forEach(p => {
        const catId = parseInt(p.product_category) || 0;
        if (catId !== 0) catIdsWithProducts.add(catId);
      });

    // Filter categories: only include if enabled and (has products OR has children with products)
    const hasProductsRecursive = (catId) => {
      if (catIdsWithProducts.has(catId)) return true;
      const children = rawCats.filter(c => c.category_id_parent == catId);
      return children.some(c => hasProductsRecursive(parseInt(c.category_id)));
    };

    const filtered = rawCats
      .filter(c => c.category_enabled !== '0' && hasProductsRecursive(parseInt(c.category_id)))
      .map(c => ({
        id: parseInt(c.category_id),
        name: c.category_name,
        parent: parseInt(c.category_id_parent) || 0,
        position: parseInt(c.category_position) || 0
      }));

    // Build tree
    const tree = buildTree(filtered, 0);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(tree);

  } catch (err) {
    console.error('Categories API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
