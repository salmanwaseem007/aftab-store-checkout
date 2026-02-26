import { calculateSalePrice } from '../lib/calculateSalePriceUtil';
import type { TaxBreakdown } from '../backend';

interface CartItem {
  barcode: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  isCustom: boolean;
  stock?: number;
  basePrice?: number;
  iva?: number;
  profitMargin?: number;
  categoryName?: string;
}

export function calculateTaxBreakdown(items: CartItem[]): TaxBreakdown[] {
  const breakdown = new Map<number, { baseAmount: number; taxAmount: number; taxableAmount: number }>();

  console.log('[TaxCalculations] Calculating tax breakdown for items:', items.map(item => ({
    name: item.name,
    iva: item.iva,
    basePrice: item.basePrice,
    profitMargin: item.profitMargin,
    isCustom: item.isCustom,
  })));

  items.forEach((item) => {
    let ivaRate: number;
    let basePrice: number;
    let profitMargin: number;

    // Use stored IVA values from cart items
    if (item.basePrice !== undefined && item.iva !== undefined && item.profitMargin !== undefined) {
      ivaRate = item.iva;
      basePrice = item.basePrice;
      profitMargin = item.profitMargin;
      
      console.log('[TaxCalculations] Using stored values for item:', {
        name: item.name,
        ivaRate,
        basePrice,
        profitMargin,
      });
    } else {
      // Fallback for items without stored values (should not happen in normal flow)
      ivaRate = item.iva || 21;
      profitMargin = item.profitMargin || 30;
      basePrice = item.unitPrice / ((1 + profitMargin / 100) * (1 + ivaRate / 100));
      
      console.warn('[TaxCalculations] Missing stored values for item, using fallback:', {
        name: item.name,
        ivaRate,
        basePrice,
        profitMargin,
      });
    }

    const priceCalc = calculateSalePrice(basePrice, ivaRate, profitMargin);
    
    const totalBase = priceCalc.priceBeforeIva * item.quantity;
    const totalIva = priceCalc.ivaAmount * item.quantity;
    const totalTaxable = priceCalc.salePrice * item.quantity;

    console.log('[TaxCalculations] Item calculation:', {
      name: item.name,
      ivaRate,
      quantity: item.quantity,
      priceBeforeIva: priceCalc.priceBeforeIva,
      ivaAmount: priceCalc.ivaAmount,
      totalBase,
      totalIva,
      totalTaxable,
    });

    const current = breakdown.get(ivaRate) || { baseAmount: 0, taxAmount: 0, taxableAmount: 0 };
    breakdown.set(ivaRate, {
      baseAmount: current.baseAmount + totalBase,
      taxAmount: current.taxAmount + totalIva,
      taxableAmount: current.taxableAmount + totalTaxable,
    });
  });

  const result = Array.from(breakdown.entries())
    .map(([rate, data]) => ({
      ivaRate: BigInt(rate),
      baseAmount: data.baseAmount,
      taxAmount: data.taxAmount,
      taxableAmount: data.taxableAmount,
    }))
    .sort((a, b) => Number(a.ivaRate) - Number(b.ivaRate));

  console.log('[TaxCalculations] Final tax breakdown:', result.map(tb => ({
    ivaRate: tb.ivaRate.toString(),
    baseAmount: tb.baseAmount,
    taxAmount: tb.taxAmount,
  })));

  return result;
}
