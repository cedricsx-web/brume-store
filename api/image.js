/**
 * /api/image.js — Image proxy
 * Fetches images from Hiboutik server-side (no Referer restriction)
 * and streams them to the browser.
 * Usage: /api/image?id=4386
 */

const ACCOUNT = process.env.HIBOUTIK_ACCOUNT;

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const url = `https://${ACCOUNT}.hiboutik.com/myshop/images/?img=big_${id}-1.jpg`;

  try {
    const response = await fetch(url, {
      headers: {
        'Referer': `https://${ACCOUNT}.hiboutik.com/`,
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!response.ok) return res.status(404).end();

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h
    return res.status(200).send(Buffer.from(buffer));

  } catch (err) {
    return res.status(500).end();
  }
}
