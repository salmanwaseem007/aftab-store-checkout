import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useToastStore } from '../stores/useToastStore';
import { useAdminCacheStore } from '../stores/useAdminCacheStore';
import type {
  Category,
  Product,
  ProductSearchResult,
  CreateOrderRequest,
  CreateOrderResponse,
  PaginatedProducts,
  PaginatedOrders,
  ReturnOrderDTO,
  ReturnResult,
  PaginatedReturns,
  StatusResult,
  ReceiptData,
  StoreDetails,
  ProductExportDTO,
  ProductsExportResult,
  CategoriesExportResult,
  OrdersExportResult,
  ProductImportDTO,
  ProductsImportResult,
  CategoryImportDTO,
  CategoriesImportResult,
  LegacyCategoryImportDTO,
  LegacyProductImportDTO,
  ImportResult,
  PaginatedArchivedOrders,
  ArchivePreviewResult,
  ArchiveResult,
  AnalyticsFilters,
  AnalyticsData,
  OrderImportDTO,
  OrderImportConfig,
  OrdersImportResult,
  AdjustmentDTO,
  AdjustmentResult,
  AdjustmentFilters,
  PaginatedAdjustments,
  AdjustmentAnalytics,
} from '../backend';
import { UserRole } from '../backend';

// ============================================================================
// Admin Status Check with 30-day cache
// ============================================================================

export function useCheckAdminStatus(enabled: boolean = true) {
  const { actor, isFetching: actorFetching } = useActor();
  const adminCache = useAdminCacheStore();

  const query = useQuery<boolean>({
    queryKey: ['adminStatus'],
    queryFn: async () => {
      if (!actor) return false;

      // Check cache first
      const cachedStatus = adminCache.get<boolean>('adminStatus');
      if (cachedStatus !== null) {
        return cachedStatus;
      }

      // Fetch from backend if not cached or expired
      const status = await actor.isUserAdmin();
      
      // Store in cache
      adminCache.set('adminStatus', status);
      
      return status;
    },
    enabled: !!actor && !actorFetching && enabled,
    staleTime: Infinity, // Never mark as stale since we manage cache manually
    gcTime: Infinity, // Keep in React Query cache indefinitely
    retry: 1,
  });

  // Return custom state that properly reflects actor dependency
  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

// ============================================================================
// User Management with 30-day cache
// ============================================================================

export function useGetAllUserRoles() {
  const { actor, isFetching } = useActor();
  const adminCache = useAdminCacheStore();

  return useQuery<Array<[string, UserRole]>>({
    queryKey: ['userRoles'],
    queryFn: async () => {
      if (!actor) return [];

      // Check cache first
      const cachedRoles = adminCache.get<Array<[string, UserRole]>>('userRoles');
      if (cachedRoles !== null) {
        return cachedRoles;
      }

      // This would need a backend endpoint - for now return empty array
      // The backend doesn't have getAllUsers endpoint yet
      const roles: Array<[string, UserRole]> = [];
      
      // Store in cache
      adminCache.set('userRoles', roles);
      
      return roles;
    },
    enabled: !!actor && !isFetching,
    staleTime: Infinity, // Never mark as stale since we manage cache manually
    gcTime: Infinity, // Keep in React Query cache indefinitely
  });
}

export function useAssignUserRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const adminCache = useAdminCacheStore();

  return useMutation({
    mutationFn: async (data: { principal: string; role: UserRole }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.assignCallerUserRoleByText(data.principal, data.role);
    },
    onSuccess: () => {
      // Invalidate userRoles cache
      adminCache.set('userRoles', null as any);
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
    },
  });
}

// ============================================================================
// Categories
// ============================================================================

export function useGetCategories() {
  const { actor, isFetching } = useActor();

  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCategories();
    },
    enabled: !!actor && !isFetching,
    staleTime: 600000, // 10 minutes
    gcTime: 1800000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

export function useAddCategory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastStore();

  return useMutation({
    mutationFn: async (data: { name: string; order: bigint; defaultIVA: bigint; defaultProfitMargin: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addCategory(data.name, data.order, data.defaultIVA, data.defaultProfitMargin);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showSuccess('Categoría agregada exitosamente');
    },
    onError: (error) => {
      showError('Error al agregar categoría');
      console.error(error);
    },
  });
}

