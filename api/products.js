/**
 * /api/products.js — Vercel Serverless Function
 *
 * Proxies GET /api/products/ from Hiboutik.
 * The API key never leaves this server — the browser never sees it.
 *
 * TO ACTIVATE: set these in Vercel dashboard → Settings → Environment Variables:
 *   HIBOUTIK_ACCOUNT   = brumeconceptstore
 *   HIBOUTIK_USER      = (your Hiboutik login email)
 *   HIBOUTIK_API_KEY   = (your Hiboutik API key)
 *   BRUME_TOKEN        = (a random secret string you invent, e.g. a UUID)
 */

export default async function handler(req, res) {
  // Security: only accept requests from our own frontend
  const token = req.headers['x-brume-token'];
  if (token !== process.env.BRUME_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const account = process.env.HIBOUTIK_ACCOUNT;
    const user    = process.env.HIBOUTIK_USER;
    const apiKey  = process.env.HIBOUTIK_API_KEY;

    const response = await fetch(
      `https://${account}.hiboutik.com/api/products/`,
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${user}:${apiKey}`).toString('base64'),
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Hiboutik API error: ${response.status}`);
    }

    const data = await response.json();

    // Cache for 5 minutes — products don't change that often
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(data);

  } catch (err) {
    console.error('Products proxy error:', err);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
}
