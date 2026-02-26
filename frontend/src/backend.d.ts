import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Product {
    iva: bigint;
    categoryId: bigint;
    updatedDate: bigint;
    name: string;
    createdDate: bigint;
    description: string;
    stock: bigint;
    barcode: string;
    profitMargin: bigint;
    basePrice: number;
}
export interface AnalyticsData {
    archivedOrders: Array<Order>;
    activeOrders: Array<Order>;
}
export interface PaginatedAdjustments {
    totalCount: bigint;
    adjustments: Array<InventoryAdjustment>;
}
export interface OrdersImportResult {
    resultDetails: Array<string>;
    nextOrderId: bigint;
    errors: Array<string>;
    importedCount: bigint;
    updatedCount: bigint;
    errorCount: bigint;
    skippedCount: bigint;
}
export interface LegacyProductImportDTO {
    categoryName: string;
    name: string;
    description: string;
    stock: bigint;
    barcode: string;
    salePrice: number;
}
export interface AnalyticsFilters {
    categoryFilter?: bigint;
    paymentMethodFilter?: string;
    toDate: bigint;
    includeArchived: boolean;
    fromDate: bigint;
}
export interface AdjustmentResult {
    adjustment: InventoryAdjustment;
    warnings: Array<string>;
    success: boolean;
}
export interface OrderItem {
    categoryName: string;
    ivaRate: bigint;
    productName: string;
    quantity: bigint;
    salePrice: number;
    totalPrice: number;
    profitMargin: bigint;
    basePrice: number;
    productBarcode: string;
    updatedStock: bigint;
    originalStock: bigint;
}
export interface CreateOrderResponse {
    order: Order;
    warnings: Array<string>;
    success: boolean;
}
export interface AdjustmentFilters {
    reasonFilter?: string;
    adjustmentTypeFilter?: string;
    toDate?: bigint;
    fromDate?: bigint;
    productSearch?: string;
}
export interface ReturnOrderDTO {
    refundAmount: number;
    originalOrderId: string;
    items: Array<ReturnItem>;
    adminNotes: string;
    originalOrderNumber: string;
    returnType: Variant_full_cancellation_partial;
    otherReason?: string;
    reason: Variant_other_defective_incorrect_change_of_mind;
}
export interface ImportResult {
    errors: Array<string>;
    successCount: bigint;
    errorCount: bigint;
}
export interface AdjustmentDTO {
    dateEffective: bigint;
    quantity: bigint;
    adjustmentType: Variant_decrease_increase;
    adminNotes: string;
    productBarcode: string;
    reason: Variant_theft_broken_expired_lost_count_error;
}
export interface ArchiveResult {
    archivedCount: bigint;
    archivedIds: Array<string>;
}
export interface PaginatedReturns {
    totalCount: bigint;
    returns: Array<ReturnOrder>;
}
export interface ReturnOrder {
    refundAmount: number;
    status: Variant_pending_rejected_processed;
    originalOrderId: string;
    stockRestored: boolean;
    createdDate: bigint;
    items: Array<ReturnItem>;
    processedDate?: bigint;
    statusChangeNotes?: string;
    returnNumber: string;
    adminNotes: string;
    originalOrderNumber: string;
    returnType: Variant_full_cancellation_partial;
    returnId: bigint;
    otherReason?: string;
    reason: Variant_other_defective_incorrect_change_of_mind;
}
export interface ReceiptData {
    order?: Order;
    receiptType: Variant_order_returnOrder;
    returnOrder?: ReturnOrder;
    storeInfo: {
        name: string;
        whatsapp: string;
        address: string;
        phone: string;
    };
    timestamp: bigint;
}
export interface OrderImportConfig {
    targetDataset: string;
    preserveTimestamps: boolean;
    updateStock: boolean;
    conflictResolution: string;
}
export interface LegacyCategoryImportDTO {
    defaultIVA: bigint;
    order: bigint;
    name: string;
    defaultProfitMargin: bigint;
}
export interface AdjustmentAnalytics {
    totalValueLost: number;
    mostAffectedProduct?: {
        name: string;
        amount: bigint;
    };
    totalAdjustments: bigint;
    primaryReason?: string;
}
export interface TaxBreakdownExportDTO {
    taxableAmount: number;
    ivaRate: bigint;
    baseAmount: number;
    taxAmount: number;
}
export interface ProductWithCategory {
    categoryName: string;
    product: Product;
}
export interface ProductExportDTO {
    iva: bigint;
    categoryId: bigint;
    updatedDate: string;
    name: string;
    createdDate: string;
    description: string;
    stock: bigint;
    barcode: string;
    salePrice: number;
    profitMargin: bigint;
    basePrice: number;
}
export interface OrderImportDTO {
    status: string;
    customerNotes: string;
    paymentMethod: string;
    discountAmount: number;
    orderId: string;
    printReceipt: boolean;
    totalAmount: number;
    timestamp: bigint;
    taxBreakdown?: Array<TaxBreakdownImportDTO>;
    items: Array<OrderItemImportDTO>;
    orderNumber: string;
}
export interface CategoriesImportResult {
    errors: Array<string>;
    importedCount: bigint;
    errorCount: bigint;
    skippedCount: bigint;
}
export interface Category {
    id: bigint;
    defaultIVA: bigint;
    order: bigint;
    name: string;
    defaultProfitMargin: bigint;
}
export interface ArchivedOrder {
    order: Order;
    archiveDate: bigint;
}
export interface ProductSearchResult {
    iva: bigint;
    categoryName: string;
    name: string;
    stock: bigint;
    barcode: string;
    profitMargin: bigint;
    basePrice: number;
}
export interface PaginatedArchivedOrders {
    orders: Array<ArchivedOrder>;
    totalCount: bigint;
}
export interface PaginatedOrders {
    orders: Array<Order>;
    totalCount: bigint;
}
export interface ProductsImportResult {
    errors: Array<string>;
    importedCount: bigint;
    errorCount: bigint;
    skippedCount: bigint;
}
export interface ProductsExportResult {
    totalCount: bigint;
    products: Array<ProductExportDTO>;
    exportTimestamp: string;
}
export interface OrderItemExportDTO {
    categoryName: string;
    ivaRate: bigint;
    productName: string;
    quantity: bigint;
    salePrice: number;
    totalPrice: number;
    profitMargin: bigint;
    basePrice: number;
    productBarcode: string;
}
export interface TaxBreakdown {
    taxableAmount: number;
    ivaRate: bigint;
    baseAmount: number;
    taxAmount: number;
}
export interface StoreDetails {
    taxId?: string;
    lastUpdated: bigint;
    whatsapp: string;
    email?: string;
    website?: string;
    address: string;
    storeName: string;
    phone: string;
}
export interface CategoriesExportResult {
    categories: Array<CategoryExportDTO>;
    totalCount: bigint;
    exportTimestamp: string;
}
export interface ProductImportDTO {
    iva: bigint;
    categoryId: bigint;
    updatedDate: bigint;
    name: string;
    createdDate: bigint;
    description: string;
    stock: bigint;
    barcode: string;
    profitMargin: bigint;
    basePrice: number;
}
export interface Order {
    customerName?: string;
    status: Variant_valid_invalid;
    customerNotes: string;
    paymentMethod: Variant_card_cash_transfer;
    discountAmount: number;
    orderId: string;
    customerTaxId?: string;
    invoiceType: string;
    printReceipt: boolean;
    totalAmount: number;
    timestamp: bigint;
    taxBreakdown?: Array<TaxBreakdown>;
    items: Array<OrderItem>;
    orderNumber: string;
}
export interface ReturnItem {
    returnedQuantity: bigint;
    categoryName: string;
    stockRestored: boolean;
    originalQuantity: bigint;
    productName: string;
    refundPerUnit: number;
    totalRefund: number;
    productBarcode: string;
}
export interface CategoryImportDTO {
    categoryId: bigint;
    defaultIVA: bigint;
    order: bigint;
    name: string;
    defaultProfitMargin: bigint;
}
export interface OrdersExportResult {
    orders: Array<OrderExportDTO>;
    totalCount: bigint;
    exportTimestamp: string;
}
export interface OrderExportDTO {
    status: string;
    customerNotes: string;
    paymentMethod: string;
    discountAmount: number;
    orderId: string;
    printReceipt: boolean;
    totalAmount: number;
    timestamp: string;
    taxBreakdown?: Array<TaxBreakdownExportDTO>;
    items: Array<OrderItemExportDTO>;
    orderNumber: string;
}
export interface ArchivePreviewResult {
    orderCount: bigint;
}
export interface TaxBreakdownImportDTO {
    taxableAmount: number;
    ivaRate: bigint;
    baseAmount: number;
    taxAmount: number;
}
export interface StatusResult {
    message: string;
    success: boolean;
}
export interface InventoryAdjustment {
    dateEffective: bigint;
    productName: string;
    adminUserId: string;
    timestamp: bigint;
    newStock: bigint;
    previousStock: bigint;
    quantity: bigint;
    adjustmentId: bigint;
    adjustmentType: Variant_decrease_increase;
    adminNotes: string;
    productBarcode: string;
    reason: Variant_theft_broken_expired_lost_count_error;
}
export interface PaginatedProducts {
    totalCount: bigint;
    products: Array<ProductWithCategory>;
}
export interface CreateOrderRequest {
    customerName?: string;
    customerNotes: string;
    paymentMethod: Variant_card_cash_transfer;
    discountAmount: number;
    customerTaxId?: string;
    invoiceType: string;
    printReceipt: boolean;
    taxBreakdown?: Array<TaxBreakdown>;
    items: Array<OrderItem>;
}
export interface CategoryExportDTO {
    id: bigint;
    defaultIVA: bigint;
    order: bigint;
    name: string;
    defaultProfitMargin: bigint;
    productCount: bigint;
}
export interface ReturnResult {
    returnOrder: ReturnOrder;
    warnings: Array<string>;
    success: boolean;
}
export interface UserProfile {
    name: string;
}
export interface OrderItemImportDTO {
    categoryName: string;
    ivaRate: bigint;
    productName: string;
    quantity: bigint;
    salePrice: number;
    totalPrice: number;
    profitMargin: bigint;
    basePrice: number;
    productBarcode: string;
    updatedStock: bigint;
    originalStock: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_card_cash_transfer {
    card = "card",
    cash = "cash",
    transfer = "transfer"
}
export enum Variant_decrease_increase {
    decrease = "decrease",
    increase = "increase"
}
export enum Variant_full_cancellation_partial {
    full = "full",
    cancellation = "cancellation",
    partial = "partial"
}
export enum Variant_order_returnOrder {
    order = "order",
    returnOrder = "returnOrder"
}
export enum Variant_other_defective_incorrect_change_of_mind {
    other = "other",
    defective = "defective",
    incorrect = "incorrect",
    change_of_mind = "change_of_mind"
}
export enum Variant_pending_rejected_processed {
    pending = "pending",
    rejected = "rejected",
    processed = "processed"
}
export enum Variant_theft_broken_expired_lost_count_error {
    theft = "theft",
    broken = "broken",
    expired = "expired",
    lost = "lost",
    count = "count",
    error = "error"
}
export enum Variant_valid_invalid {
    valid = "valid",
    invalid = "invalid"
}
export interface backendInterface {
    addCategory(name: string, order: bigint, defaultIVA: bigint, defaultProfitMargin: bigint): Promise<bigint>;
    addProduct(product: Product): Promise<void>;
    archiveOrders(dateFrom: bigint, dateTo: bigint): Promise<ArchiveResult>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignCallerUserRoleByText(principalId: string, role: UserRole): Promise<void>;
    bulkUpdateCategories(updates: Array<[bigint, bigint | null, bigint | null]>): Promise<void>;
    bulkUpdateProductsByCategory(categoryId: bigint, newIVA: bigint, newProfitMargin: bigint): Promise<void>;
    createInventoryAdjustment(adjustment: AdjustmentDTO): Promise<AdjustmentResult>;
    createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse>;
    createReturn(returnData: ReturnOrderDTO): Promise<ReturnResult>;
    deleteCategory(id: bigint, confirmPassword: string): Promise<void>;
    deleteProduct(barcode: string, confirmPassword: string): Promise<void>;
    exportCategories(): Promise<CategoriesExportResult>;
    exportOrders(fromDate: bigint | null, toDate: bigint | null, statusFilter: string | null, paymentMethodFilter: string | null): Promise<OrdersExportResult>;
    exportProducts(categoryFilter: bigint | null, minStock: bigint | null, maxStock: bigint | null, fromDate: bigint | null, toDate: bigint | null): Promise<ProductsExportResult>;
    generateReturnReceipt(returnId: bigint): Promise<ReceiptData | null>;
    getArchivePreview(dateFrom: bigint, dateTo: bigint): Promise<ArchivePreviewResult>;
    getArchivedOrderDetails(orderId: string): Promise<Order | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCategories(): Promise<Array<Category>>;
    getInventoryAdjustmentAnalytics(filters: AnalyticsFilters): Promise<AdjustmentAnalytics>;
    getOrder(orderNumber: string): Promise<Order | null>;
    getOrders(): Promise<Array<Order>>;
    getPaginatedAdjustments(pageNumber: bigint, pageSize: bigint, filters: AdjustmentFilters): Promise<PaginatedAdjustments>;
    getPaginatedArchivedOrders(pageNumber: bigint, pageSize: bigint, searchTerm: string, searchMode: string, fromDate: bigint | null, toDate: bigint | null): Promise<PaginatedArchivedOrders>;
    getPaginatedOrders(pageNumber: bigint, pageSize: bigint, searchTerm: string, searchMode: string, fromDate: bigint | null, toDate: bigint | null, invoiceTypeFilter: string | null): Promise<PaginatedOrders>;
    getPaginatedProducts(pageNumber: bigint, pageSize: bigint, searchTerm: string, searchMode: string, categoryFilter: bigint, stockFilter: bigint | null, ivaFilter: bigint | null): Promise<PaginatedProducts>;
    getPaginatedReturns(pageNumber: bigint, pageSize: bigint, searchTerm: string, searchMode: string, typeFilter: string, statusFilter: string, reasonFilter: string, fromDate: bigint | null, toDate: bigint | null, originalOrderNumber: string | null): Promise<PaginatedReturns>;
    getProduct(barcode: string): Promise<Product | null>;
    getReturnDetails(returnId: bigint): Promise<ReturnOrder | null>;
    getSalesAnalyticsData(filters: AnalyticsFilters): Promise<AnalyticsData>;
    getStoreDetails(): Promise<StoreDetails>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    importCategories(categoriesToImport: Array<CategoryImportDTO>): Promise<CategoriesImportResult>;
    importLegacyCategories(categoriesToImport: Array<LegacyCategoryImportDTO>): Promise<ImportResult>;
    importLegacyProducts(productsToImport: Array<LegacyProductImportDTO>): Promise<ImportResult>;
    importOrders(ordersToImport: Array<OrderImportDTO>, config: OrderImportConfig): Promise<OrdersImportResult>;
    importProducts(productsToImport: Array<ProductImportDTO>): Promise<ProductsImportResult>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isUserAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchProductsForCheckout(searchTerm: string, searchMode: string, limit: bigint): Promise<Array<ProductSearchResult>>;
    updateCategory(id: bigint, name: string, order: bigint, defaultIVA: bigint, defaultProfitMargin: bigint): Promise<void>;
    updateProduct(product: Product): Promise<void>;
    updateReturnStatus(returnId: bigint, newStatus: Variant_pending_rejected_processed, adminNotes: string | null): Promise<StatusResult>;
    updateStoreDetails(details: StoreDetails): Promise<{
        message: string;
        success: boolean;
    }>;
}
