/**
 * Shared price calculation utility for consistent pricing across Products and Orders pages
 * 
 * COMMON SALE PRICE FORMULA (matches backend with intermediate rounding):
 * 1. profitAmount = round(basePrice × (profitMargin / 100))
 * 2. priceBeforeIva = round(basePrice + profitAmount)
 * 3. ivaAmount = round(priceBeforeIva × (iva / 100))
 * 4. salePrice = round(priceBeforeIva + ivaAmount)
 * 
 * All intermediate steps are rounded to 2 decimal places using Math.round(value * 100) / 100
 */

import { formatSpanishCurrency } from './formatNumberUtil';

export interface PriceCalculation {
  basePrice: number;
  profitAmount: number;
  priceBeforeIva: number;
  ivaAmount: number;
  salePrice: number;
}

/**
 * Round to two decimal places using JavaScript's Math.round
 * This matches the backend's roundToTwo function
 */
function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate sale price from base price, IVA, and profit margin
 * This formula MUST match the backend calculateSalePrice function
 * All intermediate steps are rounded to 2 decimal places
 */
export function calculateSalePrice(
  basePrice: number,
  iva: number,
  profitMargin: number
): PriceCalculation {
  // Step 1: Calculate profit amount and round
  const profitAmount = roundToTwo(basePrice * (profitMargin / 100));
  
  // Step 2: Calculate price before IVA (base + profit) and round
  const priceBeforeIva = roundToTwo(basePrice + profitAmount);
  
  // Step 3: Calculate IVA amount (applied to price before IVA) and round
  const ivaAmount = roundToTwo(priceBeforeIva * (iva / 100));
  
  // Step 4: Calculate final sale price and round
  const salePrice = roundToTwo(priceBeforeIva + ivaAmount);

  return {
    basePrice,
    profitAmount,
    priceBeforeIva,
    ivaAmount,
    salePrice,
  };
}

/**
 * Format price with Spanish comma decimal separator (€XX,XX)
 */
export function formatPrice(price: number): string {
  return formatSpanishCurrency(price);
}

/**
 * Calculate only the final sale price (shorthand)
 */
export function calculateFinalPrice(
  basePrice: number,
  iva: number,
  profitMargin: number
): number {
  return calculateSalePrice(basePrice, iva, profitMargin).salePrice;
}

/**
 * Validate that frontend and backend sale prices match
 * Allows up to 0.005 tolerance for floating point differences
 */
export function validateBackendFrontendMatch(
  basePrice: number,
  iva: number,
  profitMargin: number,
  backendSalePrice: number
): boolean {
  const frontendResult = calculateSalePrice(basePrice, iva, profitMargin);
  const difference = Math.abs(frontendResult.salePrice - backendSalePrice);
  const tolerance = 0.005; // Allow 0.005 difference

  if (difference > tolerance) {
    console.warn(
      '⚠️ PRICE MISMATCH DETECTED:',
      '\nFrontend calculated:', frontendResult.salePrice.toFixed(2),
      '\nBackend returned:', backendSalePrice.toFixed(2),
      '\nDifference:', difference.toFixed(4),
      '\nInputs:', { basePrice, iva, profitMargin }
    );
    return false;
  }

  return true;
}
