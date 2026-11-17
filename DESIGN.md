---
name: VESTIQ
description: In-store virtual fitting room where every garment and every look hangs as a swing tag on red thread.
colors:
  thread: "#d92128"
  men: "#2a46d8"
  women: "#d6307a"
  kids: "#ffc21f"
  foot: "#b78b5a"
  board: "#e2e6ea"
  card: "#ffffff"
  weave: "#161616"
  ink: "#161616"
  ink-2: "#50555b"
  line: "#c3c8ce"
  cord: "#8a9097"
  on-weave: "#f1f3f5"
  on-weave-2: "#aeb3b9"
typography:
  hero:
    fontFamily: "Bricolage Grotesque Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(3.4rem, 13vw, 15rem)"
    fontWeight: 800
    lineHeight: 0.8
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 75"
  display:
    fontFamily: "Bricolage Grotesque Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(2.3rem, 4.4vw, 4.4rem)"
    fontWeight: 800
    lineHeight: 0.88
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 75"
  headline:
    fontFamily: "Bricolage Grotesque Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 800
    lineHeight: 1
    fontVariation: "'wdth' 75"
  title:
    fontFamily: "Bricolage Grotesque Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(1.35rem, 2vw, 1.75rem)"
    fontWeight: 800
    lineHeight: 1.05
    fontVariation: "'wdth' 85"
  lead:
    fontFamily: "Bricolage Grotesque Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(1.05rem, 1.25vw, 1.3rem)"
    fontWeight: 400
    lineHeight: 1.45
  body:
    fontFamily: "Bricolage Grotesque Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Bricolage Grotesque Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "0.92rem"
    fontWeight: 600
    lineHeight: 1.25
  wordmark:
    fontFamily: "Bricolage Grotesque Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "1.65rem"
    fontWeight: 800
    letterSpacing: "0.16em"
    fontVariation: "'wdth' 75"
  barcode:
    fontFamily: "Libre Barcode 39 Text, monospace"
    fontSize: "min(5rem, calc(100cqw * 2.05 / var(--n, 10)))"
    lineHeight: 1
rounded:
  key: "3px"
  chip-sm: "4px"
  control: "6px"
  panel: "8px"
  frame: "10px"
  pill: "999px"
spacing:
  gutter: "clamp(16px, 3vw, 44px)"
  xs: "8px"
  sm: "12px"
  md: "18px"
  lg: "32px"
components:
  button-tag:
    backgroundColor: "{colors.thread}"
    textColor: "{colors.card}"
    typography: "{typography.label}"
    padding: "0 26px 0 50px"
    height: "58px"
  button-tag-hover:
    backgroundColor: "{colors.weave}"
    textColor: "{colors.card}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "50px"
  button-ghost-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card}"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    padding: "0 4px"
    height: "44px"
  button-text-hover:
    textColor: "{colors.thread}"
  button-round:
    backgroundColor: "transparent"
    textColor: "{colors.on-weave}"
    rounded: "{rounded.pill}"
    size: "46px"
  dept-tab:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 18px 0 14px"
    height: "46px"
  category-chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "42px"
  category-chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card}"
  input-field:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 14px"
    height: "50px"
  fascia:
    backgroundColor: "{colors.weave}"
    textColor: "{colors.on-weave}"
    height: "66px"
    padding: "0 {spacing.gutter}"
  swing-tag:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
---

# Design System: VESTIQ

## Overview

**Creative North Star: "The Hang-Tag"**

Every garment, every step and every finished look is a swing tag: die-cut card stock with chamfered top corners, a punched hole with a nickel eyelet, hanging on a red thread from a steel rail over a cool shop-display board. The tags are the content containers; there are no rounded product cards. Chrome is woven label: near-black ribbon with a fine CSS weave and a dashed stitch line sewn just inside its edge. Department is carried by tag stock colour, the way a shop colour-codes its own tickets.

The type is one family, Bricolage Grotesque, pushed to 800 weight at 75% width and set in capitals for everything that announces, and left at normal width for everything that explains. Display sizes are very large and tightly leaded so a single word can fill a tag. Density is low and targets are large: this is a shop-floor kiosk, so controls sit at 44px minimum and most primary ones at 46 to 58px.

