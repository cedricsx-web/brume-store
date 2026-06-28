const ACCOUNT = process.env.HIBOUTIK_ACCOUNT;
const USER    = process.env.HIBOUTIK_USER;
const KEY     = process.env.HIBOUTIK_API_KEY;

function auth() {
  return 'Basic ' + Buffer.from(`${USER}:${KEY}`).toString('base64');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const headers = { Authorization: auth(), Accept: 'application/json' };

    const [productsRes, brandsRes] = await Promise.all([
      fetch(`https://${ACCOUNT}.hiboutik.com/api/products/`, { headers }),
      fetch(`https://${ACCOUNT}.hiboutik.com/api/brands`, { headers })
    ]);

    const [rawProducts, rawBrands] = await Promise.all([
      productsRes.json(),
      brandsRes.json()
    ]);

    // Brand lookup map
    const brandMap = {};
    if (Array.isArray(rawBrands)) {
      rawBrands.forEach(b => { brandMap[b.brand_id] = b.brand_name; });
    }

    const products = rawProducts
      // Only exclude archived products — show all others regardless of display_www
      .filter(p => p.product_arch !== 1 && p.product_arch !== '1')
      .map(p => {
        const price    = parseFloat(p.product_price) || 0;
        const discount = parseFloat(p.product_discount_price) || 0;
        // Only treat as sale if discount is set and less than full price
        const hasSale  = discount > 0 && discount < price;

        return {
          product_id:             parseInt(p.product_id),
          product_model:          p.product_model || 'Sans nom',
          product_brand:          brandMap[p.product_brand] || '',
          product_price:          p.product_price || '0.00',
          product_discount_price: hasSale ? p.product_discount_price : null,
          product_category:       parseInt(p.product_category) || 0,
          product_description:    p.products_desc || '', // ← correct field name
          // Image URL pattern — browser will fallback to gradient if 404
          product_image: `/api/image?id=${p.product_id}`,
          tag: hasSale ? 'sale' : null
        };
      });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(products);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
}
