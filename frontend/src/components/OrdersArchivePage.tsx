import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronDown, ChevronUp, Search, X, Eye, CalendarIcon, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useGetPaginatedArchivedOrders, useGetArchivePreview, useArchiveOrders, useGetStoreDetails } from '../hooks/useQueries';
import { useToastStore } from '../stores/useToastStore';
import { printReceipt, PrintStatus } from '../lib/printService';
import { cn } from '@/lib/utils';
import type { ArchivedOrder } from '../backend';

export default function OrdersArchivePage() {
  const [activeTab, setActiveTab] = useState<'view' | 'create'>('view');
  const { showSuccess, showError } = useToastStore();
  const { data: storeDetails } = useGetStoreDetails();

  // View Archive Tab State
  const [viewFiltersExpanded, setViewFiltersExpanded] = useState(false);
  const [viewSearchTerm, setViewSearchTerm] = useState('');
  const [viewSearchInput, setViewSearchInput] = useState('');
  const [viewFromDate, setViewFromDate] = useState<Date | undefined>(undefined);
  const [viewToDate, setViewToDate] = useState<Date | undefined>(undefined);
  const [viewPageNumber, setViewPageNumber] = useState(0);
  const [viewPageSize, setViewPageSize] = useState(10);

  // Create Archive Tab State
  const [createFromDate, setCreateFromDate] = useState<Date | undefined>(undefined);
  const [createToDate, setCreateToDate] = useState<Date | undefined>(undefined);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setViewSearchTerm(viewSearchInput);
      setViewPageNumber(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [viewSearchInput]);

  // Determine search mode
  const searchMode = viewSearchTerm && /^\d+$/.test(viewSearchTerm) ? 'order-barcode-exact' : 'normal';

  // Convert dates to BigInt timestamps
  const viewFromTimestamp = viewFromDate ? BigInt(viewFromDate.getTime() * 1000000) : null;
  const viewToTimestamp = viewToDate ? BigInt((viewToDate.getTime() + 86400000 - 1) * 1000000) : null;

  // Fetch archived orders
  const {
    data: archivedOrdersData,
    isLoading: isLoadingArchived,
    error: archivedError,
  } = useGetPaginatedArchivedOrders(
    viewPageNumber,
    viewPageSize,
    viewSearchTerm,
    searchMode,
    viewFromTimestamp,
    viewToTimestamp
  );

  // Archive preview mutation
  const archivePreviewMutation = useGetArchivePreview();

  // Archive orders mutation
  const archiveOrdersMutation = useArchiveOrders();

  const handleClearViewFilters = () => {
    setViewSearchInput('');
    setViewSearchTerm('');
    setViewFromDate(undefined);
    setViewToDate(undefined);
    setViewPageNumber(0);
  };

  const handleViewReceipt = async (archivedOrder: ArchivedOrder) => {
    const receiptData = {
      receiptType: 'order' as const,
      orderNumber: archivedOrder.order.orderNumber,
      createdDate: archivedOrder.order.timestamp,
      items: archivedOrder.order.items.map((item) => ({
        quantity: Number(item.quantity),
        description: item.productName,
        unitPrice: item.salePrice,
        total: item.totalPrice,
      })),
      ivaBreakdown: archivedOrder.order.taxBreakdown
        ? archivedOrder.order.taxBreakdown.map((tax) => ({
            rate: Number(tax.ivaRate),
            baseImponible: tax.baseAmount,
            cuota: tax.taxAmount,
          }))
        : [],
      subtotal: archivedOrder.order.totalAmount + archivedOrder.order.discountAmount,
      discount: archivedOrder.order.discountAmount,
      total: archivedOrder.order.totalAmount,
      paymentMethod: archivedOrder.order.paymentMethod,
      customerNotes: archivedOrder.order.customerNotes,
      // Include invoice type and customer details
      invoiceType: archivedOrder.order.invoiceType || 'simplified',
      customerName: archivedOrder.order.customerName || undefined,
      customerTaxId: archivedOrder.order.customerTaxId || undefined,
    };

    await printReceipt(receiptData, storeDetails || null, (status: PrintStatus) => {
      if (status === 'success') {
        showSuccess('Impresión completada');
      } else if (status === 'error') {
        showError('Error al imprimir');
      }
    });
  };

  const handlePreview = async () => {
    if (!createFromDate || !createToDate) {
      showError('Por favor selecciona ambas fechas');
      return;
    }

    if (createFromDate > createToDate) {
      showError('La fecha "Desde" debe ser anterior o igual a la fecha "Hasta"');
      return;
    }

    const now = new Date();
    if (createFromDate > now || createToDate > now) {
      showError('No se pueden seleccionar fechas futuras');
      return;
    }

    try {
      const fromTimestamp = BigInt(createFromDate.getTime() * 1000000);
      const toTimestamp = BigInt((createToDate.getTime() + 86400000 - 1) * 1000000);
      
      const result = await archivePreviewMutation.mutateAsync({
        dateFrom: fromTimestamp,
        dateTo: toTimestamp,
      });

      setPreviewCount(Number(result.orderCount));
      setShowConfirmDialog(true);
    } catch (error: any) {
      console.error('Preview error:', error);
      showError('Error al obtener vista previa');
    }
  };

  const handleArchive = async () => {
    if (!createFromDate || !createToDate || previewCount === null) {
      return;
    }

    try {
      const fromTimestamp = BigInt(createFromDate.getTime() * 1000000);
      const toTimestamp = BigInt((createToDate.getTime() + 86400000 - 1) * 1000000);

      const result = await archiveOrdersMutation.mutateAsync({
        dateFrom: fromTimestamp,
        dateTo: toTimestamp,
      });

      showSuccess(`✅ ${result.archivedCount} pedidos archivados exitosamente.`);
      
      // Reset create tab
      setCreateFromDate(undefined);
      setCreateToDate(undefined);
      setPreviewCount(null);
      setShowConfirmDialog(false);

      // Switch to view tab and apply date filter
      setActiveTab('view');
      setViewFromDate(createFromDate);
      setViewToDate(createToDate);
      setViewPageNumber(0);
    } catch (error: any) {
      console.error('Archive error:', error);
      showError('Error al archivar pedidos');
    }
  };

  const formatDate = (timestamp: bigint): string => {
    const date = new Date(Number(timestamp) / 1000000);
    return format(date, 'd MMM yyyy, HH:mm', { locale: es });
  };

  const totalPages = archivedOrdersData ? Math.ceil(Number(archivedOrdersData.totalCount) / viewPageSize) : 0;
  const startIndex = viewPageNumber * viewPageSize + 1;
  const endIndex = Math.min((viewPageNumber + 1) * viewPageSize, Number(archivedOrdersData?.totalCount || 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Archivo de Pedidos</h1>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'view' | 'create')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="view">Ver Archivo</TabsTrigger>
          <TabsTrigger value="create">Crear Archivo</TabsTrigger>
        </TabsList>

        {/* View Archive Tab */}
        <TabsContent value="view" className="space-y-6">
          {/* Filters Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Filtros de Búsqueda</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewFiltersExpanded(!viewFiltersExpanded)}
                >
                  {viewFiltersExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            {viewFiltersExpanded && (
              <CardContent className="space-y-4">
                {/* Search Bar */}
                <div className="space-y-2">
                  <Label>Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar pedidos archivados por número, producto o cliente..."
                      value={viewSearchInput}
                      onChange={(e) => setViewSearchInput(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    {viewSearchInput && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                        onClick={() => setViewSearchInput('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Los números buscan por número de pedido (solo dígitos) y códigos de barras exactos
                  </p>
                </div>

                {/* Date Filters */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Desde Fecha</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !viewFromDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {viewFromDate ? format(viewFromDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={viewFromDate}
                          onSelect={setViewFromDate}
                          locale={es}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Hasta Fecha</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !viewToDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {viewToDate ? format(viewToDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={viewToDate}
                          onSelect={setViewToDate}
                          locale={es}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <Button variant="outline" onClick={handleClearViewFilters} className="w-full">
                  Limpiar filtros
                </Button>
              </CardContent>
            )}
          </Card>

          {/* Archived Orders Table */}
          <Card>
            <CardContent className="p-0">
              {isLoadingArchived ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Cargando pedidos archivados...</span>
                </div>
              ) : archivedError ? (
                <div className="flex flex-col items-center justify-center py-12 text-destructive">
                  <AlertTriangle className="h-8 w-8 mb-2" />
                  <p>Error al cargar los datos.</p>
                </div>
              ) : !archivedOrdersData || archivedOrdersData.orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <p>No hay registros disponibles.</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pedido #</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Fecha de Archivado</TableHead>
                          <TableHead>Fecha de Pedido</TableHead>
                          <TableHead>Productos</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {archivedOrdersData.orders.map((archivedOrder) => (
                          <TableRow key={archivedOrder.order.orderId} className="opacity-70">
                            <TableCell className="font-medium">{archivedOrder.order.orderNumber}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-gray-500/10 text-gray-700 dark:text-gray-300">
                                [ARCHIVADO]
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDate(archivedOrder.archiveDate)}
                            </TableCell>
                            <TableCell>
                              {formatDate(archivedOrder.order.timestamp)}
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs truncate">
                                {archivedOrder.order.items.map((item) => item.productName).join(', ')}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              €{archivedOrder.order.totalAmount.toFixed(2).replace('.', ',')}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewReceipt(archivedOrder)}
                                title="Ver recibo"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4 p-4">
                    {archivedOrdersData.orders.map((archivedOrder) => (
                      <Card key={archivedOrder.order.orderId} className="opacity-70">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">{archivedOrder.order.orderNumber}</CardTitle>
                              <CardDescription>
                                {formatDate(archivedOrder.order.timestamp)}
                              </CardDescription>
                            </div>
                            <Badge variant="secondary" className="bg-gray-500/10 text-gray-700 dark:text-gray-300">
                              [ARCHIVADO]
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium">Archivado:</span>{' '}
                            {formatDate(archivedOrder.archiveDate)}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Productos:</span>{' '}
                            {archivedOrder.order.items.map((item) => item.productName).join(', ')}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Total:</span> €{archivedOrder.order.totalAmount.toFixed(2).replace('.', ',')}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewReceipt(archivedOrder)}
                            className="w-full mt-2"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Recibo
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="border-t p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-muted-foreground">
                        Mostrando {startIndex}–{endIndex} de {archivedOrdersData.totalCount.toString()} pedidos archivados
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={viewPageSize.toString()}
                          onValueChange={(value) => {
                            setViewPageSize(Number(value));
                            setViewPageNumber(0);
                          }}
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="500">500</SelectItem>
                            <SelectItem value="1000">1000</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewPageNumber(Math.max(0, viewPageNumber - 1))}
                            disabled={viewPageNumber === 0}
                          >
                            Anterior
                          </Button>

                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageIndex = viewPageNumber < 3 ? i : viewPageNumber - 2 + i;
                            if (pageIndex >= totalPages) return null;
                            return (
                              <Button
                                key={pageIndex}
                                variant={pageIndex === viewPageNumber ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewPageNumber(pageIndex)}
                              >
                                {pageIndex + 1}
                              </Button>
                            );
                          })}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewPageNumber(Math.min(totalPages - 1, viewPageNumber + 1))}
                            disabled={viewPageNumber >= totalPages - 1}
                          >
                            Siguiente
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Archive Tab */}
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Seleccionar Rango de Fechas</CardTitle>
              <CardDescription>
                Selecciona el rango de fechas de los pedidos que deseas archivar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Desde Fecha</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !createFromDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {createFromDate ? format(createFromDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={createFromDate}
                        onSelect={setCreateFromDate}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Hasta Fecha</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !createToDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {createToDate ? format(createToDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={createToDate}
                        onSelect={setCreateToDate}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Button
                onClick={handlePreview}
                disabled={!createFromDate || !createToDate || archivePreviewMutation.isPending}
                className="w-full"
              >
                {archivePreviewMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  'Vista Previa'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Archivado</DialogTitle>
            <DialogDescription>
              Se moverán {previewCount} pedidos al archivo.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Esta acción es irreversible
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Los pedidos se moverán permanentemente al archivo.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleArchive}
              disabled={archiveOrdersMutation.isPending}
            >
              {archiveOrdersMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Archivando...
                </>
              ) : (
                `Archivar ${previewCount} Pedidos`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
