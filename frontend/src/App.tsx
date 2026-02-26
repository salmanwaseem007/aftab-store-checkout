import { useEffect, useRef } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useToastStore } from './stores/useToastStore';
import { useAdminCacheStore } from './stores/useAdminCacheStore';
import { useCheckAdminStatus } from './hooks/useQueries';
import { RouterProvider, createRouter, createRootRoute, createRoute } from '@tanstack/react-router';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './components/DashboardHome';
import ProductsPageContent from './pages/ProductsPage';
import CategoriesPageContent from './pages/CategoriesPage';
import OrdersPage from './pages/orders/OrdersPage';
import AdminUsersPage from './pages/AdminUsersPage';
import StoreDetailsPage from './pages/StoreDetailsPage';
import LegacyImportPage from './pages/LegacyImportPage';
import ImportPage from './pages/ImportPage';
import ExportPage from './pages/ExportPage';
import OrdersArchivePage from './pages/OrdersArchivePage';
import SalesAnalyticsPage from './pages/SalesAnalyticsPage';
import InventoryMovementsPage from './pages/InventoryMovementsPage';
import BulkOrdersPage from './pages/BulkOrdersPage';
import AccessDenied from './pages/AccessDenied';
import ToastContainer from './components/ToastContainer';

// Create root route with DashboardLayout
const rootRoute = createRootRoute({
  component: DashboardLayout,
});

// Create index route (dashboard home)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardHome,
});

// Create products route
const productsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/products',
  component: ProductsPageContent,
});

// Create categories route
const categoriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/categories',
  component: CategoriesPageContent,
});

// Create orders route
const ordersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orders',
  component: OrdersPage,
});

// Create admin users route
const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin-users',
  component: AdminUsersPage,
});

// Create store details route
const storeDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/store-details',
  component: StoreDetailsPage,
});

// Create sales analytics route
const salesAnalyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sales-analytics',
  component: SalesAnalyticsPage,
});

// Create legacy import route
const legacyImportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/legacy-import',
  component: LegacyImportPage,
});

// Create import route
const importRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/import',
  component: ImportPage,
});

// Create export route
const exportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/export',
  component: ExportPage,
});

// Create orders archive route
const ordersArchiveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orders-archive',
  component: OrdersArchivePage,
});

// Create inventory movements route
const inventoryMovementsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inventory-movements',
  component: InventoryMovementsPage,
});

// Create bulk orders route
const bulkOrdersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bulk-orders',
  component: BulkOrdersPage,
});

// Create router tree with all routes
const routeTree = rootRoute.addChildren([
  indexRoute,
  productsRoute,
  categoriesRoute,
  ordersRoute,
  adminUsersRoute,
  storeDetailsRoute,
  salesAnalyticsRoute,
  legacyImportRoute,
  importRoute,
  exportRoute,
  ordersArchiveRoute,
  inventoryMovementsRoute,
  bulkOrdersRoute,
]);

// Create router instance
const router = createRouter({ 
  routeTree,
  defaultNotFoundComponent: () => {
    // Redirect to home on 404
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
    return null;
  },
});

// Declare router type for TypeScript
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  const { identity, isInitializing, clear } = useInternetIdentity();
  const { addToast } = useToastStore();
  const adminCache = useAdminCacheStore();
  const workerRef = useRef<Worker | null>(null);

  // Check admin status after authentication with 30-day caching
  const { data: isAdmin, isLoading: isCheckingAdmin, isFetched, error: adminCheckError } = useCheckAdminStatus(!!identity);

  // Clear admin cache on logout
  useEffect(() => {
    if (!identity) {
      adminCache.clear();
    }
  }, [identity, adminCache]);

  // Web Worker session management
  useEffect(() => {
    // Only start worker if authenticated
    if (!identity) {
      // Terminate worker if it exists
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      return;
    }

    // Check if Web Workers are supported
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers are not supported in this browser. Session keep-alive disabled.');
      return;
    }

    try {
      // Create and start the session worker
      const worker = new Worker('/session-worker.js');
      workerRef.current = worker;

      // Listen for messages from the worker
      worker.addEventListener('message', (event) => {
        const { type } = event.data;

        if (type === 'ready') {
          console.log('Session worker ready');
          // Start the keep-alive interval
          worker.postMessage({ type: 'start' });
        } else if (type === 'started') {
          console.log('Session worker started');
        } else if (type === 'keep-alive') {
          // Dispatch synthetic mousemove event to maintain session activity
          document.dispatchEvent(new Event('mousemove'));
        } else if (type === 'stopped') {
          console.log('Session worker stopped');
        }
      });

      // Handle worker errors
      worker.addEventListener('error', (error) => {
        console.error('Session worker error:', error);
      });

      // Cleanup function
      return () => {
        if (workerRef.current) {
          workerRef.current.postMessage({ type: 'stop' });
          workerRef.current.terminate();
          workerRef.current = null;
        }
      };
    } catch (error) {
      console.error('Failed to create session worker:', error);
    }
  }, [identity]);

  // Show error toast if admin check fails (with timeout fallback)
  useEffect(() => {
    if (adminCheckError) {
      console.error('Admin check error:', adminCheckError);
      addToast('error', 'No se pudo verificar permisos de administrador', 4000);
    }
  }, [adminCheckError, addToast]);

  // Show loading state during initialization
  if (isInitializing) {
    return (
      <>
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
        <iframe
          id="print-iframe"
          title="Print Frame"
          style={{
            width: 0,
            height: 0,
            position: 'absolute',
            border: 'none',
            visibility: 'hidden'
          }}
        />
      </>
    );
  }

  // Show login page for unauthenticated users
  if (!identity) {
    return (
      <>
        <LoginPage />
        <ToastContainer />
        <iframe
          id="print-iframe"
          title="Print Frame"
          style={{
            width: 0,
            height: 0,
            position: 'absolute',
            border: 'none',
            visibility: 'hidden'
          }}
        />
      </>
    );
  }

  // Show loading state during admin verification
  // This includes: query is loading OR query hasn't fetched yet (prevents flash)
  if (identity && (isCheckingAdmin || !isFetched)) {
    return (
      <>
        <AccessDenied isLoading={true} />
        <ToastContainer />
        <iframe
          id="print-iframe"
          title="Print Frame"
          style={{
            width: 0,
            height: 0,
            position: 'absolute',
            border: 'none',
            visibility: 'hidden'
          }}
        />
      </>
    );
  }

  // Show AccessDenied for authenticated non-admin users
  // Only show this after the admin check has completed (isFetched is true)
  if (identity && isFetched && (adminCheckError || !isAdmin)) {
    return (
      <>
        <AccessDenied isLoading={false} />
        <ToastContainer />
        <iframe
          id="print-iframe"
          title="Print Frame"
          style={{
            width: 0,
            height: 0,
            position: 'absolute',
            border: 'none',
            visibility: 'hidden'
          }}
        />
      </>
    );
  }

  // Show admin dashboard with routing for authenticated admin users
  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
      <iframe
        id="print-iframe"
        title="Print Frame"
        style={{
          width: 0,
          height: 0,
          position: 'absolute',
          border: 'none',
          visibility: 'hidden'
        }}
      />
    </>
  );
}
