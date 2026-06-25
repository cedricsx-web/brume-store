/**
 * MOCK DATA — mirrors the exact JSON structure Hiboutik API returns.
 * When the real API is connected, this file is no longer used.
 * 
 * Real Hiboutik endpoints this replaces:
 *   GET /api/products/          → window.MOCK_PRODUCTS
 *   GET /api/categories/        → window.MOCK_CATEGORIES
 *   GET /api/stock/{product_id} → window.MOCK_STOCK
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
    product_brand: "Maison Brüme",
    product_price: "24.00",
    product_discount_price: null,
    product_category: 1,
    product_description: "Cire de soja naturelle, parfum boisé. Durée de combustion : 40h.",
    product_image: null,
    product_emoji: "🕯️",
    product_emoji_hover: "🌫️",
    product_img_bg: "linear-gradient(145deg,#E2D9CC,#C8BBA8)",
    product_img_bg_hover: "linear-gradient(145deg,#D5CABB,#B8AA94)",
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
    product_image: null,
    product_emoji: "🪴",
    product_emoji_hover: "🌱",
    product_img_bg: "linear-gradient(145deg,#CDD5D2,#A9B7B3)",
    product_img_bg_hover: "linear-gradient(145deg,#BFC9C5,#96A8A4)",
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
    product_image: null,
    product_emoji: "📎",
    product_emoji_hover: "✏️",
    product_img_bg: "linear-gradient(145deg,#D9CFBF,#BFB09C)",
    product_img_bg_hover: "linear-gradient(145deg,#CBC0AE,#AFA088)",
    tag: "sale"
  },
  {
    product_id: 104,
    product_model: "Bocal à fleurs séchées",
    product_brand: "L'Herbier",
    product_price: "19.00",
    product_discount_price: null,
    product_category: 1,
    product_description: "Verre soufflé à la bouche, composition florale incluse.",
    product_image: null,
    product_emoji: "🫙",
    product_emoji_hover: "🌸",
    product_img_bg: "linear-gradient(145deg,#E8E0D5,#D0C5B5)",
    product_img_bg_hover: "linear-gradient(145deg,#DACEDD,#BEADB5)",
    tag: "new"
  },
  {
    product_id: 105,
    product_model: "Plateau en béton texturé",
    product_brand: "Béton Brut",
    product_price: "55.00",
    product_discount_price: null,
    product_category: 2,
    product_description: "Béton ciré à la main. Dimensions : 30×20cm.",
    product_image: null,
    product_emoji: "🧱",
    product_emoji_hover: "🏠",
    product_img_bg: "linear-gradient(145deg,#CCC4B8,#AFA598)",
    product_img_bg_hover: "linear-gradient(145deg,#C0B8AB,#A09489)",
    tag: null
  },
  {
    product_id: 106,
    product_model: "Lampe à poser raku",
    product_brand: "Serax",
    product_price: "88.00",
    product_discount_price: null,
    product_category: 1,
    product_description: "Céramique raku unique, câble textile tressé, ampoule E27.",
    product_image: null,
    product_emoji: "🔦",
    product_emoji_hover: "💡",
    product_img_bg: "linear-gradient(145deg,#D5C8B8,#BFAF9C)",
    product_img_bg_hover: "linear-gradient(145deg,#C8BB9E,#AF9E84)",
    tag: null
  },
  {
    product_id: 107,
    product_model: "Carafe en grès blanc",
    product_brand: "Ceramique Sauvage",
    product_price: "64.00",
    product_discount_price: null,
    product_category: 5,
    product_description: "Grès blanc, contenance 1.2L. Lave-vaisselle compatible.",
    product_image: null,
    product_emoji: "🍶",
    product_emoji_hover: "☕",
    product_img_bg: "linear-gradient(145deg,#C8D0CC,#A8B5B0)",
    product_img_bg_hover: "linear-gradient(145deg,#BACBC5,#9AAAA2)",
    tag: "new"
  },
  {
    product_id: 108,
    product_model: "Vide-poche en bois massif",
    product_brand: "Forêt Studio",
    product_price: "32.00",
    product_discount_price: null,
    product_category: 2,
    product_description: "Noyer massif huilé, dimensions : 15×10cm.",
    product_image: null,
    product_emoji: "🪵",
    product_emoji_hover: "🍂",
    product_img_bg: "linear-gradient(145deg,#D4CCB8,#BEB49E)",
    product_img_bg_hover: "linear-gradient(145deg,#C8BFA8,#AEA48C)",
    tag: null
  },
  {
    product_id: 109,
    product_model: "Terrarium géométrique",
    product_brand: "Brüme Studio",
    product_price: "45.00",
    product_discount_price: null,
    product_category: 4,
    product_description: "Structure en laiton brossé, vitre trempée. Dimensions : 20×20×25cm.",
    product_image: null,
    product_emoji: "🌿",
    product_emoji_hover: "🌱",
    product_img_bg: "linear-gradient(145deg,#B8C4B0,#8BA882)",
    product_img_bg_hover: "linear-gradient(145deg,#AABB98,#7A9178)",
    tag: null
  },
  {
    product_id: 110,
    product_model: "Carnet cuir végétal",
    product_brand: "Papier Tigre",
    product_price: "28.00",
    product_discount_price: null,
    product_category: 3,
    product_description: "Couverture cuir tanné végétal, 192 pages ivory.",
    product_image: null,
    product_emoji: "📓",
    product_emoji_hover: "✍️",
    product_img_bg: "linear-gradient(145deg,#D8CDBA,#C0B098)",
    product_img_bg_hover: "linear-gradient(145deg,#CABFA8,#AF9E84)",
    tag: null
  },
  {
    product_id: 111,
    product_model: "Bol céramique émaillé",
    product_brand: "Ceramique Sauvage",
    product_price: "22.00",
    product_discount_price: null,
    product_category: 5,
    product_description: "Grès blanc, glaçure bleu de four. Ø 14cm.",
    product_image: null,
    product_emoji: "🍵",
    product_emoji_hover: "🫖",
    product_img_bg: "linear-gradient(145deg,#B8C8D0,#8FAAB5)",
    product_img_bg_hover: "linear-gradient(145deg,#AABEC8,#809EA8)",
    tag: "new"
  },
  {
    product_id: 112,
    product_model: "Bougeoir en marbre",
    product_brand: "Béton Brut",
    product_price: "34.00",
    product_discount_price: "26.00",
    product_category: 1,
    product_description: "Marbre de Carrare, compatible bougie chauffe-plat.",
    product_image: null,
    product_emoji: "🕍",
    product_emoji_hover: "✨",
    product_img_bg: "linear-gradient(145deg,#E0DCDC,#C8C4C4)",
    product_img_bg_hover: "linear-gradient(145deg,#D4D0D0,#B8B4B4)",
    tag: "sale"
  }
];

// Stock per product_id — mirrors GET /api/stock/{id}
window.MOCK_STOCK = {
  101: 8,
  102: 3,
  103: 12,
  104: 0,   // out of stock
  105: 5,
  106: 2,
  107: 7,
  108: 4,
  109: 1,
  110: 15,
  111: 6,
  112: 9
};
