/* TEMPORARY — delete after debugging */
const ACCOUNT = process.env.HIBOUTIK_ACCOUNT;
const USER    = process.env.HIBOUTIK_USER;
const KEY     = process.env.HIBOUTIK_API_KEY;

export default async function handler(req, res) {
  try {
    const response = await fetch(
      `https://${ACCOUNT}.hiboutik.com/api/products/`,
      { headers: { Authorization: 'Basic ' + Buffer.from(`${USER}:${KEY}`).toString('base64'), Accept: 'application/json' } }
    );
    const data = await response.json();
    return res.status(200).json(Array.isArray(data) ? data.slice(0, 2) : data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
