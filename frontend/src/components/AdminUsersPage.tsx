import { useState } from 'react';
import { Users, Plus, Search, Copy, Check, Shield, User as UserIcon, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useGetAllUserRoles, useAssignUserRole } from '@/hooks/useQueries';
import { useToastStore } from '@/stores/useToastStore';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { UserRole } from '@/backend';

export default function AdminUsersPage() {
  const { data: userRoles, isLoading, refetch } = useGetAllUserRoles();
  const assignRoleMutation = useAssignUserRole();
  const { showSuccess, showError } = useToastStore();
  const { identity } = useInternetIdentity();

  const [newPrincipalId, setNewPrincipalId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [copiedPrincipal, setCopiedPrincipal] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    principal: string;
    role: UserRole | null;
    action: string;
  }>({
    open: false,
    principal: '',
    role: null,
    action: '',
  });

  const currentUserPrincipal = identity?.getPrincipal().toString();

  // Validate Principal ID format (Motoko-compatible)
  const isValidPrincipalId = (id: string): boolean => {
    if (!id || id.trim().length === 0) {
      return false;
    }

    const trimmedId = id.trim();

    // Principal IDs are base32-encoded with hyphens
    // Must be at least 20 characters and contain only lowercase alphanumeric and hyphens
    if (trimmedId.length < 20) {
      return false;
    }

    // Check for valid characters (lowercase alphanumeric and hyphens only)
    const validPattern = /^[a-z0-9-]+$/;
    return validPattern.test(trimmedId);
  };

  const handleAddUser = async () => {
    const trimmedId = newPrincipalId.trim();

    if (!trimmedId) {
      showError('El campo ID de principal es obligatorio');
      return;
    }

    if (!isValidPrincipalId(trimmedId)) {
      showError('ID de principal inválido');
      return;
    }

    try {
      await assignRoleMutation.mutateAsync({
        principal: trimmedId,
        role: UserRole.admin,
      });

      showSuccess('Usuario promovido a administrador');
      setNewPrincipalId('');
      refetch();
    } catch (error: any) {
      console.error('Error adding user:', error);
      const errorMessage = error?.message || 'Error al agregar usuario';
      
      // Check for specific backend error messages
      if (errorMessage.includes('ID de principal inválido')) {
        showError('ID de principal inválido');
      } else if (errorMessage.includes('obligatorio')) {
        showError('El campo ID de principal es obligatorio');
      } else {
        showError(errorMessage);
      }
    }
  };

  const handleCopyPrincipal = async (principal: string) => {
    try {
      await navigator.clipboard.writeText(principal);
      setCopiedPrincipal(principal);
      showSuccess('ID copiado al portapapeles');
      setTimeout(() => setCopiedPrincipal(null), 2000);
    } catch (error) {
      showError('Error al copiar ID');
    }
  };

  const openConfirmDialog = (principal: string, role: UserRole | null, action: string) => {
    // Prevent removing own admin role
    if (principal === currentUserPrincipal && (role === null || action === 'remove')) {
      showError('No puedes eliminar tu propio rol de administrador');
      return;
    }

    // Check if trying to demote the last admin
    if (action === 'assign-user' || action === 'remove') {
      const adminCount = userRoles?.filter(([_, r]) => r === UserRole.admin).length || 0;
      const isCurrentUserAdmin = userRoles?.find(([p, r]) => p === principal && r === UserRole.admin);
      
      if (adminCount === 1 && isCurrentUserAdmin) {
        showError('No se puede eliminar el último administrador');
        return;
      }
    }

    setConfirmDialog({
      open: true,
      principal,
      role,
      action,
    });
  };

  const handleConfirmRoleChange = async () => {
    try {
      if (!confirmDialog.role && confirmDialog.action !== 'remove') {
        showError('Rol no válido');
        return;
      }

      if (!isValidPrincipalId(confirmDialog.principal)) {
        showError('ID de principal inválido');
        return;
      }

      await assignRoleMutation.mutateAsync({
        principal: confirmDialog.principal,
        role: confirmDialog.role || UserRole.guest,
      });

      showSuccess('Rol actualizado correctamente');
      setConfirmDialog({ open: false, principal: '', role: null, action: '' });
      refetch();
    } catch (error: any) {
      console.error('Error updating role:', error);
      const errorMessage = error?.message || 'Error al actualizar rol';
      
      // Check for specific backend error messages
      if (errorMessage.includes('ID de principal inválido')) {
        showError('ID de principal inválido');
      } else if (errorMessage.includes('obligatorio')) {
        showError('El campo ID de principal es obligatorio');
      } else {
        showError(errorMessage);
      }
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.admin:
        return (
          <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20">
            <Shield className="mr-1 h-3 w-3" />
            Administrador
          </Badge>
        );
      case UserRole.user:
        return (
          <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20">
            <UserIcon className="mr-1 h-3 w-3" />
            Usuario
          </Badge>
        );
      case UserRole.guest:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <UserX className="mr-1 h-3 w-3" />
            Sin Rol
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Sin Rol
          </Badge>
        );
    }
  };

  const getConfirmMessage = () => {
    switch (confirmDialog.action) {
      case 'assign-admin':
        return '¿Seguro que deseas asignar rol de administrador a este usuario?';
      case 'assign-user':
        return '¿Seguro que deseas asignar rol de usuario a este usuario?';
      case 'remove':
        return '¿Seguro que deseas eliminar el rol de este usuario?';
      default:
        return '¿Confirmar cambio de rol?';
    }
  };

  // Filter users based on search and role filter
  const filteredUsers = userRoles?.filter(([principal, role]) => {
    const matchesSearch = principal.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || role === roleFilter;
    return matchesSearch && matchesRole;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
          <Users className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuarios Admin</h1>
          <p className="text-muted-foreground">Gestión de roles de usuarios</p>
        </div>
      </div>

      {/* Add User Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="principal-id" className="text-sm font-medium mb-2 block">
                Internet Identity Principal ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="principal-id"
                placeholder="Ingresa el Principal ID del usuario"
                value={newPrincipalId}
                onChange={(e) => setNewPrincipalId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddUser();
                  }
                }}
                className="font-mono text-sm"
                required
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAddUser}
                disabled={assignRoleMutation.isPending || !newPrincipalId.trim()}
                className="gap-2 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Agregar Usuario
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="text-sm font-medium mb-2 block">
                Buscar por Principal ID
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Label htmlFor="role-filter" className="text-sm font-medium mb-2 block">
                Filtrar por Rol
              </Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger id="role-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value={UserRole.admin}>Administrador</SelectItem>
                  <SelectItem value={UserRole.user}>Usuario</SelectItem>
                  <SelectItem value={UserRole.guest}>Sin Rol</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="mt-4 text-sm text-muted-foreground">Cargando usuarios...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desktop Table */}
      {!isLoading && filteredUsers.length > 0 && (
        <div className="hidden md:block rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Principal ID</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Rol actual</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(([principal, role]) => (
                  <tr key={principal} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                          {principal.slice(0, 20)}...{principal.slice(-8)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyPrincipal(principal)}
                          className="h-7 w-7 p-0"
                        >
                          {copiedPrincipal === principal ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getRoleBadge(role)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {role !== UserRole.admin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openConfirmDialog(principal, UserRole.admin, 'assign-admin')}
                            disabled={assignRoleMutation.isPending}
                            className="gap-1"
                          >
                            <Shield className="h-3 w-3" />
                            Asignar Admin
                          </Button>
                        )}
                        {role === UserRole.admin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openConfirmDialog(principal, UserRole.user, 'assign-user')}
                            disabled={assignRoleMutation.isPending || principal === currentUserPrincipal}
                            className="gap-1"
                          >
                            <UserIcon className="h-3 w-3" />
                            Asignar Usuario
                          </Button>
                        )}
                        {role !== UserRole.guest && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openConfirmDialog(principal, null, 'remove')}
                            disabled={assignRoleMutation.isPending || principal === currentUserPrincipal}
                            className="gap-1 text-destructive hover:text-destructive"
                          >
                            <UserX className="h-3 w-3" />
                            Eliminar Rol
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile Cards */}
      {!isLoading && filteredUsers.length > 0 && (
        <div className="md:hidden space-y-4">
          {filteredUsers.map(([principal, role]) => (
            <Card key={principal}>
              <CardContent className="p-4 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Principal ID</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 overflow-x-auto">
                      {principal}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyPrincipal(principal)}
                      className="h-7 w-7 p-0 shrink-0"
                    >
                      {copiedPrincipal === principal ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Rol actual</p>
                  {getRoleBadge(role)}
                </div>

                <div className="flex flex-col gap-2">
                  {role !== UserRole.admin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openConfirmDialog(principal, UserRole.admin, 'assign-admin')}
                      disabled={assignRoleMutation.isPending}
                      className="gap-1 w-full"
                    >
                      <Shield className="h-3 w-3" />
                      Asignar Admin
                    </Button>
                  )}
                  {role === UserRole.admin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openConfirmDialog(principal, UserRole.user, 'assign-user')}
                      disabled={assignRoleMutation.isPending || principal === currentUserPrincipal}
                      className="gap-1 w-full"
                    >
                      <UserIcon className="h-3 w-3" />
                      Asignar Usuario
                    </Button>
                  )}
                  {role !== UserRole.guest && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openConfirmDialog(principal, null, 'remove')}
                      disabled={assignRoleMutation.isPending || principal === currentUserPrincipal}
                      className="gap-1 w-full text-destructive hover:text-destructive"
                    >
                      <UserX className="h-3 w-3" />
                      Eliminar Rol
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredUsers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">
              {searchTerm || roleFilter !== 'all' ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
            </h3>
            <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
              {searchTerm || roleFilter !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda.'
                : 'Los usuarios aparecerán aquí una vez que inicien sesión en el sistema.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cambio de rol</AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmMessage()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={assignRoleMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRoleChange}
              disabled={assignRoleMutation.isPending}
            >
              {assignRoleMutation.isPending ? 'Actualizando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
