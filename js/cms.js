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
  ;['titre','categorie','chapeau','image','auteur','date_publication','produits_ids']
    .forEach(f => params.append('fields[]', f))

  const res = await fetch(`${CMS_API}?${params}`)
  const data = await res.json()
  if (!data.records) throw new Error('Réponse Airtable invalide')
  return data.records.map(r => ({ id: r.id, ...r.fields, image_url: extractImageUrl(r.fields.image) }))
}

// Airtable Attachment fields are arrays of objects like [{ url, filename, thumbnails... }]
// On extrait l'URL directe pour garder le reste du code inchangé (image_url comme avant)
function extractImageUrl(attachmentField) {
  if (!attachmentField) return ''
  if (Array.isArray(attachmentField) && attachmentField.length) {
    return attachmentField[0].url || ''
  }
  if (typeof attachmentField === 'string') return attachmentField // rétrocompatibilité ancien champ URL
  return ''
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
  return data.records.map(r => ({ id: r.id, ...r.fields, image_url: extractImageUrl(r.fields.image) }))
}

async function getAllArticles() {
  const params = new URLSearchParams({
    'sort[0][field]': 'date_publication',
    'sort[0][direction]': 'desc',
  })
  const res = await fetch(`${CMS_API}?${params}`)
  const data = await res.json()
  if (!data.records) throw new Error('Réponse Airtable invalide')
  return data.records.map(r => ({ id: r.id, ...r.fields, image_url: extractImageUrl(r.fields.image) }))
}

// ─────────────────────────────────────
// HORAIRES D'OUVERTURE
// Table Airtable "horaires" — une ligne par mois (champ "mois" = "AAAA-MM")
// avec un champ texte par jour : lun, mar, mer, jeu, ven, sam, dim
// Chaque champ jour peut contenir :
//   - vide ou "Fermé"                        → jour fermé
//   - une plage : "11h – 19h"                → ouvert en continu
//   - deux plages séparées par une virgule :
//     "9h30 – 12h30, 14h – 19h"              → fermeture le midi
// ─────────────────────────────────────

const HORAIRES_TABLE = 'horaires'
const JOURS_SEMAINE = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']
const JOURS_LABELS = {
  lun: 'Lundi', mar: 'Mardi', mer: 'Mercredi', jeu: 'Jeudi',
  ven: 'Vendredi', sam: 'Samedi', dim: 'Dimanche'
}

// Récupère les horaires d'un mois donné ("AAAA-MM"). Renvoie null si aucune
// entrée n'existe encore pour ce mois (le modal doit alors afficher un message).
async function getHoraires(mois) {
  const params = new URLSearchParams({
    table: HORAIRES_TABLE,
    filterByFormula: `{mois}="${mois}"`,
  })
  const res = await fetch(`${CMS_API}?${params}`)
  const data = await res.json()
  if (!data.records) throw new Error('Réponse Airtable invalide')
  if (!data.records.length) return null
  const r = data.records[0]
  return { id: r.id, mois: r.fields.mois, jours: JOURS_SEMAINE.map(j => r.fields[j] || '') }
}

