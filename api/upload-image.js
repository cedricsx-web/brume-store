// api/upload-image.js
// Reçoit une image en base64 depuis admin.html, l'héberge sur Vercel Blob
// (gratuit, inclus avec Vercel), renvoie l'URL utilisable comme attachment Airtable.
// Aucune clé tierce exposée — tout reste dans l'écosystème Vercel.

import { put } from '@vercel/blob'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Méthode non autorisée' }); return }

  try {
    const { filename, base64 } = req.body
    if (!filename || !base64) {
      res.status(400).json({ error: 'filename et base64 requis' })
      return
    }

    // base64 arrive sous la forme "data:image/jpeg;base64,XXXX" — on retire le préfixe
    const matches = base64.match(/^data:(.+);base64,(.+)$/)
    if (!matches) { res.status(400).json({ error: 'Format base64 invalide' }); return }
    const contentType = matches[1]
    const buffer = Buffer.from(matches[2], 'base64')

    const blob = await put(`articles/${Date.now()}-${filename}`, buffer, {
      access: 'public',
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    res.status(200).json({ url: blob.url })

  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Erreur lors de l\'upload' })
  }
}
