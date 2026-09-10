/**
 * Money is always integer minor units (cents) internally. Never use floats for
 * arithmetic - convert at the display boundary only.
 */

export type Money = {
  amountCents: number;
  currency: string;
};

const DISPLAY_LOCALE = "en-US";

export function formatMoney(
  amountCents: number,
  currency = "usd",
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(DISPLAY_LOCALE, {
    style: "currency",
    currency: currency.toUpperCase(),
    ...options,
  }).format(amountCents / 100);
}

/** Compact form for chart axes / KPI tiles: $12.3k, $1.2M. */
export function formatMoneyCompact(amountCents: number, currency = "usd"): string {
  return new Intl.NumberFormat(DISPLAY_LOCALE, {
    style: "currency",
    currency: currency.toUpperCase(),
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amountCents / 100);
}

export function formatNumberCompact(value: number): string {
  return new Intl.NumberFormat(DISPLAY_LOCALE, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(ratio: number, fractionDigits = 1): string {
  return new Intl.NumberFormat(DISPLAY_LOCALE, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(ratio);
}

/** Parse a user-entered price string ("19.99", "$19.99") into cents. */
export function parsePriceToCents(input: string): number {
  const normalized = input.replace(/[^0-9.]/g, "");
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

export function sumCents(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Normalise anything Prisma might hand back for a money-ish column to a number. */
export function toCents(value: number | bigint | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "bigint" ? Number(value) : value;
}
