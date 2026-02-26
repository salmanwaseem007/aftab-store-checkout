# Aftab Shop   Admin Dashboard Application

## Overview
A Spanish-language admin dashboard application for "Aftab Shop" with Internet Identity authentication, admin role verification, and responsive design.

## Authentication & Authorization
- Internet Identity integration with all user interface text in Spanish
- Internet Identity alternative origins configuration file at `frontend/public/.well-known/ii-alternative-origins` containing JSON with alternativeOrigins array including "https://store.aftabstore.com" and "https://www.store.aftabstore.com"
- Login page displays when user is not authenticated
- After successful Internet Identity login, backend verifies admin status via `isUserAdmin` endpoint
- Admin dashboard displays only for authenticated admin users
- Access Denied interface displays for authenticated non-admin users
- Logout functionality available from both dashboard header and Access Denied page
- **Persistent User Role Management**: User roles are stored in stable variables that persist across canister upgrades and deployments
- First user initialization works for fresh deployments without overwriting existing roles during upgrades
- All role assignment methods maintain functional compatibility while ensuring persistence

## Session Management
- Web Worker-based session keep-alive system that activates after successful Internet Identity authentication
- Session worker (`session-worker.js`) runs every 60 seconds and posts keep-alive messages to main thread
- Main application listens for worker messages and dispatches synthetic mousemove events to maintain session activity
- Worker lifecycle managed automatically: starts on authentication, terminates on logout
- Graceful degradation with console logging if Web Workers are not supported
- No backend API calls or network requests for session management

## Application Structure
- Single route application (/) with conditional rendering based on authentication and admin status
- No URL changes during navigation
- Content renders within root route based on user permissions

## Login Interface
- Clean, centered login design
- "Aftab Shop" branding prominently displayed
- Internet Identity authentication button
- All text in Spanish

## Access Denied Interface
- Displayed for authenticated users without admin permissions
- Centered layout similar to login page
- Spanish content:
  - Heading: "Acceso Denegado"
  - Subheading: "No tienes permisos de administrador para acceder a este panel."
  - Label: "Tu ID de Internet Identity:"
- User's principal ID displayed with copy-to-clipboard functionality
- Toast notification "ID copiado al portapapeles" on successful copy
- "Cerrar Sesión" logout button
- No header, side panel, or navigation elements
- Uses existing theme variables and responsive layout

## Admin Dashboard Layout

### Header
- Fixed header with maximum width of 1200px, centered horizontally
- Contains three elements:
  - Hamburger menu icon (far left)
  - "Aftab Shop" title (left-aligned, clickable to return to dashboard)
  - "Cerrar Sesión" logout button (far right)
- Only visible for authenticated admin users

### Side Panel Navigation
- Collapsible vertical navigation panel that overlays content
- Always collapsed by default on both desktop and mobile
- Expands when hamburger menu is clicked
- Full viewport width overlay on mobile devices
- Contains navigation links in Spanish:
  - Dashboard
  - Caja
  - Productos
  - Categorías
  - Usuarios Admin
  - Datos de Tienda
  - Análisis de Ventas
  - Importación Legacy
  - Importación
  - Exportación
  - Archivo de Pedidos
- Active link is visually highlighted
- **Fixed Navigation Functionality**: Clicking a link loads the corresponding page by properly updating the active page state via Zustand store (`usePageStore.setActivePage`), updates active state, and collapses the panel
- Only accessible by authenticated admin users

### Dashboard Content
- Default page displayed after admin login
- Welcome message for the user
- Grid of 11 large, clickable cards displayed 3 cards per row on desktop screens within the 1200px max-width constraint:
  - Caja (with description: "Gestión de ventas y pedidos")
  - Productos
  - Categorías
  - Usuarios Admin
  - Datos de Tienda
  - Análisis de Ventas
  - Importación Legacy
  - Importación de Datos
  - Exportación de Datos
  - Archivo de Pedidos
- **Fixed Card Navigation**: Cards navigate to corresponding pages when clicked by properly updating the active page state via Zustand store (`usePageStore.setActivePage`)
- Proper spacing, alignment, and visual balance between cards
- Responsive grid layout that preserves mobile stacking behavior

## Sales Analytics Management (Análisis de Ventas Page)

### Page Layout
- Header row with "Análisis de Ventas" title
- Filter section with collapsible design
- Analytics results area with summary cards and charts
- Admin-only access with same gatekeeping logic as other admin pages

### Filter Section
- Collapsible filter section titled "Filtros de Análisis" with toggle button
- Chevron up/down icon indicating expanded/collapsed state
- Default expanded state for initial use
- Filter options:
  - Time period dropdown: "Últimos 7 días", "Últimos 30 días", "Últimos 3 meses", "Últimos 6 meses", "Último año", "Personalizado"
  - Custom date range: "Desde Fecha" and "Hasta Fecha" (visible when "Personalizado" selected)
  - Category filter dropdown with enhanced scrolling functionality (same as other pages)
  - Payment method filter dropdown: "Todos", "Efectivo", "Tarjeta", "Transferencia"
  - Include archived orders toggle checkbox
- "Obtener Datos" button to trigger analytics generation
- Date validation ensuring "Desde" ≤ "Hasta" for custom ranges

### Analytics Results Area
- Empty state message: "No hay datos de análisis. Usa los filtros para generar reportes."
- Loading state: "Generando análisis de ventas..."
- Error state: "Error al cargar los datos de análisis."

### Summary Cards Section
- Seven summary cards displayed in responsive grid layout:
  1. **Ingresos Totales**: Total revenue with Spanish comma decimal formatting
  2. **Beneficio Total**: Total profit with Spanish comma decimal formatting
  3. **Margen Promedio**: Average profit margin as percentage
  4. **Pedidos Analizados**: Total number of orders in dataset
  5. **Descuentos Aplicados**: Total discount amount with Spanish comma decimal formatting
  6. **IVA Recaudado**: Total IVA collected with Spanish comma decimal formatting
  7. **Desglose del Dataset**: Shows active vs archived orders count when archived data included

### Charts and Visualizations
- Six chart sections with responsive design:
  1. **Ingresos vs Beneficio**: Bar chart comparing total revenue and profit
  2. **Distribución de Márgenes**: Pie chart showing profit margin distribution by ranges
  3. **Rentabilidad por Método de Pago**: Bar chart showing profit by payment method
  4. **Beneficio por Categoría**: Horizontal bar chart showing profit by product category
  5. **Productos Más Rentables**: Table showing top 10 products by total profit
  6. **Comparación Activos vs Archivados**: Comparison chart (when archived data included)

### Frontend Analytics Calculations
- All calculations performed client-side after receiving raw order data
- Profit calculation: `(basePrice × profitMargin / 100) × quantity`
- Revenue calculation: `totalPrice` from order items
- Average margin calculation: `(Total Profit / (Total Base Cost + Total Profit)) × 100`
- IVA calculation: `(basePrice + profit) × (ivaRate / 100) × quantity`
- Discount aggregation from order-level discount amounts
- Category-based aggregations using `categoryName` from order items
- Payment method aggregations using order-level `paymentMethod`
- Top products ranking by total profit across all orders

### Data Loading and Management
- Calls `getSalesAnalyticsData(filters)` backend endpoint with filter parameters
- Backend returns raw order data without calculations or aggregations
- React Query integration for data fetching and caching
- Filter state preservation during analytics generation
- Error handling with Spanish toast notifications

### Backend API Integration
- `getSalesAnalyticsData(filters: AnalyticsFilters): async { activeOrders: [Order], archivedOrders: [Order] }` endpoint
- Filter parameters:
  - Date range (fromDate, toDate)
  - Category filter (optional)
  - Payment method filter (optional)
  - Include archived flag
- Admin-only access control with proper permission checks
- Returns raw order data for frontend processing
- No backend calculations or aggregations

### State Management
- Analytics filter state (time period, category, payment method, date ranges, archived toggle)
- Analytics results state (summary data, chart data, loading states)
- Preserve filter state during data refresh operations
- Consistent design and localization with existing components

### Responsive Design
- Summary cards responsive grid layout
- Charts responsive design with mobile-friendly sizing
- Filter section responsive layout with mobile stacking
- Table displays responsive design: table for desktop, cards for mobile
- Consistent with existing page layouts and 1200px max-width constraint

## Store Details Management (Datos de Tienda Page)

### Page Layout
- Header row with "Datos de la Tienda" title
- Description text: "Esta información aparecerá en todos los recibos térmicos impresos."
- Form fields with Spanish labels and validation
- Collapsible "Vista Previa del Recibo" section showing live formatted receipt header
- Fixed bottom area with action buttons

### Store Details Form
- Form fields with Spanish labels:
  - Nombre de la Tienda* (text input, required, max 50 characters)
  - Dirección* (textarea, required, 3 rows, max 100 characters)
  - Teléfono* (text input, required, digits only, 9-15 characters)
  - WhatsApp* (text input, required, digits only, 9-15 characters)
  - NIF/CIF (text input, optional, max 20 characters)
  - Email (email input, optional)
  - Sitio Web (URL input, optional)
- Real-time validation with Spanish error messages
- Required field indicators with asterisks

### Receipt Preview Section
- Collapsible section titled "Vista Previa del Recibo"
- Live formatted receipt header using entered form values
- Shows how store information will appear on thermal receipts
- Updates in real-time as user types in form fields
- Uses same formatting as actual receipt generation

### Action Buttons
- Fixed bottom area with two buttons:
  - "Guardar Cambios" (primary button): saves form data to backend
  - "Restaurar Valores Originales" (secondary button): resets form to last fetched data
- Loading states during save operations
- Success/error toast notifications in Spanish

### Data Loading and Management
- On page load, calls `getStoreDetails` backend endpoint
- If backend returns default values, shows toast: "Valores por defecto configurados automáticamente"
- Form pre-populated with fetched store details
- React Query integration for data fetching and caching
- Error handling with Spanish toast notifications

## Caja Management (Caja Page)

### Page Layout
- Header row with "Caja" title
- Subheading: "Gestión de ventas y pedidos"
- Three-tab layout with Spanish labels:
  - "Ventas" (active tab with full implementation)
  - "Pedidos Procesados" (full implementation with backend integration and true lazy loading)
  - "Devoluciones" (complete returns management system with true lazy loading)
- Tabs distribute evenly horizontally, stacking vertically on mobile
- Tab content rendered below tabs within 1200px centered constraint
- **PERMANENT REQUIREMENT**: This three-tab structure must remain intact and cannot be removed or modified by future changes

### Independent Tab Lifecycle Management
- **Complete Tab Independence**: Each tab component mounts and unmounts independently based on active tab state
- **Conditional React Query Hooks**: Data-fetching hooks (`useGetPaginatedOrders`, `useGetPaginatedReturns`) include `enabled` flag tied to tab activation state
- **No Cross-Tab Query Invalidation**: Order creation in Ventas tab does not trigger automatic refetches or query invalidations for other tabs
- **Isolated Component Mounting**: Only the active tab component is mounted and executes its data queries; inactive tabs remain fully unmounted
- **No Background Refetches**: Inactive tabs do not run background refetches or maintain active query subscriptions
- **Tab State Tracking**: Implement tab state mechanism to track which tabs have been loaded to avoid redundant API calls
- **Session Data Persistence**: Maintain and reuse previously fetched data per tab within the session to prevent duplicate loading when switching back to previously visited tabs

### True Lazy Loading Implementation
- **Exclusive Data Loading**: Each tab loads its data exclusively when the tab is first visited — no API calls or prefetching on initial page mount
- **Loading Indicators**: Show "Cargando pedidos..." for Pedidos Procesados tab and "Cargando devoluciones..." for Devoluciones tab during initial load
- **Ventas Tab Preservation**: Preserve all existing sales tab (Ventas) content, ensuring no alterations to any other tabs or shared functionality
- **Existing Logic Maintenance**: Keep all current pagination, search, filter, and UI logic intact for both tabs once loaded

### Modular Component Architecture
- **CustomProductModal Component** (`frontend/src/components/orders/CustomProductModal.tsx`):
  - Handles creation of custom products during sales
  - Auto-generated barcode (`custom-<timestamp>`)
  - Product name input and category dropdown with enhanced scrolling functionality:
    - Load all categories at once
    - Fixed maximum height showing exactly 10 visible items
    - Vertical scrollbar appears when more than 10 categories exist
    - Native or styled scrollbars depending on platform
    - Touch-friendly scrolling on mobile devices
    - Full keyboard navigation support (Up/Down arrows, Enter, Escape)
    - All categories preloaded and available (no lazy loading)
    - Responsive design maintaining 10-item constraint
  - Base price, IVA dropdown (0%, 4%, 10%, 21%), and profit margin inputs
  - Real-time "Precio de venta calculado" display using unified price calculation utility
  - Buttons: "Cancelar" and "Agregar al Carrito"
  - Custom products marked `isCustom: true`, stored only in cart memory
  - Enhanced custom product cart storage with complete product data
  - Toast "Producto personalizado añadido al carrito" on successful add

- **FullReturnModal Component** (`frontend/src/components/orders/FullReturnModal.tsx`):
  - Displays complete order details for full return processing
  - Return reason dropdown with Spanish options
  - "Otro" text field when "Otro" reason selected
  - Admin notes textarea
  - Automatic refund calculation showing full order total with Spanish comma decimal formatting
  - "Crear Devolución Completa" button

- **PartialReturnModal Component** (`frontend/src/components/orders/PartialReturnModal.tsx`):
  - Order items list with quantity selectors (0 to original quantity)
  - Return reason dropdown and "Otro" text field
  - Admin notes textarea
  - Real-time refund calculation based on selected quantities with Spanish comma decimal formatting
  - "Crear Devolución Parcial" button

- **CancelOrderModal Component** (`frontend/src/components/orders/CancelOrderModal.tsx`):
  - Order details display for cancellation confirmation
  - Cancellation reason dropdown
  - Admin notes textarea
  - "Cancelar Pedido" button

- **StatusUpdateModal Component** (`frontend/src/components/orders/StatusUpdateModal.tsx`):
  - Current return details display
  - Admin notes textarea for status change reason
  - Status update buttons: "Marcar Procesada" (green) and "Marcar Rechazada" (red)
  - Confirmation buttons and loading states

### Ventas (Checkout) Tab

#### Search System
- Full-width search bar with magnifying glass icon
- Spanish placeholder: "Busca por nombre, descripción o código de barras (mínimo 2 caracteres)"
- Simplified search logic without mode selector:
  - Numeric-only input → exact barcode match (`searchMode: "barcode-exact"`)
  - Non-numeric or mixed input → search across barcode, name, and description (`searchMode: "normal"`)