export function useAddCategories() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categories: Array<{ name: string; order: bigint; defaultIVA: bigint; defaultProfitMargin: bigint }>) => {
      if (!actor) throw new Error('Actor not available');
      // Add categories one by one
      for (const category of categories) {
        await actor.addCategory(category.name, category.order, category.defaultIVA, category.defaultProfitMargin);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastStore();

  return useMutation({
    mutationFn: async (data: { id: bigint; name: string; order: bigint; defaultIVA: bigint; defaultProfitMargin: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateCategory(data.id, data.name, data.order, data.defaultIVA, data.defaultProfitMargin);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showSuccess('Categoría actualizada exitosamente');
    },
    onError: (error) => {
      showError('Error al actualizar categoría');
      console.error(error);
    },
  });
}

export function useDeleteCategory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastStore();

  return useMutation({
    mutationFn: async (data: { id: bigint; password: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteCategory(data.id, data.password);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showSuccess('Categoría eliminada exitosamente');
    },
    onError: (error) => {
      showError('Error al eliminar categoría');
      console.error(error);
    },
  });
}

export function useBulkUpdateCategories() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastStore();

  return useMutation({
    mutationFn: async (updates: Array<[bigint, bigint | null, bigint | null]>) => {
      if (!actor) throw new Error('Actor not available');
      return actor.bulkUpdateCategories(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showSuccess('Categorías actualizadas exitosamente');
    },
    onError: (error) => {
      showError('Error al actualizar categorías');
      console.error(error);
    },
  });
}

// ============================================================================
// Products
// ============================================================================

export function useGetPaginatedProducts(
  pageNumber: number,
  pageSize: number,
  searchTerm: string,
  searchMode: string,
  categoryFilter: number,
  stockFilter: number | null,
  ivaFilter: number | null
) {
  const { actor, isFetching } = useActor();

  return useQuery<PaginatedProducts>({
    queryKey: ['products', pageNumber, pageSize, searchTerm, searchMode, categoryFilter, stockFilter, ivaFilter],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getPaginatedProducts(
        BigInt(pageNumber),
        BigInt(pageSize),
        searchTerm,
        searchMode,
        BigInt(categoryFilter),
        stockFilter !== null ? BigInt(stockFilter) : null,
        ivaFilter !== null ? BigInt(ivaFilter) : null
      );
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastStore();

  return useMutation({
    mutationFn: async (product: Product) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addProduct(product);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showSuccess('Producto agregado exitosamente');
    },
    onError: (error) => {
      showError('Error al agregar producto');
      console.error(error);
    },
  });
}

export function useUpdateProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastStore();

  return useMutation({
    mutationFn: async (product: Product) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateProduct(product);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showSuccess('Producto actualizado exitosamente');
    },
    onError: (error) => {
      showError('Error al actualizar producto');
      console.error(error);
    },
  });
}

export function useDeleteProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { barcode: string; password: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteProduct(data.barcode, data.password);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useBulkUpdateProductsByCategory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastStore();

  return useMutation({
    mutationFn: async (data: { categoryId: bigint; newIVA: bigint; newProfitMargin: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.bulkUpdateProductsByCategory(data.categoryId, data.newIVA, data.newProfitMargin);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showSuccess('Productos actualizados exitosamente');
    },
    onError: (error) => {
      showError('Error al actualizar productos');
      console.error(error);
    },
  });
}

// ============================================================================
// Product Search for Checkout
// ============================================================================

export function useSearchProductsForCheckout(searchTerm: string, searchMode: string, limit: number, enabled: boolean = true) {
  const { actor, isFetching } = useActor();

  return useQuery<ProductSearchResult[]>({
    queryKey: ['productSearch', searchTerm, searchMode, limit],
    queryFn: async () => {
      if (!actor) return [];
      if (searchTerm.length < 2) return [];
      return actor.searchProductsForCheckout(searchTerm, searchMode, BigInt(limit));
    },
    enabled: !!actor && !isFetching && searchTerm.length >= 2 && enabled,
  });
}

export function useGetProductByBarcode(barcode: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Product | null>({
    queryKey: ['product', barcode],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getProduct(barcode);
    },
    enabled: !!actor && !isFetching && barcode.length > 0,
  });
}

// ============================================================================
// Orders
// ============================================================================

export function useCreateOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateOrderRequest) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createOrder(request);
    },
    onSuccess: () => {
      // Only invalidate products query, not orders or returns
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useGetPaginatedOrders(
  pageNumber: number,
  pageSize: number,
  searchTerm: string,
  searchMode: string,
  fromDate: bigint | null,
  toDate: bigint | null,
  invoiceTypeFilter: string | null,
  enabled: boolean = true
) {
  const { actor, isFetching } = useActor();

  return useQuery<PaginatedOrders>({
    queryKey: ['orders', pageNumber, pageSize, searchTerm, searchMode, fromDate?.toString(), toDate?.toString(), invoiceTypeFilter],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getPaginatedOrders(
        BigInt(pageNumber),
        BigInt(pageSize),
        searchTerm,
        searchMode,
        fromDate,
        toDate,
        invoiceTypeFilter
      );
    },
    enabled: !!actor && !isFetching && enabled,
  });
}

// ============================================================================
// Returns
// ============================================================================

export function useCreateReturn() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (returnData: ReturnOrderDTO) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createReturn(returnData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useGetPaginatedReturns(
  pageNumber: number,
  pageSize: number,
  searchTerm: string,
  searchMode: string,
  typeFilter: string,
  statusFilter: string,
  reasonFilter: string,
  fromDate: bigint | null,
  toDate: bigint | null,
  originalOrderNumber: string | null,
  enabled: boolean = true
) {
  const { actor, isFetching } = useActor();

  return useQuery<PaginatedReturns>({
    queryKey: ['returns', pageNumber, pageSize, searchTerm, searchMode, typeFilter, statusFilter, reasonFilter, fromDate?.toString(), toDate?.toString(), originalOrderNumber],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getPaginatedReturns(
        BigInt(pageNumber),
        BigInt(pageSize),
        searchTerm,
        searchMode,
        typeFilter,
        statusFilter,
        reasonFilter,
        fromDate,
        toDate,
        originalOrderNumber
      );
    },
    enabled: !!actor && !isFetching && enabled,
  });
}

