import { useState, useEffect, useRef, memo } from 'react';
import { Search, Plus, Minus, Trash2, Copy, Loader2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { useSearchProductsForCheckout, useCreateOrder } from '../../hooks/useQueries';
import { useCartStore } from '../../stores/useCartStore';
import { useToastStore } from '../../stores/useToastStore';
import { calculateSalePrice, formatPrice } from '../../lib/calculateSalePriceUtil';
import { parseSpanishNumber } from '../../lib/formatNumberUtil';
import { printReceipt as printReceiptService, PrintStatus } from '../../lib/printService';
import CustomProductModal from '../../components/orders/CustomProductModal';
import { calculateTaxBreakdown } from '../../utils/taxCalculations';
import { playBeep } from '../../utils/audioUtils';
import type { ProductSearchResult, OrderItem, StoreDetails, Category } from '../../backend';

interface VentasTabProps {
  storeDetails?: StoreDetails;
  categories?: Category[];
  isStoreDetailsLoading?: boolean;
  isCategoriesLoading?: boolean;
}

const VentasTab = memo(function VentasTab({
  storeDetails,
  categories,
  isStoreDetailsLoading,
  isCategoriesLoading,
}: VentasTabProps) {
  const { showSuccess, showError, showWarning } = useToastStore();
  const createOrder = useCreateOrder();

  // Cart state
  const { items, addItem, removeItem, updateQuantity, updatePrice, clearCart, getTotal } = useCartStore();

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'normal' | 'barcode-exact'>('normal');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  // Custom product modal state
  const [showCustomModal, setShowCustomModal] = useState(false);

  // Checkout form state
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerNotes, setCustomerNotes] = useState('');
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState(true);
  const [discount, setDiscount] = useState('');
  const [invoiceType, setInvoiceType] = useState('simplified');
  const [customerName, setCustomerName] = useState('');
  const [customerTaxId, setCustomerTaxId] = useState('');

  // Price editing state - separate display values for each item
  const [priceDisplayValues, setPriceDisplayValues] = useState<Record<string, string>>({});
  const [priceErrors, setPriceErrors] = useState<Record<string, boolean>>({});

  // Abort controller for search
  const abortControllerRef = useRef<AbortController | null>(null);

  // Audio context for beep sound
  const audioContextRef = useRef<AudioContext | null>(null);

  // Track if auto-add has been triggered for current search
  const autoAddTriggeredRef = useRef<boolean>(false);

  // Initialize display values when items change
  useEffect(() => {
    const newDisplayValues: Record<string, string> = {};
    items.forEach((item) => {
      if (!priceDisplayValues[item.barcode]) {
        newDisplayValues[item.barcode] = item.unitPrice.toFixed(2).replace('.', ',');
      }
    });
    if (Object.keys(newDisplayValues).length > 0) {
      setPriceDisplayValues((prev) => ({ ...prev, ...newDisplayValues }));
    }
  }, [items]);

  // Auto-focus search input when tab becomes active
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      if (searchInputRef.current && !showCustomModal) {
        searchInputRef.current.focus();
      }
    }, 100);

    return () => clearTimeout(focusTimer);
  }, [showCustomModal]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Detect search mode based on input
  useEffect(() => {
    if (searchTerm.trim().length >= 2) {
      const isNumericOnly = /^\d+$/.test(searchTerm.trim());
      setSearchMode(isNumericOnly ? 'barcode-exact' : 'normal');
    }
  }, [searchTerm]);

  // Cancel previous request when search changes
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
  }, [debouncedSearchTerm, searchMode]);

  // Reset auto-add flag when search term changes
  useEffect(() => {
    autoAddTriggeredRef.current = false;
  }, [debouncedSearchTerm]);

  // Search products query
  const { data: searchResults, isLoading: searchLoading } = useSearchProductsForCheckout(
    debouncedSearchTerm,
    searchMode,
    10,
    true
  );

  // Show/hide search results
  useEffect(() => {
    if (debouncedSearchTerm.length >= 2) {
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
  }, [debouncedSearchTerm]);

  // Immediate single-result addition
  useEffect(() => {
    if (
      !searchLoading &&
      searchResults &&
      searchResults.length === 1 &&
      !autoAddTriggeredRef.current
    ) {
      const product = searchResults[0];
      autoAddTriggeredRef.current = true;
      handleAddProductFromSearch(product);
      showSuccess('Producto agregado automáticamente');
    }
  }, [searchResults, searchLoading]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchResultsRef.current &&
        !searchResultsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle adding product from search
  const handleAddProductFromSearch = (product: ProductSearchResult) => {
    const priceCalc = calculateSalePrice(product.basePrice, Number(product.iva), Number(product.profitMargin));
    
    console.log('[VentasTab] Adding product from search:', {
      barcode: product.barcode,
      name: product.name,
      iva: Number(product.iva),
      basePrice: product.basePrice,
      profitMargin: Number(product.profitMargin),
      calculatedSalePrice: priceCalc.salePrice,
    });
    
    addItem({
      barcode: product.barcode,
      name: product.name,
      category: product.categoryName,
      quantity: 1,
      unitPrice: priceCalc.salePrice,
      isCustom: false,
      stock: Number(product.stock),
      basePrice: product.basePrice,
      iva: Number(product.iva),
      profitMargin: Number(product.profitMargin),
      categoryName: product.categoryName,
    });

    playBeep(audioContextRef);
    showSuccess('Producto añadido al carrito');
    setSearchTerm('');
    setShowSearchResults(false);
    
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  };

  // Handle Enter key in search
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchResults && searchResults.length === 1) {
      handleAddProductFromSearch(searchResults[0]);
    }
  };

  // Handle custom modal close with focus restoration
  const handleCustomModalChange = (open: boolean) => {
    setShowCustomModal(open);
    
    if (!open) {
      setTimeout(() => {
        if (searchInputRef.current && !searchInputRef.current.disabled) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  };

  // Handle price input change - only update display value
  const handlePriceChange = (barcode: string, value: string) => {
    setPriceDisplayValues((prev) => ({ ...prev, [barcode]: value }));
    // Clear error while typing
    setPriceErrors((prev) => ({ ...prev, [barcode]: false }));
  };

  // Handle price blur - validate and update actual price
  const handlePriceBlur = (barcode: string) => {
    const displayValue = priceDisplayValues[barcode] || '';
    const parsedPrice = parseSpanishNumber(displayValue);
    
    if (displayValue.trim() === '' || isNaN(parsedPrice) || parsedPrice < 0) {
      // Invalid input - show error and revert to current price
      setPriceErrors((prev) => ({ ...prev, [barcode]: true }));
      const item = items.find((i) => i.barcode === barcode);
      if (item) {
        setPriceDisplayValues((prev) => ({
          ...prev,
          [barcode]: item.unitPrice.toFixed(2).replace('.', ','),
        }));
      }
    } else {
      // Valid input - update price
      updatePrice(barcode, parsedPrice);
      setPriceErrors((prev) => ({ ...prev, [barcode]: false }));
      // Keep display value as-is (user's exact input)
    }
  };

  // Handle price Enter key - same as blur
  const handlePriceKeyDown = (barcode: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  // Handle checkout
  const handleCheckout = async () => {
    if (items.length === 0) {
      showError('El carrito está vacío');
      return;
    }

    // Validate invoice type fields
    if (invoiceType === 'full') {
      if (!customerName.trim()) {
        showError('El nombre del cliente es obligatorio para facturas completas');
        return;
      }
      if (!customerTaxId.trim()) {
        showError('El NIF/NIE/CIF es obligatorio para facturas completas');
        return;
      }
    }

    console.log('[VentasTab] Starting checkout with cart items:', items.map(item => ({
      barcode: item.barcode,
      name: item.name,
      iva: item.iva,
      basePrice: item.basePrice,
      profitMargin: item.profitMargin,
      quantity: item.quantity,
    })));

    try {
      const orderItems: OrderItem[] = items.map((item) => {
        const basePrice = item.basePrice || 0;
        const ivaRate = item.iva !== undefined ? item.iva : 21; // Use stored IVA or default to 21%
        const profitMargin = item.profitMargin || 0;
        const originalStock = item.stock || 0;

        console.log('[VentasTab] Creating OrderItem:', {
          barcode: item.barcode,
          name: item.name,
          ivaRate,
          basePrice,
          profitMargin,
          quantity: item.quantity,
        });

        return {
          productBarcode: item.barcode,
          productName: item.name,
          categoryName: item.category,
          quantity: BigInt(item.quantity),
          basePrice,
          ivaRate: BigInt(ivaRate),
          profitMargin: BigInt(profitMargin),
          salePrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
          originalStock: BigInt(originalStock),
          updatedStock: BigInt(Math.max(0, originalStock - item.quantity)),
        };
      });

      console.log('[VentasTab] Order items prepared for backend:', orderItems.map(item => ({
        barcode: item.productBarcode,
        name: item.productName,
        ivaRate: item.ivaRate.toString(),
        quantity: item.quantity.toString(),
      })));

      const taxBreakdown = calculateTaxBreakdown(items);
      console.log('[VentasTab] Tax breakdown calculated:', taxBreakdown.map(tb => ({
        ivaRate: tb.ivaRate.toString(),
        baseAmount: tb.baseAmount,
        taxAmount: tb.taxAmount,
      })));

      const paymentMethodEnum = paymentMethod === 'cash' ? 'cash' : paymentMethod === 'card' ? 'card' : 'transfer';
      const discountValue = discount.trim() === '' ? 0 : parseSpanishNumber(discount);

      const response = await createOrder.mutateAsync({
        items: orderItems,
        paymentMethod: paymentMethodEnum as any,
        customerNotes,
        printReceipt: shouldPrintReceipt,
        discountAmount: discountValue,
        taxBreakdown: taxBreakdown.length > 0 ? taxBreakdown : undefined,
        invoiceType,
        customerName: invoiceType === 'full' ? customerName.trim() : undefined,
        customerTaxId: invoiceType === 'full' ? customerTaxId.trim() : undefined,
      });

      if (response.success) {
        console.log('[VentasTab] Order created successfully:', {
          orderNumber: response.order.orderNumber,
          items: response.order.items.map(item => ({
            name: item.productName,
            ivaRate: item.ivaRate.toString(),
          })),
        });

        clearCart();
        setPriceDisplayValues({});
        setPriceErrors({});
        playBeep(audioContextRef);
        showSuccess(`Pedido #${response.order.orderNumber} creado exitosamente`);
        
        if (response.warnings && response.warnings.length > 0) {
          response.warnings.forEach((warning) => {
            showWarning(warning);
          });
        }

        if (shouldPrintReceipt) {
          const receiptData = {
            receiptType: 'order' as const,
            orderNumber: response.order.orderNumber,
            createdDate: response.order.timestamp,
            items: response.order.items.map((item) => ({
              quantity: Number(item.quantity),
              description: item.productName,
              unitPrice: item.salePrice,
              total: item.totalPrice,
            })),
            ivaBreakdown: response.order.taxBreakdown
              ? response.order.taxBreakdown.map((tax) => ({
                  rate: Number(tax.ivaRate),
                  baseImponible: tax.baseAmount,
                  cuota: tax.taxAmount,
                }))
              : [],
            subtotal: response.order.totalAmount + response.order.discountAmount,
            discount: response.order.discountAmount,
            total: response.order.totalAmount,
            paymentMethod: response.order.paymentMethod,
            customerNotes: response.order.customerNotes,
            invoiceType: response.order.invoiceType,
            customerName: response.order.customerName,
            customerTaxId: response.order.customerTaxId,
          };

          await printReceiptService(receiptData, storeDetails || null, (status: PrintStatus) => {
            if (status === 'success') {
              showSuccess('Impresión completada');
            } else if (status === 'error') {
              showError('Error al imprimir');
            }
          });
        }

        setCustomerNotes('');
        setPaymentMethod('cash');
        setShouldPrintReceipt(true);
        setDiscount('');
        setInvoiceType('simplified');
        setCustomerName('');
        setCustomerTaxId('');
        
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      } else {
        showError('Error al crear el pedido');
      }
    } catch (error) {
      showError('Error al procesar el pedido');
      console.error('[VentasTab] Checkout error:', error);
    }
  };

  const handleClearCart = () => {
    clearCart();
    setPriceDisplayValues({});
    setPriceErrors({});
    setSearchTerm('');
    setShowSearchResults(false);
    showSuccess('Carrito vaciado');
  };

  const handleRemoveItem = (barcode: string) => {
    removeItem(barcode);
    setPriceDisplayValues((prev) => {
      const newValues = { ...prev };
      delete newValues[barcode];
      return newValues;
    });
    setPriceErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[barcode];
      return newErrors;
    });
  };

  const handleCopyBarcode = (barcode: string) => {
    navigator.clipboard.writeText(barcode);
    showSuccess('Código de barras copiado');
  };

  const cartTotal = getTotal();
  const cartSubtotal = cartTotal;
  const discountValue = discount.trim() === '' ? 0 : parseSpanishNumber(discount);
  const cartTotalWithDiscount = cartTotal - discountValue;

  return (
    <>
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pl-9"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Busca por nombre, descripción o código de barras (mínimo 2 caracteres)
          </p>

          {/* Search Results Dropdown */}
          {showSearchResults && (
            <div
              ref={searchResultsRef}
              className="absolute z-50 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-[400px] overflow-y-auto"
            >
              {searchLoading ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Buscando productos...</p>
                </div>
              ) : !searchResults || searchResults.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">No se encontraron productos que coincidan</p>
                </div>
              ) : (
                <div className="p-2">
                  {searchResults.map((product) => {
                    const priceCalc = calculateSalePrice(product.basePrice, Number(product.iva), Number(product.profitMargin));
                    return (
                      <button
                        key={product.barcode}
                        onClick={() => handleAddProductFromSearch(product)}
                        className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.categoryName}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {product.barcode}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-semibold">{formatPrice(priceCalc.salePrice)}</div>
                            <Badge variant={product.stock === BigInt(0) ? 'destructive' : 'outline'} className="text-xs">
                              Stock: {product.stock.toString()}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <Button onClick={() => setShowCustomModal(true)} className="sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Producto Personalizado
        </Button>
      </div>

      {/* Shopping Cart */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Carrito de Compra</h2>

        {items.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <ShoppingCart className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Carrito vacío</h3>
              <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
                Busca productos para agregarlos al carrito
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Categoría</TableHead>
                    <TableHead className="text-center">Precio de Venta</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.barcode}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">
                              {item.name}
                              {item.isCustom && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  (Personalizado)
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                              {item.barcode}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4"
                                    onClick={() => handleCopyBarcode(item.barcode)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copiar código</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="text"
                          value={priceDisplayValues[item.barcode] ?? item.unitPrice.toFixed(2).replace('.', ',')}
                          onChange={(e) => handlePriceChange(item.barcode, e.target.value)}
                          onBlur={() => handlePriceBlur(item.barcode)}
                          onKeyDown={(e) => handlePriceKeyDown(item.barcode, e)}
                          className={`w-24 text-center font-mono mx-auto ${
                            priceErrors[item.barcode] ? 'border-red-500' : ''
                          }`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.barcode, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            max="999"
                            value={item.quantity}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value);
                              if (!isNaN(qty) && qty >= 1 && qty <= 999) {
                                updateQuantity(item.barcode, qty);
                              }
                            }}
                            className="w-16 text-center"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.barcode, Math.min(999, item.quantity + 1))}
                            disabled={item.quantity >= 999}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveItem(item.barcode)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {items.map((item) => (
                <Card key={item.barcode}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">
                          {item.name}
                          {item.isCustom && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              (Personalizado)
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="mt-1">
                          {item.category}
                        </Badge>
                        <div className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-1">
                          {item.barcode}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={() => handleCopyBarcode(item.barcode)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleRemoveItem(item.barcode)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Precio:</span>
                        <Input
                          type="text"
                          value={priceDisplayValues[item.barcode] ?? item.unitPrice.toFixed(2).replace('.', ',')}
                          onChange={(e) => handlePriceChange(item.barcode, e.target.value)}
                          onBlur={() => handlePriceBlur(item.barcode)}
                          onKeyDown={(e) => handlePriceKeyDown(item.barcode, e)}
                          className={`w-24 text-right font-mono ${
                            priceErrors[item.barcode] ? 'border-red-500' : ''
                          }`}
                        />
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Cantidad:</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.barcode, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            max="999"
                            value={item.quantity}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value);
                              if (!isNaN(qty) && qty >= 1 && qty <= 999) {
                                updateQuantity(item.barcode, qty);
                              }
                            }}
                            className="w-16 text-center"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.barcode, Math.min(999, item.quantity + 1))}
                            disabled={item.quantity >= 999}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-semibold">Total:</span>
                        <span className="font-mono font-semibold text-lg">
                          {formatPrice(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Cart Summary */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-lg">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatPrice(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-lg items-center">
                    <span>Descuento:</span>
                    <Input
                      type="text"
                      placeholder="0,00"
                      value={discount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^[\d,.-]*$/.test(val)) {
                          setDiscount(val);
                        }
                      }}
                      className="w-32 text-right font-mono ml-auto"
                    />
                  </div>
                  <div className="flex justify-between text-2xl font-bold pt-2 border-t">
                    <span>Total:</span>
                    <span className="font-mono">{formatPrice(cartTotalWithDiscount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Checkout Form */}
      {items.length > 0 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Finalizar Pedido</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="payment-method">Método de Pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="print-receipt" className="flex items-center gap-2">
                  <Checkbox
                    id="print-receipt"
                    checked={shouldPrintReceipt}
                    onCheckedChange={(checked) => setShouldPrintReceipt(checked as boolean)}
                  />
                  Imprimir Recibo
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-notes">Notas del Cliente</Label>
              <Textarea
                id="customer-notes"
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Notas adicionales sobre el pedido..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice-type">Tipo de factura</Label>
              <Select value={invoiceType} onValueChange={setInvoiceType}>
                <SelectTrigger id="invoice-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simplified">Factura Simplificada</SelectItem>
                  <SelectItem value="full">Factura</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {invoiceType === 'full' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customer-name">Nombre del Cliente</Label>
                  <Input
                    id="customer-name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nombre del cliente"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer-tax-id">NIF / NIE / CIF</Label>
                  <Input
                    id="customer-tax-id"
                    value={customerTaxId}
                    onChange={(e) => setCustomerTaxId(e.target.value)}
                    placeholder="Ej: B12345678"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleClearCart} className="flex-1">
                Vaciar Carrito
              </Button>
              <Button onClick={handleCheckout} disabled={createOrder.isPending} className="flex-1">
                {createOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {createOrder.isPending ? 'Creando pedido...' : 'Finalizar Pedido'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <CustomProductModal
        open={showCustomModal}
        onOpenChange={handleCustomModalChange}
        categories={categories || []}
        searchInputRef={searchInputRef}
      />
    </>
  );
});

export default VentasTab;
