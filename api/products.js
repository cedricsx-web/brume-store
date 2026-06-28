/**
 * /api/products.js — Vercel Serverless Function
 * Fetches products + brands from Hiboutik and normalizes the response.
 * Brands are merged so the frontend gets brand names, not just IDs.
 */

const ACCOUNT = process.env.HIBOUTIK_ACCOUNT;
const USER    = process.env.HIBOUTIK_USER;
const KEY     = process.env.HIBOUTIK_API_KEY;
const TOKEN   = process.env.BRUME_TOKEN;

function auth() {
  return 'Basic ' + Buffer.from(`${USER}:${KEY}`).toString('base64');
}
function base() {
  return `https://${ACCOUNT}.hiboutik.com/api`;
}

export default async function handler(req, res) {
  if (req.headers['x-brume-token'] !== TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const headers = { Authorization: auth(), Accept: 'application/json' };

    // Fetch products and brands in parallel
    const [productsRes, brandsRes] = await Promise.all([
      fetch(`${base()}/products/`, { headers }),
      fetch(`${base()}/brands`, { headers })
    ]);

    if (!productsRes.ok) throw new Error(`Products fetch failed: ${productsRes.status}`);
    if (!brandsRes.ok)  throw new Error(`Brands fetch failed: ${brandsRes.status}`);

    const [rawProducts, rawBrands] = await Promise.all([
      productsRes.json(),
      brandsRes.json()
    ]);

    // Build a brand lookup map: { brand_id: brand_name }
    const brandMap = {};
    if (Array.isArray(rawBrands)) {
      rawBrands.forEach(b => { brandMap[b.brand_id] = b.brand_name; });
    }

    // Normalize products to match our frontend's expected format
    const products = rawProducts
      .filter(p => p.product_display_www !== '0' && p.product_arch !== '1') // only web-visible, non-archived
      .map(p => ({
        product_id:             parseInt(p.product_id),
        product_model:          p.product_model || 'Sans nom',
        product_brand:          brandMap[p.product_brand] || '',
        product_price:          p.product_price || '0.00',
        product_discount_price: p.product_discount_price || null,
        product_category:       parseInt(p.product_category) || 0,
        product_description:    p.product_desc || '',
        // Hiboutik image URL pattern — null if no image uploaded
        product_image:
          p.product_image
            ? `https://${ACCOUNT}.hiboutik.com/img/product/${p.product_image}`
            : null,
        tag: p.product_discount_price ? 'sale' : null
      }));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(products);

  } catch (err) {
    console.error('Products proxy error:', err);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
}
