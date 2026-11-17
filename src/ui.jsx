import React, { useEffect, useMemo } from 'react';

export const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const imageUrl = value => (value?.startsWith('/') ? `${API}${value}` : value);

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
/** Placeholder prices are stored as 0; never show "₹0" to a shopper. */
export const priceLabel = n => (Number(n) > 0 ? inr.format(Number(n)) : 'Ask staff for price');

export const TYPE_LABEL = { tops: 'Top', bottoms: 'Bottoms', 'one-pieces': 'Full length' };

/** Department → tag stock colour. Unknown departments fall back to kraft. */
export const tone = department => (['men', 'women', 'kids'].includes(department) ? department : 'foot');

export function useObjectUrl(file) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);
  return url;
}

/** Letter-swap label: two stacked copies, each letter rolls on its own delay (from the CWC site). */
export const Swap = ({ text }) => {
  const row = hidden => (
    <span className="swap-row" aria-hidden={hidden || undefined}>
      {[...text].map((c, i) => (
        <span key={i} style={{ '--i': i }}>{c === ' ' ? ' ' : c}</span>
      ))}
    </span>
  );
  return <span className="swap">{row(false)}{row(true)}</span>;
};

/** The primary control: a small die-cut swing tag with a punched hole. */
export const TagButton = ({ label, icon, className = '', ...props }) => (
  <button className={`tag-btn ${className}`} data-magnetic {...props}>
    <span className="tag-btn-hole" aria-hidden="true" />
    <Swap text={label} />
    {icon}
  </button>
);

/** Code 39 barcode of a product code, set in a barcode font so a store scanner can read it. */
export const Barcode = ({ code }) => {
  const text = `*${String(code).toUpperCase().replace(/[^0-9A-Z.\- $/+%]/g, '')}*`;
  // --n lets CSS size the bars to fill the stub's width whatever the code length
  return <span className="barcode" role="img" aria-label={`Product code ${code}`} style={{ '--n': text.length }}>{text}</span>;
};

/** A garment on a hanger, white product background dropped out against the board. */
export const Hanger = ({ src, alt }) => (
  <figure className="hanger">
    <svg className="hanger-wire" viewBox="0 0 120 40" aria-hidden="true">
      <path d="M60 14V9a5 5 0 1 0-5-5M60 14 8 36h104L60 14" />
    </svg>
    <img src={src} alt={alt} loading="lazy" decoding="async" />
  </figure>
);
