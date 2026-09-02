# Mussdl — Salla Twilight theme

Luxury single-product theme for **معزز الشعر بالقرنفل** (MUSSDL), built on top of
Salla's official [Raed](https://github.com/SallaApp/theme-raed) scaffold.

## How it's organised

| Owns the Mussdl design (layout `layouts/mussdl.twig`) | Kept from Raed (layout `layouts/master.twig`) |
|---|---|
| `pages/index.twig` — home | product listing / search / categories |
| `pages/product/single.twig` — product | customer account, orders, wishlist, wallet |
| `pages/cart.twig` — cart | blog, brands, testimonials, loyalty, static pages |
| `pages/thank-you.twig` — order confirmation | |

The two layouts load **different stylesheets** (`css/mussdl.css` vs Raed's
`app.css`) so the two Tailwind builds never conflict. Checkout itself is
rendered by Salla and only inherits the store colours.

- `src/views/components/mussdl/` — header, footer
- `tools/css/tailwind.css` → compiled to `src/assets/css/mussdl.css` (Tailwind v4, isolated toolchain)
- `src/assets/js/mussdl.js` — animations, hero scroll-video, before/after slider, gallery
- `src/assets/images/mussdl/`, `src/assets/video/` — brand media
- `twilight.json` → **إعدادات ثيم مسدل** — the merchant-editable settings

## Build

```bash
pnpm install
pnpm run production      # Tailwind v4 (mussdl.css) + webpack → public/
```

`public/` is committed, matching Raed, so Salla can serve the theme without a
build step.

## Preview and publish

```bash
salla login
salla theme preview      # live preview on your demo store
salla theme push         # publish to the partner portal
```

## Store setup the theme expects

1. **Theme settings → إعدادات ثيم مسدل** — set the product URL (used by every
   "اطلبي الآن" button), hero text, WhatsApp number, and optionally your own
   hero / before / after images.
2. **The product** — paste the approved description into the product page in
   the dashboard; the theme renders it under the price.
3. **Pack sizes** — add a product option (e.g. "الحجم": عبوة واحدة / عبوتان /
   ثلاث عبوات) with additional prices. The theme renders whatever options the
   product has.
4. **Footer links** — the footer's help column reads the store's *footer* menu.
