# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Two groups, both inside a clothing shop.

- **Customers** (men, women, parents shopping for kids) who want to see how a garment looks on them without queuing for, or undressing in, a trial room. A staff member hands them an in-store **landscape laptop or tablet** with a front camera. They take one full-length photo, browse the shop's catalogue, and see AI previews of themselves wearing items.
- **Staff**, who add and remove catalogue products from product photographs, and help customers find a previewed item on the shop floor.

## Product Purpose
VESTIQ is a virtual fitting room for a physical clothing shop. One photo of the customer plus a product photo from the shop's own catalogue produces a picture of the customer wearing that garment, single items or a top-and-bottom outfit. Success: the customer previews several looks in a few minutes, shortlists what they like, and asks staff for the exact item, with fewer trial-room trips.

## Positioning
The garments are the shop's real stock, photographed by staff, and the AI runs locally on the shop's own machine (FASHN VTON v1.5). No customer photo leaves the shop and no paid cloud API is used.

## Operating Context
- Shop floor, handheld or on a counter; mixed lighting; customers are standing and often in a hurry.
- Device is passed between strangers, so every session must end cleanly and leave nothing of the previous customer behind.
- One generation takes noticeable time on a laptop GPU (first run loads the model); requests are serialised.
- Staff manage the catalogue on the same app.

## Capabilities and Constraints
- Camera capture or photo upload; consent before capture.
- Catalogue from SQLite: department (men, women, kids, footwear), category, colour, price, description, try-on type.
- Try-on types the model supports: `tops`, `bottoms`, `one-pieces`. Footwear cannot be tried on. A full outfit is two sequential passes (top, then bottom).
- Prices may be 0 (placeholder) and must not be shown as "₹0".
- Results are AI previews: drape, colour and fit can differ from reality, and the UI says so.
- Staff tools are locked by a staff PIN set in the backend `.env` (`ADMIN_PIN`); when unset, they stay open.
- Kiosk-style privacy: photos live only in the browser session and are cleared when the session ends.

## Brand Commitments
- Name: **VESTIQ**. General clothing for men, women and kids. Leftover "Saree Mirror" wording is retired.
- Visual references the user made binding for the UI: landonorris.com (UI reference) and the user's own Compassion Worship Center site (`../compassion worship center church`): heavy display type, scroll and text motion, magnetic/letter-swap micro-interactions. Fonts: fat or multi-colour display faces, kept professional.

## Evidence on Hand
- Starter catalogue: 9 product photos in `backend/catalog/images/` (men navy shirt, beige chinos; women magenta blouse, black wide-leg trousers, beige frock, white shirt, black pants; kids gingham shirt, denim cargo joggers). White backgrounds, no models.
- Sample person and result photos in `backend/test-images/` (person.png, person2.png, shirt_result.png, jeans_result.png, complete_outfit.png, man_complete_outfit.png). Real model outputs from this project.
- No customer testimonials, store address, real prices or partner logos exist. Do not invent them.

## Product Principles
1. The customer is the subject. Their photo and their result get the most space on every screen.
2. Honest previews. Always label AI output as a preview; never promise fit.
3. Nothing lingers. Sessions end with a reset that clears photos; idle devices reset themselves.
4. Shop floor speed. Every step is reachable in one tap, with large targets and short words.
5. Staff stay in control of the catalogue; customers cannot change it.

## Accessibility & Inclusion
WCAG 2.1 AA. Touch targets at least 44px. Every animation has a `prefers-reduced-motion` path. Images carry alt text. Body text ≥4.5:1 contrast.