// Décale une clé "AAAA-MM" de `delta` mois (delta négatif = mois précédents).
function shiftMonthKey(mois, delta) {
  const [y, m] = mois.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Récupère les horaires d'un mois donné, et si ce mois n'a pas été renseigné,
// recule mois par mois (jusqu'à `maxLookback` mois en arrière) jusqu'à trouver
// la dernière entrée disponible. Ainsi, si le mois en cours n'a pas encore été
// mis à jour, on affiche automatiquement les horaires du mois précédent plutôt
// qu'un message vide.
// Renvoie { data, moisAffiche, moisDemande, isFallback } — data est null si
// aucun mois des `maxLookback` derniers n'a d'horaires renseignés.
async function getHorairesWithFallback(moisDemande, maxLookback = 6) {
  let cle = moisDemande
  for (let i = 0; i <= maxLookback; i++) {
    const data = await getHoraires(cle)
    if (data) {
      return { data, moisAffiche: cle, moisDemande, isFallback: cle !== moisDemande }
    }
    cle = shiftMonthKey(cle, -1)
  }
  return { data: null, moisAffiche: null, moisDemande, isFallback: false }
}

// Renvoie toutes les entrées horaires (pour la liste admin), triées par mois décroissant.
async function getAllHoraires() {
  const params = new URLSearchParams({ table: HORAIRES_TABLE })
  const res = await fetch(`${CMS_API}?${params}`)
  const data = await res.json()
  if (!data.records) throw new Error('Réponse Airtable invalide')
  return data.records
    .map(r => ({ id: r.id, mois: r.fields.mois, jours: JOURS_SEMAINE.map(j => r.fields[j] || '') }))
    .sort((a, b) => (b.mois || '').localeCompare(a.mois || ''))
}

// Crée ou met à jour les horaires d'un mois. `joursValues` est un tableau de
// 7 chaînes (lun→dim), dans le même ordre que JOURS_SEMAINE.
async function saveHoraires(mois, joursValues, id = null) {
  const fields = { mois }
  JOURS_SEMAINE.forEach((j, i) => { fields[j] = joursValues[i] || '' })

  if (id) {
    const res = await fetch(`${CMS_API}?table=${HORAIRES_TABLE}&id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    })
    return res.json()
  } else {
    const res = await fetch(`${CMS_API}?table=${HORAIRES_TABLE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [{ fields }] })
    })
    const data = await res.json()
    return data.records?.[0]
  }
}

async function deleteHoraires(id) {
  await fetch(`${CMS_API}?table=${HORAIRES_TABLE}&id=${id}`, { method: 'DELETE' })
}

// Découpe la valeur brute d'un jour ("9h30 – 12h30, 14h – 19h") en un tableau
// de 1 ou 2 plages nettoyées. Renvoie un tableau vide si le jour est fermé.
function parseDaySlots(value) {
  if (!value) return []
  return value.split(',').map(s => s.trim()).filter(Boolean)
}

// Recombine 1 ou 2 plages en la chaîne stockée dans Airtable.
function formatDaySlots(slot1, slot2) {
  return [slot1, slot2].map(s => (s || '').trim()).filter(Boolean).join(', ')
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

// Génère une image carrée 1080×1080 (format Instagram) avec la photo de l'article,
// un dégradé sombre en bas, et le titre — prête à télécharger et poster.
async function generateShareImage(article) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1080
  const ctx = canvas.getContext('2d')

  // Fond — image de l'article si disponible
  if (article.image_url) {
    try {
      const img = await loadImage(article.image_url)
      // Cover crop centré
      const scale = Math.max(1080 / img.width, 1080 / img.height)
      const w = img.width * scale, h = img.height * scale
      ctx.drawImage(img, (1080 - w) / 2, (1080 - h) / 2, w, h)
    } catch {
      ctx.fillStyle = '#1a1a18'
      ctx.fillRect(0, 0, 1080, 1080)
    }
  } else {
    ctx.fillStyle = '#1a1a18'
    ctx.fillRect(0, 0, 1080, 1080)
  }

  // Dégradé sombre en bas pour la lisibilité du texte
  const gradient = ctx.createLinearGradient(0, 1080, 0, 550)
  gradient.addColorStop(0, 'rgba(26,26,24,0.95)')
  gradient.addColorStop(1, 'rgba(26,26,24,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 550, 1080, 530)

  // Logo Brüme en haut
  ctx.font = '300 36px Georgia, serif'
  ctx.fillStyle = 'rgba(245,242,237,0.9)'
  ctx.textTransform = 'uppercase'
  ctx.fillText('BRÜME', 60, 90)

  // Catégorie (eyebrow)
  ctx.font = '400 22px monospace'
  ctx.fillStyle = '#c8b89a'
  ctx.fillText((article.categorie || 'ÉDITIONS').toUpperCase(), 60, 880)

  // Titre — wrap automatique
  ctx.font = '300 56px Georgia, serif'
  ctx.fillStyle = '#f5f2ed'
  wrapText(ctx, article.titre, 60, 940, 960, 64)

  return canvas.toDataURL('image/jpeg', 0.92)
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ')
  let line = ''
  let lines = []
  for (const word of words) {
    const test = line + word + ' '
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word + ' '
    } else {
      line = test
    }
  }
  lines.push(line)
  // Affiche les 2 dernières lignes max, remonte le point de départ si besoin
  lines = lines.slice(-2)
  const startY = y - (lines.length - 1) * lineHeight
  lines.forEach((l, i) => ctx.fillText(l.trim(), x, startY + i * lineHeight))
}

