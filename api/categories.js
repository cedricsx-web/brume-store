const ACCOUNT = process.env.HIBOUTIK_ACCOUNT;
const USER    = process.env.HIBOUTIK_USER;
const KEY     = process.env.HIBOUTIK_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const response = await fetch(
      `https://${ACCOUNT}.hiboutik.com/api/categories`,
      { headers: { Authorization: 'Basic ' + Buffer.from(`${USER}:${KEY}`).toString('base64'), Accept: 'application/json' } }
    );
    const raw = await response.json();
    const all = (Array.isArray(raw) ? raw : [])
      .filter(c => c.category_enabled !== '0')
      .map(c => ({
        id:       parseInt(c.category_id),
        name:     c.category_name,
        parent:   parseInt(c.category_id_parent) || 0,
        position: parseInt(c.category_position) || 0
      }));

    // Build tree: parent categories with their children
    const parents  = all.filter(c => c.parent === 0).sort((a,b) => a.position - b.position);
    const children = all.filter(c => c.parent !== 0);

    const tree = parents.map(p => ({
      ...p,
      subcategories: children
        .filter(c => c.parent === p.id)
        .sort((a,b) => a.position - b.position)
    }));

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    return res.status(200).json(tree);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
}
