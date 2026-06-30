// api/airtable.js
// Proxy sécurisé — la clé Airtable reste côté serveur, jamais exposée au navigateur

const BASE_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE}/articles`

export default async function handler(req, res) {
  // CORS — autoriser uniquement votre domaine
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const headers = {
    'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
    'Content-Type': 'application/json'
  }

  try {
    let url = BASE_URL
    let options = { headers }

    if (req.method === 'GET') {
      // Passer les query params (filterByFormula, sort, fields, etc.)
      const params = new URLSearchParams(req.query)
      if ([...params].length) url += `?${params}`

    } else if (req.method === 'POST') {
      options = { method: 'POST', headers, body: JSON.stringify(req.body) }

    } else if (req.method === 'PATCH') {
      const { id } = req.query
      url = `${BASE_URL}/${id}`
      options = { method: 'PATCH', headers, body: JSON.stringify(req.body) }

    } else if (req.method === 'DELETE') {
      const { id } = req.query
      url = `${BASE_URL}/${id}`
      options = { method: 'DELETE', headers }
    }

    const response = await fetch(url, options)
    const data = await response.json()
    res.status(response.status).json(data)

  } catch (error) {
    console.error('Airtable proxy error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
}
