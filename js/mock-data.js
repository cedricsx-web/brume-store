/**
 * MOCK DATA — mirrors Hiboutik API JSON structure exactly.
 * Unsplash images used as placeholders until real product photos are loaded via API.
 */

window.MOCK_CATEGORIES = [
  { categories_id: 1, categories_name: "Décoration" },
  { categories_id: 2, categories_name: "Objets" },
  { categories_id: 3, categories_name: "Papeterie" },
  { categories_id: 4, categories_name: "Plantes & Terrarium" },
  { categories_id: 5, categories_name: "Cuisine & Art de vivre" }
];

window.MOCK_PRODUCTS = [
  {
    product_id: 101,
    product_model: "Bougie artisanale Forêt",
    product_brand: "La Bougie Française",
    product_price: "29.00",
    product_discount_price: null,
    product_category: 1,
    product_description: "Cire de soja naturelle, parfum boisé. Durée : 40h.",
    product_image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80",
    tag: "new"
  },
  {
    product_id: 102,
    product_model: "Pot en grès texturé",
    product_brand: "Atelier Vert",
    product_price: "38.00",
    product_discount_price: null,
    product_category: 4,
    product_description: "Grès tourné à la main, glaçure mate naturelle.",
    product_image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80",
    tag: null
  },
  {
    product_id: 103,
    product_model: "Kit papeterie minimaliste",
    product_brand: "Papier Tigre",
    product_price: "42.00",
    product_discount_price: "29.00",
    product_category: 3,
    product_description: "Carnet, stylo et pochette kraft. Édition limitée.",
    product_image: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&q=80",
    tag: "sale"
  },
  {
    product_id: 104,
    product_model: "Vase Bruine",
    product_brand: "Ceramics by Laure",
    product_price: "54.00",
    product_discount_price: null,
    product_category: 1,
    product_description: "Grès blanc émaillé, façonné à la main.",
    product_image: "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=600&q=80",
    tag: null
  },
  {
    product_id: 105,
    product_model: "Plateau en béton ciré",
    product_brand: "Béton Brut",
    product_price: "55.00",
    product_discount_price: null,
    product_category: 2,
    product_description: "Béton ciré à la main. 30×20cm.",
    product_image: "https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?w=600&q=80",
    tag: null
  },
  {
    product_id: 106,
    product_model: "Lampe à poser raku",
    product_brand: "Serax",
    product_price: "88.00",
    product_discount_price: null,
    product_category: 1,
    product_description: "Céramique raku unique, câble textile tressé.",
    product_image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80",
    tag: null
  },
  {
    product_id: 107,
    product_model: "Carafe en grès blanc",
    product_brand: "Ceramique Sauvage",
    product_price: "64.00",
    product_discount_price: null,
    product_category: 5,
    product_description: "Grès blanc, contenance 1.2L.",
    product_image: "https://images.unsplash.com/photo-1544441893-675973e31985?w=600&q=80",
    tag: "new"
  },
  {
    product_id: 108,
    product_model: "Carnet Éclipse",
    product_brand: "Maison Calligramme",
    product_price: "22.00",
    product_discount_price: null,
    product_category: 3,
    product_description: "Couverture cuir végétal, 192 pages ivory.",
    product_image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80",
    tag: null
  },
  {
    product_id: 109,
    product_model: "Terrarium géométrique",
    product_brand: "Brüme Studio",
    product_price: "45.00",
    product_discount_price: null,
    product_category: 4,
    product_description: "Structure laiton brossé, vitre trempée. 20×25cm.",
    product_image: "https://images.unsplash.com/photo-1520302630591-fd1f4205a82f?w=600&q=80",
    tag: null
  },
  {
    product_id: 110,
    product_model: "Bol céramique émaillé",
    product_brand: "Ceramique Sauvage",
    product_price: "22.00",
    product_discount_price: null,
    product_category: 5,
    product_description: "Grès blanc, glaçure bleu de four. Ø 14cm.",
    product_image: "https://images.unsplash.com/photo-1603199503920-27bef7d47bf1?w=600&q=80",
    tag: "new"
  },
  {
    product_id: 111,
    product_model: "Bougeoir en marbre",
    product_brand: "Béton Brut",
    product_price: "34.00",
    product_discount_price: "26.00",
    product_category: 1,
    product_description: "Marbre de Carrare. Compatible chauffe-plat.",
    product_image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=600&q=80",
    tag: "sale"
  },
  {
    product_id: 112,
    product_model: "Vide-poche noyer",
    product_brand: "Forêt Studio",
    product_price: "32.00",
    product_discount_price: null,
    product_category: 2,
    product_description: "Noyer massif huilé. 15×10cm.",
    product_image: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=600&q=80",
    tag: null
  }
];

window.MOCK_STOCK = {
  101: 8, 102: 3, 103: 12, 104: 0,
  105: 5, 106: 2, 107: 7, 108: 4,
  109: 1, 110: 6, 111: 9, 112: 0
};
