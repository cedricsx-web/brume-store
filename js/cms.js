// js/cms.js
// Brüme CMS — version sécurisée
// La clé Airtable est côté serveur (Vercel). Ce fichier ne contient aucune clé.

const CMS_API = '/api/airtable'         // proxy Vercel local
const ADMIN_PASSWORD = 'brume2026'  // mot de passe admin Cédric — vous pouvez changer

// ─────────────────────────────────────
// LECTURE
// ─────────────────────────────────────

async function getArticles() {
  const params = new URLSearchParams({
    filterByFormula: `{publie}=1`,
    'sort[0][field]': 'date_publication',
    'sort[0][direction]': 'desc',
  })
  ;['titre','categorie','chapeau','image_url','auteur','date_publication','produits_ids']
    .forEach(f => params.append('fields[]', f))

  const res = await fetch(`${CMS_API}?${params}`)
  const data = await res.json()
  if (!data.records) throw new Error('Réponse Airtable invalide')
  return data.records.map(r => ({ id: r.id, ...r.fields }))
}

async function getArticle(id) {
  const res = await fetch(`${CMS_API}?id=${id}`)
  const data = await res.json()
  // Fetch par ID : on filtre côté client depuis la liste complète
  const all = await getAllArticlesPublic()
  return all.find(a => a.id === id) || null
}

async function getAllArticlesPublic() {
  const params = new URLSearchParams({
    filterByFormula: `AND({publie}=1)`,
    'sort[0][field]': 'date_publication',
    'sort[0][direction]': 'desc',
  })
  const res = await fetch(`${CMS_API}?${params}`)
  const data = await res.json()
  if (!data.records) throw new Error('Réponse Airtable invalide')
  return data.records.map(r => ({ id: r.id, ...r.fields }))
}

async function getAllArticles() {
  const params = new URLSearchParams({
    'sort[0][field]': 'date_publication',
    'sort[0][direction]': 'desc',
  })
  const res = await fetch(`${CMS_API}?${params}`)
  const data = await res.json()
  if (!data.records) throw new Error('Réponse Airtable invalide')
  return data.records.map(r => ({ id: r.id, ...r.fields }))
}

// ─────────────────────────────────────
// ÉCRITURE (admin uniquement)
// ─────────────────────────────────────

async function saveArticle(fields, id = null) {
  if (id) {
    // Mise à jour
    const res = await fetch(`${CMS_API}?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    })
    return res.json()
  } else {
    // Création
    const res = await fetch(CMS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [{ fields }] })
    })
    const data = await res.json()
    return data.records?.[0]
  }
}

async function deleteArticle(id) {
  await fetch(`${CMS_API}?id=${id}`, { method: 'DELETE' })
}

// ─────────────────────────────────────
// PARTAGE RÉSEAUX SOCIAUX
// ─────────────────────────────────────

function shareToFacebook(article, articleUrl) {
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`
  window.open(url, '_blank', 'width=600,height=400')
}

function shareToInstagram(article, articleUrl) {
  const text = `${article.titre}\n\n${article.chapeau}\n\n${articleUrl}\n\n#brume #brumeconceptstore #cachan #design #decoration`
  navigator.clipboard.writeText(text).then(() => {
    alert('Texte copié ! Ouvrez Instagram et collez-le dans votre publication.')
    window.open('https://www.instagram.com', '_blank')
  })
}

// ─────────────────────────────────────
// PANIER PARTAGÉ (localStorage)
// Utilisé par article.html pour ajouter un produit lié au panier
// sans rediriger immédiatement vers Hiboutik.
// index.html (store.js) lit ce même localStorage au chargement.
// ─────────────────────────────────────

function addToLocalCart(productId, qty = 1) {
  let cart = []
  try { cart = JSON.parse(localStorage.getItem('brume_cart') || '[]') } catch {}
  const existing = cart.find(i => i.product_id === productId)
  if (existing) existing.qty += qty
  else cart.push({ product_id: productId, qty })
  localStorage.setItem('brume_cart', JSON.stringify(cart))
  return cart.reduce((sum, i) => sum + i.qty, 0)
}

function getLocalCartCount() {
  try {
    const cart = JSON.parse(localStorage.getItem('brume_cart') || '[]')
    return cart.reduce((sum, i) => sum + i.qty, 0)
  } catch { return 0 }
}

// ─────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

function articleUrl(id) {
  return `${window.location.origin}/article.html?id=${id}`
}

function checkAuth() {
  const stored = sessionStorage.getItem('brume_admin')
  if (stored === ADMIN_PASSWORD) return true
  const input = prompt('Mot de passe admin :')
  if (input === ADMIN_PASSWORD) {
    sessionStorage.setItem('brume_admin', input)
    return true
  }
  window.location.href = '/index.html'
  return false
}