- Minimum 2 characters, 300ms debounce, AbortController cancellation
- Dropdown overlay below search box showing up to 10 results
- Each result displays: name, category, calculated sale price using unified formula with Spanish comma decimal formatting, stock
- Clicking result adds product to cart with beep sound (Web Audio API)
- Enhanced cart addition process:
  - Fetches complete product data from backend (`/api/products/{barcode}`) when adding from search results
  - Stores enhanced cart item data including `basePrice`, `ivaRate`, `profitMargin`, and `categoryName`
  - **CRITICAL FIX**: The `handleAddProductFromSearch` function must correctly pass the retrieved product's `basePrice`, `ivaRate`, and `profitMargin` fields to the `addItem` cart store function
  - Maintains backward compatibility with existing cart structure
- Toast notification "Producto añadido al carrito" on successful add
- Pressing Enter with single result auto-adds and clears search
- Small circular loading spinner and Spanish loading text "Buscando productos..." at bottom center of dropdown overlay when API search requests are active
- Spanish no-results message "No se encontraron productos que coincidan" when API returns empty array
- After product is clicked and added to cart, automatically refocus on search input field for continuous scanning/typing
- Loading and no-results messages appear in same position as normal results
- **Immediate Single-Result Addition**:
  - When search API completes (`searchLoading` is `false`) and returns exactly one product result, immediately add the item to cart
  - Triggers automatically when all conditions are met: search completed, results exist, exactly one product returned
  - **Stock-Independent Auto-Add**: Auto-add functionality adds products to the shopping cart regardless of stock level, including when stock equals 0 or is negative
  - Auto-add trigger condition checks only:
    - `searchLoading === false`
    - `searchResults` exists
    - there is exactly one product match
  - **No Stock Validation**: Remove any condition that checks `product.stock` or validates positive stock before triggering the auto-add call
  - On immediate auto-add: add product to cart, clear search field, hide dropdown, play beep sound, show toast "Producto agregado automáticamente", maintain input focus
  - Auto-add triggers only once per search query to avoid duplicate additions
  - Uses the same `handleAddProductFromSearch()` function used for manual product additions
  - Works with existing barcode-exact logic and debounce functions

#### Custom Product System
- "Producto Personalizado" button right-aligned on search bar row
- Renders `CustomProductModal` component when clicked
- Modal handles all custom product creation logic and cart integration

#### Shopping Cart
- Displayed below search area within same width constraint
- Desktop table headers: Producto, Categoría, Precio de Venta, Cantidad, Total, Acciones
- Mobile card layout with same information stacked
- Column alignments in desktop cart table:
  - "Precio de Venta", "Categoría", and "Total" columns: headers and values centered horizontally
  - "Acciones" column: header and contents right aligned
  - "Producto" column: product name values left aligned
  - "Cantidad" remains centered
- Features:
  - Quantity controls (+/- buttons, min=1, max=999)
  - Inline price editing (≥ 0)
  - Copy barcode icon with tooltip
  - Individual item deletion
  - Cart sorted by "most recent first"
  - Custom products show "(Personalizado)" marker
- All monetary values displayed with Spanish comma decimal formatting (sale price, total per item)
- IVA breakdown grouped by rate (only showing applicable groups)
- Dynamic subtotal/discount/total calculations with real-time updates and Spanish comma decimal formatting
- "Descuento:" field positioned directly beneath "Subtotal" in summary:
  - Right aligned, same width as subtotal field
  - Visually connected (Subtotal → Descuento → Total)
  - Starts empty with placeholder "0,00" in light gray
  - Accepts and displays Spanish decimal format (comma separator)
  - Discount value updates total dynamically and included in orders when creating them
  - Spanish comma decimal formatting for display
- **Zero-Stock Product Display**: Display zero-stock products in the cart with their actual stock value (0) shown
- **Negative Stock Handling**: Handle negative stock gracefully and continue adding the product

#### Checkout Form
- Form below cart with Spanish fields:
  - Método de Pago (dropdown: Efectivo default, Tarjeta, Transferencia)
  - Notas del Cliente (textarea)
  - Imprimir Recibo (checkbox, checked by default)
- Payment method validation ensures value is selected and included in order creation
- Action buttons:
  - "Vaciar Carrito" (clears all items, resets search UI)
  - "Finalizar Pedido" (creates order with payment method included)

#### Order Processing
- Backend integration for complete order creation with extended data model including payment method
- Enhanced order creation payload:
  - Complete order details with discount amount and tax breakdown
  - Payment method from checkout form (required field)
  - Order status as valid
  - Current timestamp
  - All cart items with enhanced product details including `basePrice`, `ivaRate`, `profitMargin`, and `categoryName`
- **CRITICAL FIX**: Backend `createOrder` function must correctly calculate `totalAmount` by subtracting `discountAmount` from the aggregated item totals, ensuring `totalAmount` cannot go below 0
- Payment method stored in backend order record and included in receipt data
- Stock reduction server-side (prevents negative stock, records original and updated stock)
- Warning toasts for insufficient stock
- Includes both normal and custom products in order
- Loading state with "Creando pedido..." message
- Success toast "Pedido #{orderNumber} creado exitosamente"
- Error toast "Error al crear el pedido" on failure
- Order number format: ORD-001, ORD-002, etc.
- Custom products stored in order record without stock impact
- On successful order creation:
  1. Clear shopping cart immediately
  2. Play short beep sound using same logic as product added feedback
  3. Show success toast in Spanish: "Pedido #{orderNumber} creado exitosamente"
  4. If "Imprimir Recibo" checkbox is checked, directly call `printService` to generate and print receipt HTML using hidden iframe
- Cart clearing always happens whether or not receipt is printed
- Single API call for complete order with embedded arrays for optimal performance
- **No Cross-Tab Query Invalidation**: Order creation does not trigger automatic query invalidations or refetches for Pedidos Procesados or Devoluciones tabs

### Direct Receipt Printing System

#### Hidden Print Infrastructure
- Single persistent hidden iframe element in main React layout
- Invisible styling: `width: 0; height: 0; position: absolute; border: none;`
- Kept mounted across app sessions for consistent printing capability
- No creation of new browser windows or tabs for printing

#### Unified Print Service (printService.ts)
- Centralized `printReceipt(data, type)` service used across all components
- Responsibilities:
  - Generate self-contained HTML document with embedded CSS
  - CSS includes `@page { size: 80mm auto; margin: 0; }` for thermal printer compatibility
  - Constrain printed content width to 80mm consistently
  - Inject HTML into hidden iframe's document
  - Call `iframe.contentWindow.print()` with up to 3 retry attempts (300ms delay each)
  - Return status: `'idle' | 'printing' | 'success' | 'error'`
  - Integrate toast notifications for success/error states in Spanish

#### Receipt Templates
- HTML-based receipt layout for iframe injection (converted from React components)
- Two template variants: `order` and `return`
- Order receipts: header "FACTURA SIMPLIFICADA"
- Return receipts: header "RECIBO DE DEVOLUCIÓN"
- Dynamic store information integration (storeName, address, phone, whatsapp)
- **Enhanced CIF Display**: When store `taxId` has a non-empty value, display as "CIF [value]" with ALL CAPS, bold styling, and same font size (10px, monospace) as other store header lines, positioned after phone numbers
- **Optimized thermal printer font stack**: `'Courier New', Courier, monospace` applied globally to all receipt content
- **Font sizing for thermal readability**:
  - Base font size: `10pt` for all receipt content
  - Store name header: `12pt` bold
  - Column headers: `9pt` bold
  - All other text: `10pt`
- ALL CAPS and ALL BOLD formatting maintained
- Payment method display in Spanish (Efectivo, Tarjeta, Transferencia)
- All numeric values formatted with Spanish comma decimal separators (P.UNIT, IMP., Total, Discount columns)
- Enhanced receipt generation using stored cart item data:
  - Uses preserved `basePrice`, `ivaRate`, and `profitMargin` from cart items for historical accuracy
  - Calculates sale price and IVA breakdown using stored values rather than re-fetching product data
  - Ensures receipt calculations remain consistent with order creation time values
- **Simplified receipt content structure**:
  - Store details section (name, address, phone, whatsapp, CIF if available)
  - Order details section ("FACTURA SIMPLIFICADA", date/time, order number, payment method)
  - Items table with optimized columns: "QTY" (10%), "DESCRIPCION" (50%), "P.UNIT" (20%), "IMP.(€)" (20%)
  - **Enhanced TOTAL formatting**: TOTAL label/value font size increased to match store name font size, formatted as `TOTAL (€): XX,XX` with colon separator, right-aligned both label and numeric value, most visually prominent line
  - IVA breakdown table positioned directly below Total value with proper vertical spacing
  - **No "Subtotal" line**
  - **No decorative separators, dashed lines, asterisk lines, or blank spacing between sections**
- IVA breakdown table headers: "IVA", "BASE IMPONIBLE (€)", "CUOTA (€)"
- IVA breakdown formatting: bold, all caps, right-aligned numeric values with Spanish comma decimal formatting, left-aligned IVA column
- **Enhanced IVA breakdown table with TOTAL row**:
  - Additional TOTAL row appended as the final line of the IVA breakdown table
  - TOTAL row uses same 15%/50%/35% column width structure as other IVA breakdown rows
  - TOTAL row displays "TOTAL" label (bold, all caps, left-aligned) and calculated totals for base amount and tax amount
  - Total base amount calculated by summing all individual IVA rate `baseAmount` values
  - Total tax amount calculated by summing all individual IVA rate `taxAmount` values
  - TOTAL row numeric values right-aligned with Spanish comma decimal formatting (no euro symbols)
  - TOTAL row appears in both receipt preview dialogs and printed HTML outputs
  - Maintains 80mm thermal printer format and existing column width constraints
- **Spanish closing lines after IVA breakdown table**:
  - After the IVA breakdown table (including TOTAL row), append two closing lines:
    - Line 1: "GRACIAS POR SU COMPRA" (ALL CAPS, bold)
    - Line 2: "GUARDAR EL RECIBO" (ALL CAPS, bold)
  - Add one blank line/space following the "GUARDAR EL RECIBO" line for visual spacing
  - Styling uses monospace font (`'Courier New', Courier, monospace`) consistent with thermal printer optimization
  - Applied to all receipt types: order, return, archived, and reprint receipts
- Receipt alignment: titles left-aligned, values right-aligned in same row
- Conditional IVA breakdown table rendering: only displays when taxBreakdown data exists and contains rates
- IVA table styling within 80mm width constraint with proper thermal print formatting
- Numeric values in IVA table with Spanish comma decimal formatting, maintaining bold and uppercase formatting
- **Optimized thermal receipt column widths for all receipt types**:
  - Items table `<colgroup>` structure with optimized column widths:
    - QTY column: 10% width (reduced from 15%)
    - DESCRIPCION column: 50% width (increased from 45%)
    - P.UNIT column: 20% width (unchanged)
    - IMP.(€) column: 20% width (unchanged)
  - Consistent column width application across order receipts, return receipts, archived receipts, and reprints
  - Improved readability for accented Spanish product names within 80mm thermal printer constraint
  - Proper text alignment and no truncation for product descriptions
  - Maintains existing IVA breakdown table column widths (15% / 50% / 35%)
- Fixed table-layout percentage widths across both print and preview modes
- **Enhanced Product Name Display in Print HTML**:
  - Product name column (DESCRIPCION) uses flexible text wrapping to prevent truncation
  - CSS `word-wrap: break-word` and `overflow-wrap: break-word` applied to product name cells
  - No `white-space: nowrap` restrictions on product name column
  - Text overflow handling with `overflow: visible` for product names
  - Maintains monospace font stack and 10pt base font size for consistency
  - Preserves column alignment for price and total columns while allowing name column to wrap
  - Ensures full product names are visible in printed receipts without character clipping

#### Direct Print Integration
- **Ventas Tab**: After successful order creation, if "Imprimir Recibo" is checked, directly call `printService.printReceipt(receiptData, 'order')` without modal
- **Pedidos Procesados Tab**: Print icon button directly calls `printService.printReceipt(receiptData, 'order')` using current order data
- **Devoluciones Tab**: After marking return as processed, directly call `printService.printReceipt(receiptData, 'return')` without modal
- **Archivo de Pedidos Tab**: Print action directly calls `printService.printReceipt(receiptData, 'order')` for archived orders
- All direct print calls include proper error handling with Spanish toast notifications
- Loading states during print operations with spinner indicators on print buttons
- Print status feedback with Spanish messages for success/failure

#### Receipt Data Structure
- Maintains existing `ReceiptData` structure with BigInt timestamp fields
- Enhanced receipt data with stored cart item details:
  - Includes payment method in receipt data for display
  - Includes complete taxBreakdown array for IVA breakdown table
  - Uses preserved `basePrice`, `ivaRate`, and `profitMargin` from cart items
  - Supports both order receipts and return receipts based on receiptType parameter
- Dynamically fetches store details from backend for receipt header
- Fallback to default store information if backend call fails

#### Receipt Layout & Formatting
- Header section uses dynamic store details from backend
- Info section with order/return ID, payment method in Spanish, and local date/time formatting
- Items table with optimized columns: "QTY" (10%), "DESCRIPCION" (50%), "P.UNIT" (20%), "IMP.(€)" (20%)
- All numeric values in items table formatted with Spanish comma decimal separators
- **Enhanced TOTAL formatting**: TOTAL label/value font size increased to match store name font size, formatted as `TOTAL (€): XX,XX` with colon separator, right-aligned both label and numeric value, most visually prominent line
- IVA breakdown table positioned directly below Total value with proper vertical spacing
- IVA breakdown table columns: "IVA", "BASE IMPONIBLE (€)", "CUOTA (€)"
- IVA breakdown: bold, all caps, right-aligned numeric values with Spanish comma decimal formatting
- **Enhanced IVA breakdown table with TOTAL row**:
  - TOTAL row appended as final line with calculated totals for base amount and tax amount
  - TOTAL row formatting: bold, all caps, left-aligned label, right-aligned numeric values
  - Spanish comma decimal formatting for TOTAL row numeric values (no euro symbols)
- **Spanish closing lines after IVA breakdown table**:
  - After the IVA breakdown table (including TOTAL row), append two closing lines:
    - Line 1: "GRACIAS POR SU COMPRA" (ALL CAPS, bold)
    - Line 2: "GUARDAR EL RECIBO" (ALL CAPS, bold)
  - Add one blank line/space following the "GUARDAR EL RECIBO" line for visual spacing
  - Styling uses monospace font (`'Courier New', Courier, monospace`) consistent with thermal printer optimization
  - Applied to all receipt types: order, return, archived, and reprint receipts
