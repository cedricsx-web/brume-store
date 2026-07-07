// api/newsletter.js
// Inscription newsletter — ajoute le contact à une liste Brevo.
// La clé API Brevo reste côté serveur, jamais exposée au navigateur.
// L'email de bienvenue (avec le PDF cadeau) est géré par une automation Brevo,
// déclenchée par l'ajout du contact à la liste — rien à faire ici pour l'envoi.

const BREVO_CONTACTS_URL = 'https://api.brevo.com/v3/contacts'

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' })
    return
  }

  const { email } = req.body || {}

  // Validation basique côté serveur (ne pas faire confiance au client)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
    res.status(400).json({ error: 'Adresse email invalide' })
    return
  }

  if (!process.env.BREVO_API_KEY || !process.env.BREVO_LIST_ID) {
    console.error('Newsletter: variables BREVO_API_KEY / BREVO_LIST_ID manquantes')
    res.status(500).json({ error: 'Configuration serveur manquante' })
    return
  }

  try {
    const response = await fetch(BREVO_CONTACTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        listIds: [Number(process.env.BREVO_LIST_ID)],
        updateEnabled: true // si le contact existe déjà, on le rattache simplement à la liste
      })
    })

    // Brevo renvoie 201 à la création. Avec updateEnabled:true, une mise à jour
    // réussie renvoie aussi un succès (pas d'erreur "duplicate_parameter").
    if (response.status === 201 || response.status === 204) {
      res.status(200).json({ success: true })
      return
    }

    const data = await response.json().catch(() => ({}))

    // Cas "déjà inscrit" — pour l'utilisateur ce n'est pas un échec
    if (data.code === 'duplicate_parameter') {
      res.status(200).json({ success: true, alreadySubscribed: true })
      return
    }

    console.error('Brevo error:', response.status, data)
    res.status(502).json({ error: 'Erreur lors de l\'inscription' })

  } catch (error) {
    console.error('Newsletter proxy error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
}