Motion is physical. Tags drop in on elastic easing and settle, sway with scroll velocity, swing when the pointer brushes them, and progress is shown as a running stitch. All of it switches off under reduced motion; the static world still reads completely.

**Key Characteristics:**
- Swing tags on red thread as the universal container, hung from a steel rail.
- Woven-black label bands with dashed stitch insets for all chrome.
- Department tag stocks: cobalt men, fuchsia women, sun-yellow kids, kraft footwear.
- One variable grotesque: 800 condensed capitals for display, normal width for text.
- Perforation, tear-off stubs and Code 39 barcodes as functional detail, not decoration.
- Elastic, gravity-driven motion with a full reduced-motion path.

## Colors

A cool, neutral shop board and white card stock, with one red for the thread and four department stocks doing the colour work.

### Primary
- **Red Thread** (thread): the string every chosen tag hangs from, the primary tag button, selected and live states (active size tab, filled hook, "picked" badge, live status dot, before/after handle, toggle on), focus outlines, text selection and caret.

### Secondary (department tag stocks)
- **Cobalt Tag** (men): men's tag stock and colour key; white text on it. Also marks the "compare" look on the session rail.
- **Fuchsia Tag** (women): women's tag stock and colour key; white text on it.
- **Sun-Yellow Tag** (kids): kids' tag stock and colour key; always ink text on it, never white.
- **Kraft Tag** (foot): footwear stock and the fallback for unknown departments; ink text. Also the neutral "not live" status dot.

### Neutral
- **Display Board** (board): the page ground behind everything, and the fill behind hanger images so white product backgrounds multiply away.
- **Tag Stock White** (card): tag and field surfaces.
- **Woven Black** (weave): fascia, footer, privacy band, rack bar, woven labels, notices, toasts, image chips. Always paired with the weave texture when it is a band or label.
- **Ink** (ink): primary text on light stock. Same value as Woven Black, different role.
- **Slate** (ink-2): secondary text on card and board (7.6:1 and 6.1:1), and dashed outlines for drop zones and empty states.
- **Cool Line** (line): field and chip borders, dashed list dividers.
- **Plain Cord** (cord): the string on tags that are not chosen; it turns to Red Thread when chosen.
- **Label White** (on-weave) and **Label Grey** (on-weave-2): primary and secondary text on woven black (secondary at 8:1).

### Named Rules
**The Red Thread Rule.** Red is the thread and only what the thread means: hanging, chosen, live, or the one primary action. It is never a section fill, a heading colour or a decorative accent.

**The Stock Means Department Rule.** Cobalt, fuchsia, yellow and kraft each belong to one department. Use them for tag stock, the department colour key and the item dot; do not reuse them as status or warning colours.

**The Cord Turns Red Rule.** A tag's string is Plain Cord until the item is chosen; choosing it turns the string Red Thread. Selection is shown on the thread first.

## Typography

**Display Font:** Bricolage Grotesque Variable (with Segoe UI, system-ui), self-hosted, wght 200-800, wdth 75-100
**Body Font:** Bricolage Grotesque Variable, same family
**Label/Mono Font:** Libre Barcode 39 Text, used only to render real product codes as scannable barcodes

**Character:** One grotesque in two postures: condensed, heavy capitals that stand up like ticket print, and an open, friendly text cut for instructions. The barcode face is functional, not a style.

### Hierarchy
- **Hero** (800, wdth 75, uppercase, hero scale, 0.8): one word per tag in the welcome hero. Only on hanging tags.
- **Display** (800, wdth 75, uppercase, display scale, 0.88, balanced wrap): every screen and section heading. The privacy band and closing statement push it larger (up to 8.6rem and 7rem).
- **Headline** (800, wdth 75, uppercase, 1.6rem): sub-section heads such as kept looks, staff list, empty state; 1.25 to 1.35rem for hook labels and woven labels.
- **Title** (800, wdth 85, title scale, 1.05): tag titles in the how-it-works steps; step numerals use the same posture at 4 to 6rem.
- **Lead** (400, lead scale, 1.45, 40 to 52ch): the one-line promise under a heading.
- **Body** (400, 1rem, 1.5, up to 46ch on tags): instructions and tag copy. Fine print at 0.9rem in Slate.
- **Label** (600 to 700, 0.82 to 0.92rem): buttons, chips, tabs, status, captions, stub text. Numbers in counts and prices use tabular figures.
- **Wordmark** (800, wdth 75, uppercase, 1.65rem, 0.16em tracking): VESTIQ in the fascia only; the only tracked-out type in the system.