- Return receipts include return reason and refund amount with Spanish comma decimal formatting
- Receipt alignment: titles left-aligned, values right-aligned in same row
- **Clean section transitions**: Minimal, logical spacing between sections without decorative separators

#### Thermal Print Optimization
- 80mm width thermal printer compatibility enforced via `@media print` styles in `index.css`
- CSS `@page` rules to remove browser headers/footers
- Left alignment for printed content, centered alignment for preview dialogs
- **Thermal printer font optimization**: `'Courier New', Courier, monospace` font stack applied globally to all receipt content
- **Thermal printer font sizing**: Base `10pt`, headers `12pt`, column headers `9pt` bold
- Bold-weight fonts applied consistently
- Optimized layout for thermal receipt format with improved column width distribution
- Mobile browser print dialog compatibility

#### Error Handling & Compatibility
- Try/catch safety around all print operations
- Fallback to user notification if print fails
- Mobile browser print dialog support
- Network error handling for store details fetching
- Spanish error messages for print failures

#### Backward Compatibility
- Replaces all occurrences of receipt preview modals with direct printing
- Maintains all existing receipt data structures and API integrations
- No breaking changes in backend or receipt data formats
- Preserves existing receipt state management and BigInt serialization

### Pedidos Procesados Tab

#### Tab Navigation & Layout
- Second tab in the Caja page with label "Pedidos Procesados"
- Uses unified content area (max-width: 1200px, centered)
- Active tab uses existing page state management system
- No H1/H2 headings or action buttons in content area
- Full backend integration with React Query hooks for data fetching
- **Independent Tab Lifecycle**: Component only mounts when tab is active; React Query hook includes `enabled: activeTab === 'processed'` flag
- **True Lazy Loading**: Data loads exclusively when tab is first visited with "Cargando pedidos..." loading indicator

#### Filter Section
- Collapsible filter section titled "Filtros de Búsqueda" with toggle button
- Chevron up/down icon indicating expanded/collapsed state
- Default collapsed state
- When expanded reveals:
  - Unified search bar with 300ms debounce, minimum 2 characters
  - Search placeholder: "Buscar pedidos por número, producto o cliente..."
  - Clear ("X") button and spinner during active search
  - Helper text: "Los números buscan por número de pedido (solo dígitos) y códigos de barras exactos"
  - Date range filters: "Desde Fecha" and "Hasta Fecha" with Spanish locale calendar pickers
  - Date validation ensuring "Desde" ≤ "Hasta"
  - "Limpiar filtros" button to reset all search, filters, and pagination

#### Data Loading & Pagination
- True lazy loading with server-side pagination using `getPaginatedOrders` from React Query
- **Conditional Query Execution**: `useGetPaginatedOrders` hook includes `enabled` flag tied to tab activation state
- Backend endpoint parameters: `pageNumber`, `pageSize`, `searchTerm`, `searchMode`, optional date filters
- Default page size: 10
- Page size dropdown options in Spanish: 10, 100, 500, 1000
- Display text: "Mostrando X–Y de Z pedidos" below table
- Pagination controls with "Anterior" and "Siguiente" buttons
- Numbered page buttons with highlighted current page
- Orders displayed in reverse chronological order (latest first)
- Loading text: "Cargando pedidos..."
- Empty state text: "No hay registros disponibles."
- Error state text: "Error al cargar los datos."

#### Backend Search & Mode Logic
- Backend API support for `searchMode` parameter
- When search term is numeric only → `searchMode: "order-barcode-exact"`:
  - Strip "ORD-" prefix and match numeric part of `orderNumber`
  - Include orders where any item's barcode equals the search digits
  - Return union of both result sets (distinct orders)
- Otherwise use `searchMode: "normal"` to search `orderNumber`, product names, and `customerNotes`

#### Processed Orders Table
- Responsive design: table for desktop, cards for mobile
- Columns in Spanish:
  1. Pedido # (order number)
  2. Estado ("Válido" green badge / "Inválido" red badge)
  3. **Enhanced Productos Column**:
     - Shows only the first product name by default
     - If order has more than one item, shows clickable "ver todos" link
     - On click, expands inline to list remaining products (one per line), no API calls
     - Truncates product names to one line with ellipsis
     - Each product name includes small copy-to-clipboard icon (clipboard symbol) beside it
     - Tooltip: "Copiar código de barras"
     - On click, copies the product's barcode to clipboard and shows toast "Código de barras copiado"
     - Clear visual hierarchy between first and expanded items
     - Uses data from loaded order items without additional API calls
  4. Cantidades (sum of all item quantities)
  5. **Fixed Método de Pago Column**:
     - Binds display strictly to `order.paymentMethod`
     - Maps values to Spanish labels: `cash → Efectivo`, `card → Tarjeta`, `transfer → Transferencia`
     - Graceful fallback ("—") for null/undefined values
     - Applied consistently to all rows
  6. Descuento (Spanish comma decimal format: €XX,XX)
  7. Total (Spanish comma decimal format: €XX,XX)
  8. Fecha (Spanish format: "15 ene 2024, 14:30")
  9. Acciones (print icon with loading spinner, return action buttons)
- Print icon button shows loading spinner during receipt generation
- Automatically reverts spinner back to print icon on success or error
- Print icon directly calls `printService.printReceipt(receiptData, 'order')` using currently displayed order data
- Print status feedback with Spanish messages
- Return action buttons:
  - "Devolución Completa" (full return) - opens `FullReturnModal` component
  - "Devolución Parcial" (partial return) - opens `PartialReturnModal` component
  - "Cancelar Pedido" (order cancellation) - opens `CancelOrderModal` component

#### Return Creation Modals
- Uses modular components for return processing:
  - `FullReturnModal` for complete order returns
  - `PartialReturnModal` for partial returns with item selection
  - `CancelOrderModal` for order cancellation
- All modals handle their respective return creation logic and backend integration

#### Error Handling
- Spanish toast notifications:
  - "Error al buscar pedidos" for search issues
  - "No se pudieron cargar los pedidos" for load failure
  - "Error al crear la devolución" for return creation failure
- Network retries with exponential backoff
- Graceful degradation for failed requests

#### State Management
- Preserve state across tab switches and collapsible toggles
- Maintain filter and pagination state when switching between tabs
- BigInt-safe timestamp parsing and display
- Consistent design, localization, and formatting with existing components

### Devoluciones Tab

#### Tab Navigation & Layout
- Third tab in the Caja page with label "Devoluciones"
- Uses unified content area (max-width: 1200px, centered)
- Active tab uses existing page state management system
- Lazy loading of return data when tab is first accessed
- Full backend integration with React Query hooks for data fetching
- **Independent Tab Lifecycle**: Component only mounts when tab is active; React Query hook includes `enabled: activeTab === 'returns'` flag
- **True Lazy Loading**: Data loads exclusively when tab is first visited with "Cargando devoluciones..." loading indicator

#### Filter Section
- Collapsible filter section titled "Filtros de Búsqueda" with toggle button
- Chevron up/down icon indicating expanded/collapsed state
- Default collapsed state
- When expanded reveals:
  - Unified search bar with 300ms debounce, minimum 2 characters
  - Search placeholder: "Buscar devoluciones por ID, pedido original o productos..."
  - Clear ("X") button and spinner during active search
  - Helper text: "Los números buscan por ID de devolución y número de pedido original"
  - Date range filters: "Desde Fecha" and "Hasta Fecha" with Spanish locale calendar pickers
  - Type filter dropdown: "Todos", "Completa", "Parcial", "Cancelación"
  - Status filter dropdown: "Todos", "Pendiente", "Procesada", "Rechazada"
  - Reason filter dropdown: "Todos", "Producto Defectuoso", "Producto Incorrecto", "Cambio de Opinión", "Otro"
  - Original order number filter: exact match input
  - "Limpiar filtros" button to reset all filters and pagination

#### Data Loading & Pagination
- True lazy loading with server-side pagination using `getPaginatedReturns` from React Query
- **Conditional Query Execution**: `useGetPaginatedReturns` hook includes `enabled` flag tied to tab activation state
- Backend endpoint parameters: `pageNumber`, `pageSize`, `searchTerm`, `searchMode`, `typeFilter`, `statusFilter`, `reasonFilter`, optional date filters, `originalOrderNumber`
- Default page size: 10
- Page size dropdown options in Spanish: 10, 100, 500, 1000
- Display text: "Mostrando X–Y de Z devoluciones" below table
- Pagination controls with "Anterior" and "Siguiente" buttons
- Numbered page buttons with highlighted current page
- Returns displayed in reverse chronological order (latest first)
- Loading text: "Cargando devoluciones..."
- Empty state text: "No hay registros disponibles."
- Error state text: "Error al cargar los datos."

#### Backend Search & Mode Logic
- Backend API support for `searchMode` parameter
- When search term is numeric only → `searchMode: "return-order-exact"`:
  - Match return ID numeric part
  - Match original order number numeric part (strip "ORD-" prefix)
  - Return union of both result sets (distinct returns)
- Otherwise use `searchMode: "normal"` to search return items, product names, and admin notes

#### Returns Table
- Responsive design: table for desktop, cards for mobile
- Columns in Spanish:
  1. ID Devolución (DEV-XXX format)
  2. Pedido Original (ORD-XXX format, clickable to view original order)
  3. Tipo ("Completa" blue badge / "Parcial" orange badge / "Cancelación" red badge)
  4. Estado ("Pendiente" yellow badge / "Procesada" green badge / "Rechazada" red badge)
  5. Motivo (return reason in Spanish)
  6. Productos Devueltos (list of returned product names with quantities)
  7. Monto Reembolso (Spanish comma decimal format: €XX,XX)
  8. Fecha (Spanish format: "15 ene 2024, 14:30")
  9. Notas (admin notes, truncated with tooltip)
  10. Acciones (status update buttons, receipt buttons)
- **Enhanced Productos Devueltos Column Display**:
  - Shows up to 3 product names from the return's items array
  - If return has more than 3 items, appends "+X más" indicator in Spanish
  - Each displayed product name includes small copy-to-clipboard icon (clipboard symbol) beside it
  - When space allows, shows quantity in parentheses (e.g. "Arroz Basmati (2) 📋")
  - Tooltip: "Copiar código de barras"
  - On click, copies the product's barcode to clipboard and shows toast "Código de barras copiado"
  - Proper ARIA labels for accessibility
  - Uses data from loaded return items without additional API calls
  - Styling matches existing copy-to-clipboard icons and spacing from Products page

#### Return Status Management
- Status update buttons for pending returns:
  - "Marcar Procesada" (green button) - opens `StatusUpdateModal` component
  - "Marcar Rechazada" (red button) - opens `StatusUpdateModal` component
- Uses `StatusUpdateModal` component for status change confirmation and admin notes
- When marked as processed:
  - Calls `updateReturnStatus` backend endpoint
  - Automatically restores stock for returned items
  - Directly calls `printService.printReceipt(receiptData, 'return')` with dynamic store details
  - Shows success toast with stock restoration confirmation
- Processed and rejected returns show timestamp of status change
- Only pending returns show action buttons

#### Receipt Integration
- "Ver Recibo Devolución" button for processed returns - directly calls `printService.printReceipt(receiptData, 'return')`
- "Ver Recibo Original" button to view original order receipt - directly calls `printService.printReceipt(receiptData, 'order')`
- Uses unified print service for direct printing via hidden iframe
- Return receipts show:
  - Header "RECIBO DE DEVOLUCIÓN" with dynamic store information
  - Return ID in DEV-XXX format
  - Original order reference
  - Returned items with quantities and refund amounts using Spanish comma decimal formatting
  - Return reason
  - Total refund amount with Spanish comma decimal formatting
  - Same store information and formatting as order receipts with optimized column widths
  - **Enhanced IVA breakdown table with TOTAL row** (same as order receipts)
  - **Spanish closing lines after IVA breakdown table** (same as order receipts)
- Fallback to default store information if backend call fails

#### Error Handling
- Spanish toast notifications:
  - "Error al buscar devoluciones" for search issues
  - "No se pudieron cargar las devoluciones" for load failure
  - "Error al actualizar el estado de la devolución" for status update failure
  - "Error al generar el recibo de devolución" for receipt generation failure
- Network retries with exponential backoff
- Graceful degradation for failed requests

#### State Management
- Preserve filter and pagination state when switching between tabs
- Maintain return status updates in real-time
- BigInt-safe timestamp parsing and display
- Consistent design, localization, and formatting with existing components

## Orders Archive Management (Archivo de Pedidos Page)

### Page Layout
- Header row with "Archivo de Pedidos" title
- Two-tab layout with Spanish labels:
  - "Ver Archivo" (default active tab)
  - "Crear Archivo"
- Tabs distribute evenly horizontally, stacking vertically on mobile
- Tab content rendered below tabs within 1200px centered constraint

### Ver Archivo Tab

#### Filter Section
- Collapsible filter section titled "Filtros de Búsqueda" with toggle button
- Chevron up/down icon indicating expanded/collapsed state
- Default collapsed state
- When expanded reveals:
  - Unified search bar with 300ms debounce, minimum 2 characters
  - Search placeholder: "Buscar pedidos archivados por número, producto o cliente..."
  - Clear ("X") button and spinner during active search
  - Helper text: "Los números buscan por número de pedido (solo dígitos) y códigos de barras exactos"
  - Date range filters: "Desde Fecha" and "Hasta Fecha" with Spanish locale calendar pickers
  - Date validation ensuring "Desde" ≤ "Hasta"
  - "Limpiar filtros" button to reset all search, filters, and pagination

#### Data Loading & Pagination
- True lazy loading with server-side pagination using `getPaginatedArchivedOrders` from React Query
- Backend endpoint parameters: `pageNumber`, `pageSize`, `searchTerm`, `searchMode`, optional date filters
- Default page size: 10
- Page size dropdown options in Spanish: 10, 100, 500, 1000
- Display text: "Mostrando X–Y de Z pedidos archivados" below table
- Pagination controls with "Anterior" and "Siguiente" buttons
- Numbered page buttons with highlighted current page
- Archived orders displayed in reverse chronological order (latest first)
- Loading text: "Cargando pedidos archivados..."
- Empty state text: "No hay registros disponibles."
- Error state text: "Error al cargar los datos."

