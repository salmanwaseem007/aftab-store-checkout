import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  barcode: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  isCustom: boolean;
  // Enhanced fields for historical accuracy
  basePrice?: number;
  iva?: number;
  profitMargin?: number;
  categoryName?: string;
  // Stock tracking
  stock?: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (barcode: string) => void;
  updateQuantity: (barcode: string, quantity: number) => void;
  updatePrice: (barcode: string, price: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getSubtotal: () => number;
  getIVABreakdown: () => { rate: number; amount: number }[];
}

// BigInt-safe serialization
const bigIntReplacer = (_key: string, value: any) => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
};

const bigIntReviver = (_key: string, value: any) => {
  if (typeof value === 'string' && /^\d+n$/.test(value)) {
    return BigInt(value.slice(0, -1));
  }
  return value;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        console.log('[Cart] Adding item to cart:', {
          barcode: item.barcode,
          name: item.name,
          iva: item.iva,
          basePrice: item.basePrice,
          profitMargin: item.profitMargin,
          unitPrice: item.unitPrice,
          isCustom: item.isCustom,
        });

        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.barcode === item.barcode
          );

          if (existingIndex >= 0) {
            // Update quantity if item exists, preserve enhanced fields
            const newItems = [...state.items];
            const existingItem = newItems[existingIndex];
            newItems[existingIndex] = {
              ...existingItem,
              quantity: existingItem.quantity + item.quantity,
              // Update enhanced fields if provided
              basePrice: item.basePrice !== undefined ? item.basePrice : existingItem.basePrice,
              iva: item.iva !== undefined ? item.iva : existingItem.iva,
              profitMargin: item.profitMargin !== undefined ? item.profitMargin : existingItem.profitMargin,
              categoryName: item.categoryName || existingItem.categoryName,
            };
            
            console.log('[Cart] Updated existing item:', {
              barcode: newItems[existingIndex].barcode,
              iva: newItems[existingIndex].iva,
              quantity: newItems[existingIndex].quantity,
            });
            
            return { items: newItems };
          } else {
            // Add new item at the beginning (most recent first)
            console.log('[Cart] Added new item to cart');
            return { items: [item, ...state.items] };
          }
        });
      },

      removeItem: (barcode) => {
        console.log('[Cart] Removing item from cart:', barcode);
        set((state) => ({
          items: state.items.filter((item) => item.barcode !== barcode),
        }));
      },

      updateQuantity: (barcode, quantity) => {
        console.log('[Cart] Updating quantity:', { barcode, quantity });
        set((state) => ({
          items: state.items.map((item) =>
            item.barcode === barcode ? { ...item, quantity } : item
          ),
        }));
      },

      updatePrice: (barcode, price) => {
        console.log('[Cart] Updating price:', { barcode, price });
        set((state) => ({
          items: state.items.map((item) =>
            item.barcode === barcode ? { ...item, unitPrice: price } : item
          ),
        }));
      },

      clearCart: () => {
        console.log('[Cart] Clearing cart');
        set({ items: [] });
      },

      getTotal: () => {
        const state = get();
        return state.items.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0
        );
      },

      getSubtotal: () => {
        return get().getTotal();
      },

      getIVABreakdown: () => {
        const state = get();
        const breakdown = new Map<number, number>();

        state.items.forEach((item) => {
          if (item.basePrice !== undefined && item.iva !== undefined && item.profitMargin !== undefined) {
            // Calculate IVA using stored values
            const profitAmount = item.basePrice * (item.profitMargin / 100);
            const priceBeforeIva = item.basePrice + profitAmount;
            const ivaAmount = priceBeforeIva * (item.iva / 100);
            const totalIva = ivaAmount * item.quantity;

            const current = breakdown.get(item.iva) || 0;
            breakdown.set(item.iva, current + totalIva);
          }
        });

        return Array.from(breakdown.entries())
          .map(([rate, amount]) => ({ rate, amount }))
          .sort((a, b) => a.rate - b.rate);
      },
    }),
    {
      name: 'aftab-cart-storage',
      storage: {
        getItem: (name) => {
          try {
            const str = localStorage.getItem(name);
            if (!str) return null;
            return JSON.parse(str, bigIntReviver);
          } catch (error) {
            console.error('Error loading cart from storage:', error);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value, bigIntReplacer));
          } catch (error) {
            console.error('Error saving cart to storage:', error);
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch (error) {
            console.error('Error removing cart from storage:', error);
          }
        },
      },
    }
  )
);
