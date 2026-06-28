const ACCOUNT  = process.env.HIBOUTIK_ACCOUNT;
const USER     = process.env.HIBOUTIK_USER;
const KEY      = process.env.HIBOUTIK_API_KEY;
const STORE_ID = process.env.HIBOUTIK_STORE_ID || '1';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { cart } = req.body ?? {};
  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: 'Panier vide' });
  }

  const auth = 'Basic ' + Buffer.from(`${USER}:${KEY}`).toString('base64');
  const base = `https://${ACCOUNT}.hiboutik.com/api`;

  // Step 1 — Create sale
  let saleRes, saleText;
  try {
    saleRes  = await fetch(`${base}/sales/`, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ store_id: parseInt(STORE_ID), currency_code: 'EUR' })
    });
    saleText = await saleRes.text();
  } catch(e) {
    return res.status(500).json({ step: 'create_sale', error: e.message });
  }

  if (!saleRes.ok) {
    return res.status(500).json({ step: 'create_sale', status: saleRes.status, body: saleText });
  }

  let sale;
  try { sale = JSON.parse(saleText); } catch(e) {
    return res.status(500).json({ step: 'parse_sale', raw: saleText });
  }

  // Hiboutik returns the sale_id in different ways depending on version
  const saleId = sale.sale_id ?? sale.id ?? (typeof sale === 'number' ? sale : null);
  if (!saleId) {
    return res.status(500).json({ step: 'no_sale_id', raw: sale });
  }

  // Step 2 — Add each product
  const errors = [];
  for (const item of cart) {
    try {
      const r = await fetch(`${base}/sales/add_product/`, {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          sale_id:       saleId,
          product_id:    item.product_id,
          quantity:      item.qty,
          product_price: String(item.unit_price),
          size_id:       0
        })
      });
      if (!r.ok) errors.push({ product_id: item.product_id, status: r.status, body: await r.text() });
    } catch(e) {
      errors.push({ product_id: item.product_id, error: e.message });
    }
  }

  // Step 3 — Return sale_id + payment URL
  // Redirect to Hiboutik myshop with the open sale
  return res.status(200).json({
    sale_id:     saleId,
    errors:      errors,
    payment_url: `https://${ACCOUNT}.hiboutik.com/myshop/`
  });
}