#### Archived Orders Table
- Responsive design: table for desktop, cards for mobile
- Columns in Spanish:
  1. Pedido # (order number)
  2. Estado ("[ARCHIVADO]" gray badge)
  3. Fecha de Archivado (Spanish format: "15 ene 2024, 14:30")
  4. Fecha de Pedido (Spanish format: "15 ene 2024, 14:30")
  5. Productos (product names)
  6. Total (Spanish comma decimal format: €XX,XX)
  7. Acciones (eye icon for viewing receipt)
- Muted row coloring to distinguish archived orders
- Tooltips showing archive date on hover
- Eye icon button directly calls `printService.printReceipt(receiptData, 'order')` for archived orders
- **Enhanced IVA breakdown table with TOTAL row** in archived order receipts (same as active order receipts)
- **Spanish closing lines after IVA breakdown table** in archived order receipts (same as active order receipts)

### Crear Archivo Tab

#### Step 1: Date Range Selection
- Inline layout with date range selectors:
  - "Desde Fecha" date picker
  - "Hasta Fecha" date picker
- Date validation:
  - "Desde" must be ≤ "Hasta"
  - Prevents future dates
  - Spanish error messages for invalid ranges
- "Vista Previa" button calls `getArchivePreview` backend endpoint
- Shows count of orders that would be archived
- Loading state during preview request

#### Step 2: Archive Confirmation
- Confirmation message: "Se moverán X pedidos al archivo."
- Warning text: "Esta acción es irreversible. Los pedidos se moverán permanentemente al archivo."
- Action button: "Archivar X Pedidos"
- Button disabled until valid date range and preview completed
- Loading state during archive operation

#### Archive Process
- Calls `archiveOrders(dateFrom, dateTo)` backend endpoint
- Success handling:
  - Toast notification: "✅ Y pedidos archivados exitosamente."
  - Lists archived order IDs in toast or separate display
  - Auto-switches to "Ver Archivo" tab
  - Applies date filter to show newly archived orders
- Error handling:
  - Toast notification: "Error al archivar pedidos"
  - Detailed error messages in Spanish

### Backend Search & Mode Logic
- Same search logic as processed orders:
- When search term is numeric only → `searchMode: "order-barcode-exact"`:
  - Strip "ORD-" prefix and match numeric part of `orderNumber`
  - Include orders where any item's barcode equals the search digits
  - Return union of both result sets (distinct orders)
- Otherwise use `searchMode: "normal"` to search `orderNumber`, product names, and `customerNotes`

### State Management
- Preserve filter and pagination state when switching between tabs
- Maintain archive creation state during process
- BigInt-safe timestamp parsing and display
- Consistent design, localization, and formatting with existing components

## Unified Price Calculation System

### Common Sale Price Formula
- Unified formula applied consistently across both frontend and backend:
  - `profitAmount = basePrice × (profitMargin / 100)`
  - `priceBeforeIva = basePrice + profitAmount`
  - `ivaAmount = priceBeforeIva × (iva / 100)`
  - `salePrice = priceBeforeIva + ivaAmount`

### Frontend Implementation
- Shared utility module (`calculateSalePriceUtil.ts`) with unified calculation function
- All price calculations in ProductsPage use the same formula as Orders (Ventas tab)
- Updated calculations in:
  - Products table views
  - Add/Edit product modals
  - Bulk Update modals
  - Real-time preview components
  - Custom product creation
  - Search result displays
- Remove all inline or repeated sale price calculation formulas
- Replace with calls to shared utility function
- Console warnings for mismatched calculations between pages
- Consistent Spanish comma decimal formatting across all price displays

### Backend Implementation
- Reusable `calculateSalePrice(basePrice: Float, iva: Nat, profitMargin: Nat): Float` function
- Implementation using Motoko Float operations:
  - `let profitAmount = basePrice * (Float.fromInt(profitMargin) / 100.0);`
  - `let priceBeforeIva = basePrice + profitAmount;`
  - `let ivaAmount = priceBeforeIva * (Float.fromInt(iva) / 100.0);`
  - `let salePrice = priceBeforeIva + ivaAmount;`
- Used consistently across all backend modules that compute sale prices
- Applied in export functions, reporting, and order processing
- Verification that `exportProducts` and other export-related functions use common function

### Validation & Testing
- Unit tests or validation checks to confirm frontend and backend formulas match exactly
- Identical outputs for given inputs across both systems
- Price consistency verification between different application sections
- Error detection for calculation mismatches

## Spanish Number Formatting System

### Shared Number Formatting Utility
- Create shared utility module (`formatNumberUtil.ts`) for consistent Spanish decimal formatting
- Function to convert standard numeric values (dot decimal) to Spanish display format (comma decimal)
- Applied consistently across all monetary displays:
  - Orders cart (sale price, total, subtotal, discount, overall totals)
  - Receipt previews and printed receipts (all numeric columns)
  - Products page price displays
  - Returns and refund amounts
  - Export data displays
- Backend data storage maintains standard numeric (dot) format
- Format with commas only at display level in frontend
- Preserve precision and avoid rounding errors during conversion

### Implementation Guidelines
- All monetary values displayed with Spanish comma decimal separators (€XX,XX format)
- Input fields accept Spanish comma format but convert to standard format for backend storage
- Consistent formatting across all price-related components and displays
- Maintain backward compatibility with existing numeric data

## Enhanced Cart Data Structure

### Cart Item Data Model
- Enhanced cart store (`useCartStore`) with expanded item structure:
  - Existing fields: `barcode`, `name`, `quantity`, `salePrice`, `isCustom`
  - New fields: `basePrice`, `ivaRate`, `profitMargin`, `categoryName`
  - Maintains backward compatibility with existing cart items
- Cart item structure supports both regular products and custom products with same data model

### Cart Store Operations
- Enhanced `addItem` action:
  - Accepts complete product data including new fields
  - Stores `basePrice`, `ivaRate`, `profitMargin`, and `categoryName` when available
  - Maintains backward compatibility for items without new fields
- Enhanced `updateItem` action:
  - Updates all item fields including new enhanced data
  - Preserves existing functionality for quantity and price updates
- Backward compatibility ensures existing cart items continue to function

### Product Data Fetching
- Enhanced search result "add to cart" behavior:
  - Fetches complete product data from backend (`/api/products/{barcode}`) when adding from search results
  - Includes `basePrice`, `ivaRate`, `profitMargin`, and `categoryName` in cart storage
  - **CRITICAL FIX**: The `handleAddProductFromSearch` function must correctly map and pass the retrieved product's `basePrice`, `ivaRate` (mapped from product's `iva` field), and `profitMargin` fields to the `addItem` cart store function
  - Maintains existing search and add functionality
- Custom product integration:
  - Reuses provided `basePrice`, `ivaRate`, and `profitMargin` values from custom product form
  - Stores `categoryName` from selected category
  - Maintains same enhanced data structure as regular products

## Local Storage & State Persistence
- Enhanced cart store with BigInt-safe serialization
- Convert BigInt to string for storage, parse back on restore
- Try-catch wrapped JSON operations
- Persist custom products in cart state
- Enhanced cart persistence includes new fields (`basePrice`, `ivaRate`, `profitMargin`, `categoryName`)
- Full cart state restoration on page reload with backward compatibility
- Receipt store with BigInt-safe persistence for receipt data

## Admin Users Management (Usuarios Admin Page)

### Page Layout
- Header row with "Usuarios Admin" title on the left
- Input field for Internet Identity Principal ID with "Agregar Usuario" button (plus icon) on the right

### Admin User Addition
- Principal ID input field with validation for proper Motoko-compatible format
- Required field validation: Principal ID input cannot be empty
- Format validation using Motoko Principal ID pattern before calling backend
- "Agregar Usuario" button with plus icon to promote user to admin
- Principal ID format validation with Spanish error messages
- Success toast: "Usuario promovido a administrador" for successful additions
- Error toasts: 
  - "ID de principal inválido" for invalid Principal ID format
  - "El campo ID de principal es obligatorio" for empty input

### Admin Users Table
- Displays all registered users with columns:
  - Principal ID (with copy-to-clipboard functionality)
  - Rol actual (role display badges: "Administrador" green badge / "Usuario" blue badge / "Sin Rol" gray badge)
  - Acciones (role management buttons)
- Responsive design: table for desktop, cards for mobile
- Consistent table styling with dark/light theme support

### Search and Filter System
- Search input field for filtering by Principal ID
- Role filter dropdown with options: "Todos", "Administrador", "Usuario", "Sin Rol"
- Real-time filtering of displayed users based on search and filter criteria
- Clear filters functionality to reset search and filter state

### Role Management Operations
- Action buttons for each user row:
  - "Asignar Admin" button (visible for non-admin users)
  - "Asignar Usuario" button (visible for admin users)
  - "Eliminar Rol" button (visible for users with roles, disabled for current user)
- Confirmation dialogs in Spanish for all role changes:
  - "¿Seguro que deseas asignar rol de administrador a este usuario?"
  - "¿Seguro que deseas asignar rol de usuario a este usuario?"
  - "¿Seguro que deseas eliminar el rol de este usuario?"
- Protection against removing own admin role
- Prevention of demotion of the last admin user
- Loading states during role update operations

### Data Loading and Management
- On page load, calls `getAllUsers` backend endpoint to fetch all user roles
- React Query integration for data fetching and caching
- Real-time role updates after successful operations
- Automatic refresh of user list after role changes

### API Integration
- Backend integration with user management functions:
  - `getAllUsers()` to fetch all user roles and information
  - `assignCallerUserRole(principal: Text, role: UserRole)` to assign specific roles with proper Principal parsing
  - `removeUserRole(principal: Text)` to remove user roles
- Role assignment with proper validation and error handling
- Admin-only access control for all operations
- Backend ensures proper Principal parsing from string format to avoid empty object issues

### Error Handling
- Spanish toast notifications for all operations:
  - "Usuario promovido a administrador" for successful admin promotions
  - "Rol actualizado correctamente" for successful role changes
  - "Error al actualizar rol" for role update failures
  - "Error al cargar usuarios" for data loading failures
  - "ID de principal inválido" for invalid Principal ID format
  - "El campo ID de principal es obligatorio" for empty input validation
  - "No se puede eliminar el último administrador" for last admin protection
  - "No puedes eliminar tu propio rol de administrador" for self-removal attempts
- Network error handling with retry logic
- Graceful degradation for failed requests

### State Management
- Maintain user roles list state
- Real-time updates after role changes
- Preserve search and filter state during operations
- Consistent design and localization with existing components

## Categories Management (Categorías Page)

### Page Layout
- Header row with "Categorías" title on the left
- Two right-aligned icon buttons:
  - Bulk create button (lucide "layers" icon)
  - Add category button (lucide "plus" icon)

### Categories Table
- Displays categories with columns:
  - ID
  - Name (Nombre)
  - Order controls (up/down arrows for reordering)
  - Default IVA (displayed as "X%")
  - Default Profit Margin (displayed as "X%")
  - Action buttons (Edit/Delete)

### Edit and Delete Functionality
- Edit button opens add/edit modal pre-filled with selected category's data
- Delete button triggers confirmation dialog with Spanish message: "¿Seguro que deseas eliminar esta categoría?"
- **Enhanced Category Deletion Validation**: Before deleting a category, the backend validates that no products are associated with it
- **Product Association Check**: Backend iterates through all products and counts those with matching `categoryId`
- **Deletion Prevention**: If products are found with the category ID, deletion is prevented with Spanish error message: "No se puede eliminar la categoría porque tiene productos asociados. Elimine o reasigne los productos primero."
- **Frontend Error Handling**: Frontend API call for category deletion handles the specific error response and displays a toast notification with the same Spanish message when deletion fails due to associated products
- Delete confirmation calls backend `deleteCategory` function via React Query mutation
- Automatic table refresh after successful edits or deletions
- Success/error toast notifications in Spanish for all operations

### Filtering and Search
- Enhanced search input that filters by both category name and category ID
- Live filtering without page reload using React state
- String-to-number match support for ID searches
- IVA filter dropdown with options including "all" sentinel value
- Profit margin range filter with "no-change" sentinel value for bulk operations

### API Integration
- React Query hooks for `getCategories`, `updateCategory`, and `deleteCategory` backend calls
- Automatic data refresh after successful operations
- Error handling with Spanish toast notifications

### Bulk Create Modal
- Text area for inputting multiple category names (one per line)
- Input fields for setting default IVA and profit margin for all categories
- Auto-increment order numbers based on current maximum
- Table preview of pending categories with validation
- Error messages for duplicates and empty lines in Spanish
- Validation and error handling in Spanish

### Add/Edit Modal
- Supports both single category and bulk edit modes
- Pre-fills form fields with existing category data when editing
- Fields:
  - Name (locked in bulk edit mode)
  - Default IVA dropdown (0%, 4%, 10%, 21%)
  - Default Profit Margin (1-100%)
  - Order (optional field)
- Spanish labels and validation messages
- Bulk edit mode: only IVA and profit margin editable
- Calls backend `updateCategory` function for edits

### Batch Operations
- Bulk update functionality for default IVA and profit margin
- Batch reordering of selected categories
- Selection controls for multiple categories

## Products Management (Productos Page)

### Page Layout
- Header row with "Productos" title on the left
- Two right-aligned icon buttons:
  - Bulk update button (lucide "layers" icon)
  - Add product button (lucide "plus" icon)

### Search and Filter Bar
- Simplified search input without mode selector dropdown
- Search placeholder: "Busca por nombre, descripción o código de barras (mínimo 2 caracteres)"
- Automatic search mode detection logic:
  - Numeric-only input → exact barcode match (`searchMode: "barcode-exact"`)
  - Non-numeric or mixed input → search across barcode, name, and description (`searchMode: "normal"`)
- 300ms debounce with AbortController for request cancellation
- Category dropdown filter with enhanced scrolling functionality:
  - Fixed maximum height showing exactly 10 visible items
  - Vertical scrollbar appears when more than 10 categories exist
  - Native or styled scrollbars depending on platform
  - Touch-friendly scrolling on mobile devices
  - Full keyboard navigation support (Up/Down arrows, Enter, Escape)
  - All categories preloaded and available (no lazy loading)
  - Responsive design maintaining 10-item constraint
  - "all" sentinel value for showing all categories
- Stock threshold filter with "no-change" sentinel value

### Products Display System
- **Responsive View Switching**: Automatically detects viewport width and switches between table view (≥768px) and card view (<768px)
- **Desktop Table View** (≥768px):
  - Server-side pagination with configurable page size
  - Displays products with columns:
    - Barcode (with copy-to-clipboard icon)
    - Name (Nombre)
    - Category (Categoría)
    - Stock
    - Base Price (Precio Base) - formatted with Spanish comma decimal separators (€XX,XX)
    - Sale Price (Precio Venta) - calculated using unified formula and formatted with Spanish comma decimal separators (€XX,XX)
    - Action buttons (Edit/Delete)
  - Hover highlights on table rows
  - Copy-to-clipboard functionality with Spanish tooltips and toast feedback
