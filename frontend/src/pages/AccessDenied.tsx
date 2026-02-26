import { ShieldAlert, Copy, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useToastStore } from '../stores/useToastStore';
import { useQueryClient } from '@tanstack/react-query';

interface AccessDeniedProps {
  isLoading?: boolean;
}

export default function AccessDenied({ isLoading = false }: AccessDeniedProps) {
  const { identity, clear } = useInternetIdentity();
  const { showSuccess } = useToastStore();
  const queryClient = useQueryClient();

  const principalId = identity?.getPrincipal().toString() || '';

  const handleCopyPrincipal = async () => {
    try {
      await navigator.clipboard.writeText(principalId);
      showSuccess('ID copiado al portapapeles');
    } catch (error) {
      console.error('Failed to copy principal:', error);
    }
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  // Loading state variant
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-muted/5 p-4">
        <div className="text-center space-y-6 animate-in fade-in duration-500">
          <div className="mx-auto flex h-20 w-20 items-center justify-center">
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Aftab Shop</h1>
            <p className="text-lg text-muted-foreground">Verificando permisos…</p>
          </div>
        </div>
      </div>
    );
  }

  // Access denied state
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-destructive/5 via-background to-muted/5 p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-md shadow-2xl border-2 border-destructive/20">
        <CardHeader className="space-y-3 text-center pb-8">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 ring-4 ring-destructive/20">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Acceso Denegado</CardTitle>
          <CardDescription className="text-base">
            No tienes permisos de administrador para acceder a este panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              Tu ID de Internet Identity:
            </label>
            <div className="flex gap-2">
              <div className="flex-1 rounded-lg border bg-muted px-3 py-2 text-sm font-mono break-all">
                {principalId}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyPrincipal}
                className="shrink-0"
                aria-label="Copiar ID"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Comparte este ID con un administrador para solicitar acceso.
            </p>
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full gap-2 font-medium"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
