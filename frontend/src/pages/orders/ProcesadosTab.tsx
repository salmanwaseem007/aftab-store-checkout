import { useState, useEffect, memo, useCallback } from 'react';
import { Search, Calendar, ChevronDown, ChevronUp, Printer, RotateCcw, FileX, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGetPaginatedOrders } from '../../hooks/useQueries';
import { useToastStore } from '../../stores/useToastStore';
import { printReceipt as printReceiptService, PrintStatus } from '../../lib/printService';
import OrderTableRow from '../../components/OrderTableRow';
import ReturnModals from '../../components/ReturnModals';
import type { SharedModalState } from './OrdersPage';
import type { Order, StoreDetails } from '../../backend';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';

interface ProcesadosTabProps {
  modalState: SharedModalState;
  setModalState: React.Dispatch<React.SetStateAction<SharedModalState>>;
  storeDetails?: StoreDetails;
  isStoreDetailsLoading?: boolean;
}

const ProcesadosTab = memo(function ProcesadosTab({
  modalState,
  setModalState,
  storeDetails,
  isStoreDetailsLoading,
}: ProcesadosTabProps) {
  const { showSuccess, showError } = useToastStore();

  // Local state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [orderSearch, setOrderSearch] = useState('');
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [debouncedOrderSearch, setDebouncedOrderSearch] = useState('');
  const [debouncedBarcodeSearch, setDebouncedBarcodeSearch] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<string>('all');
  const [printingOrderNumber, setPrintingOrderNumber] = useState<string | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  // Debounce order search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedOrderSearch(orderSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [orderSearch]);

  // Debounce barcode search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBarcodeSearch(barcodeSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [barcodeSearch]);

  // Determine search mode and search term
  const searchTerm = debouncedOrderSearch || debouncedBarcodeSearch;
  const searchMode = debouncedOrderSearch ? 'order-exact' : debouncedBarcodeSearch ? 'barcode-exact' : 'normal';

  // Paginated orders query
  const fromDateTimestamp = fromDate ? BigInt(fromDate.getTime() * 1000000) : null;
  const toDateTimestamp = toDate ? BigInt((toDate.getTime() + 86400000 - 1) * 1000000) : null;
  const invoiceTypeFilterValue = invoiceTypeFilter === 'all' ? null : invoiceTypeFilter;

  const {
    data: paginatedOrders,
    isLoading: ordersLoading,
    error: ordersError,
  } = useGetPaginatedOrders(
    page,
    pageSize,
    searchTerm,
    searchMode,
    fromDateTimestamp,
    toDateTimestamp,
    invoiceTypeFilterValue,
    true
  );

  const handleClearFilters = useCallback(() => {
    setOrderSearch('');
    setBarcodeSearch('');
    setFromDate(undefined);
    setToDate(undefined);
    setInvoiceTypeFilter('all');
    setPage(0);
  }, []);

  const handlePrintOrder = useCallback(async (order: Order) => {
    try {
      setPrintingOrderNumber(order.orderNumber);

      const receiptData = {
        receiptType: 'order' as const,
        orderNumber: order.orderNumber,
        createdDate: order.timestamp,
        items: order.items.map((item) => ({
          quantity: Number(item.quantity),
          description: item.productName,
          unitPrice: item.salePrice,
          total: item.totalPrice,
        })),
        ivaBreakdown: order.taxBreakdown
          ? order.taxBreakdown.map((tax) => ({
              rate: Number(tax.ivaRate),
              baseImponible: tax.baseAmount,
              cuota: tax.taxAmount,
            }))
          : [],
        subtotal: order.totalAmount + order.discountAmount,
        discount: order.discountAmount,
        total: order.totalAmount,
        paymentMethod: order.paymentMethod,
        customerNotes: order.customerNotes,
        // Include invoice type and customer details
        invoiceType: order.invoiceType || 'simplified',
        customerName: order.customerName || undefined,
        customerTaxId: order.customerTaxId || undefined,
      };

      await printReceiptService(receiptData, storeDetails || null, (status: PrintStatus) => {
        if (status === 'success') {
          showSuccess('Impresión completada');
        } else if (status === 'error') {
          showError('Error al imprimir');
        }
        setPrintingOrderNumber(null);
      });
    } catch (error) {
      showError('Error al cargar el pedido');
      console.error(error);
      setPrintingOrderNumber(null);
    }
  }, [storeDetails, showSuccess, showError]);

  const handleOpenFullReturn = useCallback((order: Order) => {
    setModalState((prev) => ({
      ...prev,
      selectedOrder: order,
      showFullReturnModal: true,
    }));
  }, [setModalState]);

  const handleOpenPartialReturn = useCallback((order: Order) => {
    setModalState((prev) => ({
      ...prev,
      selectedOrder: order,
      showPartialReturnModal: true,
    }));
  }, [setModalState]);

  const handleOpenCancelOrder = useCallback((order: Order) => {
    setModalState((prev) => ({
      ...prev,
      selectedOrder: order,
      showCancelOrderModal: true,
    }));
  }, [setModalState]);

  const toggleOrderExpansion = useCallback((orderId: string) => {
    setExpandedOrderIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  }, []);

  const totalOrders = paginatedOrders?.totalCount ? Number(paginatedOrders.totalCount) : 0;
  const startIndex = page * pageSize + 1;
  const endIndex = Math.min((page + 1) * pageSize, totalOrders);
  const totalPages = Math.ceil(totalOrders / pageSize);

  return (
    <>
      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Dual Search Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Order Number Search */}
          <div className="space-y-2">
            <Label htmlFor="order-search">Buscar por ID exacto de pedido</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="order-search"
                      placeholder="Ej: 1, 25, 100"
                      value={orderSearch}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d+$/.test(value)) {
                          setOrderSearch(value);
                        }
                      }}
                      className="pl-9 pr-9"
                    />
                    {orderSearch && (
                      <button
                        onClick={() => setOrderSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Limpiar búsqueda"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Buscar por ID exacto de pedido (solo números)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Barcode Search */}
          <div className="space-y-2">
            <Label htmlFor="barcode-search">Buscar por Código de Barras</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="barcode-search"
                      placeholder="Ej: 1234567890"
                      value={barcodeSearch}
                      onChange={(e) => setBarcodeSearch(e.target.value)}
                      className="pl-9 pr-9"
                    />
                    {barcodeSearch && (
                      <button
                        onClick={() => setBarcodeSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Limpiar búsqueda"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Busca pedidos por código de barras exacto</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Filters Toggle Button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="sm:w-auto"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Filtros
            {filtersExpanded ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </Button>
        </div>

        <Collapsible open={filtersExpanded}>
          <CollapsibleContent className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Fecha Desde</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {fromDate ? format(fromDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={fromDate}
                          onSelect={setFromDate}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha Hasta</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {toDate ? format(toDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={toDate}
                          onSelect={setToDate}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice-type-filter">Tipo de Factura</Label>
                  <Select value={invoiceTypeFilter} onValueChange={setInvoiceTypeFilter}>
                    <SelectTrigger id="invoice-type-filter">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="simplified">Factura Simplificada</SelectItem>
                      <SelectItem value="full">Factura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClearFilters} className="flex-1">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Limpiar Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Orders Table */}
      {ordersLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : ordersError ? (
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileX className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold">Error al cargar pedidos</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Por favor, intenta de nuevo más tarde
            </p>
          </CardContent>
        </Card>
      ) : !paginatedOrders || paginatedOrders.orders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileX className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No se encontraron pedidos</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Intenta ajustar los filtros de búsqueda
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Número de Pedido</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Fecha</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Productos</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Estado</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Método de Pago</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Total</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.orders.map((order) => (
                  <OrderTableRow
                    key={order.orderId}
                    order={order}
                    expandedOrderIds={expandedOrderIds}
                    toggleOrderExpansion={toggleOrderExpansion}
                    printingOrderNumber={printingOrderNumber}
                    onPrint={handlePrintOrder}
                    onFullReturn={handleOpenFullReturn}
                    onPartialReturn={handleOpenPartialReturn}
                    onCancelOrder={handleOpenCancelOrder}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {paginatedOrders.orders.map((order) => (
              <OrderTableRow
                key={order.orderId}
                order={order}
                expandedOrderIds={expandedOrderIds}
                toggleOrderExpansion={toggleOrderExpansion}
                printingOrderNumber={printingOrderNumber}
                onPrint={handlePrintOrder}
                onFullReturn={handleOpenFullReturn}
                onPartialReturn={handleOpenPartialReturn}
                onCancelOrder={handleOpenCancelOrder}
                isMobile
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex} a {endIndex} de {totalOrders} pedidos
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                Anterior
              </Button>
              <div className="text-sm">
                Página {page + 1} de {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Return Modals */}
      <ReturnModals
        modalState={modalState}
        setModalState={setModalState}
      />
    </>
  );
});

export default ProcesadosTab;
