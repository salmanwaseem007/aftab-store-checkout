import { X, LayoutDashboard, ShoppingCart, Package, FolderTree, Users, Upload, Store, FileDown, FileUp, Archive, BarChart3 } from 'lucide-react';
import { useLocation } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, route: '/' },
  { id: 'orders', label: 'Caja', icon: ShoppingCart, route: '/orders' },
  { id: 'products', label: 'Productos', icon: Package, route: '/products' },
  { id: 'categories', label: 'Categorías', icon: FolderTree, route: '/categories' },
  { id: 'admin-users', label: 'Usuarios Admin', icon: Users, route: '/admin-users' },
  { id: 'store-details', label: 'Datos de Tienda', icon: Store, route: '/store-details' },
  { id: 'sales-analytics', label: 'Análisis de Ventas', icon: BarChart3, route: '/sales-analytics' },
  { id: 'legacy-import', label: 'Importación Legacy', icon: Upload, route: '/legacy-import' },
  { id: 'import', label: 'Importación', icon: FileUp, route: '/import' },
  { id: 'export', label: 'Exportación', icon: FileDown, route: '/export' },
  { id: 'orders-archive', label: 'Archivo de Pedidos', icon: Archive, route: '/orders-archive' },
];

export default function SidePanel({ isOpen, onClose, onNavigate }: SidePanelProps) {
  const location = useLocation();

  const isActive = (route: string) => {
    return location.pathname === route;
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Side Panel */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-full bg-card shadow-2xl transition-transform duration-300 ease-in-out md:w-80',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <h2 className="text-lg font-semibold">Navegación</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.route);
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.route)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left font-medium transition-all',
                  active
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
