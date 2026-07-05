// api/airtable.js
// Proxy sécurisé — la clé Airtable reste côté serveur, jamais exposée au navigateur
// Générique : sert n'importe quelle table de la base via ?table=nom (défaut "articles")
// pour éviter de multiplier les fonctions serverless (limite 12 sur le plan Hobby).

const ALLOWED_TABLES = new Set(['articles', 'horaires', 'accueil'])

function tableBaseUrl(table) {
  return `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE}/${table}`
}

export default async function handler(req, res) {
  // CORS — autoriser uniquement votre domaine
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const requestedTable = req.query.table
  const table = ALLOWED_TABLES.has(requestedTable) ? requestedTable : 'articles'
  const BASE_URL = tableBaseUrl(table)

  const headers = {
    'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
    'Content-Type': 'application/json'
  }

  try {
    let url = BASE_URL
    let options = { headers }

    if (req.method === 'GET') {
      // Transférer la query string brute (évite que Vercel déforme fields[] répétés)
      // en retirant seulement le paramètre "table" utilisé par ce proxy.
      const rawQuery = req.url.split('?')[1]
      if (rawQuery) {
        const params = new URLSearchParams(rawQuery)
        params.delete('table')
        const cleaned = params.toString()
        if (cleaned) url += `?${cleaned}`
      }

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
