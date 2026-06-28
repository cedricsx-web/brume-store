/* TEMPORARY TEST — delete after debugging */
const ACCOUNT  = process.env.HIBOUTIK_ACCOUNT;
const USER     = process.env.HIBOUTIK_USER;
const KEY      = process.env.HIBOUTIK_API_KEY;

export default async function handler(req, res) {
  const auth = 'Basic ' + Buffer.from(`${USER}:${KEY}`).toString('base64');

  // Try creating a minimal sale
  const r = await fetch(`https://${ACCOUNT}.hiboutik.com/api/sales/`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ store_id: 1, currency_code: 'EUR' })
  });

  const text = await r.text();
  return res.status(200).json({
    hiboutik_status: r.status,
    hiboutik_response: text,
    credentials_used: `${USER} / ${ACCOUNT}`
  });
}
