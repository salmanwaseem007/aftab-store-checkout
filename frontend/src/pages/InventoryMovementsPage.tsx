import { usePageCleanup } from '../hooks/usePageCleanup';

export default function InventoryMovementsPage() {
  // Use comprehensive cleanup hook
  usePageCleanup(['inventory-movements']);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movimientos de Inventario</h1>
          <p className="text-muted-foreground">Historial de cambios en el inventario</p>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">Página en desarrollo</p>
      </div>
    </div>
  );
}
