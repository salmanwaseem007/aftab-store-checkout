import { usePageCleanup } from '../hooks/usePageCleanup';

export default function BulkOrdersPage() {
  // Use comprehensive cleanup hook
  usePageCleanup(['bulk-orders']);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pedidos al Por Mayor</h1>
          <p className="text-muted-foreground">Gestión de pedidos grandes</p>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">Página en desarrollo</p>
      </div>
    </div>
  );
}
