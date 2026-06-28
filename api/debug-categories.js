/**
 * Debug endpoint — shows category tree
 */
const ACCOUNT = process.env.HIBOUTIK_ACCOUNT;
const USER    = process.env.HIBOUTIK_USER;
const KEY     = process.env.HIBOUTIK_API_KEY;

function buildTree(all, parentId = 0, depth = 0) {
  return all
    .filter(c => c.parent === parentId)
    .sort((a, b) => a.position - b.position)
    .map(c => ({
      ...c,
      depth,
      subcategories: buildTree(all, c.id, depth + 1)
    }));
}

export default async function handler(req, res) {
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
        position: parseInt(c.category_position)  || 0
      }));

    const tree = buildTree(all, 0);

    // Pretty print the tree
    const printTree = (items, indent = '') => {
      return items.map(item => {
        const subs = item.subcategories && item.subcategories.length > 0
          ? '\n' + printTree(item.subcategories, indent + '  ')
          : '';
        return `${indent}${item.name} (id: ${item.id}, parent: ${item.parent})${subs}`;
      }).join('\n');
    };

    return res.status(200).json({
      total_categories: all.length,
      tree_structure: tree,
      text_tree: printTree(tree)
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
