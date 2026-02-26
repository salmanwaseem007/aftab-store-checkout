import { useState, useCallback } from 'react';
import { usePageCleanup } from '../../hooks/usePageCleanup';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { lazy, Suspense, memo } from 'react';
import { useGetStoreDetails, useGetCategories } from '../../hooks/useQueries';
import type { Order, StoreDetails, Category } from '../../backend';

// Lazy load tab components
const VentasTab = lazy(() => import('./VentasTab'));
const ProcesadosTab = lazy(() => import('./ProcesadosTab'));
const DevolucionesTab = lazy(() => import('./DevolucionesTab'));
const AjustesInventarioTab = lazy(() => import('./AjustesInventarioTab'));

// Shared modal state types
export interface SharedModalState {
  showFullReturnModal: boolean;
  showPartialReturnModal: boolean;
  showCancelOrderModal: boolean;
  showStatusUpdateModal: boolean;
  selectedOrder: Order | null;
  selectedReturnId: bigint | null;
}

export default function OrdersPage() {
  // Use comprehensive cleanup hook
  usePageCleanup(['orders', 'returns', 'search-products-checkout', 'inventory-adjustments']);

  // Active tab state
  const [activeTab, setActiveTab] = useState('ventas');

  // Shared modal state
  const [modalState, setModalState] = useState<SharedModalState>({
    showFullReturnModal: false,
    showPartialReturnModal: false,
    showCancelOrderModal: false,
    showStatusUpdateModal: false,
    selectedOrder: null,
    selectedReturnId: null,
  });

  // Centralized data fetching for store details and categories
  const {
    data: storeDetails,
    isLoading: isStoreDetailsLoading,
    error: storeDetailsError,
  } = useGetStoreDetails();

  const {
    data: categories,
    isLoading: isCategoriesLoading,
    error: categoriesError,
  } = useGetCategories();

  // Combined loading state
  const isDataLoading = isStoreDetailsLoading || isCategoriesLoading;

  // Loading fallback
  const LoadingFallback = useCallback(() => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ), []);

  // Centralized loading UI
  if (isDataLoading) {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Caja</h1>
              <p className="text-muted-foreground">Gestión de ventas y pedidos</p>
            </div>
          </div>

          {/* Loading state */}
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center space-y-1">
              {isStoreDetailsLoading && (
                <p className="text-sm text-muted-foreground">Cargando datos de tienda...</p>
              )}
              {isCategoriesLoading && (
                <p className="text-sm text-muted-foreground">Cargando categorías...</p>
              )}
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
            <ShoppingCart className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Caja</h1>
            <p className="text-muted-foreground">Gestión de ventas y pedidos</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ventas">Ventas</TabsTrigger>
            <TabsTrigger value="procesados">Pedidos Procesados</TabsTrigger>
            <TabsTrigger value="devoluciones">Devoluciones</TabsTrigger>
            <TabsTrigger value="ajustes">Ajustes de Inventario</TabsTrigger>
          </TabsList>

          {/* Ventas Tab */}
          <TabsContent value="ventas" className="space-y-6 mt-6">
            <Suspense fallback={<LoadingFallback />}>
              {activeTab === 'ventas' && (
                <VentasTab
                  storeDetails={storeDetails}
                  categories={categories}
                  isStoreDetailsLoading={isStoreDetailsLoading}
                  isCategoriesLoading={isCategoriesLoading}
                />
              )}
            </Suspense>
          </TabsContent>

          {/* Pedidos Procesados Tab */}
          <TabsContent value="procesados" className="space-y-6 mt-6">
            <Suspense fallback={<LoadingFallback />}>
              {activeTab === 'procesados' && (
                <ProcesadosTab
                  modalState={modalState}
                  setModalState={setModalState}
                  storeDetails={storeDetails}
                  isStoreDetailsLoading={isStoreDetailsLoading}
                />
              )}
            </Suspense>
          </TabsContent>

          {/* Devoluciones Tab */}
          <TabsContent value="devoluciones" className="space-y-6 mt-6">
            <Suspense fallback={<LoadingFallback />}>
              {activeTab === 'devoluciones' && (
                <DevolucionesTab
                  modalState={modalState}
                  setModalState={setModalState}
                  storeDetails={storeDetails}
                  isStoreDetailsLoading={isStoreDetailsLoading}
                />
              )}
            </Suspense>
          </TabsContent>

          {/* Ajustes de Inventario Tab */}
          <TabsContent value="ajustes" className="space-y-6 mt-6">
            <Suspense fallback={<LoadingFallback />}>
              {activeTab === 'ajustes' && (
                <AjustesInventarioTab />
              )}
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
