/**
 * Parse a `YYYY-MM-DD` string (from an `<input type="date">`) as local midnight.
 * `new Date('YYYY-MM-DD')` parses as UTC per spec, which rolls back a day in any
 * timezone behind UTC — this constructs the Date from local components instead.
 */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
