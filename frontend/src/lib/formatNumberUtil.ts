/**
 * Shared number formatting utility for Spanish decimal formatting
 * 
 * Spanish format uses comma (,) as decimal separator instead of dot (.)
 * Example: 123.45 → 123,45
 * 
 * Backend stores numbers in standard format (dot decimal)
 * This utility formats numbers for display only
 */

/**
 * Format number with Spanish comma decimal separator
 * @param value Number to format
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted string with comma as decimal separator
 */
export function formatSpanishNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals).replace('.', ',');
}

/**
 * Format currency with Spanish comma decimal separator
 * @param value Amount to format
 * @returns Formatted string like "€12,34"
 */
export function formatSpanishCurrency(value: number): string {
  return `€${formatSpanishNumber(value, 2)}`;
}

/**
 * Parse Spanish formatted number (with comma) to standard number
 * @param value String with comma as decimal separator
 * @returns Parsed number
 */
export function parseSpanishNumber(value: string): number {
  const normalized = value.replace(',', '.');
  return parseFloat(normalized);
}

/**
 * Format number for input field (accepts both comma and dot)
 * @param value Input value
 * @returns Normalized value for display
 */
export function normalizeNumberInput(value: string): string {
  // Allow both comma and dot during input
  return value.replace(/[^\d,.-]/g, '');
}

/**
 * Format currency for receipt display (no € symbol, Spanish comma)
 * @param value Amount to format
 * @returns Formatted string like "12,34"
 */
export function formatReceiptCurrency(value: number): string {
  return formatSpanishNumber(value, 2);
}