### Named Rules
**The Two Postures Rule.** Condensed 800 capitals announce; normal-width text explains. Never set a paragraph condensed, and never set a heading at normal width.

**The Real Code Rule.** The barcode face only ever renders a real product code, sized by container query so the bars fill the stub.

## Layout

Full-bleed sections with a fluid gutter (spacing.gutter) on both sides; no centred max-width container. The welcome screen is a two-column grid (about 1.9fr hero tags, 1fr window rack) under a full-width steel rail; it collapses to one column at 900px, with the rack becoming a single rail of hangers below the copy. Flow screens pair a large subject area (camera lens, before/after, result) with a narrower tag column (roughly 1.15:0.85 or 1.35:0.85) and stack at 900px. The product rack is an auto-fill grid of 190px-minimum tag columns with generous row gaps (48px) so strings have room; two columns under 700px. The rack bar is sticky at the bottom; the fascia is sticky at the top and hides its size tabs under 700px.

Rhythm is loose and vertical: sections breathe with viewport-relative padding (clamp up to 150 to 180px on welcome bands), tag internals use 10 to 22px gaps, control groups 8 to 14px.

## Elevation & Depth

Depth is physical, not interface elevation. Hanging tags carry a soft two-layer drop shadow cast on the board, as if a hand-length off it; the steel rail has a cast shadow and a top-lit gradient; the eyelet has a tiny contact shadow. Everything else (fields, chips, tabs, bands) is flat. The only conventional shadow is the toast, which floats over content.

### Shadow Vocabulary
- **Tag hang** (`filter: drop-shadow(0 14px 16px rgb(22 22 22 / 0.15)) drop-shadow(0 2px 3px rgb(22 22 22 / 0.12))`): on every swinging tag, applied as a filter so it follows the chamfer and the punched hole.
- **Rail** (`box-shadow: 0 3px 6px rgb(0 0 0 / 0.18)` over `linear-gradient(#d5d9de, #868c93)`): steel rails tags and hangers hang from.
- **Toast** (`box-shadow: 0 14px 30px rgb(0 0 0 / 0.25)`): transient messages only.

### Named Rules
**The Only Hanging Things Cast Shadows Rule.** A surface casts a shadow because it hangs off the board. Flat controls and bands never get one.

## Shapes

The silhouette is the die-cut tag: a rectangle with both top corners chamfered at 22px (clip-path), a 7px punched hole masked out 22px from the top, and a conic nickel eyelet ringing it. Horizontal tags (the primary button, staff stock rows) point left with an 18px or 16px point and a hole near the point. Perforation is cut as 8 to 9px half-circle notches on both edges with a 3px dotted rule between card and stub. Woven bands carry a 1.5px dashed stitch inset 5 to 14px from the edge. Interface controls use small radii (6px), panels 8px, image frames 10px, category chips are full pills, and colour keys are 3px-rounded squares.

## Components

### Buttons
Tactile and literal: the main action is a tag you pull.
- **Shape:** left-pointing tag with an 18px point and a punched 6px hole ringed in translucent white; no radius.
- **Primary (tag button):** Red Thread with white 700 label, 58px tall, extra left padding for the hole. Label is a letter-swap (two stacked rows, each letter rolling 110% on a 14ms stagger). Pulled toward the pointer on fine pointers (magnetic, about 0.22x/0.3y of offset).
- **Hover / Focus:** a Woven Black flood wipes in from the left (scaleX, 0.4s); on the rack bar the flood is white and the label turns ink. Focus draws a dashed white inset outline. Disabled is cool grey.
- **Ghost:** 1.5px ink border, 6px radius, 50px; fills ink with white text on hover and when pressed.
- **Text:** Slate, underlined at 4px offset, turns Red Thread on hover; Label Grey on woven black.
- **Round:** 46px circle on woven black with a translucent white ring (carousel and close controls).

