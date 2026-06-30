// js/cms.js
// Brüme CMS — Airtable connector
// Remplacer les deux constantes ci-dessous avec vos vraies valeurs

const AIRTABLE_TOKEN = 'pat9cQsJ9Cepn2jQz.2ed2008f9645d35bbe0801459c0fd1e10d1badcdc538d75d31a24240cd4c907c'
const AIRTABLE_BASE  = 'app82aR6KjAzJiUyF/tbl6zKxbMnWQatYJm/viwFwxd6XLZsmR8sT'  // commence par "app"
const AIRTABLE_TABLE = 'articles'           // nom de la table (encodé URL)
const ADMIN_PASSWORD = 'brume2026'           // mot de passe admin Cédric

const API = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`
const HEADERS = {
  'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
  'Content-Type': 'application/json'
}

// ─────────────────────────────────────
// LECTURE
// ─────────────────────────────────────

// Tous les articles publiés, du plus récent au plus ancien
async function getArticles() {
  const params = new URLSearchParams({
    filterByFormula: `AND({publie}=1, IS_BEFORE({date_publication}, NOW()))`,
    sort: JSON.stringify([{ field: 'date_publication', direction: 'desc' }]),
    fields: ['titre','categorie','chapeau','image_url','auteur','date_publication','produits_ids']
  })
  const res = await fetch(`${API}?${params}`, { headers: HEADERS })
  const data = await res.json()
  return data.records.map(r => ({ id: r.id, ...r.fields }))
}

// Un article par ID
async function getArticle(id) {
  const res = await fetch(`${API}/${id}`, { headers: HEADERS })
  const data = await res.json()
  return { id: data.id, ...data.fields }
}

// Tous les articles (admin — publiés et non publiés)
async function getAllArticles() {
  const params = new URLSearchParams({
    sort: JSON.stringify([{ field: 'date_publication', direction: 'desc' }])
  })
  const res = await fetch(`${API}?${params}`, { headers: HEADERS })
  const data = await res.json()
  return data.records.map(r => ({ id: r.id, ...r.fields }))
}

// ─────────────────────────────────────
// ÉCRITURE (admin uniquement)
// ─────────────────────────────────────

async function saveArticle(fields, id = null) {
  const method = id ? 'PATCH' : 'POST'
  const url    = id ? `${API}/${id}` : API
  const body   = id
    ? JSON.stringify({ fields })
    : JSON.stringify({ records: [{ fields }] })

  const res  = await fetch(url, { method, headers: HEADERS, body })
  const data = await res.json()
  return id ? data : data.records[0]
}

async function deleteArticle(id) {
  await fetch(`${API}/${id}`, { method: 'DELETE', headers: HEADERS })
}

// ─────────────────────────────────────
// PARTAGE RÉSEAUX SOCIAUX
// ─────────────────────────────────────

function shareToFacebook(article, articleUrl) {
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`
  window.open(url, '_blank', 'width=600,height=400')
}

function shareToInstagram(article, articleUrl) {
  // Instagram ne permet pas la publication automatique via URL
  // On copie le texte dans le presse-papier et on ouvre Instagram
  const text = `${article.titre}\n\n${article.chapeau}\n\n${articleUrl}\n\n#brume #brumeconceptstore #cachan #design #decoration`
  navigator.clipboard.writeText(text).then(() => {
    alert('Texte copié ! Collez-le dans votre publication Instagram.')
    window.open('https://www.instagram.com', '_blank')
  })
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

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Auth admin simple
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
