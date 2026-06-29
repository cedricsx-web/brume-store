// lib/sanity.ts
// Client Sanity pour brume.fr — lecture seule, CDN public

import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: 'production',
  apiVersion: '2026-01-01',
  useCdn: true, // cache CDN — rapide, gratuit
})

// Helper pour générer les URLs d'images Sanity
const builder = imageUrlBuilder(client)
export const urlFor = (source: any) => builder.image(source)

// ─────────────────────────────────────
// QUERIES
// ─────────────────────────────────────

// Tous les articles publiés (liste)
export async function getArticles() {
  return client.fetch(`
    *[_type == "article" && publishedAt <= now()] 
    | order(publishedAt desc) {
      _id,
      title,
      "slug": slug.current,
      category,
      lead,
      author,
      publishedAt,
      "coverUrl": cover.asset->url,
      "coverAlt": cover.alt,
    }
  `)
}

// Article unique par slug
export async function getArticle(slug: string) {
  return client.fetch(`
    *[_type == "article" && slug.current == $slug && publishedAt <= now()][0] {
      _id,
      title,
      "slug": slug.current,
      category,
      lead,
      body,
      author,
      publishedAt,
      seoDescription,
      "coverUrl": cover.asset->url,
      "coverAlt": cover.alt,
      relatedProducts[] {
        productId,
        label,
      }
    }
  `, { slug })
}

// Tous les slugs (pour Next.js generateStaticParams)
export async function getArticleSlugs() {
  return client.fetch(`
    *[_type == "article" && publishedAt <= now()] {
      "slug": slug.current
    }
  `)
}
