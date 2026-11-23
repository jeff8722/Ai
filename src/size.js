/** Size guide from height, weight and fit. Runs in the browser only: nothing here is sent anywhere. */

// ponytail: girth ≈ reference girth × √((weight/height) ÷ (ref weight/ref height)), a cylinder body calibrated on one
// average-build adult per department. Good to about one size; swap in each brand's own chart if staff need closer.
const REF = {
  men: { h: 175, w: 70, chest: 37.8, waist: 32.3 }, // inches
  women: { h: 160, w: 55, chest: 33.9, waist: 27.6 }
};
const EASE = { snug: -0.5, regular: 0, loose: 2 }; // inches of room; waist sizes ignore it

// [first size's body measurement in inches, labels], every chart steps 2 in per size
const CHART = {
  menTop: [36, ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL']],
  menWaist: [28, ['28', '30', '32', '34', '36', '38', '40', '42', '44']],
  womenTop: [32, ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']],
  womenWaist: [26, ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']],
  blouse: [32, ['32', '34', '36', '38', '40', '42', '44', '46']]
};
// kids clothes are sold by height: up to 98 cm, then every 6 cm
const KIDS = ['2–3 Y', '3–4 Y', '4–5 Y', '5–6 Y', '6–7 Y', '7–8 Y', '8–9 Y', '9–10 Y', '10–11 Y', '11–12 Y', '12–13 Y', '13–14 Y'];

export const FITS = ['snug', 'regular', 'loose'];

export const isSaree = item => /\bsar(ee|i)s?\b/i.test(`${item?.category} ${item?.name}`);

const pick = (inches, [start, labels]) => {
  const i = Math.round((inches - start) / 2);
  return i < 0 ? labels[0] : i >= labels.length ? `${labels.at(-1)}+` : labels[i];
};

/** body: { height (cm), weight (kg), fit }. Returns a label like "M", "Waist 32", "6–7 Y", or null. */
export function recommendSize(item, { height, weight, fit = 'regular' } = {}) {
  if (!item?.tryon_category || !height) return null;
  if (item.department === 'kids') {
    const i = Math.max(0, Math.ceil((height - 98) / 6)) + (fit === 'loose' ? 1 : 0);
    return i < KIDS.length ? KIDS[i] : 'Adult sizes';
  }
  if (!weight) return null;
  const men = item.department === 'men';
  const ref = REF[men ? 'men' : 'women'];
  const k = Math.sqrt(weight / height / (ref.w / ref.h));
  const chest = ref.chest * k + (EASE[fit] ?? 0);
  if (isSaree(item)) return `Free size, blouse ${pick(chest, CHART.blouse)}`;
  if (item.tryon_category === 'bottoms') {
    const waist = ref.waist * k;
    return men ? `Waist ${pick(waist, CHART.menWaist)}` : pick(waist, CHART.womenWaist);
  }
  return pick(chest, men ? CHART.menTop : CHART.womenTop);
}
