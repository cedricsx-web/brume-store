/**
 * /api/checkout.js
 *
 * Server-side cart transfer to Hiboutik myshop.
 *
 * Flow:
 *  1. GET Hiboutik myshop → capture session cookie
 *  2. POST each cart item using that session (server-side, no CORS issues)
 *  3. Redirect customer to Hiboutik checkout with session ID in URL
 *     PHP trans-sid allows session transfer via URL parameter
 *
 * No POS sales created. No accounting impact.
 */

const ACCOUNT = process.env.HIBOUTIK_ACCOUNT;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const cart = body?.cart;
  if (!cart?.length) return res.status(400).json({ error: 'Empty cart' });

  const BASE = `https://${ACCOUNT}.hiboutik.com/myshop`;

  try {
    // Step 1 — Initialise a Hiboutik myshop session
    const initRes = await fetch(`${BASE}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrumeBot/1.0)',
        'Accept': 'text/html'
      },
      redirect: 'follow'
    });

    // Extract session cookie from response
    const rawCookies = initRes.headers.get('set-cookie') || '';
    const sessionMatch = rawCookies.match(/([A-Za-z_]+SESSION[A-Za-z_]*)=([^;]+)/i)
      || rawCookies.match(/([A-Za-z_]{6,})=([a-zA-Z0-9]{20,})/);

    if (!sessionMatch) {
      return res.status(200).json({
        payment_url: `${BASE}/`,
        warning: 'No session cookie found — cart may be empty'
      });
    }

    const cookieName = sessionMatch[1];
    const cookieValue = sessionMatch[2];
    const cookieHeader = `${cookieName}=${cookieValue}`;

    console.log('Session established:', cookieName, '=', cookieValue.substring(0, 8) + '...');

    // Step 2 — Add each item to cart server-side
    for (const item of cart) {
      const body = new URLSearchParams({
        action:              'add_to_basket',
        product_id_add_b:    String(item.product_id),
        size_add_b:          '0',
        'qtity_dispo[0]':    '99',
        quantite_add_b:      String(item.qty),
        comments_add_b:      ''
      });

      const addRes = await fetch(`${BASE}/?page=product&id=${item.product_id}`, {
        method:  'POST',
        headers: {
          'Cookie':       cookieHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':   'Mozilla/5.0 (compatible; BrumeBot/1.0)',
          'Referer':      `${BASE}/?page=product&id=${item.product_id}`,
          'Origin':       `https://${ACCOUNT}.hiboutik.com`
        },
        body:    body.toString(),
        redirect: 'manual'  // don't follow redirect — just confirm it was processed
      });

      console.log(`Added product ${item.product_id} x${item.qty} — status: ${addRes.status}`);
    }

    // Step 3 — Build checkout URL
    // Try PHP trans-sid (session via URL) — works if Hiboutik has it enabled
    const checkoutUrl = `${BASE}/?page=order&${cookieName}=${cookieValue}`;

    return res.status(200).json({
      payment_url: checkoutUrl,
      session_cookie: cookieName,
      // Also return fallback in case trans-sid is disabled
      fallback_url: `${BASE}/?page=order`
    });

  } catch(err) {
    console.error('Checkout error:', err);
    return res.status(500).json({
      error: err.message,
      payment_url: `${BASE}/`
    });
  }
}
