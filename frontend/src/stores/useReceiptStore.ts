import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ReceiptData {
  receiptType: 'order' | 'return';
  orderNumber?: string;
  returnNumber?: string;
  originalOrderNumber?: string;
  createdDate: bigint;
  items: Array<{
    quantity: number;
    description: string;
    unitPrice: number;
    total: number;
  }>;
  ivaBreakdown: Array<{
    rate: number;
    baseImponible: number;
    cuota: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod?: any;
  customerNotes?: string;
  returnReason?: string;
  invoiceType?: string;
  customerName?: string;
  customerTaxId?: string;
}

interface ReceiptStore {
  currentReceipt: ReceiptData | null;
  setCurrentReceipt: (receipt: ReceiptData | null) => void;
  clearReceipt: () => void;
}

// Custom serializer for BigInt
const bigIntSerializer = {
  serialize: (state: any) => {
    return JSON.stringify(state, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );
  },
  deserialize: (str: string) => {
    return JSON.parse(str, (key, value) => {
      if (key === 'createdDate' && typeof value === 'string') {
        try {
          return BigInt(value);
        } catch {
          return value;
        }
      }
      return value;
    });
  },
};

export const useReceiptStore = create<ReceiptStore>()(
  persist(
    (set) => ({
      currentReceipt: null,
      setCurrentReceipt: (receipt) => set({ currentReceipt: receipt }),
      clearReceipt: () => set({ currentReceipt: null }),
    }),
    {
      name: 'receipt-storage',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          try {
            return bigIntSerializer.deserialize(str);
          } catch (error) {
            console.error('Error deserializing receipt:', error);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            const str = bigIntSerializer.serialize(value);
            localStorage.setItem(name, str);
          } catch (error) {
            console.error('Error serializing receipt:', error);
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
