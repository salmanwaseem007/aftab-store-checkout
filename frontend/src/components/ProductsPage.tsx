import { useState, useMemo, useEffect, useRef } from 'react';
import { useGetPaginatedProducts, useGetCategories, useAddProduct, useUpdateProduct, useDeleteProduct, useBulkUpdateProductsByCategory } from '../hooks/useQueries';
import { Package, Loader2, Plus, Layers, Pencil, Trash2, Search, Copy, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToastStore } from '../stores/useToastStore';
import { calculateSalePrice, formatPrice } from '../lib/calculateSalePriceUtil';
import type { Product, Category } from '../backend';

// Sentinel values for Select components (non-empty strings)
const CATEGORY_FILTER_ALL = 'filter-all';
const IVA_FILTER_ALL = 'filter-iva-all';

export default function ProductsPage() {
  const { showSuccess, showError } = useToastStore();
  const { data: categories, isLoading: categoriesLoading } = useGetCategories();
  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const bulkUpdate = useBulkUpdateProductsByCategory();

  // Pagination state
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Search and filter state - using sentinel values
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(CATEGORY_FILTER_ALL);
  const [stockFilterInput, setStockFilterInput] = useState('');
  const [debouncedStockFilter, setDebouncedStockFilter] = useState('');
  const [stockFilterError, setStockFilterError] = useState('');
  const [ivaFilter, setIvaFilter] = useState(IVA_FILTER_ALL);

  // Abort controller for search cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Automatic search mode detection based on input
  const searchMode = useMemo(() => {
    // If search term is empty or contains non-numeric characters, use normal mode
    if (!debouncedSearchTerm || /[^0-9]/.test(debouncedSearchTerm)) {
      return 'normal';
    }
    // If search term is numeric-only, use barcode-exact mode
    return 'barcode-exact';
  }, [debouncedSearchTerm]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPageNumber(0); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce stock filter with validation
  useEffect(() => {
    const timer = setTimeout(() => {
      // Validate stock filter input
      const trimmed = stockFilterInput.trim();
      
      if (trimmed === '') {
        // Empty input is valid (no filter)
        setStockFilterError('');
        setDebouncedStockFilter('');
        setPageNumber(0);
        return;
      }

      // Check if input contains only digits
      if (!/^\d+$/.test(trimmed)) {
        setStockFilterError('Solo se permiten números enteros positivos');
        return;
      }

      // Remove leading zeros and normalize
      const normalized = trimmed.replace(/^0+/, '') || '0';
      
      // Validate it's a valid non-negative integer
      const num = parseInt(normalized, 10);
      if (isNaN(num) || num < 0) {
        setStockFilterError('Ingresa un número válido mayor o igual a 0');
        return;
      }

      // Valid input
      setStockFilterError('');
      setDebouncedStockFilter(normalized);
      setPageNumber(0);
    }, 300);

    return () => clearTimeout(timer);
  }, [stockFilterInput]);

  // Cancel previous request when search changes
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
  }, [debouncedSearchTerm, searchMode, categoryFilter, debouncedStockFilter, ivaFilter]);

  // Convert filter values to backend parameters
  const categoryFilterValue = categoryFilter === CATEGORY_FILTER_ALL ? 0 : Number(categoryFilter);
  
  // Map stock filter to backend parameter: empty → null (no filter), "0" → 0 (only stock == 0), "N" (N > 0) → N (stock ≤ N)
  const stockFilterValue = debouncedStockFilter === '' ? null : Number(debouncedStockFilter);

  // Map IVA filter to backend parameter: "Todos" → null, "0" → 0, "4" → 4, "10" → 10, "21" → 21
  const ivaFilterValue = ivaFilter === IVA_FILTER_ALL ? null : Number(ivaFilter);

  const { data: paginatedData, isLoading: productsLoading } = useGetPaginatedProducts(
    pageNumber,
    pageSize,
    debouncedSearchTerm,
    searchMode,
    categoryFilterValue,
    stockFilterValue,
    ivaFilterValue
  );

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Add/Edit form state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formBasePrice, setFormBasePrice] = useState('');
  const [formIVA, setFormIVA] = useState('21');
  const [formProfitMargin, setFormProfitMargin] = useState('30');

  // Bulk update state
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkIVA, setBulkIVA] = useState('21');
  const [bulkProfitMargin, setBulkProfitMargin] = useState('30');

  // Products are now filtered by backend, no need for frontend filtering
  const products = paginatedData?.products || [];

  const totalCount = Number(paginatedData?.totalCount || 0);
  const totalPages = Math.ceil(totalCount / pageSize);

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000); // Convert nanoseconds to milliseconds
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showSuccess(`${label} copiado al portapapeles`);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormBarcode(product.barcode);
    setFormName(product.name);
    setFormDescription(product.description);
    setFormCategoryId(product.categoryId.toString());
    setFormStock(product.stock.toString());
    setFormBasePrice(product.basePrice.toString());
    setFormIVA(product.iva.toString());
    setFormProfitMargin(product.profitMargin.toString());
    setShowAddModal(true);
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteDialog(true);
  };

  const handleConfirmDeleteDialog = () => {
    // Close first dialog and open password modal
    setShowDeleteDialog(false);
    setDeletePassword('');
    setPasswordError('');
    setShowPasswordModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    // Validate password
    if (!deletePassword.trim()) {
      setPasswordError('La contraseña es requerida');
      return;
    }

    try {
      await deleteProduct.mutateAsync({ barcode: productToDelete.barcode, password: deletePassword });
      showSuccess('Producto eliminado exitosamente');
      setShowPasswordModal(false);
      setProductToDelete(null);
      setDeletePassword('');
      setPasswordError('');
    } catch (error: any) {
      // Check if error message contains the specific backend error
      const errorMessage = error?.message || '';
      if (errorMessage.includes('Contraseña de confirmación incorrecta')) {
        setPasswordError('Contraseña incorrecta. Inténtelo de nuevo.');
      } else {
        showError('Error al eliminar el producto');
        console.error(error);
      }
    }
  };

  const handleSaveProduct = async () => {
    if (!formBarcode.trim()) {
      showError('El código de barras es obligatorio');
      return;
    }
    if (!formName.trim()) {
      showError('El nombre del producto es obligatorio');
      return;
    }
    if (!formCategoryId) {
      showError('Selecciona una categoría');
      return;
    }

    const stock = Number(formStock);
    const basePrice = parseFloat(formBasePrice);
    const iva = Number(formIVA);
    const profitMargin = Number(formProfitMargin);

    if (isNaN(stock) || stock < 0) {
      showError('El stock debe ser un número válido');
      return;
    }
    if (isNaN(basePrice) || basePrice <= 0) {
      showError('El precio base debe ser mayor a 0');
      return;
    }
    if (profitMargin < 0 || profitMargin > 10000) {
      showError('El margen debe estar entre 0 y 10000');
      return;
    }

    const now = BigInt(Date.now() * 1000000); // Convert to nanoseconds

    const productData: Product = {
      barcode: formBarcode.trim(),
      name: formName.trim(),
      description: formDescription.trim(),
      categoryId: BigInt(formCategoryId),
      stock: BigInt(stock),
      basePrice,
      iva: BigInt(iva),
      profitMargin: BigInt(profitMargin),
      createdDate: editingProduct ? editingProduct.createdDate : now,
      updatedDate: now,
    };

    try {
      if (editingProduct) {
        await updateProduct.mutateAsync(productData);
        showSuccess('Producto actualizado exitosamente');
      } else {
        await addProduct.mutateAsync(productData);
        showSuccess('Producto creado exitosamente');
      }
      setShowAddModal(false);
      resetAddForm();
    } catch (error) {
      showError(editingProduct ? 'Error al actualizar el producto' : 'Error al crear el producto');
      console.error(error);
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkCategoryId) {
      showError('Selecciona una categoría');
      return;
    }

    const iva = Number(bulkIVA);
    const profitMargin = Number(bulkProfitMargin);

    if (profitMargin < 0 || profitMargin > 10000) {
      showError('El margen debe estar entre 0 y 10000');
      return;
    }

    try {
      await bulkUpdate.mutateAsync({
        categoryId: BigInt(bulkCategoryId),
        newIVA: BigInt(iva),
        newProfitMargin: BigInt(profitMargin),
      });
      showSuccess('Productos actualizados exitosamente');
      setShowBulkModal(false);
      resetBulkForm();
    } catch (error) {
      showError('Error al actualizar los productos');
      console.error(error);
    }
  };

  const resetAddForm = () => {
    setFormBarcode('');
    setFormName('');
    setFormDescription('');
    setFormCategoryId('');
    setFormStock('');
    setFormBasePrice('');
    setFormIVA('21');
    setFormProfitMargin('30');
    setEditingProduct(null);
  };

  const resetBulkForm = () => {
    setBulkCategoryId('');
    setBulkIVA('21');
    setBulkProfitMargin('30');
  };

  const handleCategoryChange = (categoryId: string) => {
    setFormCategoryId(categoryId);
    const category = categories?.find(c => c.id.toString() === categoryId);
    if (category && !editingProduct) {
      setFormIVA(category.defaultIVA.toString());
      setFormProfitMargin(category.defaultProfitMargin.toString());
    }
  };

  const selectedCategory = useMemo(() => {
    return categories?.find(c => c.id.toString() === formCategoryId);
  }, [categories, formCategoryId]);

  const calculatedPrices = useMemo(() => {
    const basePrice = parseFloat(formBasePrice);
    const iva = Number(formIVA);
    const profitMargin = Number(formProfitMargin);
    if (isNaN(basePrice) || basePrice <= 0) {
      return {
        basePrice: 0,
        profitAmount: 0,
        priceBeforeIva: 0,
        ivaAmount: 0,
        salePrice: 0
      };
    }
    return calculateSalePrice(basePrice, iva, profitMargin);
  }, [formBasePrice, formIVA, formProfitMargin]);

  const bulkCategoryProductCount = useMemo(() => {
    if (!bulkCategoryId || !paginatedData) return 0;
    // This is an approximation - in a real scenario, you'd query the backend
    return products.filter(p => p.product.categoryId.toString() === bulkCategoryId).length;
  }, [bulkCategoryId, products, paginatedData]);

  // Clear stock filter handler
  const handleClearStockFilter = () => {
    setStockFilterInput('');
    setStockFilterError('');
    setDebouncedStockFilter('');
    setPageNumber(0);
  };

  // Clear all filters handler
  const handleClearFilters = () => {
    setSearchTerm('');
    setCategoryFilter(CATEGORY_FILTER_ALL);
    setStockFilterInput('');
    setStockFilterError('');
    setDebouncedStockFilter('');
    setIvaFilter(IVA_FILTER_ALL);
    setPageNumber(0);
  };

  const hasActiveFilters = searchTerm !== '' || categoryFilter !== CATEGORY_FILTER_ALL || debouncedStockFilter !== '' || ivaFilter !== IVA_FILTER_ALL;

  // Empty state message based on stock filter
  const getEmptyStateMessage = () => {
    if (debouncedStockFilter === '0') {
      return 'No hay productos sin stock';
    }
    if (hasActiveFilters) {
      return 'No se encontraron productos con los filtros aplicados';
    }
    return 'Comienza agregando tu primer producto';
  };

  if (categoriesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
              <p className="text-muted-foreground">Gestión del catálogo de productos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowBulkModal(true)}
              title="Actualización masiva"
            >
              <Layers className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={() => {
                resetAddForm();
                setShowAddModal(true);
              }}
              title="Agregar producto"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Busca por nombre, descripción o código de barras (mínimo 2 caracteres)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent className="max-h-[400px]">
              <SelectItem value={CATEGORY_FILTER_ALL}>Todas las categorías</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id.toString()} value={cat.id.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="w-[180px]">
            <div className="relative">
              <Label htmlFor="stock-filter" className="sr-only">Stock ≤</Label>
              <Input
                id="stock-filter"
                type="text"
                placeholder="Filtrar por stock (≤ N)"
                value={stockFilterInput}
                onChange={(e) => setStockFilterInput(e.target.value)}
                className={`pr-8 ${stockFilterError ? 'border-destructive' : ''}`}
                aria-label="Stock ≤"
                aria-invalid={!!stockFilterError}
                aria-describedby={stockFilterError ? 'stock-filter-error' : undefined}
              />
              {stockFilterInput && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={handleClearStockFilter}
                      aria-label="Limpiar filtro de stock"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Limpiar filtro de stock</TooltipContent>
                </Tooltip>
              )}
            </div>
            {stockFilterError && (
              <p id="stock-filter-error" className="text-xs text-destructive mt-1">
                {stockFilterError}
              </p>
            )}
          </div>
          <Select value={ivaFilter} onValueChange={setIvaFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="IVA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={IVA_FILTER_ALL}>Todos los IVA</SelectItem>
              <SelectItem value="0">0%</SelectItem>
              <SelectItem value="4">4%</SelectItem>
              <SelectItem value="10">10%</SelectItem>
              <SelectItem value="21">21%</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="outline" onClick={handleClearFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Products Display */}
        {productsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !products || products.length === 0 ? (
          <div className="border border-dashed rounded-lg p-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mx-auto">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No hay productos</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {getEmptyStateMessage()}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={handleClearFilters} className="mt-4">
                Limpiar filtros
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (≥768px) */}
            <div className="products-table-view border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código de Barras</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-right">Precio Base</TableHead>
                      <TableHead className="text-right">Precio Venta</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map(({ product, categoryName }) => {
                      const salePrice = calculateSalePrice(product.basePrice, Number(product.iva), Number(product.profitMargin)).salePrice;
                      return (
                        <TableRow key={product.barcode} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              <span>{product.barcode}</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleCopyToClipboard(product.barcode, 'Código de barras')}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copiar código de barras</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px]">
                            <div className="flex items-center gap-2">
                              <div className="truncate">{product.name}</div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    onClick={() => handleCopyToClipboard(product.name, 'Nombre')}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copiar nombre</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{categoryName}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={Number(product.stock) === 0 ? 'destructive' : Number(product.stock) <= 10 ? 'secondary' : 'outline'}>
                              {product.stock.toString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatPrice(product.basePrice)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatPrice(salePrice)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Editar"
                                onClick={() => handleEditProduct(product)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title="Eliminar"
                                onClick={() => handleDeleteClick(product)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Card View (<768px) */}
            <div className="products-card-view space-y-3">
              {products.map(({ product, categoryName }) => {
                const prices = calculateSalePrice(product.basePrice, Number(product.iva), Number(product.profitMargin));
                return (
                  <div key={product.barcode} className="product-card border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors">
                    {/* Barcode & Name */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-semibold">{product.barcode}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => handleCopyToClipboard(product.barcode, 'Código de barras')}
                                aria-label="Copiar código de barras"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar código de barras</TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base leading-tight">{product.name}</h3>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => handleCopyToClipboard(product.name, 'Nombre')}
                                aria-label="Copiar nombre"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar nombre</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>

                    {/* Category */}
                    <div className="mb-3">
                      <Badge variant="outline" className="text-xs">{categoryName}</Badge>
                    </div>

                    {/* Stock */}
                    <div className="mb-3">
                      <span className="text-sm text-muted-foreground">Stock: </span>
                      <Badge variant={Number(product.stock) === 0 ? 'destructive' : Number(product.stock) <= 10 ? 'secondary' : 'outline'} className="text-xs">
                        {product.stock.toString()}
                      </Badge>
                    </div>

                    {/* Price Section */}
                    <div className="space-y-1 mb-4 bg-muted/30 rounded-md p-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Base:</span>
                        <span className="font-mono">{formatPrice(prices.basePrice)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">IVA:</span>
                        <span className="font-mono">{formatPrice(prices.ivaAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Beneficio:</span>
                        <span className="font-mono">{formatPrice(prices.profitAmount)}</span>
                      </div>
                      <div className="flex justify-between text-base font-semibold pt-1 border-t border-border/50">
                        <span>Venta:</span>
                        <span className="font-mono text-lg">{formatPrice(prices.salePrice)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditProduct(product)}
                        aria-label="Editar producto"
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(product)}
                        aria-label="Eliminar producto"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {pageNumber * pageSize + 1}-{Math.min((pageNumber + 1) * pageSize, totalCount)} de {totalCount} productos
              </div>
              <div className="flex items-center gap-2">
                <Select value={pageSize.toString()} onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPageNumber(0);
                }}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPageNumber(Math.max(0, pageNumber - 1))}
                    disabled={pageNumber === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="px-4 py-2 text-sm">
                    Página {pageNumber + 1} de {totalPages || 1}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPageNumber(Math.min(totalPages - 1, pageNumber + 1))}
                    disabled={pageNumber >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Add/Edit Product Modal */}
        <Dialog open={showAddModal} onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) resetAddForm();
        }}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Editar Producto' : 'Agregar Producto'}</DialogTitle>
              <DialogDescription>
                {editingProduct ? 'Modifica los datos del producto' : 'Completa los datos del nuevo producto'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="barcode">Código de Barras *</Label>
                <div className="flex gap-2">
                  <Input
                    id="barcode"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="1234567890123"
                    disabled={!!editingProduct}
                    className="flex-1"
                  />
                  {editingProduct && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleCopyToClipboard(formBarcode, 'Código de barras')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copiar código de barras</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                {editingProduct && (
                  <p className="text-xs text-muted-foreground">El código de barras no se puede modificar</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <div className="flex gap-2">
                  <Input
                    id="name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Nombre del producto"
                    className="flex-1"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopyToClipboard(formName, 'Nombre')}
                        disabled={!formName}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copiar nombre</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <div className="flex gap-2">
                  <Textarea
                    id="description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Descripción del producto"
                    rows={3}
                    className="flex-1"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopyToClipboard(formDescription, 'Descripción')}
                        disabled={!formDescription}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copiar descripción</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría *</Label>
                <Select value={formCategoryId} onValueChange={handleCategoryChange}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id.toString()} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCategory && !editingProduct && (
                  <p className="text-xs text-muted-foreground">
                    Valores por defecto de la categoría: IVA {selectedCategory.defaultIVA.toString()}%, Margen {selectedCategory.defaultProfitMargin.toString()}%
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock *</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Precio Base (€) *</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formBasePrice}
                    onChange={(e) => setFormBasePrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="iva">IVA (%) *</Label>
                  <Select value={formIVA} onValueChange={setFormIVA}>
                    <SelectTrigger id="iva">
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
                  <Label htmlFor="profitMargin">Margen de Beneficio (%) *</Label>
                  <Input
                    id="profitMargin"
                    type="number"
                    min="0"
                    max="10000"
                    value={formProfitMargin}
                    onChange={(e) => setFormProfitMargin(e.target.value)}
                    placeholder="0-10000"
                  />
                </div>
              </div>

              {/* Price Calculation Preview */}
              {formBasePrice && !isNaN(parseFloat(formBasePrice)) && parseFloat(formBasePrice) > 0 && (
                <div className="border rounded-lg p-4 bg-muted/50 space-y-2">
                  <h4 className="font-semibold text-sm">Vista previa del cálculo</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Precio base:</span>
                      <span className="font-mono">{formatPrice(calculatedPrices.basePrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Margen ({formProfitMargin}%):</span>
                      <span className="font-mono">+{formatPrice(calculatedPrices.profitAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Precio antes de IVA:</span>
                      <span className="font-mono">{formatPrice(calculatedPrices.priceBeforeIva)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IVA ({formIVA}%):</span>
                      <span className="font-mono">+{formatPrice(calculatedPrices.ivaAmount)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-semibold">
                      <span>Precio de venta:</span>
                      <span className="font-mono text-lg">{formatPrice(calculatedPrices.salePrice)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Dates */}
              {editingProduct && (
                <div className="border-t pt-4 space-y-1 text-xs text-muted-foreground">
                  <div>Creado: {formatDate(editingProduct.createdDate)}</div>
                  <div>Última actualización: {formatDate(editingProduct.updatedDate)}</div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveProduct} disabled={addProduct.isPending || updateProduct.isPending}>
                {(addProduct.isPending || updateProduct.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingProduct ? 'Guardar cambios' : 'Crear producto'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Update Modal */}
        <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Actualización Masiva</DialogTitle>
              <DialogDescription>
                Actualiza el IVA y margen de beneficio de todos los productos de una categoría
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20 p-3 rounded text-sm">
                <p className="text-blue-900 dark:text-blue-100">
                  Esta operación actualizará todos los productos de la categoría seleccionada con los nuevos valores de IVA y margen de beneficio.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulk-category">Categoría *</Label>
                <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
                  <SelectTrigger id="bulk-category">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id.toString()} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-iva">Nuevo IVA (%) *</Label>
                  <Select value={bulkIVA} onValueChange={setBulkIVA}>
                    <SelectTrigger id="bulk-iva">
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
                  <Label htmlFor="bulk-margin">Nuevo Margen (%) *</Label>
                  <Input
                    id="bulk-margin"
                    type="number"
                    min="0"
                    max="10000"
                    value={bulkProfitMargin}
                    onChange={(e) => setBulkProfitMargin(e.target.value)}
                    placeholder="0-10000"
                  />
                </div>
              </div>

              {bulkCategoryId && (
                <div className="border rounded-lg p-3 bg-muted/50 text-sm">
                  <p className="text-muted-foreground">
                    Ejemplo de recálculo: Un producto con precio base de €10.00 pasará a tener un precio de venta de{' '}
                    <span className="font-semibold">{formatPrice(calculateSalePrice(10, Number(bulkIVA), Number(bulkProfitMargin)).salePrice)}</span>
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleBulkUpdate} disabled={bulkUpdate.isPending || !bulkCategoryId}>
                {bulkUpdate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Actualizar productos
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Seguro que deseas eliminar este producto?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El producto "{productToDelete?.name}" (código: {productToDelete?.barcode}) será eliminado permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowDeleteDialog(false);
                setProductToDelete(null);
              }}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteDialog}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Continuar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Password Confirmation Modal */}
        <Dialog open={showPasswordModal} onOpenChange={(open) => {
          setShowPasswordModal(open);
          if (!open) {
            setDeletePassword('');
            setPasswordError('');
            setProductToDelete(null);
          }
        }}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Confirmar Eliminación de Producto</DialogTitle>
              <DialogDescription>
                Para eliminar este producto, ingrese la contraseña de confirmación:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="delete-password">Contraseña de confirmación *</Label>
                <Input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="Ingrese la contraseña"
                  autoComplete="off"
                  className={passwordError ? 'border-destructive' : ''}
                />
                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordModal(false);
                  setDeletePassword('');
                  setPasswordError('');
                  setProductToDelete(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={deleteProduct.isPending || !deletePassword.trim()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Eliminación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
