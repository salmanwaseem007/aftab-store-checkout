import { useState, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useCartStore } from '../../stores/useCartStore';
import { useToastStore } from '../../stores/useToastStore';
import { calculateSalePrice, formatPrice } from '../../lib/calculateSalePriceUtil';
import type { Category } from '../../backend';

interface CustomProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function CustomProductModal({ open, onOpenChange, categories, searchInputRef }: CustomProductModalProps) {
  const { addItem } = useCartStore();
  const { showSuccess, showError } = useToastStore();

  const [customName, setCustomName] = useState('');
  const [customCategoryId, setCustomCategoryId] = useState('');
  const [customBasePrice, setCustomBasePrice] = useState('');
  const [customIVA, setCustomIVA] = useState('21');
  const [customProfitMargin, setCustomProfitMargin] = useState('30');

  // Track previous open state to detect close events
  const prevOpenRef = useRef(open);

  // Auto-select category with highest order when modal opens
  useEffect(() => {
    if (open && categories && categories.length > 0) {
      // Find category with maximum order value
      const categoryWithMaxOrder = categories.reduce((maxCat, currentCat) => {
        const maxOrder = Number(maxCat.order);
        const currentOrder = Number(currentCat.order);
        return currentOrder > maxOrder ? currentCat : maxCat;
      }, categories[0]);

      // Set the category with highest order as default
      const categoryIdStr = categoryWithMaxOrder.id.toString();
      setCustomCategoryId(categoryIdStr);
      setCustomIVA(categoryWithMaxOrder.defaultIVA.toString());
      setCustomProfitMargin(categoryWithMaxOrder.defaultProfitMargin.toString());

      console.log('[CustomProductModal] Auto-selected category with highest order:', {
        categoryId: categoryIdStr,
        categoryName: categoryWithMaxOrder.name,
        order: categoryWithMaxOrder.order.toString(),
        defaultIVA: categoryWithMaxOrder.defaultIVA.toString(),
        defaultProfitMargin: categoryWithMaxOrder.defaultProfitMargin.toString(),
      });
    }
  }, [open, categories]);

  const selectedCategory = useMemo(() => {
    return categories?.find((c) => c.id.toString() === customCategoryId);
  }, [categories, customCategoryId]);

  const calculatedCustomSalePrice = useMemo(() => {
    const basePrice = parseFloat(customBasePrice);
    const iva = Number(customIVA);
    const profitMargin = Number(customProfitMargin);
    if (isNaN(basePrice) || basePrice <= 0) return 0;
    return calculateSalePrice(basePrice, iva, profitMargin).salePrice;
  }, [customBasePrice, customIVA, customProfitMargin]);

  // Detect modal close and restore focus to search input
  useEffect(() => {
    // Check if modal just closed (was open, now closed)
    if (prevOpenRef.current && !open) {
      // Modal has closed - restore focus to search input
      const timer = setTimeout(() => {
        if (searchInputRef?.current && !searchInputRef.current.disabled) {
          searchInputRef.current.focus();
        }
      }, 100);

      return () => clearTimeout(timer);
    }

    // Update previous open state
    prevOpenRef.current = open;
  }, [open, searchInputRef]);

  const handleCategoryChange = (categoryId: string) => {
    setCustomCategoryId(categoryId);
    const category = categories?.find((c) => c.id.toString() === categoryId);
    if (category) {
      setCustomIVA(category.defaultIVA.toString());
      setCustomProfitMargin(category.defaultProfitMargin.toString());
      console.log('[CustomProductModal] Category selected:', {
        categoryId,
        categoryName: category.name,
        defaultIVA: category.defaultIVA.toString(),
        defaultProfitMargin: category.defaultProfitMargin.toString(),
      });
    }
  };

  const handleAddCustomProduct = () => {
    if (!customName.trim()) {
      showError('El nombre del producto es obligatorio');
      return;
    }
    if (!customCategoryId) {
      showError('Selecciona una categoría');
      return;
    }

    const basePrice = parseFloat(customBasePrice);
    const iva = Number(customIVA);
    const profitMargin = Number(customProfitMargin);

    if (isNaN(basePrice) || basePrice <= 0) {
      showError('El precio base debe ser mayor a 0');
      return;
    }
    if (profitMargin < 0 || profitMargin > 10000) {
      showError('El margen debe estar entre 0 y 10000');
      return;
    }

    const category = categories?.find((c) => c.id.toString() === customCategoryId);
    const salePrice = calculateSalePrice(basePrice, iva, profitMargin).salePrice;

    const customBarcode = `custom-${Date.now()}`;

    console.log('[CustomProductModal] Adding custom product:', {
      barcode: customBarcode,
      name: customName.trim(),
      categoryName: category?.name,
      iva,
      basePrice,
      profitMargin,
      calculatedSalePrice: salePrice,
    });

    addItem({
      barcode: customBarcode,
      name: customName.trim(),
      category: category?.name || 'Sin categoría',
      quantity: 1,
      unitPrice: salePrice,
      isCustom: true,
      basePrice,
      iva,
      profitMargin,
      stock: 0,
    });

    showSuccess('Producto personalizado añadido al carrito');
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setCustomName('');
    setCustomCategoryId('');
    setCustomBasePrice('');
    setCustomIVA('21');
    setCustomProfitMargin('30');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Producto Personalizado</DialogTitle>
          <DialogDescription>
            Crea un producto personalizado para añadir al carrito
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="custom-name">Nombre del Producto *</Label>
            <Input
              id="custom-name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Ej: Producto especial"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-category">Categoría *</Label>
            <Select value={customCategoryId} onValueChange={handleCategoryChange}>
              <SelectTrigger id="custom-category">
                <SelectValue placeholder={categories && categories.length > 0 ? "Seleccionar categoría" : "No hay categorías disponibles"} />
              </SelectTrigger>
              <SelectContent className="max-h-[400px]">
                {categories && categories.length > 0 ? (
                  categories.map((category) => (
                    <SelectItem key={category.id.toString()} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-categories" disabled>
                    No hay categorías disponibles
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="custom-base-price">Precio Base *</Label>
              <Input
                id="custom-base-price"
                type="number"
                step="0.01"
                min="0"
                value={customBasePrice}
                onChange={(e) => setCustomBasePrice(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-iva">IVA (%)</Label>
              <Select value={customIVA} onValueChange={setCustomIVA}>
                <SelectTrigger id="custom-iva">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="4">4%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="21">21%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-profit">Margen (%)</Label>
              <Input
                id="custom-profit"
                type="number"
                min="0"
                max="10000"
                value={customProfitMargin}
                onChange={(e) => setCustomProfitMargin(e.target.value)}
                placeholder="0-10000"
              />
            </div>
          </div>

          {selectedCategory && (
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <div className="text-sm">
                <span className="text-muted-foreground">Categoría seleccionada:</span>{' '}
                <span className="font-medium">{selectedCategory.name}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">IVA por defecto:</span>{' '}
                <span className="font-medium">{selectedCategory.defaultIVA}%</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Margen por defecto:</span>{' '}
                <span className="font-medium">{selectedCategory.defaultProfitMargin}%</span>
              </div>
            </div>
          )}

          {calculatedCustomSalePrice > 0 && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <div className="text-sm text-muted-foreground">Precio de Venta Calculado:</div>
              <div className="text-2xl font-bold font-mono">{formatPrice(calculatedCustomSalePrice)}</div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAddCustomProduct}>
            Añadir al Carrito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