- **Mobile Card View** (<768px):
  - Vertical card layout displaying each product as individual cards
  - Card content structure (in Spanish):
    1. **Barcode & Name** (bold text with copy-to-clipboard icon)
    2. **Category** (muted text style)
    3. **Stock:** "Stock: X" (clear label)
    4. **Price Section** (grouped with visual hierarchy):
       - "Base: €XX,XX" (base price with Spanish comma formatting)
       - "IVA: €XX,XX" (calculated IVA amount with Spanish comma formatting)
       - "Beneficio: €XX,XX" (calculated profit amount with Spanish comma formatting)
       - "Venta: €XX,XX" (prominent sale price with Spanish comma formatting)
    5. **Action Buttons:** Edit ✏️ and Delete 🗑️ icons positioned at bottom right
  - Consistent margin and spacing between cards
  - Visual grouping with clear information hierarchy
  - Hover/tap states for interactive elements
  - ARIA labels for accessibility compliance
  - No horizontal scrolling, cards fit viewport width
  - Performance optimized for rendering multiple cards
- **Shared Functionality**:
  - Uses existing paginated API responses (no additional backend requests)
  - Reuses table pagination, lazy loading, filtering, and search logic
  - Card view actions (Edit/Delete) invoke same modals and dialogs as desktop
  - Copy-to-clipboard functionality identical to Products table
  - Smooth transition when resizing or changing device orientation
- Pagination controls with page navigation, size selector, and "Mostrando X-Y de Z productos" text

### Product Data Structure
- Barcode as unique identifier (no separate ID field)
- Name, description, categoryId (references category)
- Stock quantity
- Base price, IVA percentage, profit margin percentage
- Created date and updated date timestamps

### Price Calculations
- Uses unified price calculation utility for consistency across all components
- Real-time calculation preview in forms using shared formula
- Consistent Spanish comma decimal formatting across all price displays
- Console warnings for calculation mismatches

### Add/Edit Modal Dialog
- Modal title: "Agregar Producto" or "Editar Producto" based on mode
- Form fields:
  - Barcode (read-only when editing, with copy-to-clipboard)
  - Name and description (with copy-to-clipboard icons)
  - Category dropdown with enhanced scrolling functionality:
    - Fixed maximum height showing exactly 10 visible items
    - Vertical scrollbar appears when more than 10 categories exist
    - Native or styled scrollbars depending on platform
    - Touch-friendly scrolling on mobile devices
    - Full keyboard navigation support (Up/Down arrows, Enter, Escape)
    - All categories preloaded and available (no lazy loading)
    - Responsive design maintaining 10-item constraint
    - Prefills IVA and profit margin from category defaults
  - Stock quantity
  - Base price
  - IVA percentage
  - Profit margin percentage
- Category default values display: "Valores por defecto de la categoría: IVA X %, Margen Y %"
- Created/Updated dates displayed at bottom in Spanish format
- Real-time price calculation preview using unified formula showing IVA amount, profit amount, and final sale price with Spanish comma decimal formatting
- Copy-to-clipboard icons with Spanish tooltips and toast notifications

### Bulk Update Modal
- Allows updating IVA and profit margin for products in selected categories
- Shows explanatory note and sample recalculation using unified formula in Spanish
- Category selection with enhanced scrolling functionality:
  - Fixed maximum height showing exactly 10 visible items
  - Vertical scrollbar appears when more than 10 categories exist
  - Native or styled scrollbars depending on platform
  - Touch-friendly scrolling on mobile devices
  - Full keyboard navigation support (Up/Down arrows, Enter, Escape)
  - All categories preloaded and available (no lazy loading)
  - Responsive design maintaining 10-item constraint
  - Preview of affected products count
- Single backend request for batch updates
- Processing indicator and success/failure summary

### Delete Functionality
- Delete button triggers confirmation dialog with Spanish message
- Confirmation dialog shows product details for verification
- Success/error toast notifications in Spanish

### API Integration
- Paginated GET endpoint with parameters:
  - pageNumber, pageSize
  - searchTerm, searchMode (normal/barcode-exact)
  - categoryFilter, stockFilter
- Response includes category names and total product count
- CRUD endpoints for individual product operations
- Batch update endpoint for category-based bulk operations
- React Query hooks for data fetching and mutations

## Legacy Import Management (Importación Legacy Page)

### Page Layout
- Header row with "Importación Legacy" title
- Two-tab layout within the page: "Categorías" and "Productos"
- Each tab contains:
  - Collapsible "Formato JSON" reference section
  - Drag-and-drop JSON file uploader with file size and progress indicators
  - Import configuration settings
  - Preview area showing up to 10 rows
  - Import action buttons

### Categories Import Tab
- Collapsible JSON format reference with explanatory Spanish comments showing expected structure
- Drag-and-drop JSON file input with validation for structure: `{ "categories": [ { "id": ignored, "name": Text, "order": Nat } ] }`
- Configuration settings:
  - Default IVA dropdown (0%, 4%, 10%, 21%)
  - Default Profit Margin (1-100%)
- Client-side validation ensuring proper JSON structure
- Duplicate name checking (case-insensitive) against existing backend categories
- Import preview table showing: name, order, IVA, profit margin, and validation status
- Single API call to backend `importLegacyCategories` function
- Success/error toast notifications in Spanish

### Products Import Tab
- Collapsible JSON format reference with sample structure showing expected fields: barcode, name, description, category (string), price (sale price), stock, createdDate, lastUpdatedDate
- Drag-and-drop JSON file input with validation for structure: `{ "products": [ ... ] }`
- Category name resolution: matches existing categories case-insensitively by name from "category" field
- Automatic creation of missing categories with sequential order numbers, default IVA 21%, and default profit margin 10%
- Price calculation: treats JSON "price" field as sale price, calculates base price server-side using unified reverse formula
- Client-side mapping before sending to backend:
  - barcode: json.barcode
  - name: json.name
  - description: json.description
  - salePrice: json.price
  - stock: json.stock
  - categoryName: json.category
  - createdDate: json.createdDate
  - lastUpdatedDate: json.lastUpdatedDate
- Validation for non-empty category name (string) and numeric positive price
- Import preview table showing: barcode, name, category status ("Categoría existente" or "Nueva categoría a crear"), sale price vs calculated base price using unified formula with Spanish comma decimal formatting ("Precio de venta: €XX,XX → Precio base calculado: €YY,YY"), and validation status
- Duplicate barcode detection and skipping
- Single API call to backend `importLegacyProducts` function
- Import summary feedback with count of successful imports
- BigInt timestamp parsing for imported date fields with proper conversion from string format

### Import Process
- File validation and parsing on client side
- Preview generation with validation status indicators
- Single backend API calls for batch import operations
- Progress indicators during file processing
- Comprehensive error handling with Spanish messages explaining reverse calculation logic using unified formula and category name matching behavior
- Toast notifications for all import results
- BigInt-safe timestamp handling for imported data compatibility

## Data Import Management (Importación Page)

### Page Layout
- Header row with "Importación de Datos" title
- Two-tab layout within the page: "Categorías" and "Productos"
- Each tab contains:
  - Drag-and-drop JSON file uploader with file format validation
  - Import preview table showing first 10 records
  - Import action buttons and template download

### Categories Import Tab
- Drag-and-drop JSON file input without `exportType` validation requirement
- Enhanced numeric field conversion with robust string-to-number conversion for:
  - `categoryId` (converted to number, validated as unique)
  - `order` (converted to number, validated as ≥ 0)
  - `defaultIVA` (converted to number, validated as 0, 4, 10, or 21)
  - `defaultProfitMargin` (converted to number, validated as 1-100)
- Type conversion error handling with Spanish messages: "Error de conversión: {fieldName} debe ser un número válido"
- Client-side validation and safe numeric conversion for all fields:
  - CategoryId (number after conversion, required, unique)
  - Name (string, required)
  - Order (number after conversion, required, ≥ 0)
  - DefaultIVA (number after conversion, required, must be 0, 4, 10, or 21)
  - DefaultProfitMargin (number after conversion, required, 1-100)
- Import preview table showing: ID, name, order, default IVA, default profit margin, validation status
- Duplicate detection by categoryId with visual highlighting after conversion
- Summary counts: total records, valid records, duplicates, errors
- Action buttons:
  - "Importar Datos" (calls backend API)
  - "Limpiar" (resets form and preview)
  - "Descargar Plantilla" (downloads example JSON template)

### Products Import Tab
- Drag-and-drop JSON file input without `exportType` validation requirement
- Enhanced numeric field conversion with robust string-to-number conversion for:
  - `iva` (converted to number, validated as 0, 4, 10, or 21)
  - `profitMargin` (converted to number, validated as 1-100)
  - `categoryId` (converted to number, validated against existing categories)
  - `stock` (converted to number, validated as ≥ 0)
  - `basePrice` (converted to number, validated as > 0)
- Type conversion error handling with Spanish messages: "Error de conversión: {fieldName} debe ser un número válido"
- Category existence validation after conversion: "Categoría con ID {categoryId} no existe en la base de datos"
- Client-side validation and safe numeric conversion for all fields:
  - Barcode (string, required)
  - Name (string, required)
  - Description (string, optional)
  - CategoryId (number after conversion, required, must exist in backend)
  - Stock (number after conversion, required, ≥ 0)
  - BasePrice (number after conversion, required, > 0)
  - IVA (number after conversion, required, must be 0, 4, 10, or 21)
  - ProfitMargin (number after conversion, required, 1-100)
  - CreatedDate (string timestamp, converted to BigInt)
  - UpdatedDate (string timestamp, converted to BigInt)
- Ignores `salePrice` field during validation and backend submission
- Import preview table showing: barcode, name, category status, base price with Spanish comma decimal formatting, validation status
- Duplicate detection by barcode with visual highlighting after conversion
- Summary counts: total records, valid records, duplicates, errors
- Action buttons:
  - "Importar Datos" (calls backend API)
  - "Limpiar" (resets form and preview)
  - "Descargar Plantilla" (downloads example JSON template)

### Import Process
- File validation and JSON parsing on client side without `exportType` requirement
- Robust string-to-number conversion function with comprehensive error handling
- BigInt timestamp parsing for date fields
- Preview generation with validation status indicators after type conversion
- Batch import processing with loading state and progress indicator
- Backend API calls with comprehensive error handling
- Success/error toast notifications in Spanish:
  - "Datos importados correctamente"
  - "Error al importar datos"
- Import result summary with counts of imported, skipped, and error records
- Round-trip compatibility with Export page JSON format
- Partial success handling and retry on failure
- Float precision preservation for base prices and other decimals without rounding

### Template Download
- Generates example JSON files for both products and categories
- Products template includes all required fields with sample data
- Categories template includes all required fields with sample data
- Downloads as `productos_plantilla.json` and `categorias_plantilla.json`

### Error Handling
- Comprehensive validation error messages in Spanish
- Network error handling with retry logic
- File format validation with specific error messages
- Numeric conversion error handling with field-specific messages: "Error de conversión: {fieldName} debe ser un número válido"
- Backend error response handling with detailed error lists
- Category existence validation errors: "Categoría con ID {categoryId} no existe en la base de datos"

## Data Export Management (Exportación Page)

### Page Layout
- Header row with "Exportación de Datos" title
- Three-tab layout within the page: "Categorías", "Productos", "Pedidos"
- Each tab contains:
  - Filter options specific to data type
  - Record count display showing total matching records
  - Progress indicator during export operations
  - "Exportar [tipo]" button for downloading JSON file

### Categories Export Tab
- No filter options (exports all categories)
- Record count display: "X categorías encontradas"
- Export button: "Exportar Categorías"
- Downloaded filename: `categories_export.json`

### Products Export Tab
- Filter options:
  - Category dropdown filter with enhanced scrolling functionality:
    - Fixed maximum height showing exactly 10 visible items
    - Vertical scrollbar appears when more than 10 categories exist
    - Native or styled scrollbars depending on platform
    - Touch-friendly scrolling on mobile devices
    - Full keyboard navigation support (Up/Down arrows, Enter, Escape)
    - All categories preloaded and available (no lazy loading)
    - Responsive design maintaining 10-item constraint
    - "all" sentinel value for exporting all categories
  - Stock range filters: minimum and maximum stock values
  - Date range filters: "Desde Fecha" and "Hasta Fecha" for creation/update dates
- Record count display: "X productos encontrados"
- Export button: "Exportar Productos"
- Downloaded filename: `products_export.json`

### Orders Export Tab
- Filter options:
  - Date range filters: "Desde Fecha" and "Hasta Fecha" for order dates
  - Status filter dropdown: "Todos", "Válido", "Inválido"
  - Payment method filter dropdown: "Todos", "Efectivo", "Tarjeta", "Transferencia"
- Record count display: "X pedidos encontrados"
- Export button: "Exportar Pedidos"
- Downloaded filename: `orders_export.json`

### Export Process
- Client-side filter validation before export request
- Backend API calls with filter parameters
- Progress indicator with Spanish text: "Exportando datos..."
- Automatic JSON file download with proper MIME type
- Success toast notification: "Exportación completada correctamente"
- Error toast notification: "Error al exportar datos"
- File download handled client-side from backend response data

### BigInt Serialization Fix
- Recursive `convertBigIntsToStrings(data: any): any` utility function for safe JSON serialization
- Traverses objects and arrays to detect BigInt values using `typeof value === 'bigint'`
- Converts BigInt values to strings using `value.toString()`
- Preserves all other value types unchanged
- Skips null or undefined values
- Applied to all export handlers before `JSON.stringify` calls
- Try-catch wrapper around `JSON.stringify` with informative error messages in Spanish
- Ensures all timestamp fields (createdDate, lastUpdatedDate, timestamp) are properly converted
- Maintains import/export compatibility with string-formatted timestamps
- Preserves JSON structure and field names without formatting changes

### JSON Export Format
- Products export structure compatible with import format:
  - Includes all product fields with calculated sale prices using unified formula
  - Timestamps exported as strings for BigInt compatibility
  - Float values maintain full precision
  - Excludes categoryName field for compatibility
- Categories export structure:
  - Includes all category fields with product count
  - Compatible with import format
