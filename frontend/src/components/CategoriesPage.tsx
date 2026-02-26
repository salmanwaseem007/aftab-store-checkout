import { useState, useMemo } from 'react';
import { useGetCategories, useAddCategory, useAddCategories, useUpdateCategory, useDeleteCategory } from '../hooks/useQueries';
import { FolderTree, Loader2, Plus, Layers, ChevronUp, ChevronDown, Pencil, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToastStore } from '../stores/useToastStore';
import type { Category } from '../backend';

export default function CategoriesPage() {
  const { data: categories, isLoading } = useGetCategories();
  const addCategory = useAddCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const addCategories = useAddCategories();
  const { showSuccess, showError } = useToastStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [ivaFilter, setIvaFilter] = useState('all');
  const [marginMin, setMarginMin] = useState('');
  const [marginMax, setMarginMax] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  // Add/Edit modal state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryIVA, setCategoryIVA] = useState('21');
  const [categoryMargin, setCategoryMargin] = useState('30');
  const [categoryOrder, setCategoryOrder] = useState('');

  // Delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deletePassword, setDeletePassword] = useState('');

  // Bulk create modal state
  const [bulkNames, setBulkNames] = useState('');
  const [bulkIVA, setBulkIVA] = useState('21');
  const [bulkMargin, setBulkMargin] = useState('30');

  // Bulk edit state
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditIVA, setBulkEditIVA] = useState('no-change');
  const [bulkEditMargin, setBulkEditMargin] = useState('');

  const sortedCategories = useMemo(() => {
    if (!categories) return [];
    return [...categories].sort((a, b) => Number(a.order) - Number(b.order));
  }, [categories]);

  const filteredCategories = useMemo(() => {
    return sortedCategories.filter((cat) => {
      // Search by name or ID
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        cat.name.toLowerCase().includes(searchLower) ||
        cat.id.toString().includes(searchTerm);
      
      const matchesIVA = ivaFilter === 'all' || Number(cat.defaultIVA) === Number(ivaFilter);
      const margin = Number(cat.defaultProfitMargin);
      const matchesMargin = 
        (!marginMin || margin >= Number(marginMin)) &&
        (!marginMax || margin <= Number(marginMax));
      return matchesSearch && matchesIVA && matchesMargin;
    });
  }, [sortedCategories, searchTerm, ivaFilter, marginMin, marginMax]);

  const maxOrder = useMemo(() => {
    if (!categories || categories.length === 0) return 0;
    return Math.max(...categories.map(c => Number(c.order)));
  }, [categories]);

  const bulkPreview = useMemo(() => {
    const lines = bulkNames.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const existingNames = new Set(categories?.map(c => c.name.toLowerCase()) || []);
    const seenNames = new Set<string>();
    const errors: string[] = [];

    const preview = lines.map((name, index) => {
      const lowerName = name.toLowerCase();
      const isDuplicate = existingNames.has(lowerName) || seenNames.has(lowerName);
      if (isDuplicate) {
        errors.push(`Línea ${index + 1}: "${name}" ya existe o está duplicado`);
      }
      seenNames.add(lowerName);

      return {
        name,
        order: maxOrder + index + 1,
        defaultIVA: Number(bulkIVA),
        defaultProfitMargin: Number(bulkMargin),
        error: isDuplicate,
      };
    });

    return { preview, errors };
  }, [bulkNames, bulkIVA, bulkMargin, categories, maxOrder]);

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryIVA(category.defaultIVA.toString());
    setCategoryMargin(category.defaultProfitMargin.toString());
    setCategoryOrder(category.order.toString());
    setShowAddModal(true);
  };

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
    setDeletePassword('');
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    if (!deletePassword) {
      showError('Por favor ingresa la contraseña de confirmación');
      return;
    }

    try {
      await deleteCategory.mutateAsync({
        id: categoryToDelete.id,
        password: deletePassword,
      });
      showSuccess('Categoría eliminada exitosamente');
      setShowDeleteDialog(false);
      setCategoryToDelete(null);
      setDeletePassword('');
    } catch (error: any) {
      // Check if the error message contains the specific Spanish message about associated products
      const errorMessage = error?.message || error?.toString() || '';
      if (errorMessage.includes('tiene productos asociados')) {
        showError('No se puede eliminar la categoría porque tiene productos asociados. Elimine o reasigne los productos primero.');
      } else if (errorMessage.includes('Contraseña de confirmación incorrecta')) {
        showError('Contraseña de confirmación incorrecta');
      } else {
        showError('Error al eliminar la categoría');
      }
      console.error(error);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      showError('El nombre de la categoría es obligatorio');
      return;
    }

    const iva = Number(categoryIVA);
    const margin = Number(categoryMargin);
    const order = categoryOrder ? Number(categoryOrder) : (editingCategory ? Number(editingCategory.order) : maxOrder + 1);

    if (margin < 0 || margin > 10000) {
      showError('El margen debe estar entre 0 y 10000');
      return;
    }

    try {
      if (editingCategory) {
        // Update existing category
        await updateCategory.mutateAsync({
          id: editingCategory.id,
          name: categoryName.trim(),
          order: BigInt(order),
          defaultIVA: BigInt(iva),
          defaultProfitMargin: BigInt(margin),
        });
        showSuccess('Categoría actualizada exitosamente');
      } else {
        // Create new category
        await addCategory.mutateAsync({
          name: categoryName.trim(),
          order: BigInt(order),
          defaultIVA: BigInt(iva),
          defaultProfitMargin: BigInt(margin),
        });
        showSuccess('Categoría creada exitosamente');
      }
      setShowAddModal(false);
      resetAddForm();
    } catch (error) {
      showError(editingCategory ? 'Error al actualizar la categoría' : 'Error al crear la categoría');
      console.error(error);
    }
  };

  const handleBulkCreate = async () => {
    if (bulkPreview.errors.length > 0) {
      showError('Corrige los errores antes de continuar');
      return;
    }

    if (bulkPreview.preview.length === 0) {
      showError('Ingresa al menos un nombre de categoría');
      return;
    }

    const margin = Number(bulkMargin);
    if (margin < 0 || margin > 10000) {
      showError('El margen debe estar entre 0 y 10000');
      return;
    }

    try {
      const categoriesToAdd = bulkPreview.preview.map(item => ({
        name: item.name,
        order: BigInt(item.order),
        defaultIVA: BigInt(item.defaultIVA),
        defaultProfitMargin: BigInt(item.defaultProfitMargin),
      }));

      await addCategories.mutateAsync(categoriesToAdd);
      showSuccess(`${categoriesToAdd.length} categorías creadas exitosamente`);
      setShowBulkModal(false);
      resetBulkForm();
    } catch (error) {
      showError('Error al crear las categorías');
      console.error(error);
    }
  };

  const resetAddForm = () => {
    setCategoryName('');
    setCategoryIVA('21');
    setCategoryMargin('30');
    setCategoryOrder('');
    setEditingCategory(null);
  };

  const resetBulkForm = () => {
    setBulkNames('');
    setBulkIVA('21');
    setBulkMargin('30');
  };

  const handleSelectCategory = (categoryId: string, checked: boolean) => {
    const newSelected = new Set(selectedCategories);
    if (checked) {
      newSelected.add(categoryId);
    } else {
      newSelected.delete(categoryId);
    }
    setSelectedCategories(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCategories(new Set(filteredCategories.map(c => c.id.toString())));
    } else {
      setSelectedCategories(new Set());
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10">
            <FolderTree className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
            <p className="text-muted-foreground">Gestión de categorías de productos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowBulkModal(true)}
            title="Crear múltiples categorías"
          >
            <Layers className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={() => {
              resetAddForm();
              setShowAddModal(true);
            }}
            title="Agregar categoría"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={ivaFilter} onValueChange={setIvaFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filtrar IVA" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los IVA</SelectItem>
            <SelectItem value="0">0%</SelectItem>
            <SelectItem value="4">4%</SelectItem>
            <SelectItem value="10">10%</SelectItem>
            <SelectItem value="21">21%</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Margen mín"
            value={marginMin}
            onChange={(e) => setMarginMin(e.target.value)}
            className="w-[120px]"
            min="0"
            max="10000"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Margen máx"
            value={marginMax}
            onChange={(e) => setMarginMax(e.target.value)}
            className="w-[120px]"
            min="0"
            max="10000"
          />
        </div>
      </div>

      {/* Batch Actions */}
      {selectedCategories.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedCategories.size} seleccionada{selectedCategories.size !== 1 ? 's' : ''}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBulkEditModal(true)}
          >
            Editar selección
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedCategories(new Set())}
          >
            Limpiar selección
          </Button>
        </div>
      )}

      {/* Categories Table */}
      {!categories || categories.length === 0 ? (
        <div className="border border-dashed rounded-lg p-12 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mx-auto">
            <FolderTree className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No hay categorías</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Comienza creando tu primera categoría
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedCategories.size === filteredCategories.length && filteredCategories.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-center">Orden</TableHead>
                <TableHead className="text-center">IVA</TableHead>
                <TableHead className="text-center">Margen</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category) => (
                <TableRow key={category.id.toString()}>
                  <TableCell>
                    <Checkbox
                      checked={selectedCategories.has(category.id.toString())}
                      onCheckedChange={(checked) => handleSelectCategory(category.id.toString(), checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {category.id.toString()}
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="Subir"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <span className="text-sm text-muted-foreground min-w-[2ch] text-center">
                        {category.order.toString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="Bajar"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{category.defaultIVA.toString()}%</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{category.defaultProfitMargin.toString()}%</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Editar"
                        onClick={() => handleEditCategory(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Eliminar"
                        onClick={() => handleDeleteClick(category)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Category Modal */}
      <Dialog open={showAddModal} onOpenChange={(open) => {
        setShowAddModal(open);
        if (!open) resetAddForm();
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar categoría' : 'Agregar categoría'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Modifica los datos de la categoría' : 'Completa los datos de la nueva categoría'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Nombre de la categoría"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iva">IVA por defecto *</Label>
              <Select value={categoryIVA} onValueChange={setCategoryIVA}>
                <SelectTrigger id="iva">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="4">4%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="21">21%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="margin">Margen de beneficio por defecto (%) *</Label>
              <Input
                id="margin"
                type="number"
                min="0"
                max="10000"
                value={categoryMargin}
                onChange={(e) => setCategoryMargin(e.target.value)}
                placeholder="0-10000"
              />
              <p className="text-xs text-muted-foreground">Valor entre 0 y 10000</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="order">Orden (opcional)</Label>
              <Input
                id="order"
                type="number"
                min="0"
                value={categoryOrder}
                onChange={(e) => setCategoryOrder(e.target.value)}
                placeholder={editingCategory ? editingCategory.order.toString() : `${maxOrder + 1}`}
              />
              <p className="text-xs text-muted-foreground">
                Si no se especifica, se asignará automáticamente
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCategory} disabled={addCategory.isPending || updateCategory.isPending}>
              {(addCategory.isPending || updateCategory.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCategory ? 'Guardar cambios' : 'Crear categoría'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Seguro que deseas eliminar esta categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La categoría "{categoryToDelete?.name}" será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="delete-password">Contraseña de confirmación</Label>
            <Input
              id="delete-password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="DeleteIsUnsafe"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Escribe "DeleteIsUnsafe" para confirmar
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setCategoryToDelete(null);
              setDeletePassword('');
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteCategory.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Create Modal */}
      <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear múltiples categorías</DialogTitle>
            <DialogDescription>
              Ingresa un nombre de categoría por línea. Los valores de IVA y margen se aplicarán a todas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-names">Nombres de categorías (uno por línea) *</Label>
              <Textarea
                id="bulk-names"
                value={bulkNames}
                onChange={(e) => setBulkNames(e.target.value)}
                placeholder="Electrónica&#10;Ropa&#10;Hogar&#10;Deportes"
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-iva">IVA por defecto *</Label>
                <Select value={bulkIVA} onValueChange={setBulkIVA}>
                  <SelectTrigger id="bulk-iva">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="4">4%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="21">21%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulk-margin">Margen por defecto (%) *</Label>
                <Input
                  id="bulk-margin"
                  type="number"
                  min="0"
                  max="10000"
                  value={bulkMargin}
                  onChange={(e) => setBulkMargin(e.target.value)}
                  placeholder="0-10000"
                />
              </div>
            </div>

            {/* Preview */}
            {bulkPreview.preview.length > 0 && (
              <div className="space-y-2">
                <Label>Vista previa ({bulkPreview.preview.length} categorías)</Label>
                <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="text-center">Orden</TableHead>
                        <TableHead className="text-center">IVA</TableHead>
                        <TableHead className="text-center">Margen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkPreview.preview.map((item, index) => (
                        <TableRow key={index} className={item.error ? 'bg-destructive/10' : ''}>
                          <TableCell className={item.error ? 'text-destructive' : ''}>
                            {item.name}
                          </TableCell>
                          <TableCell className="text-center">{item.order}</TableCell>
                          <TableCell className="text-center">{item.defaultIVA}%</TableCell>
                          <TableCell className="text-center">{item.defaultProfitMargin}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Errors */}
            {bulkPreview.errors.length > 0 && (
              <div className="space-y-2">
                <Label className="text-destructive">Errores encontrados</Label>
                <div className="border border-destructive rounded-lg p-3 space-y-1 max-h-[150px] overflow-y-auto">
                  {bulkPreview.errors.map((error, index) => (
                    <p key={index} className="text-sm text-destructive">
                      • {error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleBulkCreate}
              disabled={addCategories.isPending || bulkPreview.errors.length > 0 || bulkPreview.preview.length === 0}
            >
              {addCategories.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear {bulkPreview.preview.length} categoría{bulkPreview.preview.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Modal */}
      <Dialog open={showBulkEditModal} onOpenChange={setShowBulkEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar selección</DialogTitle>
            <DialogDescription>
              Modifica el IVA y margen de {selectedCategories.size} categoría{selectedCategories.size !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-edit-iva">IVA por defecto</Label>
              <Select value={bulkEditIVA} onValueChange={setBulkEditIVA}>
                <SelectTrigger id="bulk-edit-iva">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-change">Sin cambios</SelectItem>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="4">4%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="21">21%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-edit-margin">Margen de beneficio (%)</Label>
              <Input
                id="bulk-edit-margin"
                type="number"
                min="0"
                max="10000"
                value={bulkEditMargin}
                onChange={(e) => setBulkEditMargin(e.target.value)}
                placeholder="Sin cambios"
              />
              <p className="text-xs text-muted-foreground">
                Deja vacío para no modificar el margen
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              showSuccess('Función de edición masiva pendiente de implementación');
              setShowBulkEditModal(false);
            }}>
              Aplicar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
