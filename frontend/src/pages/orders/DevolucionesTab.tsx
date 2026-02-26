import { useState, useEffect, memo, useCallback } from 'react';
import { Search, Calendar, ChevronDown, ChevronUp, Printer, FileX, Loader2, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGetPaginatedReturns, useUpdateReturnStatus, useGenerateReturnReceipt } from '../../hooks/useQueries';
import { useToastStore } from '../../stores/useToastStore';
import { printReceipt as printReceiptService, PrintStatus } from '../../lib/printService';
import ReturnTableRow from '../../components/ReturnTableRow';
import StatusUpdateModal from '../../components/orders/StatusUpdateModal';
import type { SharedModalState } from './OrdersPage';
import type { Variant_pending_rejected_processed, StoreDetails } from '../../backend';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { getReasonLabel } from '../../utils/orderFormatters';

interface DevolucionesTabProps {
  modalState: SharedModalState;
  setModalState: React.Dispatch<React.SetStateAction<SharedModalState>>;
  storeDetails?: StoreDetails;
  isStoreDetailsLoading?: boolean;
}

const DevolucionesTab = memo(function DevolucionesTab({
  modalState,
  setModalState,
  storeDetails,
  isStoreDetailsLoading,
}: DevolucionesTabProps) {
  const { showSuccess, showError } = useToastStore();
  const updateReturnStatus = useUpdateReturnStatus();
  const generateReturnReceipt = useGenerateReturnReceipt();

  // Local state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [returnSearch, setReturnSearch] = useState('');
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [debouncedReturnSearch, setDebouncedReturnSearch] = useState('');
  const [debouncedBarcodeSearch, setDebouncedBarcodeSearch] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [originalOrderFilter, setOriginalOrderFilter] = useState('');

  // Debounce return search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedReturnSearch(returnSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [returnSearch]);

  // Debounce barcode search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBarcodeSearch(barcodeSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [barcodeSearch]);

  // Determine search mode and search term
  const searchTerm = debouncedReturnSearch || debouncedBarcodeSearch;
  const searchMode = debouncedReturnSearch ? 'return-exact' : debouncedBarcodeSearch ? 'barcode-exact' : 'normal';

  // Paginated returns query
  const fromDateTimestamp = fromDate ? BigInt(fromDate.getTime() * 1000000) : null;
  const toDateTimestamp = toDate ? BigInt((toDate.getTime() + 86400000 - 1) * 1000000) : null;

  const {
    data: paginatedReturns,
    isLoading: returnsLoading,
    error: returnsError,
  } = useGetPaginatedReturns(
    page,
    pageSize,
    searchTerm,
    searchMode,
    typeFilter,
    statusFilter,
    reasonFilter,
    fromDateTimestamp,
    toDateTimestamp,
    originalOrderFilter || null,
    true
  );

  const handleClearFilters = useCallback(() => {
    setReturnSearch('');
    setBarcodeSearch('');
    setFromDate(undefined);
    setToDate(undefined);
    setTypeFilter('all');
    setStatusFilter('all');
    setReasonFilter('all');
    setOriginalOrderFilter('');
    setPage(0);
  }, []);

  const handleUpdateReturnStatus = useCallback(async (returnId: bigint, status: 'processed' | 'rejected', notes: string) => {
    try {
      const statusVariant = status === 'processed' ? 'processed' : 'rejected';
      const result = await updateReturnStatus.mutateAsync({
        returnId,
        newStatus: statusVariant as Variant_pending_rejected_processed,
        adminNotes: notes || null,
      });

      if (result.success) {
        showSuccess(result.message);
        setModalState((prev) => ({ ...prev, showStatusUpdateModal: false }));
        
        if (status === 'processed') {
          const receiptData = await generateReturnReceipt.mutateAsync(returnId);
          if (receiptData && receiptData.returnOrder) {
            const returnReceipt = {
              receiptType: 'return' as const,
              returnNumber: receiptData.returnOrder.returnNumber,
              originalOrderNumber: receiptData.returnOrder.originalOrderNumber,
              createdDate: receiptData.timestamp,
              items: receiptData.returnOrder.items.map((item) => ({
                quantity: Number(item.returnedQuantity),
                description: item.productName,
                unitPrice: item.refundPerUnit,
                total: item.totalRefund,
              })),
              ivaBreakdown: [],
              subtotal: receiptData.returnOrder.refundAmount,
              discount: 0,
              total: receiptData.returnOrder.refundAmount,
              returnReason: getReasonLabel(receiptData.returnOrder.reason),
            };
            
            await printReceiptService(returnReceipt, storeDetails || null, (printStatus: PrintStatus) => {
              if (printStatus === 'success') {
                showSuccess('Impresión completada');
              } else if (printStatus === 'error') {
                showError('Error al imprimir');
              }
            });
          }
        }
      } else {
        showError(result.message);
      }
    } catch (error) {
      showError('Error al actualizar el estado de la devolución');
      console.error(error);
    }
  }, [updateReturnStatus, generateReturnReceipt, storeDetails, showSuccess, showError, setModalState]);

  const handleViewReturnReceipt = useCallback(async (returnId: bigint) => {
    try {
      const receiptData = await generateReturnReceipt.mutateAsync(returnId);
      if (receiptData && receiptData.returnOrder) {
        const returnReceipt = {
          receiptType: 'return' as const,
          returnNumber: receiptData.returnOrder.returnNumber,
          originalOrderNumber: receiptData.returnOrder.originalOrderNumber,
          createdDate: receiptData.timestamp,
          items: receiptData.returnOrder.items.map((item) => ({
            quantity: Number(item.returnedQuantity),
            description: item.productName,
            unitPrice: item.refundPerUnit,
            total: item.totalRefund,
          })),
          ivaBreakdown: [],
          subtotal: receiptData.returnOrder.refundAmount,
          discount: 0,
          total: receiptData.returnOrder.refundAmount,
          returnReason: getReasonLabel(receiptData.returnOrder.reason),
        };
        
        await printReceiptService(returnReceipt, storeDetails || null, (status: PrintStatus) => {
          if (status === 'success') {
            showSuccess('Impresión completada');
          } else if (status === 'error') {
            showError('Error al imprimir');
          }
        });
      } else {
        showError('Error al generar el recibo de devolución');
      }
    } catch (error) {
      showError('Error al generar el recibo de devolución');
      console.error(error);
    }
  }, [generateReturnReceipt, storeDetails, showSuccess, showError]);

  const totalReturns = paginatedReturns?.totalCount ? Number(paginatedReturns.totalCount) : 0;
  const startIndex = page * pageSize + 1;
  const endIndex = Math.min((page + 1) * pageSize, totalReturns);
  const totalPages = Math.ceil(totalReturns / pageSize);

  return (
    <>
      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Dual Search Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Return ID Search */}
          <div className="space-y-2">
            <Label htmlFor="return-search">Buscar por ID exacto de devolución</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="return-search"
                      placeholder="Ej: 1, 25, 100"
                      value={returnSearch}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d+$/.test(value)) {
                          setReturnSearch(value);
                        }
                      }}
                      className="pl-9 pr-9"
                    />
                    {returnSearch && (
                      <button
                        onClick={() => setReturnSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Limpiar búsqueda"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Buscar por ID exacto de devolución (solo números)</p>
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
                  <p>Buscar por código de barras exacto en productos de la devolución</p>
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
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="full">Completa</SelectItem>
                        <SelectItem value="partial">Parcial</SelectItem>
                        <SelectItem value="cancellation">Cancelación</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="processed">Procesada</SelectItem>
                        <SelectItem value="rejected">Rechazada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Motivo</Label>
                    <Select value={reasonFilter} onValueChange={setReasonFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="defective">Defectuoso</SelectItem>
                        <SelectItem value="incorrect">Incorrecto</SelectItem>
                        <SelectItem value="change_of_mind">Cambio de Opinión</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Pedido Original</Label>
                    <Input
                      placeholder="Número de pedido"
                      value={originalOrderFilter}
                      onChange={(e) => setOriginalOrderFilter(e.target.value)}
                    />
                  </div>
                </div>

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

        {/* Loading indicator during search */}
        {(returnsLoading && searchTerm) && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">Buscando devoluciones…</span>
          </div>
        )}
      </div>

      {/* Returns Table */}
      {returnsLoading && !searchTerm ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Cargando devoluciones...</span>
        </div>
      ) : returnsError ? (
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileX className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold">Error al cargar devoluciones</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Por favor, intenta de nuevo más tarde
            </p>
          </CardContent>
        </Card>
      ) : !paginatedReturns || paginatedReturns.returns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileX className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No se encontraron devoluciones</h3>
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
                  <th className="px-4 py-3 text-left text-sm font-medium">Número</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Pedido Original</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Fecha</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Motivo</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Estado</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Reembolso</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedReturns.returns.map((returnOrder) => (
                  <ReturnTableRow
                    key={returnOrder.returnId.toString()}
                    returnOrder={returnOrder}
                    onUpdateStatus={(returnId) => {
                      setModalState((prev) => ({
                        ...prev,
                        selectedReturnId: returnId,
                        showStatusUpdateModal: true,
                      }));
                    }}
                    onViewReceipt={handleViewReturnReceipt}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {paginatedReturns.returns.map((returnOrder) => (
              <ReturnTableRow
                key={returnOrder.returnId.toString()}
                returnOrder={returnOrder}
                onUpdateStatus={(returnId) => {
                  setModalState((prev) => ({
                    ...prev,
                    selectedReturnId: returnId,
                    showStatusUpdateModal: true,
                  }));
                }}
                onViewReceipt={handleViewReturnReceipt}
                isMobile
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex} a {endIndex} de {totalReturns} devoluciones
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

      {/* Status Update Modal */}
      <StatusUpdateModal
        open={modalState.showStatusUpdateModal}
        onOpenChange={(open) => setModalState((prev) => ({ ...prev, showStatusUpdateModal: open }))}
        returnId={modalState.selectedReturnId}
        onUpdate={handleUpdateReturnStatus}
      />
    </>
  );
});

export default DevolucionesTab;