- Orders export structure:
  - Complete order data with nested items and tax breakdown
  - All timestamps as strings for BigInt compatibility
  - Includes order metadata and customer information
  - Payment method included in export data
  - Enhanced order items with `basePrice`, `ivaRate`, `profitMargin`, and `categoryName` fields

### Access Control
- Admin-only access with same gatekeeping logic as other admin pages
- Backend endpoints require admin authentication
- Error handling for unauthorized access attempts

## Toast Notification System
- Modern toast notification system positioned in the top-right corner
- Zustand store for managing multiple concurrent toasts with vertical stacking
- Toast component with compact card design, smooth CSS animations, shadow, and rounded corners
- Toast types with color-coded accents:
  - Success (green): auto-dismiss after 2 seconds
  - Info (blue): auto-dismiss after 2 seconds
  - Warning (amber): auto-dismiss after 4 seconds
  - Error (red): auto-dismiss after 4 seconds
- Manual close button on each toast for immediate dismissal
- Hover pause functionality to delay auto-dismiss timer while hovered
- Responsive layout maintaining top-right position on mobile
- Accessibility features including ARIA roles, keyboard interaction support, and proper color contrast
- Performance optimizations with memoized rendering and CSS transform-based transitions
- Helper functions in toast store: showSuccess, showError, showWarning, showInfo
- Toast-specific CSS styles appended below existing :root variable block in index.css

## Backend Data Management

### Store Details Data Structure
- Store details stored in backend with fields:
  - StoreName (Text)
  - Address (Text)
  - Phone (Text)
  - WhatsApp (Text)
  - TaxId (optional Text)
  - Email (optional Text)
  - Website (optional Text)
  - LastUpdated (Int, timestamp)

### User Role Data Structure
- **Persistent User Role Storage**: User roles stored in stable variables that persist across canister upgrades and deployments
- Role types: Admin, User, or no role assigned
- Stable map structure for efficient role lookup and management
- Persistent storage of user role assignments that survives canister redeployments
- First user initialization works for fresh deployments without overwriting existing roles during upgrades

### Admin Users Data Structure
- **Persistent Admin User Storage**: Admin users stored in stable variables that persist across canister upgrades and deployments
- Stable map structure for efficient admin status lookup
- Persistent storage of admin user list that survives canister redeployments

### Category Data Structure
- Categories stored in backend with fields:
  - ID (auto-generated)
  - Name
  - Order (Nat)
  - Default IVA (Nat)
  - Default Profit Margin (Nat)

### Product Data Structure
- Products stored in backend with fields:
  - Barcode (Text, unique identifier)
  - Name (Text)
  - Description (Text)
  - CategoryId (Nat, references category)
  - Stock (Nat)
  - BasePrice (Float)
  - IVA (Nat, percentage)
  - ProfitMargin (Nat, percentage)
  - CreatedDate (Int, timestamp)
  - UpdatedDate (Int, timestamp)