### Chips
- **Department tabs:** white with Cool Line border, 6px radius, 46px, led by a 12px colour-key square in the department stock. Selected fills with the stock and flips text to its on-stock colour.
- **Category chips:** transparent pills with Cool Line border, 42px; selected fills ink.
- **Mode switch:** two buttons inside an ink-bordered 8px tray; pressed fills ink.

### Cards / Containers
- **Corner Style:** chamfered tag silhouette, not rounded cards.
- **Background:** Tag Stock White, a department stock, or Woven Black with weave texture.
- **Shadow Strategy:** Tag hang (see Elevation).
- **Internal Padding:** top padding always clears the hole (about 38 to 56px), sides 16 to 44px fluid.

### Inputs / Fields
- **Style:** white, 1.5px Cool Line border, 6px radius, 50px minimum, 600 label above.
- **Focus:** border turns ink plus a 2px Red Thread outline.
- **Drop zone:** 2px dashed Slate, 8px radius; border turns red on hover.
- **Check:** dashed Slate box around a 26px checkbox with Red Thread accent.

### Navigation
- **Fascia:** sticky 66px woven label across the top with a dashed stitch inset; condensed wordmark left; size-tab step indicator centre; status and fascia buttons right.
- **Size tabs:** each step is a numbered 24px square tab in Label Grey; the current step goes white with a Red Thread square, and a 3px red underline slides between steps.
- **Footer and rack bar:** woven black bands; the rack bar is sticky at the bottom and holds the primary action.

### Hanging Tag (signature)
String (2px, Red Thread or Plain Cord, length set per placement), chamfered tag with masked hole and nickel eyelet, rotating from the top centre. Tones come from the department stock map; text colour follows the stock.

### Perforated Stub and Barcode
The product tag ends in a 50px price stub below a perforation; the result tag tears off a stub with a dotted rule and notched corners, holding the real product code as a Code 39 barcode so staff can scan it.

### Woven Label
Full-bleed woven-black header strip on a tag (staff "New product tag"), condensed capitals, dashed stitch inset; the same treatment forms notices and the privacy band.

### Staff Price-Tag Rows
Each stock row is a horizontal tag: department-stock stub on the left with a nickel-ringed hole, white body with thumbnail, name and meta, and a remove button that arms to red before confirming.

### Before/After Slider
10px-radius white frame; the before image clips from the left to a 3px Red Thread handle with a pill grip; woven "before" and red "after" chips in the corners. Revealed on arrival by a top-down clip-path unveil.

### Motion grammar
Elastic drops for tags entering (elastic.out, about 1.5 to 1.7s, staggered); scroll-velocity sway clamped to 6 degrees on every swinging tag, plus a 5 degree swing on pointer contact; masked per-character rises for headings (expo.out, 14 to 16ms stagger); scroll-scrubbed rail draw and step drops; a pinned horizontal rail on welcome; privacy-band words lighting from 16% to full opacity on scroll; running-stitch progress and a stitch line sweeping the photo while processing. Lenis smooth scroll drives it. Every effect is skipped under prefers-reduced-motion and CSS durations collapse to near zero.

## Do's and Don'ts

### Do:
- **Do** hang content on tags: chamfered 22px top corners, punched hole, eyelet, string from a rail.
- **Do** keep Red Thread for strings, chosen and live states, focus and the single primary action per screen.
- **Do** colour by department stock (men cobalt, women fuchsia, kids yellow with ink text, footwear kraft).
- **Do** put chrome on woven black with the weave texture and a dashed stitch inset.
- **Do** set announcements in Bricolage 800 at 75% width in capitals, and explanations at normal width.
- **Do** keep touch targets at 44px or more and give every motion a reduced-motion path.

### Don't:
- **Don't** use white rounded product cards in a grid under a model-photo hero; that is the category default this world replaces.
- **Don't** use department stock colours as warning or status colours.
- **Don't** add shadows to flat controls or bands; only hanging things cast shadows.
- **Don't** render placeholder or invented codes in the barcode face.
