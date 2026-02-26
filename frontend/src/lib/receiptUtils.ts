import type { ReceiptData } from '../stores/useReceiptStore';
import { formatReceiptCurrency } from './formatNumberUtil';

/**
 * Format currency with Spanish comma decimal separator for receipts (no € symbol)
 */
export function formatCurrency(amount: number): string {
  return formatReceiptCurrency(amount);
}

/**
 * Format date and time in Spanish uppercase format
 */
export function formatDateSpanish(timestamp: bigint): { date: string; time: string } {
  const date = new Date(Number(timestamp) / 1000000); // Convert nanoseconds to milliseconds
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return {
    date: `${day}/${month}/${year}`.toUpperCase(),
    time: `${hours}:${minutes}`.toUpperCase(),
  };
}

/**
 * Validate receipt data completeness
 */
export function validateReceiptData(receipt: ReceiptData | null): boolean {
  if (!receipt) return false;
  if (receipt.receiptType === 'order' && !receipt.orderNumber) return false;
  if (receipt.receiptType === 'return' && !receipt.returnNumber) return false;
  if (!receipt.items || receipt.items.length === 0) return false;
  if (typeof receipt.total !== 'number') return false;
  return true;
}
