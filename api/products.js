/**
 * /api/products
 * Fetch ALL products from Hiboutik API with pagination.
 * Hiboutik paginates at 250 per page via ?offset=N or page param.
 * Falls back to single fetch if pagination fails.
 */
const ACCOUNT = process.env.HIBOUTIK_ACCOUNT;
const USER    = process.env.HIBOUTIK_USER;
const KEY     = process.env.HIBOUTIK_API_KEY;

function auth() {
  return 'Basic ' + Buffer.from(`${USER}:${KEY}`).toString('base64');
}

async function fetchAllProducts(headers) {
  const all = [];
  let page = 1;

  while (true) {
    // Hiboutik pagination: try ?p=N first
    const url = `https://${ACCOUNT}.hiboutik.com/api/products/?p=${page}`;
    const res = await fetch(url, { headers });

    if (!res.ok) break;

    let batch;
    try {
      batch = await res.json();
    } catch (e) {
      break;
    }

    if (!Array.isArray(batch) || batch.length === 0) break;

    all.push(...batch);

    if (batch.length < 250) break;
    page++;
  }

  return all;
}

export default async function handler(req, res) {
  try {
    const headers = { Authorization: auth(), Accept: 'application/json' };

    let allProducts = await fetchAllProducts(headers);

    // If pagination returned nothing, fall back to the bare endpoint
    if (allProducts.length === 0) {
      const fallback = await fetch(
        `https://${ACCOUNT}.hiboutik.com/api/products/`,
        { headers }
      );
      allProducts = await fallback.json();
    }

    // Only show products flagged for online display, exclude archived
    const products = allProducts
      .filter(p =>
        (p.product_display_www == 1 || p.product_display_www === '1') &&
        p.product_arch !== 1 && p.product_arch !== '1'
      )
      .map(p => ({
        product_id:             parseInt(p.product_id),
        product_model:          p.product_model,
        products_desc:          p.products_desc,
        product_price:          parseFloat(p.product_price),
        product_discount_price: parseFloat(p.product_discount_price || '0'),
        product_brand:          p.product_brand,
        product_category:       parseInt(p.product_category) || 0,
        product_arch:           parseInt(p.product_arch) || 0,
        product_display_www:    p.product_display_www,
        updated_at:             p.updated_at
      }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(products);

  } catch (err) {
    console.error('Products API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
