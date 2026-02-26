import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Debug "mo:base/Debug";
import Float "mo:base/Float";
import Int "mo:base/Int";
import Array "mo:base/Array";
import Time "mo:base/Time";
import AccessControl "authorization/access-control";

persistent actor AftabShop {
  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
  transient let categoryMap = OrderedMap.Make<Nat>(Nat.compare);
  transient let productMap = OrderedMap.Make<Text>(Text.compare);
  transient let orderMap = OrderedMap.Make<Text>(Text.compare);
  transient let returnMap = OrderedMap.Make<Nat>(Nat.compare);
  transient let adjustmentMap = OrderedMap.Make<Nat>(Nat.compare);

  var categories : OrderedMap.Map<Nat, Category> = categoryMap.empty();
  var products : OrderedMap.Map<Text, Product> = productMap.empty();
  var userProfiles : OrderedMap.Map<Principal, UserProfile> = principalMap.empty();
  var orders : OrderedMap.Map<Text, Order> = orderMap.empty();
  var returns : OrderedMap.Map<Nat, ReturnOrder> = returnMap.empty();
  var storeDetails : ?StoreDetails = null;
  var archivedOrders : OrderedMap.Map<Text, ArchivedOrder> = orderMap.empty();
  var inventoryAdjustments : OrderedMap.Map<Nat, InventoryAdjustment> = adjustmentMap.empty();

  var nextCategoryId : Nat = 1;
  var nextOrderNumber : Nat = 1;
  var nextReturnId : Nat = 1;
  var nextAdjustmentId : Nat = 1;

  var accessControlState : AccessControl.AccessControlState = AccessControl.initState();

  public type UserProfile = {
    name : Text;
  };

  public type Category = {
    id : Nat;
    name : Text;
    order : Nat;
    defaultIVA : Nat;
    defaultProfitMargin : Nat;
  };

  public type Product = {
    barcode : Text;
    name : Text;
    description : Text;
    categoryId : Nat;
    stock : Nat;
    basePrice : Float;
    iva : Nat;
    profitMargin : Nat;
    createdDate : Int;
    updatedDate : Int;
  };

  public type PaginatedProducts = {
    products : [ProductWithCategory];
    totalCount : Nat;
  };

  public type ProductWithCategory = {
    product : Product;
    categoryName : Text;
  };

  public type OrderItem = {
    productBarcode : Text;
    productName : Text;
    categoryName : Text;
    quantity : Nat;
    basePrice : Float;
    ivaRate : Nat;
    profitMargin : Nat;
    salePrice : Float;
    totalPrice : Float;
    originalStock : Nat;
    updatedStock : Nat;
  };

  public type TaxBreakdown = {
    ivaRate : Nat;
    baseAmount : Float;
    taxAmount : Float;
    taxableAmount : Float;
  };

  public type Order = {
    orderId : Text;
    orderNumber : Text;
    timestamp : Int;
    status : {
      #valid;
      #invalid;
    };
    totalAmount : Float;
    discountAmount : Float;
    paymentMethod : {
      #cash;
      #card;
      #transfer;
    };
    customerNotes : Text;
    printReceipt : Bool;
    items : [OrderItem];
    taxBreakdown : ?[TaxBreakdown];
    invoiceType : Text;
    customerName : ?Text;
    customerTaxId : ?Text;
  };

  public type ProductSearchResult = {
    barcode : Text;
    name : Text;
    categoryName : Text;
    stock : Nat;
    basePrice : Float;
    iva : Nat;
    profitMargin : Nat;
  };

  public type CreateOrderRequest = {
    items : [OrderItem];
    paymentMethod : {
      #cash;
      #card;
      #transfer;
    };
    customerNotes : Text;
    printReceipt : Bool;
    discountAmount : Float;
    taxBreakdown : ?[TaxBreakdown];
    invoiceType : Text;
    customerName : ?Text;
    customerTaxId : ?Text;
  };

  public type CreateOrderResponse = {
    success : Bool;
    order : Order;
    warnings : [Text];
  };

  public type LegacyCategoryImportDTO = {
    name : Text;
    order : Nat;
    defaultIVA : Nat;
    defaultProfitMargin : Nat;
  };

  public type LegacyProductImportDTO = {
    barcode : Text;
    name : Text;
    description : Text;
    categoryName : Text;
    stock : Nat;
    salePrice : Float;
  };

  public type ImportResult = {
    successCount : Nat;
    errorCount : Nat;
    errors : [Text];
  };

  public type PaginatedOrders = {
    orders : [Order];
    totalCount : Nat;
  };

  public type ReturnOrder = {
    returnId : Nat;
    returnNumber : Text;
    originalOrderId : Text;
    originalOrderNumber : Text;
    returnType : {
      #full;
      #partial;
      #cancellation;
    };
    status : {
      #pending;
      #processed;
      #rejected;
    };
    reason : {
      #defective;
      #incorrect;
      #change_of_mind;
      #other;
    };
    otherReason : ?Text;
    refundAmount : Float;
    createdDate : Int;
    processedDate : ?Int;
    adminNotes : Text;
    statusChangeNotes : ?Text;
    items : [ReturnItem];
    stockRestored : Bool;
  };

  public type ReturnItem = {
    productBarcode : Text;
    productName : Text;
    categoryName : Text;
    returnedQuantity : Nat;
    originalQuantity : Nat;
    refundPerUnit : Float;
    totalRefund : Float;
    stockRestored : Bool;
  };

  public type ReturnOrderDTO = {
    originalOrderId : Text;
    originalOrderNumber : Text;
    returnType : {
      #full;
      #partial;
      #cancellation;
    };
    reason : {
      #defective;
      #incorrect;
      #change_of_mind;
      #other;
    };
    otherReason : ?Text;
    refundAmount : Float;
    adminNotes : Text;
    items : [ReturnItem];
  };

  public type ReturnResult = {
    success : Bool;
    returnOrder : ReturnOrder;
    warnings : [Text];
  };

  public type StatusResult = {
    success : Bool;
    message : Text;
  };

  public type PaginatedReturns = {
    returns : [ReturnOrder];
    totalCount : Nat;
  };

  public type ReceiptData = {
    receiptType : {
      #order;
      #returnOrder;
    };
    order : ?Order;
    returnOrder : ?ReturnOrder;
    storeInfo : {
      name : Text;
      address : Text;
      phone : Text;
      whatsapp : Text;
    };
    timestamp : Int;
  };

  public type StoreDetails = {
    storeName : Text;
    address : Text;
    phone : Text;
    whatsapp : Text;
    taxId : ?Text;
    email : ?Text;
    website : ?Text;
    lastUpdated : Int;
  };

  public type ProductExportDTO = {
    barcode : Text;
    name : Text;
    description : Text;
    categoryId : Nat;
    stock : Nat;
    basePrice : Float;
    salePrice : Float;
    iva : Nat;
    profitMargin : Nat;
    createdDate : Text;
    updatedDate : Text;
  };

  public type ProductsExportResult = {
    products : [ProductExportDTO];
    totalCount : Nat;
    exportTimestamp : Text;
  };

  public type CategoryExportDTO = {
    id : Nat;
    name : Text;
    order : Nat;
    defaultIVA : Nat;
    defaultProfitMargin : Nat;
    productCount : Nat;
  };

  public type CategoriesExportResult = {
    categories : [CategoryExportDTO];
    totalCount : Nat;
    exportTimestamp : Text;
  };

  public type OrderItemExportDTO = {
    productBarcode : Text;
    productName : Text;
    categoryName : Text;
    quantity : Nat;
    basePrice : Float;
    ivaRate : Nat;
    profitMargin : Nat;
    salePrice : Float;
    totalPrice : Float;
  };

  public type TaxBreakdownExportDTO = {
    ivaRate : Nat;
    baseAmount : Float;
    taxAmount : Float;
    taxableAmount : Float;
  };

  public type OrderExportDTO = {
    orderId : Text;
    orderNumber : Text;
    timestamp : Text;
    status : Text;
    totalAmount : Float;
    discountAmount : Float;
    paymentMethod : Text;
    customerNotes : Text;
    printReceipt : Bool;
    items : [OrderItemExportDTO];
    taxBreakdown : ?[TaxBreakdownExportDTO];
  };

  public type OrdersExportResult = {
    orders : [OrderExportDTO];
    totalCount : Nat;
    exportTimestamp : Text;
  };

  public type ProductImportDTO = {
    barcode : Text;
    name : Text;
    description : Text;
    categoryId : Nat;
    stock : Nat;
    basePrice : Float;
    iva : Nat;
    profitMargin : Nat;
    createdDate : Int;
    updatedDate : Int;
  };

  public type ProductsImportResult = {
    importedCount : Nat;
    skippedCount : Nat;
    errorCount : Nat;
    errors : [Text];
  };

  public type CategoryImportDTO = {
    categoryId : Nat;
    name : Text;
    order : Nat;
    defaultIVA : Nat;
    defaultProfitMargin : Nat;
  };

  public type CategoriesImportResult = {
    importedCount : Nat;
    skippedCount : Nat;
    errorCount : Nat;
    errors : [Text];
  };

  public type ArchivedOrder = {
    order : Order;
    archiveDate : Int;
  };

  public type PaginatedArchivedOrders = {
    orders : [ArchivedOrder];
    totalCount : Nat;
  };

  public type ArchivePreviewResult = {
    orderCount : Nat;
  };

  public type ArchiveResult = {
    archivedCount : Nat;
    archivedIds : [Text];
  };

  public type AnalyticsFilters = {
    fromDate : Int;
    toDate : Int;
    categoryFilter : ?Nat;
    paymentMethodFilter : ?Text;
    includeArchived : Bool;
  };

  public type AnalyticsData = {
    activeOrders : [Order];
    archivedOrders : [Order];
  };

  public type OrderImportDTO = {
    orderId : Text;
    orderNumber : Text;
    timestamp : Int;
    status : Text;
    totalAmount : Float;
    discountAmount : Float;
    paymentMethod : Text;
    customerNotes : Text;
    printReceipt : Bool;
    items : [OrderItemImportDTO];
    taxBreakdown : ?[TaxBreakdownImportDTO];
  };

  public type OrderItemImportDTO = {
    productBarcode : Text;
    productName : Text;
    categoryName : Text;
    quantity : Nat;
    basePrice : Float;
    ivaRate : Nat;
    profitMargin : Nat;
    salePrice : Float;
    totalPrice : Float;
    originalStock : Nat;
    updatedStock : Nat;
  };

  public type TaxBreakdownImportDTO = {
    ivaRate : Nat;
    baseAmount : Float;
    taxAmount : Float;
    taxableAmount : Float;
  };

  public type OrderImportConfig = {
    targetDataset : Text;
    conflictResolution : Text;
    updateStock : Bool;
    preserveTimestamps : Bool;
  };

  public type OrdersImportResult = {
    importedCount : Nat;
    skippedCount : Nat;
    updatedCount : Nat;
    errorCount : Nat;
    errors : [Text];
    resultDetails : [Text];
    nextOrderId : Nat;
  };

  public type InventoryAdjustment = {
    adjustmentId : Nat;
    productBarcode : Text;
    productName : Text;
    adjustmentType : {
      #increase;
      #decrease;
    };
    quantity : Nat;
    reason : {
      #expired;
      #lost;
      #broken;
      #theft;
      #error;
      #count;
    };
    previousStock : Nat;
    newStock : Nat;
    adminNotes : Text;
    timestamp : Int;
    adminUserId : Text;
    dateEffective : Int;
  };

  public type AdjustmentDTO = {
    productBarcode : Text;
    adjustmentType : {
      #increase;
      #decrease;
    };
    quantity : Nat;
    reason : {
      #expired;
      #lost;
      #broken;
      #theft;
      #error;
      #count;
    };
    adminNotes : Text;
    dateEffective : Int;
  };

  public type AdjustmentResult = {
    success : Bool;
    adjustment : InventoryAdjustment;
    warnings : [Text];
  };

  public type AdjustmentFilters = {
    productSearch : ?Text;
    reasonFilter : ?Text;
    adjustmentTypeFilter : ?Text;
    fromDate : ?Int;
    toDate : ?Int;
  };

  public type PaginatedAdjustments = {
    adjustments : [InventoryAdjustment];
    totalCount : Nat;
  };

  public type AdjustmentAnalytics = {
    totalValueLost : Float;
    totalAdjustments : Nat;
    mostAffectedProduct : ?{
      name : Text;
      amount : Nat;
    };
    primaryReason : ?Text;
  };

  // ============================================================================
  // Helper Functions
  // ============================================================================

  func roundToTwo(value : Float) : Float {
    Float.fromInt(Int.abs(Float.toInt(value * 100.0))) / 100.0;
  };

  func calculateSalePrice(basePrice : Float, iva : Nat, profitMargin : Nat) : Float {
    let profitAmount = roundToTwo(basePrice * (Float.fromInt(profitMargin) / 100.0));
    let priceBeforeIva = roundToTwo(basePrice + profitAmount);
    let ivaAmount = roundToTwo(priceBeforeIva * (Float.fromInt(iva) / 100.0));
    let salePrice = roundToTwo(priceBeforeIva + ivaAmount);
    salePrice;
  };

  func isValidPrincipalFormat(principalId : Text) : Bool {
    if (Text.size(principalId) == 0) {
      return false;
    };

    let validChars = "abcdefghijklmnopqrstuvwxyz0123456789-";
    for (char in principalId.chars()) {
      if (not Text.contains(validChars, #char char)) {
        return false;
      };
    };

    true;
  };

  func getMaxCategoryId() : Nat {
    var maxId : Nat = 0;
    for ((id, _) in categoryMap.entries(categories)) {
      if (id > maxId) {
        maxId := id;
      };
    };
    maxId;
  };

  func extractOrderNumeric(orderNumber : Text) : ?Nat {
    let stripped = if (Text.startsWith(orderNumber, #text("ORD-"))) {
      Text.replace(orderNumber, #text("ORD-"), "");
    } else {
      orderNumber;
    };
    Nat.fromText(stripped);
  };

  func extractReturnNumeric(returnNumber : Text) : ?Nat {
    let stripped = if (Text.startsWith(returnNumber, #text("DEV-"))) {
      Text.replace(returnNumber, #text("DEV-"), "");
    } else {
      returnNumber;
    };
    Nat.fromText(stripped);
  };

  func isValidIVARate(iva : Nat) : Bool {
    iva == 0 or iva == 4 or iva == 10 or iva == 21;
  };

  // ============================================================================
  // Access Control Initialization
  // ============================================================================

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public shared ({ caller }) func assignCallerUserRoleByText(principalId : Text, role : AccessControl.UserRole) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can assign user roles");
    };

    if (Text.size(principalId) == 0) {
      Debug.trap("El campo ID de principal es obligatorio");
    };

    if (not isValidPrincipalFormat(principalId)) {
      Debug.trap("ID de principal inválido");
    };

    let userPrincipal = Principal.fromText(principalId);
    AccessControl.assignRole(accessControlState, caller, userPrincipal, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // ============================================================================
  // User Profile Management
  // ============================================================================

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can access profiles");
    };
    principalMap.get(userProfiles, caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Can only view your own profile");
    };
    principalMap.get(userProfiles, user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles := principalMap.put(userProfiles, caller, profile);
  };

  // ============================================================================
  // Admin User Management - Frontend Integration Endpoint
  // ============================================================================

  public query ({ caller }) func isUserAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // ============================================================================
  // Category Management (Admin-only)
  // ============================================================================

  public shared ({ caller }) func addCategory(name : Text, order : Nat, defaultIVA : Nat, defaultProfitMargin : Nat) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can add categories");
    };

    if (not isValidIVARate(defaultIVA)) {
      Debug.trap("IVA inválido: debe ser 0, 4, 10 o 21");
    };

    let currentMaxId = getMaxCategoryId();
    let categoryId = currentMaxId + 1;

    let category : Category = {
      id = categoryId;
      name;
      order;
      defaultIVA;
      defaultProfitMargin;
    };
    categories := categoryMap.put(categories, categoryId, category);
    nextCategoryId := categoryId + 1;

    categoryId;
  };

  public shared ({ caller }) func updateCategory(id : Nat, name : Text, order : Nat, defaultIVA : Nat, defaultProfitMargin : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can update categories");
    };

    if (not isValidIVARate(defaultIVA)) {
      Debug.trap("IVA inválido: debe ser 0, 4, 10 o 21");
    };

    let category : Category = {
      id;
      name;
      order;
      defaultIVA;
      defaultProfitMargin;
    };
    categories := categoryMap.put(categories, id, category);
  };

  public shared ({ caller }) func deleteCategory(id : Nat, confirmPassword : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can delete categories");
    };

    if (confirmPassword != "DeleteIsUnsafe") {
      Debug.trap("Contraseña de confirmación incorrecta");
    };

    let associatedProductsCount = Array.foldLeft<Product, Nat>(
      Iter.toArray(productMap.vals(products)),
      0,
      func(acc : Nat, product : Product) : Nat {
        if (product.categoryId == id) { acc + 1 } else { acc };
      },
    );

    if (associatedProductsCount > 0) {
      Debug.trap("No se puede eliminar la categoría porque tiene productos asociados. Elimine o reasigne los productos primero.");
    };

    categories := categoryMap.delete(categories, id);
  };

  public shared ({ caller }) func bulkUpdateCategories(updates : [(Nat, ?Nat, ?Nat)]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can bulk update categories");
    };

    for ((id, maybeIVA, maybeMargin) in updates.vals()) {
      switch (categoryMap.get(categories, id)) {
        case (?existingCategory) {
          let newIVA = switch (maybeIVA) {
            case (?iva) iva;
            case null existingCategory.defaultIVA;
          };

          if (not isValidIVARate(newIVA)) {
            Debug.trap("IVA inválido: debe ser 0, 4, 10 o 21");
          };

          let updatedCategory : Category = {
            id = existingCategory.id;
            name = existingCategory.name;
            order = existingCategory.order;
            defaultIVA = newIVA;
            defaultProfitMargin = switch (maybeMargin) {
              case (?margin) margin;
              case null existingCategory.defaultProfitMargin;
            };
          };
          categories := categoryMap.put(categories, id, updatedCategory);
        };
        case null {};
      };
    };
  };

  public query ({ caller }) func getCategories() : async [Category] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view categories");
    };

    Iter.toArray(categoryMap.vals(categories));
  };

  // ============================================================================
  // Product Management (Admin-only)
  // ============================================================================

  public shared ({ caller }) func addProduct(product : Product) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can add products");
    };

    if (not isValidIVARate(product.iva)) {
      Debug.trap("IVA inválido: debe ser 0, 4, 10 o 21");
    };

    Debug.print("Adding product with IVA: " # Nat.toText(product.iva));
    products := productMap.put(products, product.barcode, product);
  };

  public shared ({ caller }) func updateProduct(product : Product) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can update products");
    };

    if (not isValidIVARate(product.iva)) {
      Debug.trap("IVA inválido: debe ser 0, 4, 10 o 21");
    };

    Debug.print("Updating product with IVA: " # Nat.toText(product.iva));
    products := productMap.put(products, product.barcode, product);
  };

  public shared ({ caller }) func deleteProduct(barcode : Text, confirmPassword : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can delete products");
    };

    if (confirmPassword != "DeleteIsUnsafe") {
      Debug.trap("Contraseña de confirmación incorrecta");
    };

    products := productMap.delete(products, barcode);
  };

  public query ({ caller }) func getProduct(barcode : Text) : async ?Product {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view products");
    };

    productMap.get(products, barcode);
  };

  public query ({ caller }) func getPaginatedProducts(pageNumber : Nat, pageSize : Nat, searchTerm : Text, searchMode : Text, categoryFilter : Nat, stockFilter : ?Nat, ivaFilter : ?Nat) : async PaginatedProducts {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view products");
    };

    var filteredProducts = Iter.toArray(productMap.vals(products));

    if (searchTerm != "") {
      filteredProducts := Array.filter<Product>(
        filteredProducts,
        func(product : Product) : Bool {
          if (searchMode == "barcode-exact") {
            return product.barcode == searchTerm;
          } else {
            return Text.contains(Text.toLowercase(product.name), #text(Text.toLowercase(searchTerm))) or Text.contains(Text.toLowercase(product.description), #text(Text.toLowercase(searchTerm)));
          };
        },
      );
    };

    if (categoryFilter != 0) {
      filteredProducts := Array.filter<Product>(
        filteredProducts,
        func(product : Product) : Bool {
          product.categoryId == categoryFilter;
        },
      );
    };

    switch (stockFilter) {
      case (?stock) {
        if (stock == 0) {
          filteredProducts := Array.filter<Product>(
            filteredProducts,
            func(product : Product) : Bool {
              product.stock == 0;
            },
          );
        } else if (stock > 0) {
          filteredProducts := Array.filter<Product>(
            filteredProducts,
            func(product : Product) : Bool {
              product.stock <= stock;
            },
          );
        };
      };
      case null {};
    };

    switch (ivaFilter) {
      case (?ivaValue) {
        filteredProducts := Array.filter<Product>(
          filteredProducts,
          func(product : Product) : Bool {
            product.iva == ivaValue;
          },
        );
      };
      case null {};
    };

    let totalCount = filteredProducts.size();

    let startIndex = pageNumber * pageSize;
    let endIndex = if (startIndex + pageSize > totalCount) { totalCount } else { startIndex + pageSize };
    let paginatedProducts = Array.subArray(filteredProducts, startIndex, Nat.sub(endIndex, startIndex));

    let productsWithCategory = Array.map<Product, ProductWithCategory>(
      paginatedProducts,
      func(product : Product) : ProductWithCategory {
        let categoryName = switch (categoryMap.get(categories, product.categoryId)) {
          case (?category) category.name;
          case null "";
        };
        {
          product;
          categoryName;
        };
      },
    );

    {
      products = productsWithCategory;
      totalCount;
    };
  };

  public shared ({ caller }) func bulkUpdateProductsByCategory(categoryId : Nat, newIVA : Nat, newProfitMargin : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can bulk update products");
    };

    if (not isValidIVARate(newIVA)) {
      Debug.trap("IVA inválido: debe ser 0, 4, 10 o 21");
    };

    for ((barcode, product) in productMap.entries(products)) {
      if (product.categoryId == categoryId) {
        let updatedProduct : Product = {
          barcode = product.barcode;
          name = product.name;
          description = product.description;
          categoryId = product.categoryId;
          stock = product.stock;
          basePrice = product.basePrice;
          iva = newIVA;
          profitMargin = newProfitMargin;
          createdDate = product.createdDate;
          updatedDate = Int.abs(Time.now());
        };
        products := productMap.put(products, barcode, updatedProduct);
      };
    };
  };

  // ============================================================================
  // Product Search for Checkout (Admin-only)
  // ============================================================================

  public query ({ caller }) func searchProductsForCheckout(searchTerm : Text, searchMode : Text, limit : Nat) : async [ProductSearchResult] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can search products for checkout");
    };

    var filteredProducts = Iter.toArray(productMap.vals(products));

    if (searchTerm != "") {
      filteredProducts := Array.filter<Product>(
        filteredProducts,
        func(product : Product) : Bool {
          if (searchMode == "barcode-exact") {
            return product.barcode == searchTerm;
          } else {
            return Text.contains(Text.toLowercase(product.name), #text(Text.toLowercase(searchTerm))) or Text.contains(Text.toLowercase(product.description), #text(Text.toLowercase(searchTerm)));
          };
        },
      );
    };

    let limitedProducts = if (filteredProducts.size() > limit) {
      Array.subArray(filteredProducts, 0, limit);
    } else {
      filteredProducts;
    };

    Array.map<Product, ProductSearchResult>(
      limitedProducts,
      func(product : Product) : ProductSearchResult {
        let categoryName = switch (categoryMap.get(categories, product.categoryId)) {
          case (?category) category.name;
          case null "";
        };

        Debug.print("Product search result - Barcode: " # product.barcode # ", IVA: " # Nat.toText(product.iva));

        {
          barcode = product.barcode;
          name = product.name;
          categoryName;
          stock = product.stock;
          basePrice = product.basePrice;
          iva = product.iva;
          profitMargin = product.profitMargin;
        };
      },
    );
  };

  // ============================================================================
  // Order Management (Admin-only)
  // ============================================================================

  public shared ({ caller }) func createOrder(request : CreateOrderRequest) : async CreateOrderResponse {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can create orders");
    };

    Debug.print("Creating order with " # Nat.toText(request.items.size()) # " items");

    var warnings : [Text] = [];

    for (item in request.items.vals()) {
      Debug.print("Order item - Barcode: " # item.productBarcode # ", IVA Rate: " # Nat.toText(item.ivaRate) # ", Quantity: " # Nat.toText(item.quantity));

      if (not isValidIVARate(item.ivaRate)) {
        warnings := Array.append(warnings, ["IVA inválido para " # item.productName # ": " # Nat.toText(item.ivaRate) # " (debe ser 0, 4, 10 o 21)"]);
      };

      switch (productMap.get(products, item.productBarcode)) {
        case (?product) {
          if (product.stock < item.quantity) {
            warnings := Array.append(warnings, ["Stock insuficiente para " # product.name # ": disponible " # Nat.toText(product.stock) # ", solicitado " # Nat.toText(item.quantity)]);

            let updatedProduct : Product = {
              barcode = product.barcode;
              name = product.name;
              description = product.description;
              categoryId = product.categoryId;
              stock = 0;
              basePrice = product.basePrice;
              iva = product.iva;
              profitMargin = product.profitMargin;
              createdDate = product.createdDate;
              updatedDate = Int.abs(Time.now());
            };
            products := productMap.put(products, item.productBarcode, updatedProduct);
          } else {
            let updatedProduct : Product = {
              barcode = product.barcode;
              name = product.name;
              description = product.description;
              categoryId = product.categoryId;
              stock = if (product.stock >= item.quantity) {
                product.stock - item.quantity;
              } else { 0 };
              basePrice = product.basePrice;
              iva = product.iva;
              profitMargin = product.profitMargin;
              createdDate = product.createdDate;
              updatedDate = Int.abs(Time.now());
            };
            products := productMap.put(products, item.productBarcode, updatedProduct);
          };
        };
        case null {
          Debug.print("Custom product (not in inventory): " # item.productBarcode);
        };
      };
    };

    let orderNumber = "ORD-" # Nat.toText(nextOrderNumber);
    nextOrderNumber += 1;

    let totalAmount = Array.foldLeft<OrderItem, Float>(
      request.items,
      0.0,
      func(acc : Float, item : OrderItem) : Float {
        acc + item.totalPrice;
      },
    );

    let finalTotalAmount = if (totalAmount - request.discountAmount < 0.0) {
      0.0;
    } else {
      totalAmount - request.discountAmount;
    };

    Debug.print("Order total before discount: " # Float.toText(totalAmount) # ", discount: " # Float.toText(request.discountAmount) # ", final total: " # Float.toText(finalTotalAmount));

    let order : Order = {
      orderId = orderNumber;
      orderNumber;
      timestamp = Int.abs(Time.now());
      status = #valid;
      totalAmount = finalTotalAmount;
      discountAmount = request.discountAmount;
      paymentMethod = request.paymentMethod;
      customerNotes = request.customerNotes;
      printReceipt = request.printReceipt;
      items = request.items;
      taxBreakdown = request.taxBreakdown;
      invoiceType = request.invoiceType;
      customerName = request.customerName;
      customerTaxId = request.customerTaxId;
    };

    orders := orderMap.put(orders, orderNumber, order);

    Debug.print("Order created successfully: " # orderNumber);

    {
      success = true;
      order;
      warnings;
    };
  };

  public query ({ caller }) func getOrders() : async [Order] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view orders");
    };

    Iter.toArray(orderMap.vals(orders));
  };

  public query ({ caller }) func getOrder(orderNumber : Text) : async ?Order {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view orders");
    };

    orderMap.get(orders, orderNumber);
  };

  // ============================================================================
  // Paginated Orders (Admin-only)
  // ============================================================================

  public query ({ caller }) func getPaginatedOrders(pageNumber : Nat, pageSize : Nat, searchTerm : Text, searchMode : Text, fromDate : ?Int, toDate : ?Int, invoiceTypeFilter : ?Text) : async PaginatedOrders {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view paginated orders");
    };

    var filteredOrders = Iter.toArray(orderMap.vals(orders));

    switch (fromDate, toDate) {
      case (?from, ?to) {
        filteredOrders := Array.filter<Order>(
          filteredOrders,
          func(order : Order) : Bool {
            order.timestamp >= from and order.timestamp <= to
          },
        );
      };
      case (?from, null) {
        filteredOrders := Array.filter<Order>(
          filteredOrders,
          func(order : Order) : Bool {
            order.timestamp >= from
          },
        );
      };
      case (null, ?to) {
        filteredOrders := Array.filter<Order>(
          filteredOrders,
          func(order : Order) : Bool {
            order.timestamp <= to
          },
        );
      };
      case (null, null) {};
    };

    switch (invoiceTypeFilter) {
      case (?invoiceTypeFilterValue) {
        if (invoiceTypeFilterValue == "simplified" or invoiceTypeFilterValue == "full") {
          filteredOrders := Array.filter<Order>(filteredOrders, func(o : Order) : Bool { o.invoiceType == invoiceTypeFilterValue });
        };
      };
      case null {};
    };

    if (searchTerm != "") {
      if (searchMode == "order-exact") {
        switch (Nat.fromText(searchTerm)) {
          case (?searchValue) {
            filteredOrders := Array.filter<Order>(
              filteredOrders,
              func(order : Order) : Bool {
                switch (extractOrderNumeric(order.orderNumber)) {
                  case (?orderNum) orderNum == searchValue;
                  case null false;
                };
              },
            );
          };
          case null {
            filteredOrders := [];
          };
        };
      } else if (searchMode == "barcode-exact") {
        filteredOrders := Array.filter<Order>(
          filteredOrders,
          func(order : Order) : Bool {
            Array.find<OrderItem>(
              order.items,
              func(item : OrderItem) : Bool {
                item.productBarcode == searchTerm
              },
            ) != null;
          },
        );
      } else {
        filteredOrders := Array.filter<Order>(
          filteredOrders,
          func(order : Order) : Bool {
            Text.contains(Text.toLowercase(order.orderNumber), #text(Text.toLowercase(searchTerm))) or Array.find<OrderItem>(
              order.items,
              func(item : OrderItem) : Bool {
                Text.contains(Text.toLowercase(item.productName), #text(Text.toLowercase(searchTerm)));
              },
            ) != null or Text.contains(Text.toLowercase(order.customerNotes), #text(Text.toLowercase(searchTerm)));
          },
        );
      };
    };

    filteredOrders := Array.sort<Order>(
      filteredOrders,
      func(a : Order, b : Order) : { #less; #equal; #greater } {
        if (a.timestamp > b.timestamp) { #less } else if (a.timestamp < b.timestamp) { #greater } else {
          #equal;
        };
      },
    );

    let totalCount = filteredOrders.size();

    let startIndex = pageNumber * pageSize;
    let endIndex = if (startIndex + pageSize > totalCount) { totalCount } else { startIndex + pageSize };
    let paginatedOrders = Array.subArray(filteredOrders, startIndex, Nat.sub(endIndex, startIndex));

    {
      orders = paginatedOrders;
      totalCount;
    };
  };

  // ============================================================================
  // Returns System (Admin-only)
  // ============================================================================

  public shared ({ caller }) func createReturn(returnData : ReturnOrderDTO) : async ReturnResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can create returns");
    };

    let existingReturn = Array.find<ReturnOrder>(
      Iter.toArray(returnMap.vals(returns)),
      func(r : ReturnOrder) : Bool {
        r.originalOrderId == returnData.originalOrderId;
      },
    );

    switch (existingReturn) {
      case (?returnOrder) {
        {
          success = false;
          returnOrder;
          warnings = ["Ya existe una devolución para el pedido original"];
        };
      };
      case null {
        let returnId = nextReturnId;
        let returnNumber = "DEV-" # Nat.toText(returnId);

        let newReturn : ReturnOrder = {
          returnId;
          returnNumber;
          originalOrderId = returnData.originalOrderId;
          originalOrderNumber = returnData.originalOrderNumber;
          returnType = returnData.returnType;
          status = #pending;
          reason = returnData.reason;
          otherReason = returnData.otherReason;
          refundAmount = returnData.refundAmount;
          createdDate = Int.abs(Time.now());
          processedDate = null;
          adminNotes = returnData.adminNotes;
          statusChangeNotes = null;
          items = returnData.items;
          stockRestored = false;
        };

        returns := returnMap.put(returns, returnId, newReturn);
        nextReturnId += 1;

        {
          success = true;
          returnOrder = newReturn;
          warnings = [];
        };
      };
    };
  };

  public shared ({ caller }) func updateReturnStatus(returnId : Nat, newStatus : { #pending; #processed; #rejected }, adminNotes : ?Text) : async StatusResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can update return status");
    };

    switch (returnMap.get(returns, returnId)) {
      case (?existingReturn) {
        if (existingReturn.status != #pending) {
          return {
            success = false;
            message = "Solo se pueden actualizar devoluciones pendientes";
          };
        };

        let updatedReturn : ReturnOrder = {
          existingReturn with
          status = newStatus;
          processedDate = ?Int.abs(Time.now());
          statusChangeNotes = adminNotes;
          stockRestored = newStatus == #processed;
        };

        returns := returnMap.put(returns, returnId, updatedReturn);

        if (newStatus == #processed and not existingReturn.stockRestored) {
          for (item in existingReturn.items.vals()) {
            switch (productMap.get(products, item.productBarcode)) {
              case (?product) {
                let updatedProduct : Product = {
                  product with stock = product.stock + item.returnedQuantity;
                };
                products := productMap.put(products, item.productBarcode, updatedProduct);
              };
              case null {};
            };
          };
        };

        {
          success = true;
          message = "Estado de devolución actualizado correctamente";
        };
      };
      case null {
        {
          success = false;
          message = "Devolución no encontrada";
        };
      };
    };
  };

  public query ({ caller }) func getReturnDetails(returnId : Nat) : async ?ReturnOrder {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view return details");
    };

    returnMap.get(returns, returnId);
  };

  // ============================================================================
  // Paginated Returns (Admin-only)
  // ============================================================================

  public query ({ caller }) func getPaginatedReturns(pageNumber : Nat, pageSize : Nat, searchTerm : Text, searchMode : Text, typeFilter : Text, statusFilter : Text, reasonFilter : Text, fromDate : ?Int, toDate : ?Int, originalOrderNumber : ?Text) : async PaginatedReturns {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view paginated returns");
    };

    var filteredReturns = Iter.toArray(returnMap.vals(returns));

    switch (fromDate, toDate) {
      case (?from, ?to) {
        filteredReturns := Array.filter<ReturnOrder>(
          filteredReturns,
          func(r : ReturnOrder) : Bool {
            r.createdDate >= from and r.createdDate <= to
          },
        );
      };
      case (?from, null) {
        filteredReturns := Array.filter<ReturnOrder>(
          filteredReturns,
          func(r : ReturnOrder) : Bool {
            r.createdDate >= from
          },
        );
      };
      case (null, ?to) {
        filteredReturns := Array.filter<ReturnOrder>(
          filteredReturns,
          func(r : ReturnOrder) : Bool {
            r.createdDate <= to
          },
        );
      };
      case (null, null) {};
    };

    if (searchTerm != "") {
      if (searchMode == "return-exact") {
        switch (Nat.fromText(searchTerm)) {
          case (?searchValue) {
            let returnMatches = Array.filter<ReturnOrder>(
              filteredReturns,
              func(r : ReturnOrder) : Bool {
                switch (extractReturnNumeric(r.returnNumber)) {
                  case (?returnNum) returnNum == searchValue;
                  case null false;
                };
              },
            );

            let orderMatches = Array.filter<ReturnOrder>(
              filteredReturns,
              func(r : ReturnOrder) : Bool {
                switch (extractOrderNumeric(r.originalOrderNumber)) {
                  case (?orderNum) orderNum == searchValue;
                  case null false;
                };
              },
            );

            let combinedResults = Array.append(returnMatches, orderMatches);
            let uniqueResults = Array.foldLeft<ReturnOrder, [ReturnOrder]>(
              combinedResults,
              [],
              func(acc : [ReturnOrder], item : ReturnOrder) : [ReturnOrder] {
                if (Array.find<ReturnOrder>(acc, func(existing : ReturnOrder) : Bool { existing.returnId == item.returnId }) == null) {
                  Array.append(acc, [item]);
                } else {
                  acc;
                };
              },
            );

            filteredReturns := uniqueResults;
          };
          case null {
            filteredReturns := [];
          };
        };
      } else if (searchMode == "barcode-exact") {
        filteredReturns := Array.filter<ReturnOrder>(
          filteredReturns,
          func(r : ReturnOrder) : Bool {
            Array.find<ReturnItem>(
              r.items,
              func(item : ReturnItem) : Bool {
                item.productBarcode == searchTerm
              },
            ) != null;
          },
        );
      } else {
        filteredReturns := Array.filter<ReturnOrder>(
          filteredReturns,
          func(r : ReturnOrder) : Bool {
            Text.contains(Text.toLowercase(r.returnNumber), #text(Text.toLowercase(searchTerm))) or Text.contains(Text.toLowercase(r.originalOrderNumber), #text(Text.toLowercase(searchTerm))) or Array.find<ReturnItem>(
              r.items,
              func(item : ReturnItem) : Bool {
                Text.contains(Text.toLowercase(item.productName), #text(Text.toLowercase(searchTerm)));
              },
            ) != null or Text.contains(Text.toLowercase(r.adminNotes), #text(Text.toLowercase(searchTerm)));
          },
        );
      };
    };

    if (typeFilter != "all") {
      filteredReturns := Array.filter<ReturnOrder>(
        filteredReturns,
        func(r : ReturnOrder) : Bool {
          switch (r.returnType, typeFilter) {
            case (#full, "full") true;
            case (#partial, "partial") true;
            case (#cancellation, "cancellation") true;
            case (_, _) false;
          };
        },
      );
    };

    if (statusFilter != "all") {
      filteredReturns := Array.filter<ReturnOrder>(
        filteredReturns,
        func(r : ReturnOrder) : Bool {
          switch (r.status, statusFilter) {
            case (#pending, "pending") true;
            case (#processed, "processed") true;
            case (#rejected, "rejected") true;
            case (_, _) false;
          };
        },
      );
    };

    if (reasonFilter != "all") {
      filteredReturns := Array.filter<ReturnOrder>(
        filteredReturns,
        func(r : ReturnOrder) : Bool {
          switch (r.reason, reasonFilter) {
            case (#defective, "defective") true;
            case (#incorrect, "incorrect") true;
            case (#change_of_mind, "change_of_mind") true;
            case (#other, "other") true;
            case (_, _) false;
          };
        },
      );
    };

    switch (originalOrderNumber) {
      case (?orderNumber) {
        filteredReturns := Array.filter<ReturnOrder>(
          filteredReturns,
          func(r : ReturnOrder) : Bool {
            Text.contains(Text.toLowercase(r.originalOrderNumber), #text(Text.toLowercase(orderNumber)));
          },
        );
      };
      case null {};
    };

    filteredReturns := Array.sort<ReturnOrder>(
      filteredReturns,
      func(a : ReturnOrder, b : ReturnOrder) : { #less; #equal; #greater } {
        if (a.createdDate > b.createdDate) { #less } else if (a.createdDate < b.createdDate) { #greater } else {
          #equal;
        };
      },
    );

    let totalCount = filteredReturns.size();

    let startIndex = pageNumber * pageSize;
    let endIndex = if (startIndex + pageSize > totalCount) { totalCount } else { startIndex + pageSize };
    let paginatedReturns = Array.subArray(filteredReturns, startIndex, Nat.sub(endIndex, startIndex));

    {
      returns = paginatedReturns;
      totalCount;
    };
  };

  public query ({ caller }) func generateReturnReceipt(returnId : Nat) : async ?ReceiptData {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can generate return receipts");
    };

    switch (returnMap.get(returns, returnId)) {
      case (?returnOrder) {
        let storeInfo = {
          name = "AFTAB STORE";
          address = "C. ALBERTILLAS, 5, LOCAL, 29003 MÁLAGA";
          phone = "952233833";
          whatsapp = "695250655";
        };

        ?{
          receiptType = #returnOrder;
          order = null;
          returnOrder = ?returnOrder;
          storeInfo;
          timestamp = Int.abs(Time.now());
        };
      };
      case null {
        null;
      };
    };
  };

  // ============================================================================
  // Store Details Management (Admin-only)
  // ============================================================================

  public query ({ caller }) func getStoreDetails() : async StoreDetails {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view store details");
    };

    switch (storeDetails) {
      case (?details) details;
      case null {
        {
          storeName = "AFTAB STORE";
          address = "C. ALBERTILLAS, 5, LOCAL, 29003 MÁLAGA";
          phone = "952233833";
          whatsapp = "695250655";
          taxId = null;
          email = null;
          website = null;
          lastUpdated = Int.abs(Time.now());
        };
      };
    };
  };

  public shared ({ caller }) func updateStoreDetails(details : StoreDetails) : async { success : Bool; message : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can update store details");
    };

    storeDetails := ?details;
    {
      success = true;
      message = "Datos de tienda actualizados correctamente";
    };
  };

  // ============================================================================
  // Inventory Adjustments (Admin-only)
  // ============================================================================

  public shared ({ caller }) func createInventoryAdjustment(adjustment : AdjustmentDTO) : async AdjustmentResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can create inventory adjustments");
    };

    var warnings : [Text] = [];

    switch (productMap.get(products, adjustment.productBarcode)) {
      case (?product) {
        let previousStock = product.stock;
        let newStock = switch (adjustment.adjustmentType) {
          case (#increase) {
            previousStock + adjustment.quantity;
          };
          case (#decrease) {
            if (previousStock >= adjustment.quantity) {
              previousStock - adjustment.quantity;
            } else {
              warnings := Array.append(warnings, ["Stock insuficiente para reducción: disponible " # Nat.toText(previousStock) # ", solicitado " # Nat.toText(adjustment.quantity)]);
              0;
            };
          };
        };

        let updatedProduct : Product = {
          product with
          stock = newStock;
          updatedDate = Int.abs(Time.now());
        };
        products := productMap.put(products, adjustment.productBarcode, updatedProduct);

        let adjustmentId = nextAdjustmentId;
        nextAdjustmentId += 1;

        let inventoryAdjustment : InventoryAdjustment = {
          adjustmentId;
          productBarcode = adjustment.productBarcode;
          productName = product.name;
          adjustmentType = adjustment.adjustmentType;
          quantity = adjustment.quantity;
          reason = adjustment.reason;
          previousStock;
          newStock;
          adminNotes = adjustment.adminNotes;
          timestamp = Int.abs(Time.now());
          adminUserId = Principal.toText(caller);
          dateEffective = adjustment.dateEffective;
        };

        inventoryAdjustments := adjustmentMap.put(inventoryAdjustments, adjustmentId, inventoryAdjustment);

        {
          success = true;
          adjustment = inventoryAdjustment;
          warnings;
        };
      };
      case null {
        Debug.trap("Producto no encontrado: " # adjustment.productBarcode);
      };
    };
  };

  public query ({ caller }) func getPaginatedAdjustments(pageNumber : Nat, pageSize : Nat, filters : AdjustmentFilters) : async PaginatedAdjustments {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view inventory adjustments");
    };

    var filteredAdjustments = Iter.toArray(adjustmentMap.vals(inventoryAdjustments));

    switch (filters.productSearch) {
      case (?searchTerm) {
        if (searchTerm != "") {
          filteredAdjustments := Array.filter<InventoryAdjustment>(
            filteredAdjustments,
            func(adj : InventoryAdjustment) : Bool {
              Text.contains(Text.toLowercase(adj.productName), #text(Text.toLowercase(searchTerm))) or Text.contains(Text.toLowercase(adj.productBarcode), #text(Text.toLowercase(searchTerm)));
            },
          );
        };
      };
      case null {};
    };

    switch (filters.reasonFilter) {
      case (?reasonFilterValue) {
        if (reasonFilterValue != "all") {
          filteredAdjustments := Array.filter<InventoryAdjustment>(
            filteredAdjustments,
            func(adj : InventoryAdjustment) : Bool {
              switch (adj.reason, reasonFilterValue) {
                case (#expired, "expired") true;
                case (#lost, "lost") true;
                case (#broken, "broken") true;
                case (#theft, "theft") true;
                case (#error, "error") true;
                case (#count, "count") true;
                case (_, _) false;
              };
            },
          );
        };
      };
      case null {};
    };

    switch (filters.adjustmentTypeFilter) {
      case (?typeFilterValue) {
        if (typeFilterValue != "all") {
          filteredAdjustments := Array.filter<InventoryAdjustment>(
            filteredAdjustments,
            func(adj : InventoryAdjustment) : Bool {
              switch (adj.adjustmentType, typeFilterValue) {
                case (#increase, "increase") true;
                case (#decrease, "decrease") true;
                case (_, _) false;
              };
            },
          );
        };
      };
      case null {};
    };

    switch (filters.fromDate, filters.toDate) {
      case (?from, ?to) {
        filteredAdjustments := Array.filter<InventoryAdjustment>(
          filteredAdjustments,
          func(adj : InventoryAdjustment) : Bool {
            adj.dateEffective >= from and adj.dateEffective <= to
          },
        );
      };
      case (?from, null) {
        filteredAdjustments := Array.filter<InventoryAdjustment>(
          filteredAdjustments,
          func(adj : InventoryAdjustment) : Bool {
            adj.dateEffective >= from
          },
        );
      };
      case (null, ?to) {
        filteredAdjustments := Array.filter<InventoryAdjustment>(
          filteredAdjustments,
          func(adj : InventoryAdjustment) : Bool {
            adj.dateEffective <= to
          },
        );
      };
      case (null, null) {};
    };

    filteredAdjustments := Array.sort<InventoryAdjustment>(
      filteredAdjustments,
      func(a : InventoryAdjustment, b : InventoryAdjustment) : { #less; #equal; #greater } {
        if (a.timestamp > b.timestamp) { #less } else if (a.timestamp < b.timestamp) { #greater } else {
          #equal;
        };
      },
    );

    let totalCount = filteredAdjustments.size();

    let startIndex = pageNumber * pageSize;
    let endIndex = if (startIndex + pageSize > totalCount) { totalCount } else { startIndex + pageSize };
    let paginatedAdjustments = Array.subArray(filteredAdjustments, startIndex, Nat.sub(endIndex, startIndex));

    {
      adjustments = paginatedAdjustments;
      totalCount;
    };
  };

  public query ({ caller }) func getInventoryAdjustmentAnalytics(filters : AnalyticsFilters) : async AdjustmentAnalytics {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can access inventory adjustment analytics");
    };

    var filteredAdjustments = Iter.toArray(adjustmentMap.vals(inventoryAdjustments));

    filteredAdjustments := Array.filter<InventoryAdjustment>(
      filteredAdjustments,
      func(adj : InventoryAdjustment) : Bool {
        adj.dateEffective >= filters.fromDate and adj.dateEffective <= filters.toDate
      },
    );

    var totalValueLost : Float = 0.0;
    var totalAdjustments : Nat = filteredAdjustments.size();

    for (adj in filteredAdjustments.vals()) {
      switch (adj.adjustmentType) {
        case (#decrease) {
          switch (productMap.get(products, adj.productBarcode)) {
            case (?product) {
              let salePrice = calculateSalePrice(product.basePrice, product.iva, product.profitMargin);
              totalValueLost += salePrice * Float.fromInt(adj.quantity);
            };
            case null {};
          };
        };
        case (#increase) {};
      };
    };

    {
      totalValueLost;
      totalAdjustments;
      mostAffectedProduct = null;
      primaryReason = null;
    };
  };

  // ============================================================================
  // Export Functions (Admin-only)
  // ============================================================================

  public query ({ caller }) func exportProducts(categoryFilter : ?Nat, minStock : ?Nat, maxStock : ?Nat, fromDate : ?Int, toDate : ?Int) : async ProductsExportResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can export products");
    };

    var filteredProducts = Iter.toArray(productMap.vals(products));

    switch (categoryFilter) {
      case (?catId) {
        filteredProducts := Array.filter<Product>(
          filteredProducts,
          func(p : Product) : Bool { p.categoryId == catId },
        );
      };
      case null {};
    };

    switch (minStock) {
      case (?min) {
        filteredProducts := Array.filter<Product>(
          filteredProducts,
          func(p : Product) : Bool { p.stock >= min },
        );
      };
      case null {};
    };

    switch (maxStock) {
      case (?max) {
        filteredProducts := Array.filter<Product>(
          filteredProducts,
          func(p : Product) : Bool { p.stock <= max },
        );
      };
      case null {};
    };

    let exportedProducts = Array.map<Product, ProductExportDTO>(
      filteredProducts,
      func(p : Product) : ProductExportDTO {
        {
          barcode = p.barcode;
          name = p.name;
          description = p.description;
          categoryId = p.categoryId;
          stock = p.stock;
          basePrice = p.basePrice;
          salePrice = calculateSalePrice(p.basePrice, p.iva, p.profitMargin);
          iva = p.iva;
          profitMargin = p.profitMargin;
          createdDate = Int.toText(p.createdDate);
          updatedDate = Int.toText(p.updatedDate);
        };
      },
    );

    {
      products = exportedProducts;
      totalCount = exportedProducts.size();
      exportTimestamp = Int.toText(Int.abs(Time.now()));
    };
  };

  public query ({ caller }) func exportCategories() : async CategoriesExportResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can export categories");
    };

    let allCategories = Iter.toArray(categoryMap.vals(categories));

    let exportedCategories = Array.map<Category, CategoryExportDTO>(
      allCategories,
      func(c : Category) : CategoryExportDTO {
        let productCount = Array.foldLeft<Product, Nat>(
          Iter.toArray(productMap.vals(products)),
          0,
          func(acc : Nat, p : Product) : Nat {
            if (p.categoryId == c.id) { acc + 1 } else { acc };
          },
        );

        {
          id = c.id;
          name = c.name;
          order = c.order;
          defaultIVA = c.defaultIVA;
          defaultProfitMargin = c.defaultProfitMargin;
          productCount;
        };
      },
    );

    {
      categories = exportedCategories;
      totalCount = exportedCategories.size();
      exportTimestamp = Int.toText(Int.abs(Time.now()));
    };
  };

  public query ({ caller }) func exportOrders(fromDate : ?Int, toDate : ?Int, statusFilter : ?Text, paymentMethodFilter : ?Text) : async OrdersExportResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can export orders");
    };

    var filteredOrders = Iter.toArray(orderMap.vals(orders));

    switch (fromDate, toDate) {
      case (?from, ?to) {
        filteredOrders := Array.filter<Order>(
          filteredOrders,
          func(o : Order) : Bool {
            o.timestamp >= from and o.timestamp <= to
          },
        );
      };
      case (?from, null) {
        filteredOrders := Array.filter<Order>(
          filteredOrders,
          func(o : Order) : Bool {
            o.timestamp >= from
          },
        );
      };
      case (null, ?to) {
        filteredOrders := Array.filter<Order>(
          filteredOrders,
          func(o : Order) : Bool {
            o.timestamp <= to
          },
        );
      };
      case (null, null) {};
    };

    let exportedOrders = Array.map<Order, OrderExportDTO>(
      filteredOrders,
      func(o : Order) : OrderExportDTO {
        let statusText = switch (o.status) {
          case (#valid) "valid";
          case (#invalid) "invalid";
        };

        let paymentMethodText = switch (o.paymentMethod) {
          case (#cash) "cash";
          case (#card) "card";
          case (#transfer) "transfer";
        };

        let exportedItems = Array.map<OrderItem, OrderItemExportDTO>(
          o.items,
          func(item : OrderItem) : OrderItemExportDTO {
            {
              productBarcode = item.productBarcode;
              productName = item.productName;
              categoryName = item.categoryName;
              quantity = item.quantity;
              basePrice = item.basePrice;
              ivaRate = item.ivaRate;
              profitMargin = item.profitMargin;
              salePrice = item.salePrice;
              totalPrice = item.totalPrice;
            };
          },
        );

        let exportedTaxBreakdown = switch (o.taxBreakdown) {
          case (?breakdown) {
            ?Array.map<TaxBreakdown, TaxBreakdownExportDTO>(
              breakdown,
              func(tb : TaxBreakdown) : TaxBreakdownExportDTO {
                {
                  ivaRate = tb.ivaRate;
                  baseAmount = tb.baseAmount;
                  taxAmount = tb.taxAmount;
                  taxableAmount = tb.taxableAmount;
                };
              },
            );
          };
          case null null;
        };

        {
          orderId = o.orderId;
          orderNumber = o.orderNumber;
          timestamp = Int.toText(o.timestamp);
          status = statusText;
          totalAmount = o.totalAmount;
          discountAmount = o.discountAmount;
          paymentMethod = paymentMethodText;
          customerNotes = o.customerNotes;
          printReceipt = o.printReceipt;
          items = exportedItems;
          taxBreakdown = exportedTaxBreakdown;
        };
      },
    );

    {
      orders = exportedOrders;
      totalCount = exportedOrders.size();
      exportTimestamp = Int.toText(Int.abs(Time.now()));
    };
  };

  // ============================================================================
  // Import Functions (Admin-only)
  // ============================================================================

  public shared ({ caller }) func importProducts(productsToImport : [ProductImportDTO]) : async ProductsImportResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can import products");
    };

    var importedCount : Nat = 0;
    var skippedCount : Nat = 0;
    var errorCount : Nat = 0;
    var errors : [Text] = [];

    for (dto in productsToImport.vals()) {
      if (not isValidIVARate(dto.iva)) {
        errorCount += 1;
        errors := Array.append(errors, ["IVA inválido para " # dto.barcode # ": " # Nat.toText(dto.iva)]);
      } else {
        switch (productMap.get(products, dto.barcode)) {
          case (?_) {
            skippedCount += 1;
          };
          case null {
            let product : Product = {
              barcode = dto.barcode;
              name = dto.name;
              description = dto.description;
              categoryId = dto.categoryId;
              stock = dto.stock;
              basePrice = dto.basePrice;
              iva = dto.iva;
              profitMargin = dto.profitMargin;
              createdDate = dto.createdDate;
              updatedDate = dto.updatedDate;
            };
            products := productMap.put(products, dto.barcode, product);
            importedCount += 1;
          };
        };
      };
    };

    {
      importedCount;
      skippedCount;
      errorCount;
      errors;
    };
  };

  public shared ({ caller }) func importCategories(categoriesToImport : [CategoryImportDTO]) : async CategoriesImportResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can import categories");
    };

    var importedCount : Nat = 0;
    var skippedCount : Nat = 0;
    var errorCount : Nat = 0;
    var errors : [Text] = [];

    for (dto in categoriesToImport.vals()) {
      if (not isValidIVARate(dto.defaultIVA)) {
        errorCount += 1;
        errors := Array.append(errors, ["IVA inválido para categoría " # Nat.toText(dto.categoryId) # ": " # Nat.toText(dto.defaultIVA)]);
      } else {
        switch (categoryMap.get(categories, dto.categoryId)) {
          case (?_) {
            skippedCount += 1;
          };
          case null {
            let category : Category = {
              id = dto.categoryId;
              name = dto.name;
              order = dto.order;
              defaultIVA = dto.defaultIVA;
              defaultProfitMargin = dto.defaultProfitMargin;
            };
            categories := categoryMap.put(categories, dto.categoryId, category);
            importedCount += 1;

            if (dto.categoryId >= nextCategoryId) {
              nextCategoryId := dto.categoryId + 1;
            };
          };
        };
      };
    };

    {
      importedCount;
      skippedCount;
      errorCount;
      errors;
    };
  };

  public shared ({ caller }) func importLegacyCategories(categoriesToImport : [LegacyCategoryImportDTO]) : async ImportResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can import legacy categories");
    };

    var successCount : Nat = 0;
    var errorCount : Nat = 0;
    var errors : [Text] = [];

    for (dto in categoriesToImport.vals()) {
      if (not isValidIVARate(dto.defaultIVA)) {
        errorCount += 1;
        errors := Array.append(errors, ["IVA inválido para categoría " # dto.name # ": " # Nat.toText(dto.defaultIVA)]);
      } else {
        let currentMaxId = getMaxCategoryId();
        let categoryId = currentMaxId + 1;

        let category : Category = {
          id = categoryId;
          name = dto.name;
          order = dto.order;
          defaultIVA = dto.defaultIVA;
          defaultProfitMargin = dto.defaultProfitMargin;
        };
        categories := categoryMap.put(categories, categoryId, category);
        nextCategoryId := categoryId + 1;
        successCount += 1;
      };
    };

    {
      successCount;
      errorCount;
      errors;
    };
  };

  public shared ({ caller }) func importLegacyProducts(productsToImport : [LegacyProductImportDTO]) : async ImportResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can import legacy products");
    };

    var successCount : Nat = 0;
    var errorCount : Nat = 0;
    var errors : [Text] = [];

    for (dto in productsToImport.vals()) {
      switch (productMap.get(products, dto.barcode)) {
        case (?_) {
          errorCount += 1;
          errors := Array.append(errors, ["Producto duplicado: " # dto.barcode]);
        };
        case null {
          successCount += 1;
        };
      };
    };

    {
      successCount;
      errorCount;
      errors;
    };
  };

  public shared ({ caller }) func importOrders(ordersToImport : [OrderImportDTO], config : OrderImportConfig) : async OrdersImportResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can import orders");
    };

    var importedCount : Nat = 0;
    var skippedCount : Nat = 0;
    var updatedCount : Nat = 0;
    var errorCount : Nat = 0;
    var errors : [Text] = [];
    var resultDetails : [Text] = [];
    var maxImportedOrderId : Nat = 0;

    for (dto in ordersToImport.vals()) {
      var statusIsValid : Bool = false;
      var paymentMethodIsValid : Bool = false;

      let status = switch (Text.toLowercase(dto.status)) {
        case "valid" {
          statusIsValid := true;
          #valid;
        };
        case "invalid" {
          statusIsValid := true;
          #invalid;
        };
        case _ {
          errorCount += 1;
          errors := Array.append(errors, ["Estado de pedido inválido para " # dto.orderNumber]);
          statusIsValid := false;
          #valid;
        };
      };

      let paymentMethod = switch (Text.toLowercase(dto.paymentMethod)) {
        case "cash" {
          paymentMethodIsValid := true;
          #cash;
        };
        case "card" {
          paymentMethodIsValid := true;
          #card;
        };
        case "transfer" {
          paymentMethodIsValid := true;
          #transfer;
        };
        case _ {
          errorCount += 1;
          errors := Array.append(errors, ["Método de pago inválido para " # dto.orderNumber]);
          paymentMethodIsValid := false;
          #cash;
        };
      };

      if (not statusIsValid or not paymentMethodIsValid) {
        errorCount += 1;
        errors := Array.append(errors, ["Pedido inválido para " # dto.orderNumber]);
      } else {

        let orderItems = Array.map<OrderItemImportDTO, OrderItem>(
          dto.items,
          func(item : OrderItemImportDTO) : OrderItem {
            if (not isValidIVARate(item.ivaRate)) {
              Debug.print("Warning: Invalid IVA rate in imported order item: " # Nat.toText(item.ivaRate));
            };

            {
              productBarcode = item.productBarcode;
              productName = item.productName;
              categoryName = item.categoryName;
              quantity = item.quantity;
              basePrice = item.basePrice;
              ivaRate = item.ivaRate;
              profitMargin = item.profitMargin;
              salePrice = item.salePrice;
              totalPrice = item.totalPrice;
              originalStock = item.originalStock;
              updatedStock = item.updatedStock;
            };
          },
        );

        let taxBreakdown = switch (dto.taxBreakdown) {
          case (?taxes) {
            ?Array.map<TaxBreakdownImportDTO, TaxBreakdown>(
              taxes,
              func(tb : TaxBreakdownImportDTO) : TaxBreakdown {
                {
                  ivaRate = tb.ivaRate;
                  baseAmount = tb.baseAmount;
                  taxAmount = tb.taxAmount;
                  taxableAmount = tb.taxableAmount;
                };
              },
            );
          };
          case null null;
        };

        let order : Order = {
          orderId = dto.orderId;
          orderNumber = dto.orderNumber;
          timestamp = dto.timestamp;
          status;
          totalAmount = dto.totalAmount;
          discountAmount = dto.discountAmount;
          paymentMethod;
          customerNotes = dto.customerNotes;
          printReceipt = dto.printReceipt;
          items = orderItems;
          taxBreakdown;
          invoiceType = "simplified";
          customerName = null;
          customerTaxId = null;
        };

        let orderNumberParts = Text.split(dto.orderNumber, #char '-');
        switch (orderNumberParts.next()) {
          case (?prefix) {
            if (Text.equal(prefix, "ORD")) {
              switch (orderNumberParts.next()) {
                case (?orderIdText) {
                  switch (Nat.fromText(orderIdText)) {
                    case (?orderId) {
                      if (orderId > maxImportedOrderId) {
                        maxImportedOrderId := orderId;
                      };
                    };
                    case null {};
                  };
                };
                case null {};
              };
            };
          };
          case null {};
        };

        switch (config.targetDataset) {
          case "active" {
            switch (orderMap.get(orders, dto.orderNumber)) {
              case (?existingOrder) {
                if (config.conflictResolution == "update") {
                  orders := orderMap.put(orders, dto.orderNumber, order);
                  updatedCount += 1;
                  resultDetails := Array.append(resultDetails, ["Pedido actualizado: " # dto.orderNumber]);
                } else {
                  skippedCount += 1;
                };
              };
              case null {
                orders := orderMap.put(orders, dto.orderNumber, order);
                importedCount += 1;
              };
            };
          };
          case "archived" {
            switch (orderMap.get(archivedOrders, dto.orderNumber)) {
              case (?existingArchived) {
                if (config.conflictResolution == "update") {
                  let archivedOrder : ArchivedOrder = {
                    order = order;
                    archiveDate = Int.abs(Time.now());
                  };
                  archivedOrders := orderMap.put(archivedOrders, dto.orderNumber, archivedOrder);
                  updatedCount += 1;
                  resultDetails := Array.append(resultDetails, ["Pedido archivado actualizado: " # dto.orderNumber]);
                } else {
                  skippedCount += 1;
                };
              };
              case null {
                let archivedOrder : ArchivedOrder = {
                  order;
                  archiveDate = Int.abs(Time.now());
                };
                archivedOrders := orderMap.put(archivedOrders, dto.orderNumber, archivedOrder);
                importedCount += 1;
                resultDetails := Array.append(resultDetails, ["Pedido archivado: " # dto.orderNumber]);
              };
            };
          };
          case _ {
            errorCount += 1;
            errors := Array.append(errors, ["Dataset objetivo inválido para " # dto.orderNumber]);
          };
        };
      };
    };

    let updatedNextOrderNumber = if (maxImportedOrderId + 1 > nextOrderNumber) {
      maxImportedOrderId + 1;
    } else {
      nextOrderNumber;
    };
    nextOrderNumber := updatedNextOrderNumber;

    {
      importedCount;
      skippedCount;
      updatedCount;
      errorCount;
      errors;
      resultDetails;
      nextOrderId = updatedNextOrderNumber;
    };
  };

  // ============================================================================
  // Archive Management (Admin-only)
  // ============================================================================

  public query ({ caller }) func getArchivePreview(dateFrom : Int, dateTo : Int) : async ArchivePreviewResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can preview archive");
    };

    let ordersInRange = Array.filter<Order>(
      Iter.toArray(orderMap.vals(orders)),
      func(o : Order) : Bool {
        o.timestamp >= dateFrom and o.timestamp <= dateTo
      },
    );

    {
      orderCount = ordersInRange.size();
    };
  };

  public shared ({ caller }) func archiveOrders(dateFrom : Int, dateTo : Int) : async ArchiveResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can archive orders");
    };

    let ordersToArchive = Array.filter<Order>(
      Iter.toArray(orderMap.vals(orders)),
      func(o : Order) : Bool {
        o.timestamp >= dateFrom and o.timestamp <= dateTo
      },
    );

    var archivedIds : [Text] = [];
    let archiveDate = Int.abs(Time.now());

    for (order in ordersToArchive.vals()) {
      let archivedOrder : ArchivedOrder = {
        order;
        archiveDate;
      };
      archivedOrders := orderMap.put(archivedOrders, order.orderNumber, archivedOrder);
      orders := orderMap.delete(orders, order.orderNumber);
      archivedIds := Array.append(archivedIds, [order.orderNumber]);
    };

    {
      archivedCount = archivedIds.size();
      archivedIds;
    };
  };

  public query ({ caller }) func getPaginatedArchivedOrders(pageNumber : Nat, pageSize : Nat, searchTerm : Text, searchMode : Text, fromDate : ?Int, toDate : ?Int) : async PaginatedArchivedOrders {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view archived orders");
    };

    var filteredArchivedOrders = Iter.toArray(orderMap.vals(archivedOrders));

    switch (fromDate, toDate) {
      case (?from, ?to) {
        filteredArchivedOrders := Array.filter<ArchivedOrder>(
          filteredArchivedOrders,
          func(archivedOrder : ArchivedOrder) : Bool {
            archivedOrder.order.timestamp >= from and archivedOrder.order.timestamp <= to
          },
        );
      };
      case (?from, null) {
        filteredArchivedOrders := Array.filter<ArchivedOrder>(
          filteredArchivedOrders,
          func(archivedOrder : ArchivedOrder) : Bool {
            archivedOrder.order.timestamp >= from
          },
        );
      };
      case (null, ?to) {
        filteredArchivedOrders := Array.filter<ArchivedOrder>(
          filteredArchivedOrders,
          func(archivedOrder : ArchivedOrder) : Bool {
            archivedOrder.order.timestamp <= to
          },
        );
      };
      case (null, null) {};
    };

    filteredArchivedOrders := Array.sort<ArchivedOrder>(
      filteredArchivedOrders,
      func(a : ArchivedOrder, b : ArchivedOrder) : { #less; #equal; #greater } {
        if (a.archiveDate > b.archiveDate) { #less } else if (a.archiveDate < b.archiveDate) { #greater } else {
          #equal;
        };
      },
    );

    let totalCount = filteredArchivedOrders.size();

    let startIndex = pageNumber * pageSize;
    let endIndex = if (startIndex + pageSize > totalCount) { totalCount } else { startIndex + pageSize };
    let paginatedArchivedOrders = Array.subArray(filteredArchivedOrders, startIndex, Nat.sub(endIndex, startIndex));

    {
      orders = paginatedArchivedOrders;
      totalCount;
    };
  };

  public query ({ caller }) func getArchivedOrderDetails(orderId : Text) : async ?Order {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view archived order details");
    };

    switch (orderMap.get(archivedOrders, orderId)) {
      case (?archivedOrder) ?archivedOrder.order;
      case null null;
    };
  };

  // ============================================================================
  // Sales Analytics (Admin-only)
  // ============================================================================

  public query ({ caller }) func getSalesAnalyticsData(filters : AnalyticsFilters) : async AnalyticsData {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can access sales analytics");
    };

    var activeOrdersList = Iter.toArray(orderMap.vals(orders));

    activeOrdersList := Array.filter<Order>(
      activeOrdersList,
      func(o : Order) : Bool {
        o.timestamp >= filters.fromDate and o.timestamp <= filters.toDate
      },
    );

    let archivedOrdersList = if (filters.includeArchived) {
      var archivedList = Iter.toArray(orderMap.vals(archivedOrders));
      archivedList := Array.filter<ArchivedOrder>(
        archivedList,
        func(ao : ArchivedOrder) : Bool {
          ao.order.timestamp >= filters.fromDate and ao.order.timestamp <= filters.toDate
        },
      );
      Array.map<ArchivedOrder, Order>(
        archivedList,
        func(ao : ArchivedOrder) : Order { ao.order },
      );
    } else {
      [];
    };

    {
      activeOrders = activeOrdersList;
      archivedOrders = archivedOrdersList;
    };
  };
};
