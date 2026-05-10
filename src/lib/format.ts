/**
 * Date / number / unit formatting helpers. Per ADR-017, all timestamps are
 * stored as UTC in the DB and rendered in the *viewer's* local timezone.
 * Don't inline date logic in components — call these instead.
 */

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const longDayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function formatLocalDay(value: Date | string | null): string {
  if (value == null) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return dayFormatter.format(d);
}

export function formatLongDay(value: Date | string | null): string {
  if (value == null) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return longDayFormatter.format(d);
}

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return numberFormatter.format(value);
}

/**
 * Convert Drizzle's `numeric` column return (string) to a number. Returns
 * null for null/undefined/empty/NaN inputs.
 */
export function numericToNumber(
  v: string | number | null | undefined,
): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isNaN(n) ? null : n;
}