### Order Data Structure
- Orders stored in backend with extended data model:
  - OrderId (Text, unique identifier)
  - OrderNumber (Text, format: ORD-001, ORD-002, etc.)
  - Timestamp (Int, using Int.abs(Time.now()))
  - Status (variant: #valid or #invalid)
  - TotalAmount (Float)
  - DiscountAmount (Float)
  - PaymentMethod (variant: #cash, #card, or #transfer)
  - CustomerNotes (Text)
  - PrintReceipt (Bool)
  - Items (array of OrderItem)
  - TaxBreakdown (array of TaxBreakdown)
- Enhanced OrderItem structure with fields:
  - ProductBarcode (Text)
  - ProductName (Text)
  - CategoryName (Text)
  - Quantity (Nat)
  - BasePrice (Float)
  - IvaRate (Nat)
  - ProfitMargin (Nat)
  - SalePrice (Float, calculated using unified formula)
  - TotalPrice (Float)
  - OriginalStock (Nat)
  - UpdatedStock (Nat)
- TaxBreakdown structure with fields:
  - IvaRate (Nat)
  - BaseAmount (Float)
  - TaxAmount (Float)
  - TaxableAmount (Float)

### Archived Orders Data Structure
- Archived orders stored in separate backend map (`archivedOrders`) with identical structure to active orders
- Additional field added to each archived order:
  - ArchiveDate (Int, timestamp when order was archived)
- Maintains original OrderId and OrderNumber format (ORD-XXX)
- Preserves all original order data including items, tax breakdown, and metadata
- Enhanced archived order items include `basePrice`, `ivaRate`, `profitMargin`, and `categoryName` fields
- Separate storage allows for efficient querying and management of archived vs active orders

### Return Data Structure
- Returns stored in backend with comprehensive data model:
  - ReturnId (Nat, auto-generated)
  - ReturnNumber (Text, format: DEV-001, DEV-002, etc.)
  - OriginalOrderId (Text, references original order)
  - OriginalOrderNumber (Text, for display purposes)
  - ReturnType (variant: #full, #partial, or #cancellation)
  - Status (variant: #pending, #processed, or #rejected)
  - Reason (variant: #defective, #incorrect, #change_of_mind, or #other)
  - OtherReason (optional Text, when reason is #other)
  - RefundAmount (Float)
  - CreatedDate (Int, timestamp)
  - ProcessedDate (optional Int, timestamp when status changed)
  - AdminNotes (Text)
  - StatusChangeNotes (optional Text, notes when status updated)
  - Items (array of ReturnItem)
  - StockRestored (Bool, flag to prevent duplicate stock restoration)
- ReturnItem structure with fields:
  - ProductBarcode (Text)
  - ProductName (Text)
  - CategoryName (Text)
  - ReturnedQuantity (Nat)
  - OriginalQuantity (Nat, from original order)
  - RefundPerUnit (Float)
  - TotalRefund (Float)
  - StockRestored (Bool, per-item flag)

### Sales Analytics Data Structure
- `AnalyticsFilters` record with fields:
  - FromDate (Int, timestamp)
  - ToDate (Int, timestamp)
  - CategoryFilter (optional Nat, category ID)
  - PaymentMethodFilter (optional Text, "cash", "card", or "transfer")
  - IncludeArchived (Bool, whether to include archived orders)
- `AnalyticsData` record with fields:
  - ActiveOrders (array of Order)
  - ArchivedOrders (array of Order, empty if IncludeArchived is false)

### Import Data Structures
- `ProductImportDTO` with fields:
  - Barcode (Text, unique identifier)
  - Name (Text)
  - Description (Text)
  - CategoryId (Nat, must reference existing category)
  - Stock (Nat)
  - BasePrice (Float)
  - IVA (Nat, must be 0, 4, 10, or 21)
  - ProfitMargin (Nat, must be 1-100)
  - CreatedDate (Int, timestamp)
  - UpdatedDate (Int, timestamp)
- `CategoryImportDTO` with fields:
  - CategoryId (Nat, unique identifier)
  - Name (Text)
  - Order (Nat)
  - DefaultIVA (Nat, must be 0, 4, 10, or 21)
  - DefaultProfitMargin (Nat, must be 1-100)

### Import Result Structures
- `ProductsImportResult` with fields:
  - ImportedCount (Nat)
  - SkippedCount (Nat)
  - ErrorCount (Nat)
  - Errors (array of Text, detailed error messages)
- `CategoriesImportResult` with fields:
  - ImportedCount (Nat)
  - SkippedCount (Nat)
  - ErrorCount (Nat)
  - Errors (array of Text, detailed error messages)

### Export Data Structures
- `ProductExportDTO` with fields:
  - Barcode (Text)
  - Name (Text)
  - Description (Text)
  - CategoryId (Nat)
  - Stock (Nat)
  - BasePrice (Float)
  - SalePrice (Float, calculated using unified formula)
  - IVA (Nat)
  - ProfitMargin (Nat)
  - CreatedDate (Text, stringified timestamp)
  - UpdatedDate (Text, stringified timestamp)
- `CategoryExportDTO` with fields:
  - ID (Nat)
  - Name (Text)
  - Order (Nat)
  - DefaultIVA (Nat)
  - DefaultProfitMargin (Nat)
  - ProductCount (Nat, number of products in category)
- Enhanced `OrderExportDTO` with fields:
  - OrderId (Text)
  - OrderNumber (Text)
  - Timestamp (Text, stringified timestamp)
  - Status (Text, "valid" or "invalid")
  - TotalAmount (Float)
  - DiscountAmount (Float)
  - PaymentMethod (Text, "cash", "card", or "transfer")
  - CustomerNotes (Text)
  - PrintReceipt (Bool)
  - Items (array of OrderItemExportDTO)
  - TaxBreakdown (array of TaxBreakdownExportDTO)
- Enhanced `OrderItemExportDTO` with fields:
  - ProductBarcode (Text)
  - ProductName (Text)
  - CategoryName (Text)
  - Quantity (Nat)
  - BasePrice (Float)
  - IvaRate (Nat)
  - ProfitMargin (Nat)
  - SalePrice (Float, calculated using unified formula)
  - TotalPrice (Float)
- `TaxBreakdownExportDTO` with fields:
  - IvaRate (Nat)
  - BaseAmount (Float)
  - TaxAmount (Float)
  - TaxableAmount (Float)

### Export Result Structures
- `ProductsExportResult` with fields:
  - Products (array of ProductExportDTO)
  - TotalCount (Nat)
  - ExportTimestamp (Text, stringified timestamp)
- `CategoriesExportResult` with fields:
  - Categories (array of CategoryExportDTO)
  - TotalCount (Nat)
  - ExportTimestamp (Text, stringified timestamp)
- `OrdersExportResult` with fields:
  - Orders (array of OrderExportDTO)
  - TotalCount (Nat)
  - ExportTimestamp (Text, stringified timestamp)

### Paginated Returns Data Structure
- `PaginatedReturns` record with fields:
  - Returns (array of ReturnOrder)
  - TotalCount (Nat)
- Used by `getPaginatedReturns` endpoint for efficient data retrieval

### Paginated Orders Data Structure
- `PaginatedOrders` record with fields:
  - Orders (array of Order)
  - TotalCount (Nat)
- Used by `getPaginatedOrders` endpoint for efficient data retrieval

### Paginated Archived Orders Data Structure
- `PaginatedArchivedOrders` record with fields:
  - Orders (array of Order with ArchiveDate)
  - TotalCount (Nat)
- Used by `getPaginatedArchivedOrders` endpoint for efficient archived order retrieval

### Legacy Import Data Structures
- `LegacyCategoryImportDTO` with fields:
  - Name (Text)
  - Order (Nat)
- `LegacyProductImportDTO` with fields:
  - Barcode (Text)
  - Name (Text)
  - Description (Text)
  - CategoryName (Text)
  - Stock (Nat)
  - SalePrice (Float)
  - CreatedDate (Int, timestamp)
  - LastUpdatedDate (Int, timestamp)

### User Management Data Structures
- `UserInfo` record with fields:
  - Principal (Text, Internet Identity Principal ID)
  - Role (variant: #admin, #user, or #none)
  - LastLogin (optional Int, timestamp)
  - CreatedDate (Int, timestamp)
- `UserRole` variant type with options:
  - #admin (administrator privileges)
  - #user (standard user privileges)
  - #none (no assigned role)

### Archive Management Data Structures
- `ArchivePreviewResult` record with fields:
  - OrderCount (Nat, number of orders in date range)
- `ArchiveResult` record with fields:
  - ArchivedCount (Nat, number of orders successfully archived)
  - ArchivedIds (array of Text, list of archived order IDs)

### Backend API
- `isUserAdmin(principal: Text): async Bool` endpoint for admin verification
- User role management endpoints:
  - `getAllUsers(): async [UserInfo]` endpoint that returns all registered users with their roles and information
  - `assignCallerUserRole(principal: Text, role: UserRole): async { success: Bool; message: Text; }` endpoint for assigning specific user roles with proper Principal parsing from string format
  - `removeUserRole(principal: Text): async { success: Bool; message: Text; }` endpoint for removing user roles
  - Admin-only access control with proper permission checks and last admin protection
  - Backend ensures proper Principal parsing from string to avoid empty object issues
  - **Persistent role storage**: All user role assignments persist across canister upgrades and deployments
- Store details management endpoints:
  - `getStoreDetails(): async StoreDetails` endpoint that returns existing store details or creates default values
  - `updateStoreDetails(details: StoreDetails): async { success: Bool; message: Text; }` endpoint for updating store information
  - Admin-only access control with `AccessControl.hasPermission` checks
- Admin user management endpoints for adding and removing admin users with persistent storage
- Category management endpoints for CRUD operations
- **Enhanced Category Deletion Endpoint**:
  - `deleteCategory(id: Nat): async { success: Bool; message: Text; }` endpoint with product association validation
  - Before deletion, iterates through all products and counts those with matching `categoryId`
  - If products are found with the category ID, prevents deletion and returns error with Spanish message: "No se puede eliminar la categoría porque tiene productos asociados. Elimine o reasigne los productos primero."
  - If no products are associated, proceeds with normal deletion logic
  - Returns success confirmation when deletion completes successfully
- Product management endpoints:
  - Paginated product retrieval with search and filter support
  - Product creation, update, and deletion
  - Batch update operations by category
  - Product search endpoint for checkout system
  - Enhanced `getProductByBarcode(barcode: Text): async ?Product` endpoint for complete product data retrieval
- Order management endpoints:
  - Enhanced `createOrder` endpoint accepting complete order data with discount, tax breakdown, payment method, and enhanced item details
  - **CRITICAL FIX**: Backend `createOrder` function must correctly calculate `totalAmount` by subtracting `discountAmount` from the aggregated item totals, ensuring `totalAmount` cannot go below 0
  - Order creation with stock reduction (never below 0)
  - Recording of original and updated stock in OrderItem
  - Order number generation (sequential ORD-XXX format)
  - Complete order data persistence in backend memory map including payment method and enhanced item details
  - Order retrieval endpoints for receipt generation with dynamic store details
  - `getPaginatedOrders(pageNumber: Nat, pageSize: Nat, searchTerm: Text, searchMode: Text, fromDate: ?Int, toDate: ?Int): async PaginatedOrders` endpoint for processed orders retrieval
  - Backend ensures taxBreakdown array is properly calculated and included in order creation
  - Enhanced order items include `basePrice`, `ivaRate`, `profitMargin`, and `categoryName` fields
- Sales analytics endpoints:
  - `getSalesAnalyticsData(filters: AnalyticsFilters): async AnalyticsData` endpoint for retrieving raw order data for analytics
  - Admin-only access control with proper permission checks
  - Returns filtered raw order data without calculations or aggregations
  - Supports date range filtering, category filtering, payment method filtering, and archived orders inclusion
- Archive management endpoints:
  - `getArchivePreview(dateFrom: Int, dateTo: Int): async ArchivePreviewResult` endpoint for previewing archive operation
  - `archiveOrders(dateFrom: Int, dateTo: Int): async ArchiveResult` endpoint for moving orders to archive
  - `getPaginatedArchivedOrders(pageNumber: Nat, pageSize: Nat, searchTerm: Text, searchMode: Text, fromDate: ?Int, toDate: ?Int): async PaginatedArchivedOrders` endpoint for archived orders retrieval
  - `getArchivedOrderDetails(orderId: Text): async ?Order` endpoint for individual archived order retrieval
  - Admin-only access control with proper permission checks
  - Maintains `nextOrderNumber` continuity across archive operations
  - Preserves original order IDs and structure in archived orders with enhanced item details
- Return management endpoints:
  - `createReturn(returnData: ReturnOrderDTO): async ReturnResult` for creating new returns
  - `updateReturnStatus(returnId: Nat, newStatus: { #pending; #processed; #rejected }, adminNotes: ?Text): async StatusResult` for status updates with stock restoration
  - `getReturnDetails(returnId: Nat): async ?ReturnOrder` for individual return retrieval
  - `getPaginatedReturns(pageNumber: Nat, pageSize: Nat, searchTerm: Text, searchMode: Text, typeFilter: Text, statusFilter: Text, reasonFilter: Text, fromDate: ?Int, toDate: ?Int, originalOrderNumber: ?Text): async PaginatedReturns` for returns listing
  - `generateReturnReceipt(returnId: Nat): async ReceiptData` for return receipt generation with dynamic store details
- Export management endpoints:
  - `exportProducts(categoryFilter: ?Nat, minStock: ?Nat, maxStock: ?Nat, fromDate: ?Int, toDate: ?Int): async ProductsExportResult` for products export with filtering using unified formula
  - `exportCategories(): async CategoriesExportResult` for categories export
  - Enhanced `exportOrders(fromDate: ?Int, toDate: ?Int, statusFilter: ?Text, paymentMethodFilter: ?Text): async OrdersExportResult` for orders export with filtering including payment method and enhanced item details
  - All export endpoints require admin authentication
  - Export endpoints support batch pagination for large datasets
  - Sale price calculation using unified backend formula for consistency
  - BigInt timestamps converted to strings for JSON compatibility
  - Float values maintain full precision in export format
- Import management endpoints:
  - `importProducts(products: [ProductImportDTO]): async ProductsImportResult` for importing products from export format
  - `importCategories(categories: [CategoryImportDTO]): async CategoriesImportResult` for importing categories from export format
  - Skip existing records by barcode (products) or categoryId (categories)
  - Preserve basePrice exactly without recalculation
  - Parse BigInt-string timestamps into Motoko Int for storage
  - Validate IVA (0, 4, 10, 21) and profitMargin (1-100) ranges
  - Validate categoryId references for products
  - Return detailed import results with counts and error lists
  - Admin-only access control
- Legacy import endpoints:
  - `importLegacyCategories(categoriesToImport: [LegacyCategoryImportDTO]): async ImportResult`
  - `importLegacyProducts(productsToImport: [LegacyProductImportDTO]): async ImportResult`
- Functions to handle product creation, retrieval, updating, and deletion
- Support for bulk product operations
- Auto-generation of timestamps for created and updated dates
- Legacy import logic:
  - Categories: skip existing names (case-insensitive), preserve order, use provided defaults
  - Products: resolve category by name (case-insensitive), create missing categories with sequential order and defaults (IVA 21%, profit margin 10%), calculate basePrice from salePrice using unified reverse formula
- Import logic for export format:
  - Products: skip existing barcodes, validate categoryId exists, preserve basePrice exactly
  - Categories: skip existing categoryIds, allow duplicate names with different IDs
- Backward compatibility with existing data structures
- Order search logic:
  - "order-barcode-exact" mode: matches both order number numeric suffix and product barcodes, returns union of distinct orders
  - "normal" mode: searches order number, product names, and customer notes
- Return search logic:
  - "return-order-exact" mode: matches return ID numeric part and original order number numeric suffix, returns union of distinct returns
  - "normal" mode: searches return items, product names, and admin notes
- Archive search logic:
  - Same search modes as active orders but applied to archived orders dataset
  - "order-barcode-exact" mode: matches archived order number numeric suffix and product barcodes
  - "normal" mode: searches archived order number, product names, and customer notes
- Date range filtering for orders, returns, and archived orders with optional fromDate and toDate parameters
- Orders, returns, and archived orders returned in reverse chronological order (newest first)
- Stock restoration logic with idempotent operations using stockRestored flags
- Duplicate return prevention per original order
- Admin-only access control on all return management endpoints, export endpoints, import endpoints, user role management endpoints, archive management endpoints, and sales analytics endpoints
- Receipt generation endpoints dynamically fetch store details and fallback to defaults on failure
- Export data optimization with memory-efficient batch processing for large datasets
- Import data validation with comprehensive error handling and detailed error reporting
- Consistent data format validation and error handling across all export and import endpoints
- Round-trip compatibility between export and import operations with BigInt timestamp handling
- Unified `calculateSalePrice(basePrice: Float, iva: Nat, profitMargin: Nat): Float` function used consistently across all backend modules
- All sale price calculations use the unified backend formula for consistency
- Payment method validation and storage in order creation process
- Payment method included in all order-related data structures and API responses
- User role validation and assignment with proper access control and persistent storage
- Role management with protection against unauthorized access and persistent storage across deployments
- Principal ID format validation for user management operations
- Last admin protection to prevent system lockout
- User search and filtering capabilities for admin management interface
- Archive operations preserve order continuity and maintain referential integrity
- Archive date tracking for audit and filtering purposes
- Enhanced order creation accepts and stores `basePrice`, `ivaRate`, `profitMargin`, and `categoryName` in OrderItem records

## State Management
- Authentication state (logged in/logged out)
- Admin status state (admin/non-admin) with caching to prevent redundant queries
- Side panel state (expanded/collapsed)
- **Fixed Active Page State**: Active page state (current admin section including orders, store details, export, import, user management, orders archive, and sales analytics) properly managed via Zustand store with `setActivePage` function
- Toast notification state (multiple concurrent toasts)
- Category management state (categories list, filters, selections)
- Product management state (products list, pagination, filters, selections)
- Admin users management state (user roles list, loading states, role updates, search and filter state)
- Store details management state (form data, loading states, validation)
- Legacy import state (file upload, validation, preview data)
- Import state (active tab, file upload, validation, preview data, template download)
- Export state (active tab, filter settings, progress indicators, record counts)
- Orders state (active tab, cart items, search results, checkout form with payment method validation, processed orders pagination and filters)
- Enhanced cart state with expanded item data structure:
  - Existing fields: `barcode`, `name`, `quantity`, `salePrice`, `isCustom`
  - New fields: `basePrice`, `ivaRate`, `profitMargin`, `categoryName`
  - Backward compatibility with existing cart items
  - BigInt-safe local storage persistence including new fields
- Returns state (returns list, pagination, filters, status updates, receipt generation)
- Orders archive state (active tab, archived orders list, pagination, filters, archive creation process)
- Sales analytics state (filter settings, analytics results, loading states, chart data)
- Receipt state with BigInt-safe persistence for receipt data and print status
- Print status state (idle, printing, success, error) managed via Zustand store
- Dashboard set as default page after admin login
- **Independent Tab Loading State Management**: Track which tabs have been loaded to avoid redundant API calls and maintain session data persistence per tab
- **Tab Activation State**: Track active tab state to control React Query hook execution via `enabled` flags
- Processed orders filter state (search terms, date ranges, pagination) preserved across tab switches
- Returns filter state (search terms, date ranges, type/status/reason filters, pagination) preserved across tab switches
- Archive filter state (search terms, date ranges, pagination) preserved across tab switches
- Archive creation state (date range selection, preview results, confirmation) preserved during process
- Export filter state (category filters, date ranges, status filters) preserved across tab switches
- Import filter state (file upload, validation results, preview data) preserved across tab switches
- User management state (user roles, role updates, loading states, search and filter criteria) preserved during operations
- Sales analytics filter state (time period, category, payment method, date ranges, archived toggle) preserved during data refresh

## Responsive Design
- 1200px maximum width constraint shared between header and content areas
- Content centered horizontally
- Side panel overlay behavior on mobile
- Responsive grid layout for dashboard cards with 3 cards per row on desktop screens
- Toast notifications adapted for mobile while maintaining top-right position
- Fully responsive modals and management controls
- Access Denied interface responsive layout
- **Products page responsive display system**:
  - **Automatic viewport detection**: Switches between table view (≥768px) and card view (<768px)
  - **Desktop table view**: Traditional table layout with horizontal scroll on mobile if needed
  - **Mobile card view**: Vertical card layout optimized for touch interaction
  - **Smooth transitions**: Seamless switching when resizing or changing device orientation
  - **Performance optimized**: Efficient rendering for multiple cards without horizontal scrolling
  - **Consistent functionality**: Same pagination, filtering, search, and actions across both views
- Legacy import page responsive layout with tab switching
- Import page responsive layout with two-tab switching and mobile-friendly file upload
- Export page responsive layout with three-tab switching and mobile-friendly filters
- Caja page responsive three-tab layout with mobile stacking
- Orders archive page responsive two-tab layout with mobile stacking
- Sales analytics page responsive layout with mobile-friendly filters and charts
- Responsive cart table/card layout
- Processed orders table responsive design: table for desktop, cards for mobile
- Archived orders table responsive design: table for desktop, cards for mobile
- Returns table responsive design: table for desktop, cards for mobile
- Return creation modals responsive design with mobile-friendly layouts
- Archive creation interface responsive design with mobile-friendly date selectors
- Store details form responsive design with mobile-optimized layout
- Export filter sections responsive design with mobile-optimized layout
- Import file upload zones responsive design with mobile-optimized drag-and-drop
- Admin users management table responsive design: table for desktop, cards for mobile
- User role management modals responsive design with mobile-friendly layouts
- Sales analytics summary cards responsive grid layout
- Sales analytics charts responsive design with mobile-friendly sizing
- **Mobile font size reduction**: Global font size reduction for mobile browsers only (via CSS media query `@media (max-width: 767px)`), excluding print HTML, so that printed receipts and thermal print formatting remain unchanged
- Smooth transitions consistent with application style

## Technical Requirements
- React with JavaScript
- Custom build configuration:
  - Disabled minification in production
  - Full error messages in production builds
  - Preserved component names for debugging
  - Source maps generated in production
- Zustand store structure for toast notifications, cart state, receipt state, print status, authentication state with admin status caching, and sales analytics state
- **Fixed Page Navigation State**: Zustand store for active page state with proper `setActivePage` function that updates the current admin section
- Enhanced cart store with expanded item data structure and backward compatibility
- Performance optimizations included
- Web Worker-based session management with automatic lifecycle control
- Session worker (`session-worker.js`) for keep-alive functionality without backend API calls
- Admin verification with caching to prevent redundant queries
- Lazy loading of admin components only after confirmation of admin role
- Preserve all existing theme variables in index.css
- Append new styles below existing :root variables including thermal receipt print styles
- `@media print` styles in `index.css` with `@page { size: 80mm auto; margin: 0; }` and 80mm width constraint
- Left alignment for printed content, centered alignment for preview dialogs
- **Thermal printer font optimization**: `'Courier New', Courier, monospace` font stack applied globally to all receipt content sections
- **Thermal printer font sizing**: Base `10pt`, store name header `12pt`, column headers `9pt` bold
- Hide numeric input spinners across browsers
- Lazy loading and cached page data for optimal performance
- Minimal re-renders with proper React optimization
- Web Audio API integration for cart sound effects
- BigInt serialization utilities for safe data persistence
- Single API call optimization for complete order creation with embedded arrays including payment method and enhanced item details
- Select components never use empty string as value; use sentinel values like "all" or "no-change"
- React Query hooks for all return management operations, store details management, export operations, import operations, orders management, user role management, archive management operations, and sales analytics operations
- **Independent Tab Lifecycle Management**: React Query hooks include `enabled` flags tied to tab activation state to prevent cross-tab query execution
- **Conditional Query Execution**: Data-fetching hooks (`useGetPaginatedOrders`, `useGetPaginatedReturns`) only execute when their respective tabs are active
- **No Cross-Tab Query Invalidation**: Order creation in Ventas tab does not trigger automatic query invalidations or refetches for other tabs
- Idempotent stock restoration operations with proper error handling
- Client-side file download handling for export functionality
- Client-side file upload handling for import functionality with drag-and-drop support
- JSON export format validation and error handling
- JSON import format validation and error handling with robust string-to-number conversion
- Memory-efficient export processing for large datasets
- Memory-efficient import processing for large datasets
- Recursive BigInt serialization utility for safe JSON export operations
- Safe numeric conversion utility for import validation with comprehensive error handling
- Round-trip compatibility between export and import operations
- Template generation and download for import operations
- Unified price calculation utility (`calculateSalePriceUtil.ts`) used consistently across all frontend components
- Console warnings for price calculation mismatches between different application sections
- Validation checks to ensure frontend and backend formulas produce identical results
- Hidden iframe print infrastructure with persistent mounting
- Centralized print service (`printService.ts`) with retry logic and status management
- HTML-based receipt templates for iframe injection with payment method display and IVA breakdown table
- **Enhanced CIF Display in Print Service**: Update receipt HTML generation in `printService.ts` to prepend "CIF " label before store `taxId` value when it has a non-empty value, using ALL CAPS, bold styling, and same font size (10px, monospace) as other store header lines, positioned after phone numbers in the store header section for all receipt types
- **Spanish closing lines after IVA breakdown table in print service**:
  - Update receipt generation logic in `printService.ts` to append two closing lines after the IVA breakdown table (including TOTAL row):
    - Line 1: "GRACIAS POR SU COMPRA" (ALL CAPS, bold)
    - Line 2: "GUARDAR EL RECIBO" (ALL CAPS, bold)
  - Add one blank line/space following the "GUARDAR EL RECIBO" line for visual spacing
  - Styling uses monospace font (`'Courier New', Courier, monospace`) consistent with thermal printer optimization
  - Applied to all receipt types: order, return, archived, and reprint receipts
  - Update CSS to properly style the closing lines with bold formatting and appropriate spacing
- Mobile browser print dialog compatibility
- Try/catch safety around all print operations with Spanish error messages
- Frontend ensures taxBreakdown data is properly passed to printService for receipt generation
- Enhanced receipt generation using stored cart item data for historical accuracy
- **Optimized thermal receipt column widths**: Receipt HTML generation includes optimized `<colgroup>` structure with QTY (10%), DESCRIPCION (50%), P.UNIT (20%), IMP.(€) (20%) for improved readability within 80mm thermal printer constraint
- **Enhanced Product Name Display in Print HTML**:
  - Modify `printService.ts` to apply flexible text wrapping CSS to product name cells in the DESCRIPCION column
  - Add CSS properties: `word-wrap: break-word`, `overflow-wrap: break-word`, and `overflow: visible` to product name table cells
  - Remove any `white-space: nowrap` restrictions from product name column
  - Ensure product names can wrap to multiple lines within the 50% column width while maintaining table structure
  - Preserve monospace font stack (`'Courier New', Courier, monospace`) and 10pt base font size for consistency
  - Maintain column alignment for QTY, P.UNIT, and IMP.(€) columns while allowing DESCRIPCION column to wrap
  - Apply changes only to the print HTML generation, not to preview dialogs or other components
  - Ensure full product names are visible in printed receipts without character clipping or truncation
- Shared number formatting utility (`formatNumberUtil.ts`) for consistent Spanish decimal formatting across all monetary displays
- Spanish comma decimal formatting applied at display level only, backend storage maintains standard numeric format
- Enhanced category dropdown scrolling functionality across all components:
  - Fixed maximum height showing exactly 10 visible items based on consistent row height units
  - Vertical scrollbar appears when more than 10 categories exist
  - Native or styled scrollbars depending on platform with consistent behavior
  - Touch-friendly scrolling on mobile devices
  - Full keyboard navigation support (Up/Down arrows, Enter, Escape)
  - All categories preloaded and available (no lazy loading)
  - Responsive design maintaining 10-item constraint across screen sizes
  - Consistent styles applied across all dropdown instances
  - Accessibility and internationalization maintained (Spanish text)
- Consistent touch support and keyboard accessibility for limited-height dropdowns
- Role-based access control with proper validation and error handling
- User role management with confirmation dialogs and loading states
- Principal ID format validation for user management operations using Motoko-compatible format
- Admin status caching and conditional rendering based on admin verification
- Error handling for admin verification failures with fallback to Access Denied interface
- Archive management with proper data integrity and referential consistency
- Archive operations with transaction-like behavior to ensure data consistency
- Enhanced product data fetching for complete cart item information
- Backend API integration for complete product details retrieval
- Cart item enhancement with historical data preservation
- Sales analytics with frontend-only calculations and backend raw data API support
- Client-side analytics calculations for profit, revenue, margins, and aggregations
- Chart and visualization components for analytics display
- **Mobile-responsive card view implementation**:
  - CSS media queries for automatic view switching at 768px breakpoint
  - Card layout CSS with proper spacing, hierarchy, and touch optimization
  - Performance optimizations for rendering multiple product cards
  - Accessibility compliance with ARIA labels and keyboard navigation
  - No horizontal scrolling constraints for mobile card view
  - Smooth transitions between table and card views during viewport changes
- **Global mobile font size reduction**:
  - CSS media query `@media (max-width: 767px)` for mobile-specific font sizing
  - Base font size reduced to 14px for body and global text elements
  - Proportional heading size reductions: H1 (~18-20% smaller), H2 (~15-18% smaller), H3 (~10-15% smaller)
  - Proportional reductions for paragraph text, form labels, table text, and button labels
  - Minimum font size maintained at 12px for accessibility
  - Proportional line-height adjustments for readability
  - WCAG-compliant contrast ratios maintained
  - Exclusion of print-specific styles and receipt content
  - Preservation of existing theme variables and desktop CSS
- **Modular Component Architecture for Orders Page**:
  - Separate reusable component files in `frontend/src/components/orders/` directory:
    - `CustomProductModal.tsx` for custom product creation during sales
    - `FullReturnModal.tsx` for full order return processing
    - `PartialReturnModal.tsx` for partial order returns with product selection
    - `CancelOrderModal.tsx` for order cancellation flow with admin notes
    - `StatusUpdateModal.tsx` for updating return order status (pending, processed, rejected)
  - `OrdersPage.tsx` imports and renders these components within appropriate tab contexts
  - Preserves all existing business logic, hooks, Zustand stores, and backend API integrations
  - Maintains Spanish localization and UX/UI consistency
  - Prevents future overwrites by separating modal logic into dedicated component files
- **Internet Identity Alternative Origins Configuration**:
  - Create file `frontend/public/.well-known/ii-alternative-origins` containing JSON with alternativeOrigins array
  - Include "https://store.aftabstore.com" and "https://www.store.aftabstore.com" as alternative origins
  - Exact JSON format: `{"alternativeOrigins": ["https://store.aftabstore.com","https://www.store.aftabstore.com"]}`
  - File placed in public directory for Internet Identity authentication compatibility
- **Persistent User Role Management**: Backend user role storage uses stable variables that persist across canister upgrades and deployments
- **Stable Access Control State**: Replace transient in-memory user role storage with stable persistence to ensure admin assignments survive redeployments
- **First User Initialization Compatibility**: Maintain first user initialization logic for fresh deployments without overwriting existing roles during upgrades
- **Fixed Dashboard and Side Panel Navigation**:
  - Dashboard cards properly trigger page changes by calling `usePageStore.setActivePage` with the correct page identifier
  - Side panel navigation links properly trigger page changes by calling `usePageStore.setActivePage` with the correct page identifier
  - Preserve SPA behavior at `/` with no URL changes during navigation
  - Maintain all existing visual states, icons, translations, and conditional rendering logic
  - Ensure proper state management for active page highlighting and content rendering
- **Direct Print Integration Without Modals**:
  - Remove all `ReceiptPreviewModal` component usage and related state management
  - Replace modal-based receipt preview with direct `printService` calls
  - Maintain existing hidden iframe print infrastructure and thermal receipt formatting
  - Preserve all print-specific CSS and Spanish localization
  - Remove unused modal-related CSS and state variables
  - Implement proper post-print cleanup for cart and search reset
- **Web Worker Session Management**:
  - Create `session-worker.js` file with 60-second interval timer
  - Worker posts keep-alive messages to main thread every 60 seconds
  - Main application listens for worker messages and dispatches synthetic mousemove events
  - Worker lifecycle managed automatically: starts on authentication, terminates on logout
  - Graceful degradation with console logging if Web Workers are not supported
  - Remove existing heartbeat system completely including `useHeartbeat` hook and all related imports

## User Interface Language
All user-facing text and interface elements in Spanish, including:
- Button labels and tooltips
- Table headers and column names
- Modal titles and field labels
- Validation and error messages
- Filter options and placeholders
- Access denied messages
- Admin user management interface with role management functionality
- User role assignment confirmation dialogs and success/error messages
- Role display badges and action button labels
- Product management interface with updated search placeholder: "Busca por nombre, descripción o código de barras (mínimo 2 caracteres)"
- **Products mobile card view labels in Spanish**:
  - "Stock: X" for stock display
  - "Base: €XX,XX" for base price
  - "IVA: €XX,XX" for calculated IVA amount
  - "Beneficio: €XX,XX" for calculated profit amount
  - "Venta: €XX,XX" for prominent sale price
  - Edit and Delete button tooltips and accessibility labels
- Caja management interface with checkout functionality including payment method labels
- Processed orders interface with search, filters, and pagination
- Returns management interface with complete CRUD operations
- Return creation modals with reason dropdowns and form fields
- Return status update interface with admin notes
- Store details management interface with form fields and validation
- Legacy import interface with updated Spanish messages explaining reverse calculation logic using unified formula and category name matching behavior
- Import interface with tab labels, file upload zones, validation messages, and action buttons
- Import success and error messages including loading states ("Importando datos...")
- Import validation error messages for numeric conversion and data validation failures: "Error de conversión: {fieldName} debe ser un número válido"
- Import category existence validation errors: "Categoría con ID {categoryId} no existe en la base de datos"
- Import preview table headers and status indicators
- Import template download labels and filenames
- Export interface with tab labels, filter options, and progress indicators
- Export success and error messages including loading states ("Exportando datos...")
- Export filter labels and helper text including payment method filters
- Export record count displays and button labels
- Archive management interface with tab labels and action buttons
- Archive creation interface with date selectors and confirmation messages
- Archive success and error messages including loading states ("Archivando pedidos...")
- Archive preview messages and validation text
- Archive filter labels and helper text
- Archived orders table headers and status badges
- Archive date display and formatting
- Sales analytics interface with filter labels and chart titles
- Sales analytics filter options: "Últimos 7 días", "Últimos 30 días", "Últimos 3 meses", "Últimos 6 meses", "Último año", "Personalizado"
- Sales analytics summary card titles: "Ingresos Totales", "Beneficio Total", "Margen Promedio", "Pedidos Analizados", "Descuentos Aplicados", "IVA Recaudado", "Desglose del Dataset"
- Sales analytics chart titles: "Ingresos vs Beneficio", "Distribución de Márgenes", "Rentabilidad por Método de Pago", "Beneficio por Categoría", "Productos Más Rentables", "Comparación Activos vs Archivados"
- Sales analytics loading and error states: "Generando análisis de ventas...", "Error al cargar los datos de análisis."
- Sales analytics empty state: "No hay datos de análisis. Usa los filtros para generar reportes."
- Delete confirmation dialogs
- **Enhanced category deletion error message**: "No se puede eliminar la categoría porque tiene productos asociados. Elimine o reasigne los productos primero." displayed as toast notification when deletion fails due to associated products
- Price calculation labels and formatting with Spanish comma decimal separators
- Pagination controls and status text
- Import progress and result messages
- Cart and checkout interface elements including payment method dropdown
- Search placeholders and helper text
- Custom product modal labels
- Order success and error messages including loading states ("Creando pedido...")
- Return success and error messages including loading states ("Creando devolución...", "Actualizando estado...")
- Receipt content and error messages with dynamic store information and payment method display
- Date picker localization and validation messages
- Filter section labels and helper text
- Loading states and error handling messages
- Return reason dropdown options in Spanish
- Return type and status badges in Spanish
- Stock restoration confirmation messages
- Store details form labels, placeholders, and validation messages
- Store details success and error messages
- Receipt preview section labels and descriptions
- Export tab labels: "Categorías", "Productos", "Pedidos"
- Export button labels: "Exportar Categorías", "Exportar Productos", "Exportar Pedidos"
- Export filter labels and validation messages
- Export progress and completion messages
- Import tab labels: "Categorías", "Productos"
- Import button labels: "Importar Datos", "Limpiar", "Descargar Plantilla"
- Import validation and error messages
- Import progress and completion messages
- Archive tab labels: "Ver Archivo", "Crear Archivo"
- Archive button labels: "Vista Previa", "Archivar X Pedidos"
- Archive validation and confirmation messages
- Archive progress and completion messages
- BigInt serialization error messages in Spanish
- Safe numeric conversion error messages in Spanish
- Price calculation consistency validation messages in Spanish
- Print status messages and error notifications in Spanish
- Print service feedback messages ("Imprimiendo...", "Impresión completada", "Error al imprimir")
- Payment method labels in receipts: "Efectivo", "Tarjeta", "Transferencia"
- IVA breakdown table headers and formatting in Spanish
- **Enhanced IVA breakdown table TOTAL row labels in Spanish**:
  - TOTAL row label: "TOTAL" (bold, all caps, left-aligned)
  - Maintains existing Spanish comma decimal formatting for numeric values
  - No euro symbols in TOTAL row numeric values, consistent with existing IVA breakdown formatting
- **Spanish closing lines after IVA breakdown table**:
  - Line 1: "GRACIAS POR SU COMPRA" (ALL CAPS, bold)
  - Line 2: "GUARDAR EL RECIBO" (ALL CAPS, bold)
  - Applied to all receipt types: order, return, archived, and reprint receipts
- Search system loading text: "Buscando productos..."
- Search system no-results message: "No se encontraron productos que coincidan"
- All monetary values displayed with Spanish comma decimal formatting (€XX,XX format)
- Discount field placeholder: "0,00" in light gray
- Spanish decimal format acceptance and display in discount input field
- User role management success and error messages: "Usuario promovido a administrador", "Rol actualizado correctamente", "Error al actualizar rol"
- User role confirmation dialogs and validation messages
- Role display labels: "Administrador", "Usuario", "Sin Rol"
- User management action button labels: "Asignar Admin", "Asignar Usuario", "Eliminar Rol"
- User management page elements: "Agregar Usuario" button, Principal ID input field
- User management search and filter labels: search placeholder, role filter options
- User management validation messages: "ID de principal inválido", "El campo ID de principal es obligatorio", "No se puede eliminar el último administrador"
- Admin verification error messages: "No se pudo verificar permisos de administrador"
- Access denied interface text and copy functionality feedback
- Archive management success and error messages: "Y pedidos archivados exitosamente", "Error al archivar pedidos", "No se pudieron cargar los pedidos archivados"
- Archive preview and confirmation text: "Se moverán X pedidos al archivo", "Esta acción es irreversible"
- Archive status badges and display text: "[ARCHIVADO]", "Recibo de Pedido Archivado"
- Archive search placeholders: "Buscar pedidos archivados por número, producto o cliente..."
- Archive pagination text: "Mostrando X–Y de Z pedidos archivados"
- Archive loading and empty states: "Cargando pedidos archivados...", "No hay registros disponibles."
- Copy-to-clipboard functionality with Spanish tooltips and toast feedback: "Copiar código de barras", "Código de barras copiado"
- Dashboard card title: "Caja" with description: "Gestión de ventas y pedidos"
- Side panel navigation link: "Caja"
- Caja page main title: "Caja"
- Caja page subheading: "Gestión de ventas y pedidos"
- Caja page tab labels: "Ventas", "Pedidos Procesados", "Devoluciones"
- **Simplified receipt headers**: Order receipts use "FACTURA SIMPLIFICADA" header instead of "RECIBO DE VENTA"
- **Immediate single-result addition toast message**: "Producto agregado automáticamente" for auto-added products
- Modal component labels and buttons in Spanish for all new modular components:
  - Custom product modal: "Producto Personalizado", "Cancelar", "Agregar al Carrito"
  - Return modals: "Devolución Completa", "Devolución Parcial", "Crear Devolución"
  - Cancel order modal: "Cancelar Pedido"
  - Status update modal: "Marcar Procesada", "Marcar Rechazada"
- **True lazy loading loading indicators**: "Cargando pedidos..." for Pedidos Procesados tab and "Cargando devoluciones..." for Devoluciones tab during initial load
