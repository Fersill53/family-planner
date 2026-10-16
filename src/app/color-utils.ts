/** Curated palette family members pick from to color-code their tasks/events. */
export const MEMBER_COLORS: string[] = [
  '#f2915f', // terracotta
  '#7bb6a1', // sage green
  '#6a9fd8', // soft blue
  '#c58fd1', // orchid
  '#e0b04a', // gold
  '#5fb8b0', // teal
  '#d97a94', // rose
  '#8fae5f', // moss
];

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** White or the app's dark ink, whichever is more readable on the given background color. */
export function textOn(bg: string): string {
  const L = luminance(bg);
  const ink = '#4a4038';
  return 1.05 / (L + 0.05) >= (L + 0.05) / (luminance(ink) + 0.05) ? '#ffffff' : ink;
}

/** Deterministic default so a new member gets a color before ever visiting the profile page. */
export function defaultColorFor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  return MEMBER_COLORS[hash % MEMBER_COLORS.length];
}
