import { useNavigate } from '@tanstack/react-router';
import { ShoppingCart, Package, FolderTree, Users, Upload, Store, FileDown, FileUp, Archive, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const dashboardCards = [
  {
    id: 'orders',
    title: 'Caja',
    description: 'Gestión de ventas y pedidos',
    icon: ShoppingCart,
    gradient: 'from-blue-500/10 to-blue-600/10',
    iconColor: 'text-blue-600',
    route: '/orders',
  },
  {
    id: 'products',
    title: 'Productos',
    description: 'Administrar catálogo de productos',
    icon: Package,
    gradient: 'from-green-500/10 to-green-600/10',
    iconColor: 'text-green-600',
    route: '/products',
  },
  {
    id: 'categories',
    title: 'Categorías',
    description: 'Organizar productos por categorías',
    icon: FolderTree,
    gradient: 'from-purple-500/10 to-purple-600/10',
    iconColor: 'text-purple-600',
    route: '/categories',
  },
  {
    id: 'admin-users',
    title: 'Usuarios Admin',
    description: 'Gestionar administradores',
    icon: Users,
    gradient: 'from-orange-500/10 to-orange-600/10',
    iconColor: 'text-orange-600',
    route: '/admin-users',
  },
  {
    id: 'store-details',
    title: 'Datos de Tienda',
    description: 'Configurar información de la tienda',
    icon: Store,
    gradient: 'from-cyan-500/10 to-cyan-600/10',
    iconColor: 'text-cyan-600',
    route: '/store-details',
  },
  {
    id: 'sales-analytics',
    title: 'Análisis de Ventas',
    description: 'Reportes de ventas y rentabilidad',
    icon: BarChart3,
    gradient: 'from-emerald-500/10 to-emerald-600/10',
    iconColor: 'text-emerald-600',
    route: '/sales-analytics',
  },
  {
    id: 'legacy-import',
    title: 'Importación Legacy',
    description: 'Importar datos legacy desde JSON',
    icon: Upload,
    gradient: 'from-pink-500/10 to-pink-600/10',
    iconColor: 'text-pink-600',
    route: '/legacy-import',
  },
  {
    id: 'import',
    title: 'Importación de Datos',
    description: 'Importar productos y categorías',
    icon: FileUp,
    gradient: 'from-indigo-500/10 to-indigo-600/10',
    iconColor: 'text-indigo-600',
    route: '/import',
  },
  {
    id: 'export',
    title: 'Exportación de Datos',
    description: 'Exportar datos a JSON',
    icon: FileDown,
    gradient: 'from-amber-500/10 to-amber-600/10',
    iconColor: 'text-amber-600',
    route: '/export',
  },
  {
    id: 'orders-archive',
    title: 'Archivo de Pedidos',
    description: 'Gestionar pedidos archivados',
    icon: Archive,
    gradient: 'from-slate-500/10 to-slate-600/10',
    iconColor: 'text-slate-600',
    route: '/orders-archive',
  },
];

export default function DashboardHome() {
  const navigate = useNavigate();

  const handleCardClick = (route: string) => {
    navigate({ to: route });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Bienvenido</h1>
        <p className="text-lg text-muted-foreground">
          Panel de administración de Aftab Shop
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {dashboardCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.id}
              className="group cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] border-2"
              onClick={() => handleCardClick(card.route)}
            >
              <CardHeader className="space-y-4">
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${card.gradient} ring-4 ring-primary/10 group-hover:ring-primary/20 transition-all`}>
                  <Icon className={`h-8 w-8 ${card.iconColor}`} />
                </div>
                <div>
                  <CardTitle className="text-2xl">{card.title}</CardTitle>
                  <CardDescription className="text-base mt-2">
                    {card.description}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
                  Acceder →
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
