// app/editions/page.tsx
// Page liste des articles — brume.fr/editions

import { getArticles } from '@/lib/sanity'
import Link from 'next/link'

export const revalidate = 60 // re-génère toutes les 60 secondes

export default async function EditionsPage() {
  const articles = await getArticles()
  const [featured, ...rest] = articles

  return (
    <main>
      {/* Hero */}
      <section className="list-hero">
        <div>
          <span className="eyebrow">Brüme — Éditions</span>
          <h1>Objets, <em>créateurs,</em> matières.</h1>
        </div>
        <p className="desc">
          Des textes sur les objets qui nous entourent, les designers qui les pensent,
          et la manière dont les choses bien faites s'inscrivent dans le quotidien.
        </p>
      </section>

      {/* Article mis en avant */}
      {featured && (
        <Link href={`/editions/${featured.slug}`} className="featured-article">
          <div className="featured-img">
            <img src={featured.coverUrl} alt={featured.coverAlt ?? featured.title} />
            <span className="featured-tag">{featured.category}</span>
          </div>
          <div className="featured-content">
            <span className="meta">
              {new Date(featured.publishedAt).toLocaleDateString('fr-FR', {
                month: 'long', year: 'numeric'
              })}
            </span>
            <h2>{featured.title}</h2>
            <p>{featured.lead}</p>
            <span className="cta">Lire l'article</span>
          </div>
        </Link>
      )}

      {/* Grille */}
      <div className="articles-grid">
        {rest.map((article) => (
          <Link key={article._id} href={`/editions/${article.slug}`} className="article-card">
            <div className="card-img">
              <img src={article.coverUrl} alt={article.coverAlt ?? article.title} />
            </div>
            <div className="card-body">
              <span className="tag">{article.category}</span>
              <h3>{article.title}</h3>
              <span className="date">
                {new Date(article.publishedAt).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
