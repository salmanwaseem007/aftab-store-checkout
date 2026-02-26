import { useState } from 'react';
import { Download, FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useGetCategories, useExportProducts, useExportCategories, useExportOrders } from '../hooks/useQueries';
import { useToastStore } from '../stores/useToastStore';

/**
 * Recursively converts all BigInt values to strings in an object or array.
 * This is necessary because JSON.stringify cannot serialize BigInt values.
 * 
 * @param data - The data structure to convert (object, array, or primitive)
 * @returns A new data structure with all BigInt values converted to strings
 */
function convertBigIntsToStrings(data: any): any {
  // Handle null and undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Handle BigInt
  if (typeof data === 'bigint') {
    return data.toString();
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => convertBigIntsToStrings(item));
  }

  // Handle objects
  if (typeof data === 'object') {
    const converted: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        converted[key] = convertBigIntsToStrings(data[key]);
      }
    }
    return converted;
  }

  // Return primitive values as-is
  return data;
}

/**
 * Get current date in DD-MM-YYYY format
 */
function getCurrentDateFormatted(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function ExportPage() {
  const [activeTab, setActiveTab] = useState('categorias');
  const { showSuccess, showError } = useToastStore();

  // Categories for filter
  const { data: categories = [] } = useGetCategories();

  // Products export state
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [productMinStock, setProductMinStock] = useState<string>('');
  const [productMaxStock, setProductMaxStock] = useState<string>('');
  const [productFromDate, setProductFromDate] = useState<string>('');
  const [productToDate, setProductToDate] = useState<string>('');

  // Orders export state
  const [orderFromDate, setOrderFromDate] = useState<string>('');
  const [orderToDate, setOrderToDate] = useState<string>('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<string>('all');

  // Export mutations
  const exportProductsMutation = useExportProducts();
  const exportCategoriesMutation = useExportCategories();
  const exportOrdersMutation = useExportOrders();

  const handleExportProducts = async () => {
    try {
      const categoryFilter = productCategoryFilter === 'all' ? null : BigInt(productCategoryFilter);
      const minStock = productMinStock ? BigInt(productMinStock) : null;
      const maxStock = productMaxStock ? BigInt(productMaxStock) : null;
      const fromDate = productFromDate ? BigInt(new Date(productFromDate).getTime() * 1000000) : null;
      const toDate = productToDate ? BigInt(new Date(productToDate).getTime() * 1000000) : null;

      const result = await exportProductsMutation.mutateAsync({
        categoryFilter,
        minStock,
        maxStock,
        fromDate,
        toDate,
      });

      // Convert BigInt values to strings before JSON.stringify
      const serializableData = convertBigIntsToStrings(result);

      // Create JSON file and download
      let jsonData: string;
      try {
        jsonData = JSON.stringify(serializableData, null, 2);
      } catch (error) {
        console.error('JSON serialization error:', error);
        showError('Error al serializar datos para exportación');
        return;
      }

      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = getCurrentDateFormatted();
      link.download = `products_export-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess('Exportación completada correctamente');
    } catch (error) {
      console.error('Export error:', error);
      showError('Error al exportar datos');
    }
  };

  const handleExportCategories = async () => {
    try {
      const result = await exportCategoriesMutation.mutateAsync();

      // Convert BigInt values to strings before JSON.stringify
      const serializableData = convertBigIntsToStrings(result);

      // Create JSON file and download
      let jsonData: string;
      try {
        jsonData = JSON.stringify(serializableData, null, 2);
      } catch (error) {
        console.error('JSON serialization error:', error);
        showError('Error al serializar datos para exportación');
        return;
      }

      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = getCurrentDateFormatted();
      link.download = `categories_export-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess('Exportación completada correctamente');
    } catch (error) {
      console.error('Export error:', error);
      showError('Error al exportar datos');
    }
  };

  const handleExportOrders = async () => {
    try {
      const fromDate = orderFromDate ? BigInt(new Date(orderFromDate).getTime() * 1000000) : null;
      const toDate = orderToDate ? BigInt(new Date(orderToDate).getTime() * 1000000) : null;
      const statusFilter = orderStatusFilter === 'all' ? null : orderStatusFilter;
      const paymentMethodFilter = orderPaymentFilter === 'all' ? null : orderPaymentFilter;

      const result = await exportOrdersMutation.mutateAsync({
        fromDate,
        toDate,
        statusFilter,
        paymentMethodFilter,
      });

      // Convert BigInt values to strings before JSON.stringify
      const serializableData = convertBigIntsToStrings(result);

      // Create JSON file and download
      let jsonData: string;
      try {
        jsonData = JSON.stringify(serializableData, null, 2);
      } catch (error) {
        console.error('JSON serialization error:', error);
        showError('Error al serializar datos para exportación');
        return;
      }

      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'orders_export.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess('Exportación completada correctamente');
    } catch (error) {
      console.error('Export error:', error);
      showError('Error al exportar datos');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileDown className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Exportación de Datos</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
        </TabsList>

        {/* Categories Export Tab */}
        <TabsContent value="categorias" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Exportar Categorías</CardTitle>
              <CardDescription>
                Exporta todas las categorías con el conteo de productos en cada una.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  Esta exportación incluirá todas las categorías del sistema con sus configuraciones de IVA y margen de beneficio predeterminados.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {exportCategoriesMutation.isPending && 'Exportando datos...'}
                </div>
                <Button
                  onClick={handleExportCategories}
                  disabled={exportCategoriesMutation.isPending}
                  size="lg"
                >
                  {exportCategoriesMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar Categorías
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Export Tab */}
        <TabsContent value="productos" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Exportar Productos</CardTitle>
              <CardDescription>
                Exporta productos con filtros opcionales. El archivo JSON incluirá todos los datos del producto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="product-category">Categoría</Label>
                  <Select value={productCategoryFilter} onValueChange={setProductCategoryFilter}>
                    <SelectTrigger id="product-category">
                      <SelectValue placeholder="Todas las categorías" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={Number(cat.id)} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product-min-stock">Stock Mínimo</Label>
                  <Input
                    id="product-min-stock"
                    type="number"
                    min="0"
                    placeholder="Sin límite"
                    value={productMinStock}
                    onChange={(e) => setProductMinStock(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product-max-stock">Stock Máximo</Label>
                  <Input
                    id="product-max-stock"
                    type="number"
                    min="0"
                    placeholder="Sin límite"
                    value={productMaxStock}
                    onChange={(e) => setProductMaxStock(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product-from-date">Desde Fecha</Label>
                  <Input
                    id="product-from-date"
                    type="date"
                    value={productFromDate}
                    onChange={(e) => setProductFromDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product-to-date">Hasta Fecha</Label>
                  <Input
                    id="product-to-date"
                    type="date"
                    value={productToDate}
                    onChange={(e) => setProductToDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {exportProductsMutation.isPending && 'Exportando datos...'}
                </div>
                <Button
                  onClick={handleExportProducts}
                  disabled={exportProductsMutation.isPending}
                  size="lg"
                >
                  {exportProductsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar Productos
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Export Tab */}
        <TabsContent value="pedidos" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Exportar Pedidos</CardTitle>
              <CardDescription>
                Exporta pedidos con filtros opcionales. El archivo JSON incluirá todos los detalles del pedido.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="order-from-date">Desde Fecha</Label>
                  <Input
                    id="order-from-date"
                    type="date"
                    value={orderFromDate}
                    onChange={(e) => setOrderFromDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order-to-date">Hasta Fecha</Label>
                  <Input
                    id="order-to-date"
                    type="date"
                    value={orderToDate}
                    onChange={(e) => setOrderToDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order-status">Estado</Label>
                  <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                    <SelectTrigger id="order-status">
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="valid">Válido</SelectItem>
                      <SelectItem value="invalid">Inválido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order-payment">Método de Pago</Label>
                  <Select value={orderPaymentFilter} onValueChange={setOrderPaymentFilter}>
                    <SelectTrigger id="order-payment">
                      <SelectValue placeholder="Todos los métodos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="card">Tarjeta</SelectItem>
                      <SelectItem value="transfer">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {exportOrdersMutation.isPending && 'Exportando datos...'}
                </div>
                <Button
                  onClick={handleExportOrders}
                  disabled={exportOrdersMutation.isPending}
                  size="lg"
                >
                  {exportOrdersMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar Pedidos
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
