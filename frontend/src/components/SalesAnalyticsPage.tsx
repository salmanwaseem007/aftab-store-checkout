import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, DollarSign, Percent, ShoppingBag, Tag, Receipt, Database, AlertTriangle, Package, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGetCategories, useGetSalesAnalyticsData, useGetInventoryAdjustmentAnalytics, useGetPaginatedAdjustments } from '../hooks/useQueries';
import { useToastStore } from '../stores/useToastStore';
import { formatSpanishNumber } from '../lib/formatNumberUtil';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import type { AnalyticsFilters, Order, AdjustmentFilters, InventoryAdjustment } from '../backend';

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

export default function SalesAnalyticsPage() {
  const { addToast } = useToastStore();
  const { data: categories = [] } = useGetCategories();

  // Filter state
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [timePeriod, setTimePeriod] = useState<string>('last-30-days');
  const [customFromDate, setCustomFromDate] = useState<string>('');
  const [customToDate, setCustomToDate] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [includeAdjustments, setIncludeAdjustments] = useState(false);

  // Analytics data state
  const [rawAnalyticsData, setRawAnalyticsData] = useState<{ activeOrders: Order[]; archivedOrders: Order[] } | null>(null);
  const [adjustmentAnalytics, setAdjustmentAnalytics] = useState<any>(null);
  const [rawAdjustments, setRawAdjustments] = useState<InventoryAdjustment[]>([]);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  const { mutateAsync: getSalesAnalyticsData } = useGetSalesAnalyticsData();
  const { mutateAsync: getInventoryAdjustmentAnalytics } = useGetInventoryAdjustmentAnalytics();

  // Get selected category name
  const selectedCategoryName = useMemo(() => {
    if (selectedCategoryId === 'all') return null;
    const category = categories.find(cat => cat.id.toString() === selectedCategoryId);
    return category?.name || null;
  }, [selectedCategoryId, categories]);

  // Calculate date range based on time period
  const getDateRange = (): { fromDate: bigint; toDate: bigint } => {
    const now = Date.now() * 1_000_000; // Convert to nanoseconds
    const toDate = BigInt(now);
    let fromDate: bigint;

    switch (timePeriod) {
      case 'last-7-days':
        fromDate = BigInt(now - 7 * 24 * 60 * 60 * 1_000_000_000);
        break;
      case 'last-30-days':
        fromDate = BigInt(now - 30 * 24 * 60 * 60 * 1_000_000_000);
        break;
      case 'last-3-months':
        fromDate = BigInt(now - 90 * 24 * 60 * 60 * 1_000_000_000);
        break;
      case 'last-6-months':
        fromDate = BigInt(now - 180 * 24 * 60 * 60 * 1_000_000_000);
        break;
      case 'last-year':
        fromDate = BigInt(now - 365 * 24 * 60 * 60 * 1_000_000_000);
        break;
      case 'custom':
        if (!customFromDate || !customToDate) {
          throw new Error('Fechas personalizadas requeridas');
        }
        fromDate = BigInt(new Date(customFromDate).getTime() * 1_000_000);
        const customTo = BigInt(new Date(customToDate).getTime() * 1_000_000);
        return { fromDate, toDate: customTo };
      default:
        fromDate = BigInt(now - 30 * 24 * 60 * 60 * 1_000_000_000);
    }

    return { fromDate, toDate };
  };

  // Helper function to get payment method label
  const getPaymentMethodLabel = (paymentMethod: any): string => {
    switch (paymentMethod) {
      case 'cash':
        return 'Efectivo';
      case 'card':
        return 'Tarjeta';
      case 'transfer':
        return 'Transferencia';
      default:
        return 'Desconocido';
    }
  };

  // Handle analytics generation
  const handleGenerateAnalytics = async () => {
    try {
      // Validate custom date range
      if (timePeriod === 'custom') {
        if (!customFromDate || !customToDate) {
          addToast('error', 'Por favor selecciona ambas fechas para el rango personalizado', 4000);
          return;
        }
        if (new Date(customFromDate) > new Date(customToDate)) {
          addToast('error', 'La fecha "Desde" debe ser anterior o igual a la fecha "Hasta"', 4000);
          return;
        }
      }

      setIsLoadingAnalytics(true);

      const { fromDate, toDate } = getDateRange();

      // Fetch raw data without category filter (we'll filter on frontend)
      const filters: AnalyticsFilters = {
        fromDate,
        toDate,
        categoryFilter: undefined, // Don't filter on backend
        paymentMethodFilter: paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined,
        includeArchived,
      };

      const data = await getSalesAnalyticsData(filters);
      setRawAnalyticsData(data);

      // Fetch inventory adjustment analytics if enabled
      if (includeAdjustments) {
        const adjustmentData = await getInventoryAdjustmentAnalytics(filters);
        setAdjustmentAnalytics(adjustmentData);

        // Fetch raw adjustments for detailed analysis
        const adjustmentFilters: AdjustmentFilters = {
          fromDate,
          toDate,
          productSearch: undefined,
          reasonFilter: undefined,
          adjustmentTypeFilter: undefined,
        };

        // Convert BigInt timestamp fields to strings before serialization
        const serializableFilters = convertBigIntsToStrings(adjustmentFilters);

        // Fetch all adjustments (using large page size)
        const response = await fetch('/api/adjustments?' + new URLSearchParams({
          pageNumber: '0',
          pageSize: '10000',
          filters: JSON.stringify(serializableFilters),
        }));
        
        if (response.ok) {
          const adjustmentsData = await response.json();
          setRawAdjustments(adjustmentsData.adjustments || []);
        }
      } else {
        setAdjustmentAnalytics(null);
        setRawAdjustments([]);
      }

      addToast('success', 'Análisis generado correctamente', 2000);
    } catch (error) {
      console.error('Error generating analytics:', error);
      addToast('error', 'Error al cargar los datos de análisis', 4000);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  // Memoized category filtering function
  const filteredOrderData = useMemo(() => {
    if (!rawAnalyticsData) return null;

    const allOrders = [...rawAnalyticsData.activeOrders, ...rawAnalyticsData.archivedOrders];

    // If no category filter, return all orders
    if (selectedCategoryId === 'all') {
      return {
        orders: allOrders,
        activeCount: rawAnalyticsData.activeOrders.length,
        archivedCount: rawAnalyticsData.archivedOrders.length,
      };
    }

    // Filter orders to only include items from selected category
    const filteredOrders = allOrders.map(order => {
      const filteredItems = order.items.filter(item => item.categoryName === selectedCategoryName);
      
      if (filteredItems.length === 0) return null;

      // Recalculate order totals based on filtered items
      const itemsTotal = filteredItems.reduce((sum, item) => sum + item.totalPrice, 0);
      
      return {
        ...order,
        items: filteredItems,
        totalAmount: itemsTotal,
      };
    }).filter((order): order is Order => order !== null);

    const activeFiltered = rawAnalyticsData.activeOrders.map(order => {
      const filteredItems = order.items.filter(item => item.categoryName === selectedCategoryName);
      return filteredItems.length > 0 ? order : null;
    }).filter(order => order !== null).length;

    const archivedFiltered = rawAnalyticsData.archivedOrders.map(order => {
      const filteredItems = order.items.filter(item => item.categoryName === selectedCategoryName);
      return filteredItems.length > 0 ? order : null;
    }).filter(order => order !== null).length;

    return {
      orders: filteredOrders,
      activeCount: activeFiltered,
      archivedCount: archivedFiltered,
    };
  }, [rawAnalyticsData, selectedCategoryId, selectedCategoryName]);

  // Calculate analytics from filtered order data
  const analytics = useMemo(() => {
    if (!filteredOrderData || filteredOrderData.orders.length === 0) return null;

    const allOrders = filteredOrderData.orders;

    // Calculate totals
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalBaseCost = 0;
    let totalDiscount = 0;
    let totalIVA = 0;

    const categoryProfits: Record<string, number> = {};
    const paymentMethodProfits: Record<string, number> = {};
    const productProfits: Record<string, { name: string; profit: number; revenue: number; quantity: number; margin: number }> = {};
    const marginRanges = { '0-10': 0, '10-20': 0, '20-30': 0, '30-40': 0, '40+': 0 };

    allOrders.forEach((order) => {
      totalRevenue += order.totalAmount;
      totalDiscount += order.discountAmount;

      order.items.forEach((item) => {
        const baseCost = item.basePrice * Number(item.quantity);
        const profit = (item.basePrice * Number(item.profitMargin) / 100) * Number(item.quantity);
        const ivaAmount = ((item.basePrice + item.basePrice * Number(item.profitMargin) / 100) * Number(item.ivaRate) / 100) * Number(item.quantity);

        totalProfit += profit;
        totalBaseCost += baseCost;
        totalIVA += ivaAmount;

        // Category profits
        if (!categoryProfits[item.categoryName]) {
          categoryProfits[item.categoryName] = 0;
        }
        categoryProfits[item.categoryName] += profit;

        // Product profits
        if (!productProfits[item.productBarcode]) {
          productProfits[item.productBarcode] = {
            name: item.productName,
            profit: 0,
            revenue: 0,
            quantity: 0,
            margin: Number(item.profitMargin),
          };
        }
        productProfits[item.productBarcode].profit += profit;
        productProfits[item.productBarcode].revenue += item.totalPrice;
        productProfits[item.productBarcode].quantity += Number(item.quantity);

        // Margin distribution
        const margin = Number(item.profitMargin);
        if (margin < 10) marginRanges['0-10']++;
        else if (margin < 20) marginRanges['10-20']++;
        else if (margin < 30) marginRanges['20-30']++;
        else if (margin < 40) marginRanges['30-40']++;
        else marginRanges['40+']++;
      });

      // Payment method profits
      const paymentMethod = getPaymentMethodLabel(order.paymentMethod);
      if (!paymentMethodProfits[paymentMethod]) {
        paymentMethodProfits[paymentMethod] = 0;
      }
      // Calculate order profit from filtered items
      let orderProfit = 0;
      order.items.forEach((item) => {
        orderProfit += (item.basePrice * Number(item.profitMargin) / 100) * Number(item.quantity);
      });
      paymentMethodProfits[paymentMethod] += orderProfit;
    });

    // Weighted average margin
    const averageMargin = totalBaseCost > 0 ? (totalProfit / totalBaseCost) * 100 : 0;

    // Top products sorted by quantity first, then profit
    const topProducts = Object.entries(productProfits)
      .map(([barcode, data]) => ({ barcode, ...data }))
      .sort((a, b) => {
        // Primary sort: quantity descending
        if (b.quantity !== a.quantity) {
          return b.quantity - a.quantity;
        }
        // Secondary sort: profit descending
        return b.profit - a.profit;
      })
      .slice(0, 10);

    // Category chart data (or product chart if category selected)
    const categoryChartData = selectedCategoryId === 'all'
      ? Object.entries(categoryProfits)
          .map(([name, profit]) => ({ name, profit }))
          .sort((a, b) => b.profit - a.profit)
      : Object.entries(productProfits)
          .map(([barcode, data]) => ({ name: data.name, profit: data.profit }))
          .sort((a, b) => b.profit - a.profit)
          .slice(0, 10);

    // Payment method chart data
    const paymentMethodChartData = Object.entries(paymentMethodProfits)
      .map(([name, profit]) => ({ name, profit }));

    // Margin distribution chart data
    const marginChartData = Object.entries(marginRanges)
      .map(([range, count]) => ({ range, count }))
      .filter(item => item.count > 0);

    return {
      totalRevenue,
      totalProfit,
      averageMargin,
      ordersCount: allOrders.length,
      totalDiscount,
      totalIVA,
      activeOrdersCount: filteredOrderData.activeCount,
      archivedOrdersCount: filteredOrderData.archivedCount,
      categoryChartData,
      paymentMethodChartData,
      marginChartData,
      topProducts,
    };
  }, [filteredOrderData, selectedCategoryId]);

  // Calculate most affected products by adjustments
  const mostAffectedProducts = useMemo(() => {
    if (!includeAdjustments || rawAdjustments.length === 0) return [];

    // Group adjustments by product barcode
    const productAdjustments: Record<string, {
      name: string;
      barcode: string;
      adjustments: InventoryAdjustment[];
      decreaseCount: number;
      increaseCount: number;
      netQuantity: number;
      totalLoss: number;
      latestDate: bigint;
    }> = {};

    rawAdjustments.forEach(adj => {
      if (!productAdjustments[adj.productBarcode]) {
        productAdjustments[adj.productBarcode] = {
          name: adj.productName,
          barcode: adj.productBarcode,
          adjustments: [],
          decreaseCount: 0,
          increaseCount: 0,
          netQuantity: 0,
          totalLoss: 0,
          latestDate: adj.dateEffective,
        };
      }

      const product = productAdjustments[adj.productBarcode];
      product.adjustments.push(adj);

      if (adj.adjustmentType === 'decrease') {
        product.decreaseCount++;
        product.netQuantity -= Number(adj.quantity);
        
        // Calculate loss value (we need to get product price)
        // For now, we'll estimate based on the adjustment data
        // In a real scenario, we'd fetch product details
        product.totalLoss += Number(adj.quantity) * 10; // Placeholder calculation
      } else {
        product.increaseCount++;
        product.netQuantity += Number(adj.quantity);
      }

      if (adj.dateEffective > product.latestDate) {
        product.latestDate = adj.dateEffective;
      }
    });

    // Convert to array and sort by total loss descending
    return Object.values(productAdjustments)
      .sort((a, b) => b.totalLoss - a.totalLoss);
  }, [includeAdjustments, rawAdjustments]);

  const handleCopyBarcode = (barcode: string) => {
    navigator.clipboard.writeText(barcode);
    addToast('success', 'Código de barras copiado', 2000);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Análisis de Ventas</h1>
        <p className="text-muted-foreground mt-2">
          Genera reportes detallados de ventas y rentabilidad
        </p>
      </div>

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Filtros de Análisis</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
            >
              {filtersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {filtersExpanded && (
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Time Period */}
              <div className="space-y-2">
                <Label>Período de Tiempo</Label>
                <Select value={timePeriod} onValueChange={setTimePeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last-7-days">Últimos 7 días</SelectItem>
                    <SelectItem value="last-30-days">Últimos 30 días</SelectItem>
                    <SelectItem value="last-3-months">Últimos 3 meses</SelectItem>
                    <SelectItem value="last-6-months">Últimos 6 meses</SelectItem>
                    <SelectItem value="last-year">Último año</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={Number(cat.id)} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method Filter */}
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                  <SelectTrigger>
                    <SelectValue />
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

            {/* Custom Date Range */}
            {timePeriod === 'custom' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Desde Fecha</Label>
                  <input
                    type="date"
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hasta Fecha</Label>
                  <input
                    type="date"
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            {/* Include Archived */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-archived"
                checked={includeArchived}
                onCheckedChange={(checked) => setIncludeArchived(checked as boolean)}
              />
              <Label htmlFor="include-archived" className="cursor-pointer">
                Incluir pedidos archivados
              </Label>
            </div>

            {/* Include Adjustments */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-adjustments"
                checked={includeAdjustments}
                onCheckedChange={(checked) => setIncludeAdjustments(checked as boolean)}
              />
              <Label htmlFor="include-adjustments" className="cursor-pointer">
                Incluir ajustes de inventario en análisis
              </Label>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateAnalytics}
              disabled={isLoadingAnalytics}
              className="w-full md:w-auto"
            >
              {isLoadingAnalytics ? 'Generando...' : 'Obtener Datos'}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Analytics Results */}
      {isLoadingAnalytics && (
        <div className="text-center py-12">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground">Generando análisis de ventas...</p>
        </div>
      )}

      {!isLoadingAnalytics && !analytics && rawAnalyticsData && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {selectedCategoryId !== 'all' 
                ? `No hay datos de ventas para la categoría "${selectedCategoryName}".`
                : 'No hay datos de análisis para los filtros seleccionados.'}
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoadingAnalytics && !rawAnalyticsData && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No hay datos de análisis. Usa los filtros para generar reportes.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoadingAnalytics && analytics && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{formatSpanishNumber(analytics.totalRevenue, 2)}</div>
                {selectedCategoryId !== 'all' && (
                  <p className="text-xs text-muted-foreground mt-1">Categoría: {selectedCategoryName}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Beneficio Total</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{formatSpanishNumber(analytics.totalProfit, 2)}</div>
                {selectedCategoryId !== 'all' && (
                  <p className="text-xs text-muted-foreground mt-1">Categoría: {selectedCategoryName}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margen Promedio</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatSpanishNumber(analytics.averageMargin, 2)}%</div>
                {selectedCategoryId !== 'all' && (
                  <p className="text-xs text-muted-foreground mt-1">Categoría: {selectedCategoryName}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.ordersCount}</div>
                {selectedCategoryId !== 'all' && (
                  <p className="text-xs text-muted-foreground mt-1">Con productos de {selectedCategoryName}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Descuentos</CardTitle>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{formatSpanishNumber(analytics.totalDiscount, 2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">IVA Recaudado</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{formatSpanishNumber(analytics.totalIVA, 2)}</div>
                {selectedCategoryId !== 'all' && (
                  <p className="text-xs text-muted-foreground mt-1">Categoría: {selectedCategoryName}</p>
                )}
              </CardContent>
            </Card>

            {includeArchived && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Desglose del Dataset</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <div>Activos: {analytics.activeOrdersCount}</div>
                    <div>Archivados: {analytics.archivedOrdersCount}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Inventory Adjustment Cards */}
            {includeAdjustments && adjustmentAnalytics && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pérdidas de Inventario</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">
                      €{formatSpanishNumber(adjustmentAnalytics.totalValueLost, 2)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ajustes Realizados</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{Number(adjustmentAnalytics.totalAdjustments)}</div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Revenue vs Profit */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedCategoryId === 'all' 
                    ? 'Ingresos vs Beneficio' 
                    : `Ingresos vs Beneficio - ${selectedCategoryName}`}
                </CardTitle>
                <CardDescription>Comparación de ingresos totales y beneficio</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'Ingresos', value: analytics.totalRevenue },
                    { name: 'Beneficio', value: analytics.totalProfit },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip formatter={(value) => `€${formatSpanishNumber(Number(value), 2)}`} />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Margin Distribution */}
            {analytics.marginChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedCategoryId === 'all' 
                      ? 'Distribución de Márgenes' 
                      : `Distribución de Márgenes - ${selectedCategoryName}`}
                  </CardTitle>
                  <CardDescription>Distribución de productos por rango de margen</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.marginChartData}
                        dataKey="count"
                        nameKey="range"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {analytics.marginChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Payment Method Profitability */}
            {analytics.paymentMethodChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedCategoryId === 'all' 
                      ? 'Rentabilidad por Método de Pago' 
                      : `Rentabilidad por Método de Pago - ${selectedCategoryName}`}
                  </CardTitle>
                  <CardDescription>Beneficio generado por cada método de pago</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.paymentMethodChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => `€${formatSpanishNumber(Number(value), 2)}`} />
                      <Bar dataKey="profit" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Profit by Category or Products */}
            {analytics.categoryChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedCategoryId === 'all' 
                      ? 'Beneficio por Categoría' 
                      : `Productos en categoría: ${selectedCategoryName}`}
                  </CardTitle>
                  <CardDescription>
                    {selectedCategoryId === 'all' 
                      ? 'Beneficio generado por cada categoría' 
                      : 'Top 10 productos por beneficio en esta categoría'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.categoryChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <RechartsTooltip formatter={(value) => `€${formatSpanishNumber(Number(value), 2)}`} />
                      <Bar dataKey="profit" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Top Products Table */}
          {analytics.topProducts.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedCategoryId === 'all' 
                    ? 'Productos Más Rentables' 
                    : `Productos Más Rentables - ${selectedCategoryName}`}
                </CardTitle>
                <CardDescription>
                  Ordenados por cantidad vendida y beneficio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Producto</th>
                        <th className="text-center py-3 px-4 font-medium">Cantidad Vendida</th>
                        <th className="text-right py-3 px-4 font-medium">Ingresos (€)</th>
                        <th className="text-right py-3 px-4 font-medium">Beneficio (€)</th>
                        <th className="text-right py-3 px-4 font-medium">Margen (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.topProducts.map((product) => (
                        <tr key={product.barcode} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">{product.barcode}</div>
                          </td>
                          <td className="text-center py-3 px-4">{product.quantity}</td>
                          <td className="text-right py-3 px-4">
                            {formatSpanishNumber(product.revenue, 2)}
                          </td>
                          <td className="text-right py-3 px-4 font-medium">
                            {formatSpanishNumber(product.profit, 2)}
                          </td>
                          <td className="text-right py-3 px-4">
                            {formatSpanishNumber(product.margin, 2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {selectedCategoryId === 'all' 
                    ? 'No hay productos vendidos.' 
                    : `No hay productos vendidos en esta categoría.`}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Most Affected Products by Adjustments */}
          {includeAdjustments && mostAffectedProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Productos Más Afectados por Ajustes</CardTitle>
                <CardDescription>
                  Productos con mayor impacto por ajustes de inventario
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Producto</th>
                        <th className="text-center py-3 px-4 font-medium">Código</th>
                        <th className="text-center py-3 px-4 font-medium">Tipo Principal</th>
                        <th className="text-center py-3 px-4 font-medium">Ajustes Total</th>
                        <th className="text-center py-3 px-4 font-medium">Cantidad Neto</th>
                        <th className="text-right py-3 px-4 font-medium">Valor Perdido (€)</th>
                        <th className="text-center py-3 px-4 font-medium">Última Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mostAffectedProducts.map((product) => {
                        const primaryType = product.decreaseCount > product.increaseCount ? 'decrease' : 'increase';
                        const latestDate = new Date(Number(product.latestDate) / 1_000_000);
                        
                        return (
                          <tr key={product.barcode} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{product.name}</span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => handleCopyBarcode(product.barcode)}
                                        className="opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                                        aria-label="Copiar código de barras"
                                      >
                                        <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Copiar código de barras</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </td>
                            <td className="text-center py-3 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-sm text-muted-foreground">{product.barcode}</span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => handleCopyBarcode(product.barcode)}
                                        className="hover:opacity-100 transition-opacity"
                                        aria-label="Copiar código de barras"
                                      >
                                        <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Copiar código de barras</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </td>
                            <td className="text-center py-3 px-4">
                              <span className={primaryType === 'decrease' ? 'text-destructive' : 'text-green-600'}>
                                {primaryType === 'decrease' ? '↓ Reducción' : '↑ Aumento'}
                              </span>
                            </td>
                            <td className="text-center py-3 px-4">
                              {product.adjustments.length}
                            </td>
                            <td className="text-center py-3 px-4">
                              <span className={product.netQuantity < 0 ? 'text-destructive font-medium' : ''}>
                                {product.netQuantity > 0 ? '+' : ''}{product.netQuantity}
                              </span>
                            </td>
                            <td className="text-right py-3 px-4">
                              <span className="text-destructive font-medium">
                                {formatSpanishNumber(product.totalLoss, 2)}
                              </span>
                            </td>
                            <td className="text-center py-3 px-4 text-sm text-muted-foreground">
                              {latestDate.toLocaleDateString('es-ES', { 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric' 
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {includeAdjustments && mostAffectedProducts.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Productos Más Afectados por Ajustes</CardTitle>
                <CardDescription>
                  Productos con mayor impacto por ajustes de inventario
                </CardDescription>
              </CardHeader>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No hay ajustes de inventario en el período seleccionado
                </p>
              </CardContent>
            </Card>
          )}

          {/* Active vs Archived Comparison */}
          {includeArchived && analytics.archivedOrdersCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Comparación Activos vs Archivados</CardTitle>
                <CardDescription>Distribución de pedidos entre activos y archivados</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Activos', value: analytics.activeOrdersCount },
                        { name: 'Archivados', value: analytics.archivedOrdersCount },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#64748b" />
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