export function useUpdateReturnStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { returnId: bigint; newStatus: any; adminNotes: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateReturnStatus(data.returnId, data.newStatus, data.adminNotes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useGenerateReturnReceipt() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (returnId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.generateReturnReceipt(returnId);
    },
  });
}

// ============================================================================
// Store Details
// ============================================================================

export function useGetStoreDetails() {
  const { actor, isFetching } = useActor();

  return useQuery<StoreDetails>({
    queryKey: ['storeDetails'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getStoreDetails();
    },
    enabled: !!actor && !isFetching,
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

export function useUpdateStoreDetails() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastStore();

  return useMutation({
    mutationFn: async (details: StoreDetails) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateStoreDetails(details);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storeDetails'] });
      showSuccess('Datos de tienda actualizados exitosamente');
    },
    onError: (error) => {
      showError('Error al actualizar datos de tienda');
      console.error(error);
    },
  });
}

// ============================================================================
// Inventory Adjustments
// ============================================================================

export function useCreateInventoryAdjustment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (adjustment: AdjustmentDTO) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createInventoryAdjustment(adjustment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useGetPaginatedAdjustments(
  pageNumber: number,
  pageSize: number,
  filters: AdjustmentFilters
) {
  const { actor, isFetching } = useActor();

  return useQuery<PaginatedAdjustments>({
    queryKey: ['inventory-adjustments', pageNumber, pageSize, filters],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getPaginatedAdjustments(
        BigInt(pageNumber),
        BigInt(pageSize),
        filters
      );
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetInventoryAdjustmentAnalytics() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (filters: AnalyticsFilters) => {
      if (!actor) throw new Error('Actor not available');
      return actor.getInventoryAdjustmentAnalytics(filters);
    },
  });
}

// ============================================================================
// Export
// ============================================================================

export function useExportProducts() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (filters: {
      categoryFilter: bigint | null;
      minStock: bigint | null;
      maxStock: bigint | null;
      fromDate: bigint | null;
      toDate: bigint | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.exportProducts(
        filters.categoryFilter,
        filters.minStock,
        filters.maxStock,
        filters.fromDate,
        filters.toDate
      );
    },
  });
}

export function useExportCategories() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.exportCategories();
    },
  });
}

export function useExportOrders() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (filters: {
      fromDate: bigint | null;
      toDate: bigint | null;
      statusFilter: string | null;
      paymentMethodFilter: string | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.exportOrders(
        filters.fromDate,
        filters.toDate,
        filters.statusFilter,
        filters.paymentMethodFilter
      );
    },
  });
}

// ============================================================================
// Import
// ============================================================================

export function useImportProducts() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (products: ProductImportDTO[]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.importProducts(products);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useImportCategories() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categories: CategoryImportDTO[]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.importCategories(categories);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useImportOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { orders: OrderImportDTO[]; config: OrderImportConfig }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.importOrders(data.orders, data.config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['archivedOrders'] });
    },
  });
}

// ============================================================================
// Legacy Import
// ============================================================================

export function useImportLegacyCategories() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categories: LegacyCategoryImportDTO[]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.importLegacyCategories(categories);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useImportLegacyProducts() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (products: LegacyProductImportDTO[]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.importLegacyProducts(products);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ============================================================================
// Archive
// ============================================================================

export function useGetArchivePreview() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (data: { dateFrom: bigint; dateTo: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.getArchivePreview(data.dateFrom, data.dateTo);
    },
  });
}

export function useArchiveOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { dateFrom: bigint; dateTo: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.archiveOrders(data.dateFrom, data.dateTo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['archivedOrders'] });
    },
  });
}

export function useGetPaginatedArchivedOrders(
  pageNumber: number,
  pageSize: number,
  searchTerm: string,
  searchMode: string,
  fromDate: bigint | null,
  toDate: bigint | null
) {
  const { actor, isFetching } = useActor();

  return useQuery<PaginatedArchivedOrders>({
    queryKey: ['archivedOrders', pageNumber, pageSize, searchTerm, searchMode, fromDate?.toString(), toDate?.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getPaginatedArchivedOrders(
        BigInt(pageNumber),
        BigInt(pageSize),
        searchTerm,
        searchMode,
        fromDate,
        toDate
      );
    },
    enabled: !!actor && !isFetching,
  });
}

// ============================================================================
// Sales Analytics
// ============================================================================

export function useGetSalesAnalyticsData() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (filters: AnalyticsFilters) => {
      if (!actor) throw new Error('Actor not available');
      return actor.getSalesAnalyticsData(filters);
    },
  });
}
