// app/editions/[slug]/page.tsx
// Page article individuel — brume.fr/editions/jean-prouve-obstination-du-beau

import { getArticle, getArticleSlugs } from '@/lib/sanity'
import { PortableText } from '@portabletext/react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 60

// Pré-génère toutes les pages d'articles au build
export async function generateStaticParams() {
  const slugs = await getArticleSlugs()
  return slugs.map(({ slug }: { slug: string }) => ({ slug }))
}

// Meta tags SEO automatiques
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug)
  if (!article) return {}
  return {
    title: `${article.title} — Brüme Éditions`,
    description: article.seoDescription ?? article.lead,
    openGraph: {
      title: article.title,
      description: article.seoDescription ?? article.lead,
      images: [{ url: article.coverUrl }],
    },
  }
}

// Rendu du corps de l'article (Portable Text → HTML)
const portableTextComponents = {
  block: {
    normal: ({ children }: any) => <p>{children}</p>,
    h2: ({ children }: any) => <h2>{children}</h2>,
    blockquote: ({ children }: any) => (
      <div className="article-pull">
        <p>{children}</p>
      </div>
    ),
  },
  types: {
    image: ({ value }: any) => (
      <figure className="article-figure">
        <img
          src={`https://cdn.sanity.io/images/${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}/production/${value.asset._ref
            .replace('image-', '')
            .replace(/-(\w+)$/, '.$1')}`}
          alt={value.alt ?? ''}
        />
        {value.caption && <figcaption>{value.caption}</figcaption>}
      </figure>
    ),
  },
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug)
  if (!article) notFound()

  // Fetch des produits Hiboutik liés (si définis dans Sanity)
  let relatedProducts: any[] = []
  if (article.relatedProducts?.length) {
    relatedProducts = await Promise.all(
      article.relatedProducts.map(async ({ productId, label }: any) => {
        try {
          const res = await fetch(
            `https://brumeconceptstore.hiboutik.com/api/products/${productId}`,
            { next: { revalidate: 3600 } }
          )
          const data = await res.json()
          return { ...data[0], labelOverride: label }
        } catch {
          return null
        }
      })
    ).then(results => results.filter(Boolean))
  }

  // Construire le lien panier Hiboutik pour "Tous les produits de l'article"
  const cartParam = article.relatedProducts
    ?.map(({ productId }: any) => `${productId}:1`)
    .join(',')

  return (
    <article>
      {/* En-tête */}
      <header className="article-header">
        <Link href="/editions" className="article-back">
          ← Retour aux éditions
        </Link>
        <div className="article-category">{article.category}</div>
        <h1 className="article-h1">{article.title}</h1>
        <div className="article-byline">
          <div className="byline-info">
            <span className="byline-name">{article.author}</span>
            <span className="byline-date">
              {new Date(article.publishedAt).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </header>

      {/* Image principale */}
      <div className="article-cover">
        <img src={article.coverUrl} alt={article.coverAlt ?? article.title} />
      </div>

      {/* Corps */}
      <div className="article-body">
        <p className="article-lead">{article.lead}</p>
        <PortableText value={article.body} components={portableTextComponents} />
      </div>

      {/* Produits liés */}
      {relatedProducts.length > 0 && (
        <section className="related-products">
          <span className="related-label">Produits liés à cet article</span>
          <div className="related-grid">
            {relatedProducts.map((product) => (
              <a
                key={product.product_id}
                href={`https://brumeconceptstore.hiboutik.com/myshop/?brume_cart=${product.product_id}:1`}
                className="related-item"
              >
                <div className="related-item-img">
                  <img
                    src={`https://brumeconceptstore.hiboutik.com/myshop/images/?img=big_${product.product_id}-1.jpg`}
                    alt={product.labelOverride ?? product.product_display_name}
                  />
                </div>
                <div className="related-item-name">
                  {product.labelOverride ?? product.product_display_name}
                </div>
                {product.product_price && (
                  <div className="related-item-price">
                    {parseFloat(product.product_price).toFixed(2)} €
                  </div>
                )}
              </a>
            ))}
          </div>

          {/* Bouton "Commander tous les produits de l'article" */}
          {cartParam && (
            <a
              href={`https://brumeconceptstore.hiboutik.com/myshop/?brume_cart=${cartParam}`}
              className="related-cta"
            >
              Commander tous les produits de l'article →
            </a>
          )}
        </section>
      )}
    </article>
  )
}
