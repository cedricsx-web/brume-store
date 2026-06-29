// studio/schemas/article.ts
// Schéma d'un article Brüme Éditions

export default {
  name: 'article',
  title: 'Article',
  type: 'document',

  fields: [
    {
      name: 'title',
      title: 'Titre',
      type: 'string',
      validation: (Rule: any) => Rule.required().max(100),
    },
    {
      name: 'slug',
      title: 'URL de l\'article',
      type: 'slug',
      description: 'Généré automatiquement depuis le titre — ne pas modifier après publication.',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'category',
      title: 'Catégorie',
      type: 'string',
      options: {
        list: [
          { title: 'Portrait', value: 'portrait' },
          { title: 'Matières', value: 'matieres' },
          { title: 'Espace', value: 'espace' },
          { title: 'Papeterie', value: 'papeterie' },
          { title: 'Cuisine', value: 'cuisine' },
          { title: 'Sélection', value: 'selection' },
        ],
        layout: 'radio',
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'cover',
      title: 'Image principale',
      type: 'image',
      description: 'Format paysage recommandé — minimum 1400×800px.',
      options: { hotspot: true },
      fields: [
        {
          name: 'alt',
          title: 'Description de l\'image (accessibilité)',
          type: 'string',
        },
      ],
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'lead',
      title: 'Chapeau',
      type: 'text',
      rows: 3,
      description: 'Phrase d\'accroche affichée sous le titre. 1 à 3 phrases maximum.',
      validation: (Rule: any) => Rule.required().max(300),
    },
    {
      name: 'body',
      title: 'Contenu de l\'article',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Texte normal', value: 'normal' },
            { title: 'Titre de section', value: 'h2' },
            { title: 'Citation mise en avant', value: 'blockquote' },
          ],
          marks: {
            decorators: [
              { title: 'Italique', value: 'em' },
              { title: 'Gras', value: 'strong' },
            ],
          },
        },
        {
          type: 'image',
          title: 'Image dans l\'article',
          options: { hotspot: true },
          fields: [
            { name: 'caption', title: 'Légende', type: 'string' },
            { name: 'alt', title: 'Description', type: 'string' },
          ],
        },
      ],
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'relatedProducts',
      title: 'Produits Hiboutik liés',
      type: 'array',
      description: 'Ajouter les identifiants Hiboutik des produits à afficher en bas d\'article.',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'productId',
              title: 'ID produit Hiboutik',
              type: 'number',
              description: 'Le numéro affiché dans l\'URL du produit sur Hiboutik.',
            },
            {
              name: 'label',
              title: 'Nom affiché (optionnel)',
              type: 'string',
              description: 'Laisser vide pour utiliser le nom Hiboutik automatiquement.',
            },
          ],
          preview: {
            select: { title: 'label', subtitle: 'productId' },
            prepare: ({ title, subtitle }: any) => ({
              title: title || `Produit #${subtitle}`,
              subtitle: `ID Hiboutik : ${subtitle}`,
            }),
          },
        },
      ],
    },
    {
      name: 'author',
      title: 'Auteur',
      type: 'string',
      initialValue: 'Brüme',
    },
    {
      name: 'publishedAt',
      title: 'Date de publication',
      type: 'datetime',
      description: 'Vous pouvez planifier une date future — l\'article sera masqué jusqu\'à cette date.',
    },
    {
      name: 'seoDescription',
      title: 'Description SEO',
      type: 'text',
      rows: 2,
      description: 'Optionnel — pour Google et les partages sur les réseaux. 150 caractères max.',
      validation: (Rule: any) => Rule.max(160),
    },
  ],

  preview: {
    select: {
      title: 'title',
      category: 'category',
      media: 'cover',
      date: 'publishedAt',
    },
    prepare({ title, category, media, date }: any) {
      const d = date ? new Date(date).toLocaleDateString('fr-FR') : 'Non publié'
      return { title, subtitle: `${category ?? '—'} · ${d}`, media }
    },
  },

  orderings: [
    {
      title: 'Date de publication (récent en premier)',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
}
