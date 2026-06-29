/**
 * Debug: show all fields in categories to find the display flag
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
    const catsRes = await fetch(`https://${ACCOUNT}.hiboutik.com/api/categories`, { headers });
    const allCats = await catsRes.json();
    
    // Find Emballages (73) and show all its fields
    const emballages = allCats.find(c => c.category_id == 73);
    const japon = allCats.find(c => c.category_id == 116);
    
    return res.status(200).json({
      emballages_all_fields: emballages,
      emballages_keys: emballages ? Object.keys(emballages).sort() : [],
      japon_all_fields: japon,
      japon_keys: japon ? Object.keys(japon).sort() : [],
      sample_category: allCats[0]
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
