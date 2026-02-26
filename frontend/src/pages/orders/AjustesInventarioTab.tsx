import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowUp, ArrowDown, FileDown, Search, X, Copy } from 'lucide-react';
import { useCreateInventoryAdjustment, useGetPaginatedAdjustments, useSearchProductsForCheckout } from '../../hooks/useQueries';
import { useToastStore } from '../../stores/useToastStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Variant_decrease_increase } from '../../backend';
import type { Product } from '../../backend';

const reasonOptions = [
  { value: 'expired', label: 'Vencido' },
  { value: 'lost', label: 'Perdido' },
  { value: 'broken', label: 'Dañado/Roto' },
  { value: 'theft', label: 'Robo' },
  { value: 'error', label: 'Error de Inventario' },
  { value: 'count', label: 'Ajuste de Conteo' },
];

const adjustmentTypeOptions = [
  { value: 'increase', label: 'Aumentar Stock' },
  { value: 'decrease', label: 'Reducir Stock' },
];

export default function AjustesInventarioTab() {
  const { showSuccess, showError } = useToastStore();

  // Form state
  const [selectedProducts, setSelectedProducts] = useState<Array<{ barcode: string; name: string }>>([]);
  const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('decrease');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [dateEffective, setDateEffective] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [adminNotes, setAdminNotes] = useState('');

  // Product search state
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Filters state
  const [filterProductSearch, setFilterProductSearch] = useState('');
  const [filterReason, setFilterReason] = useState('all');
  const [filterAdjustmentType, setFilterAdjustmentType] = useState('all');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  // Pagination state
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Hover state for copy icons
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  // Product search query
  const { data: searchResults = [], isLoading: isSearching } = useSearchProductsForCheckout(
    productSearch,
    productSearch.match(/^\d+$/) ? 'barcode-exact' : 'normal',
    10,
    productSearch.length >= 2 && showProductDropdown
  );

  // Adjustments query
  const {
    data: adjustmentsData,
    isLoading: isLoadingAdjustments,
    refetch: refetchAdjustments,
  } = useGetPaginatedAdjustments(
    pageNumber,
    pageSize,
    {
      productSearch: filterProductSearch || undefined,
      reasonFilter: filterReason !== 'all' ? filterReason : undefined,
      adjustmentTypeFilter: filterAdjustmentType !== 'all' ? filterAdjustmentType : undefined,
      fromDate: filterFromDate ? BigInt(new Date(filterFromDate).getTime() * 1000000) : undefined,
      toDate: filterToDate ? BigInt(new Date(filterToDate).getTime() * 1000000) : undefined,
    }
  );

  // Create adjustment mutation
  const createAdjustmentMutation = useCreateInventoryAdjustment();

  // Handle product selection
  const handleAddProduct = (product: { barcode: string; name: string }) => {
    if (!selectedProducts.find(p => p.barcode === product.barcode)) {
      setSelectedProducts([...selectedProducts, product]);
    }
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const handleRemoveProduct = (barcode: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.barcode !== barcode));
  };

  // Handle copy barcode
  const handleCopyBarcode = (barcode: string) => {
    navigator.clipboard.writeText(barcode);
    showSuccess('Código de barras copiado');
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      showError('Selecciona al menos un producto');
      return;
    }

    if (!quantity || parseInt(quantity) < 1) {
      showError('Ingresa una cantidad válida');
      return;
    }

    if (!reason) {
      showError('Selecciona una razón');
      return;
    }

    try {
      const dateEffectiveTimestamp = BigInt(new Date(dateEffective).getTime() * 1000000);

      for (const product of selectedProducts) {
        await createAdjustmentMutation.mutateAsync({
          productBarcode: product.barcode,
          adjustmentType: adjustmentType === 'increase' ? Variant_decrease_increase.increase : Variant_decrease_increase.decrease,
          quantity: BigInt(quantity),
          reason: { [reason]: null } as any,
          adminNotes: adminNotes.trim() || '',
          dateEffective: dateEffectiveTimestamp,
        });
      }

      showSuccess(`${selectedProducts.length} ajuste(s) creado(s) exitosamente`);
      
      // Reset form
      setSelectedProducts([]);
      setQuantity('');
      setReason('');
      setAdminNotes('');
      setDateEffective(format(new Date(), 'yyyy-MM-dd'));
      
      // Refetch adjustments
      refetchAdjustments();
    } catch (error: any) {
      showError(error.message || 'Error al crear ajustes');
    }
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setFilterProductSearch('');
    setFilterReason('all');
    setFilterAdjustmentType('all');
    setFilterFromDate('');
    setFilterToDate('');
    setPageNumber(0);
  };

  // Format date
  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return format(date, "d MMM yyyy, HH:mm", { locale: es });
  };

  // Get reason label
  const getReasonLabel = (reasonValue: string) => {
    return reasonOptions.find(r => r.value === reasonValue)?.label || reasonValue;
  };

  // Pagination
  const totalPages = adjustmentsData ? Math.ceil(Number(adjustmentsData.totalCount) / pageSize) : 0;

  return (
    <div className="space-y-6">
      {/* Bulk Adjustment Form */}
      <Card>
        <CardHeader>
          <CardTitle>Ajuste Masivo de Inventario</CardTitle>
          <CardDescription>Ajusta el stock de múltiples productos simultáneamente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Product Search */}
          <div className="space-y-2">
            <Label>Productos</Label>
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar productos por nombre o código de barras..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Search dropdown */}
              {showProductDropdown && productSearch.length >= 2 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg">
                  {isSearching ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto">
                      {searchResults.map((product) => (
                        <button
                          key={product.barcode}
                          onClick={() => handleAddProduct({ barcode: product.barcode, name: product.name })}
                          className="w-full px-4 py-2 text-left hover:bg-accent"
                        >
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">{product.barcode}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      No se encontraron productos
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected products */}
            {selectedProducts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedProducts.map((product) => (
                  <Badge key={product.barcode} variant="secondary" className="gap-1">
                    {product.name}
                    <button
                      onClick={() => handleRemoveProduct(product.barcode)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Adjustment Type */}
            <div className="space-y-2">
              <Label>Tipo de Ajuste</Label>
              <Select value={adjustmentType} onValueChange={(value: any) => setAdjustmentType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {adjustmentTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ingresa cantidad"
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>Razón</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona razón" />
                </SelectTrigger>
                <SelectContent>
                  {reasonOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Effective */}
            <div className="space-y-2">
              <Label>Fecha Efectiva</Label>
              <Input
                type="date"
                value={dateEffective}
                onChange={(e) => setDateEffective(e.target.value)}
              />
            </div>
          </div>

          {/* Admin Notes */}
          <div className="space-y-2">
            <Label>Notas del Administrador (opcional)</Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Ingresa notas sobre este ajuste (opcional)..."
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={createAdjustmentMutation.isPending}
            className="w-full"
          >
            {createAdjustmentMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Aplicando Ajustes...
              </>
            ) : (
              'Aplicar Ajustes'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Historical Adjustments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historial de Ajustes</CardTitle>
              <CardDescription>Registro de todos los ajustes de inventario</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <FileDown className="mr-2 h-4 w-4" />
              Exportar Ajustes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Buscar Producto</Label>
              <Input
                placeholder="Nombre o código..."
                value={filterProductSearch}
                onChange={(e) => setFilterProductSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Razón</Label>
              <Select value={filterReason} onValueChange={setFilterReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {reasonOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={filterAdjustmentType} onValueChange={setFilterAdjustmentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="increase">Aumentos</SelectItem>
                  <SelectItem value="decrease">Reducciones</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Desde Fecha</Label>
              <Input
                type="date"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Hasta Fecha</Label>
              <Input
                type="date"
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={handleClearFilters} className="w-full">
                Limpiar Filtros
              </Button>
            </div>
          </div>

          {/* Desktop Table */}
          {isLoadingAdjustments ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : adjustmentsData && adjustmentsData.adjustments.length > 0 ? (
            <>
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Tipo</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead>Razón</TableHead>
                      <TableHead className="text-center">Stock Anterior</TableHead>
                      <TableHead className="text-center">Stock Nuevo</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustmentsData.adjustments.map((adjustment) => (
                      <TableRow 
                        key={Number(adjustment.adjustmentId)}
                        onMouseEnter={() => setHoveredRow(Number(adjustment.adjustmentId))}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        <TableCell className="whitespace-nowrap">
                          {formatDate(adjustment.dateEffective)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{adjustment.productName}</div>
                            {hoveredRow === Number(adjustment.adjustmentId) && (
                              <button
                                onClick={() => handleCopyBarcode(adjustment.productBarcode)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title="Copiar código de barras"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {adjustment.adjustmentType === Variant_decrease_increase.increase ? (
                            <Badge variant="default" className="gap-1">
                              <ArrowUp className="h-3 w-3" />
                              Aumento
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <ArrowDown className="h-3 w-3" />
                              Reducción
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {adjustment.adjustmentType === Variant_decrease_increase.increase ? '+' : '-'}
                          {Number(adjustment.quantity)}
                        </TableCell>
                        <TableCell>
                          {getReasonLabel(Object.keys(adjustment.reason)[0])}
                        </TableCell>
                        <TableCell className="text-center">{Number(adjustment.previousStock)}</TableCell>
                        <TableCell className="text-center font-medium">{Number(adjustment.newStock)}</TableCell>
                        <TableCell className="max-w-xs truncate">{adjustment.adminNotes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {adjustmentsData.adjustments.map((adjustment) => (
                  <Card key={Number(adjustment.adjustmentId)}>
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{adjustment.productName}</div>
                            <button
                              onClick={() => handleCopyBarcode(adjustment.productBarcode)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title="Copiar código de barras"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {formatDate(adjustment.dateEffective)}
                          </div>
                        </div>
                        {adjustment.adjustmentType === Variant_decrease_increase.increase ? (
                          <Badge variant="default" className="gap-1">
                            <ArrowUp className="h-3 w-3" />
                            Aumento
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <ArrowDown className="h-3 w-3" />
                            Reducción
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Cantidad:</span>
                          <span className="ml-2 font-medium">
                            {adjustment.adjustmentType === Variant_decrease_increase.increase ? '+' : '-'}
                            {Number(adjustment.quantity)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Razón:</span>
                          <span className="ml-2">{getReasonLabel(Object.keys(adjustment.reason)[0])}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Stock Anterior:</span>
                          <span className="ml-2">{Number(adjustment.previousStock)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Stock Nuevo:</span>
                          <span className="ml-2 font-medium">{Number(adjustment.newStock)}</span>
                        </div>
                      </div>

                      {adjustment.adminNotes && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Notas:</span>
                          <p className="mt-1">{adjustment.adminNotes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Mostrando {pageNumber * pageSize + 1}–
                  {Math.min((pageNumber + 1) * pageSize, Number(adjustmentsData.totalCount))} de{' '}
                  {Number(adjustmentsData.totalCount)} ajustes
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(parseInt(value));
                      setPageNumber(0);
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 por página</SelectItem>
                      <SelectItem value="100">100 por página</SelectItem>
                      <SelectItem value="500">500 por página</SelectItem>
                      <SelectItem value="1000">1000 por página</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber(Math.max(0, pageNumber - 1))}
                    disabled={pageNumber === 0}
                  >
                    Anterior
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = pageNumber < 3 ? i : pageNumber - 2 + i;
                      if (page >= totalPages) return null;
                      return (
                        <Button
                          key={page}
                          variant={page === pageNumber ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPageNumber(page)}
                        >
                          {page + 1}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber(Math.min(totalPages - 1, pageNumber + 1))}
                    disabled={pageNumber >= totalPages - 1}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No hay registros disponibles.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
