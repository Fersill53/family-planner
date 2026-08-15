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

/** Deterministic default so a new member gets a color before ever visiting the profile page. */
export function defaultColorFor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  return MEMBER_COLORS[hash % MEMBER_COLORS.length];
}
