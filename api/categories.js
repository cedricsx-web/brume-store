/**
 * /api/categories
 * Fetch categories from Hiboutik and build a tree.
 * Show ALL categories (even if no products), but filter out VIDE placeholders.
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

    // Fetch categories
    const catsRes = await fetch(`https://${ACCOUNT}.hiboutik.com/api/categories`, { headers });
    const rawCats = await catsRes.json();

    // Filter: show ALL categories regardless of category_enabled_www
    // Only exclude VIDE placeholders and empty names
    const filtered = rawCats
      .filter(c => c.category_name && c.category_name.trim() !== '' &&
                   c.category_name !== 'VIDE')
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
