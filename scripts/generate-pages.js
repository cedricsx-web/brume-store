/**
 * scripts/generate-pages.js
 *
 * Génère, au moment du build Vercel, des pages HTML statiques et indexables
 * pour chaque catégorie et chaque produit du catalogue Hiboutik, ainsi que
 * sitemap.xml et robots.txt.
 *
 * Pourquoi : le site actuel (index.html) charge tout le catalogue en JS après
 * coup, donc Google ne voit aucun contenu produit dans le HTML initial. Ce
 * script résout ce problème en générant, en plus de l'expérience JS existante
 * (modale, navigation par filtres), une version 100% HTML de chaque page,
 * servie directement par le CDN Vercel — sans toucher à l'expérience utilisateur
 * actuelle (la modale continue de fonctionner exactement comme avant).
 *
 * Lancé automatiquement par Vercel via "build" dans package.json.
 * Aucune fonction serverless ajoutée — uniquement des fichiers statiques.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Polyfill fetch via https natif Node — compatible Node 14, 16, 18, 20, 22
function nodeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: async () => JSON.parse(body),
          text: async () => body,
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}
// Utilise fetch natif si disponible (Node 18+), sinon polyfill
const fetch = global.fetch || nodeFetch;

const ACCOUNT = process.env.HIBOUTIK_ACCOUNT;
const USER = process.env.HIBOUTIK_USER;
const KEY = process.env.HIBOUTIK_API_KEY;
const SITE_URL = process.env.SITE_URL || 'https://brumeconceptstore.fr';

const OUT_DIR = path.join(__dirname, '..', 'public');
const PRODUCT_DIR = path.join(OUT_DIR, 'produit');
const CATEGORY_DIR = path.join(OUT_DIR, 'categorie');

function auth() {
  return 'Basic ' + Buffer.from(`${USER}:${KEY}`).toString('base64');
}

// ── Récupération des données (même logique que api/products.js et api/categories.js) ──

async function fetchAllProducts() {
  const headers = { Authorization: auth(), Accept: 'application/json' };
  const all = [];
  let page = 1;

  while (true) {
    const url = `https://${ACCOUNT}.hiboutik.com/api/products/?p=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) break;

    let batch;
    try { batch = await res.json(); } catch { break; }
    if (!Array.isArray(batch) || batch.length === 0) break;

    all.push(...batch);
    if (batch.length < 250) break;
    page++;
  }

  if (all.length === 0) {
    const fallback = await fetch(`https://${ACCOUNT}.hiboutik.com/api/products/`, { headers });
    return fallback.json();
  }
  return all;
}

async function fetchCategories() {
  const headers = { Authorization: auth(), Accept: 'application/json' };
  const res = await fetch(`https://${ACCOUNT}.hiboutik.com/api/categories`, { headers });
  const rawCats = await res.json();

  const EXCLUDED = ['VIDE', 'Emballages', 'a reclasser'];
  return rawCats
    .filter(c => c.category_name && c.category_name.trim() !== '' && !EXCLUDED.includes(c.category_name.trim()))
    .map(c => ({
      id: parseInt(c.category_id),
      name: c.category_name,
      parent: parseInt(c.category_id_parent) || 0,
      position: parseInt(c.category_position) || 0,
    }));
}

function buildTree(allCats, parentId = 0) {
  return allCats
    .filter(c => c.parent === parentId)
    .sort((a, b) => a.position - b.position)
    .map(c => ({ ...c, subcategories: buildTree(allCats, c.id) }));
}

function flattenTree(tree) {
  const flat = [];
  const walk = (nodes) => nodes.forEach(n => { flat.push(n); if (n.subcategories) walk(n.subcategories); });
  walk(tree);
  return flat;
}

function getAllCategoryIds(tree, targetId) {
  const ids = [];
  const search = (nodes) => {
    for (const node of nodes) {
      if (node.id === targetId) {
        const collect = (n) => { ids.push(n.id); (n.subcategories || []).forEach(collect); };
        collect(node);
        return true;
      }
      if (node.subcategories && search(node.subcategories)) return true;
    }
    return false;
  };
  search(tree);
  return ids;
}

// ── Utilitaires texte ──

function slugify(text) {
  return (text || '')
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'produit';
}

function truncate(text, max) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd().replace(/[,.;:]$/, '') + '…';
}

function stripHtml(text) {
  return (text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeHtml(text) {
  return (text || '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeAttr(text) {
  return escapeHtml(text);
}

function fmtPrice(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

function imageUrl(productId) {
  return `https://brumeconceptstore.hiboutik.com/myshop/images/?img=big_${productId}-1.jpg`;
}

// ── Layout HTML commun (header/footer simplifiés, cohérents avec la charte) ──

function pageShell({ title, metaDescription, canonical, h1, bodyHtml, jsonLd, ogImage }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeAttr(metaDescription)}">
<link rel="canonical" href="${escapeAttr(canonical)}">
<meta property="og:title" content="${escapeAttr(title)}">
<meta property="og:description" content="${escapeAttr(metaDescription)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${escapeAttr(canonical)}">
${ogImage ? `<meta property="og:image" content="${escapeAttr(ogImage)}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&family=Space+Mono&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
<style>
  /* Page statique générée — réutilise la charte du site, mise en page simplifiée
     (le rendu riche, avec modale et panier, reste celui de index.html) */
  body { background: var(--linen); }
  .static-wrap { max-width: 900px; margin: 0 auto; padding: 140px 32px 100px; }
  .static-eyebrow { font-family: var(--mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--sand); margin-bottom: 18px; display: block; }
  .static-h1 { font-family: var(--serif); font-size: clamp(2rem, 5vw, 3.2rem); font-weight: 300; color: var(--black); line-height: 1.1; margin-bottom: 28px; }
  .static-meta { font-family: var(--mono); font-size: 12px; color: var(--ink, #444); opacity: .6; margin-bottom: 40px; }
  .static-back { display: inline-block; margin-bottom: 32px; font-family: var(--mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--black); opacity: .6; text-decoration: none; }
  .static-back:hover { opacity: 1; }
  .static-product { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: start; }
  .static-product img { width: 100%; aspect-ratio: 1; object-fit: cover; background: #eee; }
  .static-price { font-family: var(--mono); font-size: 20px; color: var(--sand); margin-bottom: 24px; }
  .static-desc { font-size: 15px; line-height: 1.8; color: #333; }
  .static-desc p { margin-bottom: 14px; }
  .static-cta { display: inline-block; margin-top: 28px; padding: 14px 28px; background: var(--forest); color: var(--linen); font-family: var(--mono); font-size: 12px; letter-spacing: .1em; text-transform: uppercase; text-decoration: none; }
  .static-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 28px; margin-top: 32px; }
  .static-card { text-decoration: none; color: inherit; display: block; }
  .static-card img { width: 100%; aspect-ratio: 1; object-fit: cover; background: #eee; margin-bottom: 10px; }
  .static-card-name { font-family: var(--serif); font-size: 15px; color: var(--black); margin-bottom: 4px; }
  .static-card-price { font-family: var(--mono); font-size: 12px; color: var(--sand); }
  @media (max-width: 760px) { .static-product { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<header>
  <div class="header-inner">
    <a href="/" class="header-logo" style="text-decoration:none;">Brüme</a>
    <nav class="nav-left">
      <a href="/editions.html" class="hide-mobile">Histoires</a>
      <a href="/index.html#boutique" class="hide-mobile">Boutique</a>
    </nav>
  </div>
</header>
<main class="static-wrap">
  ${bodyHtml}
</main>
</body>
</html>`;
}

// ── Génération des pages produit ──

function buildProductPage(p, categoryName) {
  const slug = slugify(p.product_model);
  const filename = `${p.product_id}-${slug}.html`;
  const canonical = `${SITE_URL}/produit/${filename}`;
  const price = parseFloat(p.product_price);
  const sale = p.product_discount_price ? parseFloat(p.product_discount_price) : null;
  const finalPrice = sale || price;
  const descText = stripHtml(p.products_desc);
  const metaDescription = truncate(descText || `${p.product_model} — disponible chez Brüme Concept Store, Cachan.`, 158);
  const title = `${p.product_model}${p.product_brand ? ' — ' + p.product_brand : ''} | Brüme Concept Store Cachan`;
  const img = imageUrl(p.product_id);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.product_model,
    image: [img],
    description: metaDescription,
    brand: p.product_brand ? { '@type': 'Brand', name: p.product_brand } : undefined,
    category: categoryName || undefined,
    offers: {
      '@type': 'Offer',
      url: canonical,
      priceCurrency: 'EUR',
      price: finalPrice.toFixed(2),
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'Brüme Concept Store' },
    },
  };

  const descHtml = descText
    ? `<div class="static-desc">${descText.split(/\n+/).filter(Boolean).map(l => `<p>${escapeHtml(l)}</p>`).join('')}</div>`
    : '<p class="static-desc">Description à venir.</p>';

  const bodyHtml = `
    <a href="/index.html" class="static-back">← Retour à la boutique</a>
    <div class="static-product">
      <img src="${img}" alt="${escapeAttr(p.product_model)}" loading="lazy">
      <div>
        ${categoryName ? `<span class="static-eyebrow">${escapeHtml(categoryName)}</span>` : ''}
        <h1 class="static-h1">${escapeHtml(p.product_model)}</h1>
        <p class="static-price">${sale ? `<span style="text-decoration:line-through;opacity:.5;margin-right:8px;">${fmtPrice(price)}</span>${fmtPrice(sale)}` : fmtPrice(price)}</p>
        ${descHtml}
        <a href="/index.html?product=${p.product_id}" class="static-cta">Voir et commander sur la boutique</a>
      </div>
    </div>
  `;

  return {
    filename,
    html: pageShell({ title, metaDescription, canonical, bodyHtml, jsonLd, ogImage: img }),
  };
}

// ── Génération des pages catégorie ──

function buildCategoryPage(cat, products, categoryTree) {
  const slug = slugify(cat.name);
  const filename = `${slug}.html`;
  const canonical = `${SITE_URL}/categorie/${filename}`;
  const title = `${cat.name} | Brüme Concept Store — Cachan`;
  const metaDescription = truncate(
    `Découvrez notre sélection ${cat.name.toLowerCase()} chez Brüme Concept Store, galerie-boutique à Cachan. Pièces choisies avec soin, click & collect disponible.`,
    158
  );

  const ids = getAllCategoryIds(categoryTree, cat.id);
  const catProducts = products.filter(p => ids.includes(p.product_category));

  const cardsHtml = catProducts.slice(0, 60).map(p => {
    const pSlug = slugify(p.product_model);
    return `
      <a href="/produit/${p.product_id}-${pSlug}.html" class="static-card">
        <img src="${imageUrl(p.product_id)}" alt="${escapeAttr(p.product_model)}" loading="lazy">
        <div class="static-card-name">${escapeHtml(p.product_model)}</div>
        <div class="static-card-price">${fmtPrice(parseFloat(p.product_price))}</div>
      </a>`;
  }).join('');

  const bodyHtml = `
    <a href="/index.html" class="static-back">← Retour à la boutique</a>
    <span class="static-eyebrow">Brüme Concept Store · Cachan</span>
    <h1 class="static-h1">${escapeHtml(cat.name)}</h1>
    <p class="static-meta">${catProducts.length} produit${catProducts.length > 1 ? 's' : ''}</p>
    <div class="static-grid">${cardsHtml}</div>
  `;

  return { filename, html: pageShell({ title, metaDescription, canonical, bodyHtml }) };
}

// ── sitemap.xml et robots.txt ──

function buildSitemap(categoryFiles, productFiles) {
  const urls = [
    `${SITE_URL}/`,
    `${SITE_URL}/editions.html`,
    ...categoryFiles.map(f => `${SITE_URL}/categorie/${f}`),
    ...productFiles.map(f => `${SITE_URL}/produit/${f}`),
  ];
  const body = urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function buildRobots() {
  return `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

// ── Exécution ──

async function main() {
  // ── ÉTAPE 1 : Toujours copier les fichiers statiques vers public/ ──
  // C'est critique : Vercel sert depuis outputDirectory "public".
  // Sans cette copie, aucun changement HTML/CSS/JS n'apparaît.
  const ROOT = path.join(__dirname, '..');
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const SKIP = new Set(['public', 'scripts', 'node_modules', '.git', '.vercel', '.gitignore']);
  function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      if (SKIP.has(entry.name)) continue;
      const s = path.join(src, entry.name);
      const d = path.join(dest, entry.name);
      if (entry.isDirectory()) copyDir(s, d);
      else fs.copyFileSync(s, d);
    }
  }
  copyDir(ROOT, OUT_DIR);
  console.log('[generate-pages] Fichiers statiques copiés vers public/.');

  // ── ÉTAPE 2 : Générer les pages SEO (optionnel — ne bloque pas le déploiement) ──
  if (!ACCOUNT || !USER || !KEY) {
    console.warn('[generate-pages] Variables Hiboutik manquantes — pages SEO ignorées.');
    return;
  }

  try {
    console.log('[generate-pages] Récupération des produits et catégories Hiboutik...');
    const [rawProducts, rawCategories] = await Promise.all([fetchAllProducts(), fetchCategories()]);

    const products = rawProducts
      .filter(p => (p.product_display_www == 1 || p.product_display_www === '1') && p.product_arch !== 1 && p.product_arch !== '1')
      .map(p => ({
        product_id: parseInt(p.product_id),
        product_model: p.product_model,
        products_desc: p.products_desc,
        product_price: parseFloat(p.product_price),
        product_discount_price: parseFloat(p.product_discount_price || '0'),
        product_brand: p.product_brand,
        product_category: parseInt(p.product_category) || 0,
      }));

    const categoryTree = buildTree(rawCategories, 0);
    const flatCategories = flattenTree(categoryTree);
    const categoryNameById = Object.fromEntries(flatCategories.map(c => [c.id, c.name]));

    fs.mkdirSync(PRODUCT_DIR, { recursive: true });
    fs.mkdirSync(CATEGORY_DIR, { recursive: true });

    console.log(`[generate-pages] ${products.length} produits, ${flatCategories.length} catégories.`);

    const productFiles = [];
    for (const p of products) {
      const { filename, html } = buildProductPage(p, categoryNameById[p.product_category]);
      fs.writeFileSync(path.join(PRODUCT_DIR, filename), html);
      productFiles.push(filename);
    }

    const categoryFiles = [];
    for (const cat of flatCategories) {
      const { filename, html } = buildCategoryPage(cat, products, categoryTree);
      fs.writeFileSync(path.join(CATEGORY_DIR, filename), html);
      categoryFiles.push(filename);
    }

    fs.writeFileSync(path.join(OUT_DIR, 'sitemap.xml'), buildSitemap(categoryFiles, productFiles));
    fs.writeFileSync(path.join(OUT_DIR, 'robots.txt'), buildRobots());

    console.log(`[generate-pages] Terminé : ${productFiles.length} pages produit, ${categoryFiles.length} pages catégorie, sitemap.xml, robots.txt → public/`);
  } catch (err) {
    console.warn('[generate-pages] Pages SEO ignorées (Hiboutik indisponible) :', err.message);
    // Les fichiers statiques sont déjà copiés — le site fonctionne, juste sans pages SEO fraîches
  }
}

main().catch(err => {
  console.error('[generate-pages] Échec critique :', err);
  process.exit(0);
});
