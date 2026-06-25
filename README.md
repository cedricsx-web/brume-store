# Brüme Concept Store — Storefront

A custom storefront for [Brüme Concept Store](https://brume-cachan.fr) that displays products and stock in real time from Hiboutik, handles the cart locally, then redirects to Hiboutik's payment page at checkout.

**The customer never navigates to hiboutik.com — except for the payment step.**

---

## Architecture

```
Browser (brume-cachan.fr)
  │
  ├─ GET /api/products   ─┐
  ├─ GET /api/stock       ├─► Vercel proxy  ──► Hiboutik API
  └─ POST /api/checkout  ─┘   (hides API key)
                                                    │
                                          Returns payment URL
                                                    │
                                   Customer redirected to Hiboutik payment page
                                         (only this step is on hiboutik.com)
```

---

## Project structure

```
brume-store/
├── index.html          ← storefront (single page)
├── css/
│   └── style.css       ← all styles
├── js/
│   ├── mock-data.js    ← mock products/stock (used in development)
│   ├── api.js          ← data layer (mock ↔ real toggle)
│   ├── ui.js           ← DOM rendering
│   └── store.js        ← cart logic, checkout flow
├── api/
│   ├── products.js     ← Vercel function: GET products from Hiboutik
│   ├── stock.js        ← Vercel function: GET stock from Hiboutik
│   └── checkout.js     ← Vercel function: POST cart → Hiboutik → return payment URL
├── vercel.json         ← routing + CORS headers
└── README.md
```

---

## Phase 1 — Development (mock data, no API needed)

1. Clone the repo
2. Open `index.html` in your browser — everything works with mock data
3. `js/api.js` line 1: `const USE_MOCK = true;` ← this is the only switch

You can develop and test the full UI, cart, and checkout flow without touching Hiboutik.

---

## Phase 2 — Connect real Hiboutik API

### Step 1 — Get your API credentials from Hiboutik

In your Hiboutik account:  
`Settings → API → Generate API key`

You'll need:
- **Account name** — the prefix in your URL (`brumeconceptstore`)
- **Login email** — your Hiboutik login
- **API key** — generated in settings

### Step 2 — Create a new GitHub repo

```bash
git init
git remote add origin https://github.com/YOUR_USERNAME/brume-store.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

### Step 3 — Deploy on Vercel (free)

1. Go to [vercel.com](https://vercel.com) → Import Git Repository → select `brume-store`
2. Go to **Settings → Environment Variables** and add:

| Variable | Value |
|---|---|
| `HIBOUTIK_ACCOUNT` | `brumeconceptstore` |
| `HIBOUTIK_USER` | your Hiboutik login email |
| `HIBOUTIK_API_KEY` | your Hiboutik API key |
| `HIBOUTIK_WAREHOUSE_ID` | `1` (or your store ID) |
| `HIBOUTIK_STORE_ID` | `1` (or your store ID) |
| `BRUME_TOKEN` | any random secret string (e.g. a UUID) |

3. Redeploy after adding variables

### Step 4 — Switch from mock to real API

In `js/api.js`, change line 1:
```js
const USE_MOCK = false; // ← was true
```

Push to GitHub → Vercel auto-deploys.

### Step 5 — Set CORS to your domain

In `vercel.json`, update the CORS origin to your real domain:
```json
{ "key": "Access-Control-Allow-Origin", "value": "https://brume-cachan.fr" }
```

---

## Stock sync

Stock levels refresh automatically every **60 seconds** on the page. If a product sells out while a customer is browsing:
- The "Add to cart" button becomes disabled
- If the item is already in the cart and stock drops to 0, it's removed with a warning

---

## Security checklist

- [x] API key never in frontend code — only in Vercel environment variables
- [x] All proxy routes require `x-brume-token` header
- [x] Checkout route is rate-limited (10 requests/minute per IP)
- [x] CORS restricted to your domain only
- [x] Cart quantities validated server-side before creating Hiboutik sale
- [x] HTTPS enforced by Vercel (automatic)

---

## Customisation notes

- **Product images**: Replace `product_emoji` fields with real image URLs in `mock-data.js`, and update `ui.js → _productCard()` to render `<img>` tags
- **Categories**: Will be auto-populated from Hiboutik API when live
- **Customer accounts**: `api/checkout.js` has a commented line ready for `customer_id` once customer auth is added
