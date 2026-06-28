/**
 * /api/categories.js — Vercel Serverless Function
 * Fetches categories from Hiboutik.
 */

const ACCOUNT = process.env.HIBOUTIK_ACCOUNT;
const USER    = process.env.HIBOUTIK_USER;
const KEY     = process.env.HIBOUTIK_API_KEY;
const TOKEN   = process.env.BRUME_TOKEN;

export default async function handler(req, res) {
  if (req.headers['x-brume-token'] !== TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const response = await fetch(
      `https://${ACCOUNT}.hiboutik.com/api/categories`,
      {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${USER}:${KEY}`).toString('base64'),
          Accept: 'application/json'
        }
      }
    );

    if (!response.ok) throw new Error(`Categories fetch failed: ${response.status}`);

    const raw = await response.json();

    // Normalize to our format
    const categories = (Array.isArray(raw) ? raw : [])
      .filter(c => c.category_enabled !== '0')
      .map(c => ({
        categories_id:   parseInt(c.category_id),
        categories_name: c.category_name
      }));

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    return res.status(200).json(categories);

  } catch (err) {
    console.error('Categories proxy error:', err);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
}