// Ouvre un petit panneau avec l'image générée + boutons d'action,
// plus élégant que l'ancien copier-coller brut.
async function openSharePanel(article, articleUrl) {
  const existing = document.getElementById('share-modal')
  if (existing) existing.remove()

  const modal = document.createElement('div')
  modal.id = 'share-modal'
  modal.style = `position:fixed;inset:0;background:rgba(26,26,24,.85);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:24px;`
  modal.innerHTML = `
    <div style="background:#f5f2ed;max-width:380px;width:100%;padding:28px;text-align:center;font-family:'DM Sans',sans-serif;">
      <p style="font-family:'Space Mono',monospace;font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;color:#3a3a37;opacity:.5;margin-bottom:16px;">Préparation du partage…</p>
      <div id="share-img-wrap" style="width:100%;aspect-ratio:1;background:#1a1a18;margin-bottom:20px;display:flex;align-items:center;justify-content:center;">
        <span style="color:#c8b89a;font-family:'Space Mono',monospace;font-size:.6rem;">Génération…</span>
      </div>
      <div id="share-actions" style="display:flex;flex-direction:column;gap:10px;"></div>
      <button onclick="document.getElementById('share-modal').remove()" style="margin-top:16px;background:none;border:none;font-family:'Space Mono',monospace;font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;color:#3a3a37;opacity:.5;cursor:pointer;">Fermer</button>
    </div>`
  document.body.appendChild(modal)

  try {
    const dataUrl = await generateShareImage(article)
    document.getElementById('share-img-wrap').innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;">`
    document.getElementById('share-actions').innerHTML = `
      <a href="${dataUrl}" download="brume-${slugifyShare(article.titre)}.jpg"
         style="display:block;background:#2d4a3e;color:#f5f2ed;padding:12px;text-decoration:none;font-family:'Space Mono',monospace;font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;">
        Télécharger l'image
      </a>
      <button onclick="shareToFacebook('${articleUrl}')"
         style="background:#1877f2;color:white;border:none;padding:12px;font-family:'Space Mono',monospace;font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;">
        Partager sur Facebook
      </button>
      <button onclick="copyShareText(${JSON.stringify(article.titre)}, ${JSON.stringify(article.chapeau || '')}, '${articleUrl}')"
         style="background:#c13584;color:white;border:none;padding:12px;font-family:'Space Mono',monospace;font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;">
        Copier la légende Instagram
      </button>
      <p style="font-size:.7rem;color:#3a3a37;opacity:.6;margin-top:4px;line-height:1.5;">
        Téléchargez l'image, puis collez-la dans Instagram avec la légende copiée.
      </p>`
  } catch (e) {
    document.getElementById('share-img-wrap').innerHTML = `<span style="color:#c0392b;font-size:.7rem;">Erreur de génération</span>`
    console.error(e)
  }
}

function shareToFacebook(articleUrl) {
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`
  window.open(url, '_blank', 'width=600,height=400')
}

function copyShareText(titre, chapeau, articleUrl) {
  const text = `${titre}\n\n${chapeau}\n\n${articleUrl}\n\n#brume #brumeconceptstore #cachan #design #decoration`
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target
    const original = btn.textContent
    btn.textContent = 'Copié ✓'
    setTimeout(() => btn.textContent = original, 1500)
  })
}

function slugifyShare(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
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
