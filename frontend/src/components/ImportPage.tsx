import { useState, useCallback, useEffect } from 'react';
import { Upload, FileUp, Loader2, Download, X, AlertCircle, CheckCircle2, Eye, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToastStore } from '../stores/useToastStore';
import type { ProductImportDTO, CategoryImportDTO, ProductsImportResult, CategoriesImportResult, OrderImportDTO, OrdersImportResult, OrderImportConfig } from '../backend';
import { useActor } from '../hooks/useActor';
import { useQueryClient } from '@tanstack/react-query';
import { useGetCategories, useImportOrders } from '../hooks/useQueries';

type ImportStatus = 'idle' | 'validating' | 'importing' | 'completed' | 'error';

interface ProductImportPreview extends ProductImportDTO {
  validationStatus: 'valid' | 'error' | 'duplicate';
  validationMessage?: string;
}

interface CategoryImportPreview extends CategoryImportDTO {
  validationStatus: 'valid' | 'error' | 'duplicate';
  validationMessage?: string;
}

interface OrderImportPreview extends OrderImportDTO {
  validationStatus: 'valid' | 'error' | 'duplicate';
  validationMessage?: string;
}

interface ImportResult {
  success: boolean;
  message: string;
  importedCount?: number;
  skippedCount?: number;
  errorCount?: number;
  updatedCount?: number;
  nextOrderId?: number;
}

/**
 * Safely converts a value to a number, handling null, empty, numeric, and string-number conversions.
 * Returns null if conversion fails or value is invalid.
 */
function safeConvertNumber(value: any, fieldName: string): { value: number | null; error: string | null } {
  if (value === null || value === undefined || value === '') {
    return { value: null, error: null };
  }
  const num = Number(value);
  if (isNaN(num)) {
    return { value: null, error: `Error de conversión: ${fieldName} debe ser un número válido` };
  }
  return { value: num, error: null };
}

/**
 * Safely converts a value to a BigInt, handling string inputs.
 * Returns null if conversion fails or value is invalid.
 */
function safeToBigInt(value: any, fieldName: string): { value: bigint | null; error: string | null } {
  if (value === null || value === undefined || value === '') {
    return { value: null, error: null };
  }
  try {
    // Handle both string and number inputs
    const strValue = String(value);
    return { value: BigInt(strValue), error: null };
  } catch {
    return { value: null, error: `Error de conversión: ${fieldName} debe ser un número válido` };
  }
}

/**
 * Converts string "true"/"false" to boolean
 */
function safeConvertBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState('categorias');
  const { showSuccess, showError } = useToastStore();
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { data: existingCategories = [] } = useGetCategories();
  const importOrdersMutation = useImportOrders();

  // Products import state
  const [productsFile, setProductsFile] = useState<File | null>(null);
  const [productsPreview, setProductsPreview] = useState<ProductImportPreview[]>([]);
  const [productsStatus, setProductsStatus] = useState<ImportStatus>('idle');
  const [productsResult, setProductsResult] = useState<ImportResult | null>(null);

  // Categories import state
  const [categoriesFile, setCategoriesFile] = useState<File | null>(null);
  const [categoriesPreview, setCategoriesPreview] = useState<CategoryImportPreview[]>([]);
  const [categoriesStatus, setCategoriesStatus] = useState<ImportStatus>('idle');
  const [categoriesResult, setCategoriesResult] = useState<ImportResult | null>(null);

  // Orders import state
  const [ordersFile, setOrdersFile] = useState<File | null>(null);
  const [ordersPreview, setOrdersPreview] = useState<OrderImportPreview[]>([]);
  const [ordersStatus, setOrdersStatus] = useState<ImportStatus>('idle');
  const [ordersResult, setOrdersResult] = useState<ImportResult | null>(null);
  const [ordersConfig, setOrdersConfig] = useState<OrderImportConfig>({
    targetDataset: 'active',
    conflictResolution: 'skip',
    updateStock: false,
    preserveTimestamps: true,
  });
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<OrderImportPreview | null>(null);

  // Products file handling with automatic import
  const handleProductsFileUpload = useCallback(async (file: File) => {
    try {
      setProductsStatus('validating');
      setProductsResult(null);
      
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data.products)) {
        showError('Formato de archivo inválido. Falta el array de productos.');
        setProductsStatus('error');
        setProductsResult({ success: false, message: 'Formato de archivo inválido' });
        return;
      }

      // Process and validate products
      const seenBarcodes = new Set<string>();
      const previews: ProductImportPreview[] = [];

      for (const product of data.products.slice(0, 10)) {
        const barcode = product.barcode?.toString() || '';
        
        const categoryIdResult = safeConvertNumber(product.categoryId, 'categoryId');
        const stockResult = safeConvertNumber(product.stock, 'stock');
        const basePriceResult = safeConvertNumber(product.basePrice, 'basePrice');
        const ivaResult = safeConvertNumber(product.iva, 'iva');
        const profitMarginResult = safeConvertNumber(product.profitMargin, 'profitMargin');
        const createdDateResult = safeToBigInt(product.createdDate, 'createdDate');
        const updatedDateResult = safeToBigInt(product.updatedDate, 'updatedDate');

        let validationStatus: 'valid' | 'error' | 'duplicate' = 'valid';
        let validationMessage = '';

        if (categoryIdResult.error) {
          validationStatus = 'error';
          validationMessage = categoryIdResult.error;
        } else if (stockResult.error) {
          validationStatus = 'error';
          validationMessage = stockResult.error;
        } else if (basePriceResult.error) {
          validationStatus = 'error';
          validationMessage = basePriceResult.error;
        } else if (ivaResult.error) {
          validationStatus = 'error';
          validationMessage = ivaResult.error;
        } else if (profitMarginResult.error) {
          validationStatus = 'error';
          validationMessage = profitMarginResult.error;
        } else if (createdDateResult.error) {
          validationStatus = 'error';
          validationMessage = createdDateResult.error;
        } else if (updatedDateResult.error) {
          validationStatus = 'error';
          validationMessage = updatedDateResult.error;
        } else if (seenBarcodes.has(barcode)) {
          validationStatus = 'duplicate';
          validationMessage = 'Código de barras duplicado';
        } else {
          seenBarcodes.add(barcode);
        }

        const categoryId = categoryIdResult.value;
        const stock = stockResult.value;
        const basePrice = basePriceResult.value;
        const iva = ivaResult.value;
        const profitMargin = profitMarginResult.value;
        const createdDate = createdDateResult.value;
        const updatedDate = updatedDateResult.value;

        if (validationStatus === 'valid') {
          if (!barcode) {
            validationStatus = 'error';
            validationMessage = 'Código de barras requerido';
          } else if (!product.name) {
            validationStatus = 'error';
            validationMessage = 'Nombre requerido';
          } else if (categoryId === null) {
            validationStatus = 'error';
            validationMessage = 'ID de categoría requerido';
          } else if (stock === null || stock < 0) {
            validationStatus = 'error';
            validationMessage = 'Stock debe ser mayor o igual a 0';
          } else if (basePrice === null || basePrice <= 0) {
            validationStatus = 'error';
            validationMessage = 'Precio base debe ser mayor que 0';
          } else if (iva === null || ![0, 4, 10, 21].includes(iva)) {
            validationStatus = 'error';
            validationMessage = 'IVA debe ser 0, 4, 10 o 21';
          } else if (profitMargin === null || profitMargin < 0 || profitMargin > 10000) {
            validationStatus = 'error';
            validationMessage = 'Margen debe estar entre 0 y 10000';
          } else if (createdDate === null || updatedDate === null) {
            validationStatus = 'error';
            validationMessage = 'Fechas requeridas';
          } else {
            const categoryExists = existingCategories.some(cat => Number(cat.id) === categoryId);
            if (!categoryExists) {
              validationStatus = 'error';
              validationMessage = `Categoría con ID ${categoryId} no existe en la base de datos`;
            }
          }
        }

        previews.push({
          barcode,
          name: product.name || '',
          description: product.description || '',
          categoryId: BigInt(categoryId || 0),
          stock: BigInt(stock || 0),
          basePrice: basePrice || 0,
          iva: BigInt(iva || 0),
          profitMargin: BigInt(profitMargin || 0),
          createdDate: createdDate || BigInt(0),
          updatedDate: updatedDate || BigInt(0),
          validationStatus,
          validationMessage,
        });
      }

      setProductsFile(file);
      setProductsPreview(previews);

      // Check if there are valid records
      const validCount = previews.filter(p => p.validationStatus === 'valid').length;
      
      if (validCount === 0) {
        setProductsStatus('error');
        setProductsResult({ success: false, message: 'No hay registros válidos para importar' });
        showError('No hay registros válidos para importar');
        return;
      }

      // Automatically start import
      await handleImportProducts(file, data);
      
    } catch (error) {
      console.error('File parsing error:', error);
      showError('Error al leer el archivo. Asegúrese de que sea un JSON válido.');
      setProductsStatus('error');
      setProductsResult({ success: false, message: 'Error al leer el archivo' });
    }
  }, [showError, existingCategories]);

  // Categories file handling with automatic import
  const handleCategoriesFileUpload = useCallback(async (file: File) => {
    try {
      setCategoriesStatus('validating');
      setCategoriesResult(null);
      
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data.categories)) {
        showError('Formato de archivo inválido. Falta el array de categorías.');
        setCategoriesStatus('error');
        setCategoriesResult({ success: false, message: 'Formato de archivo inválido' });
        return;
      }

      const seenIds = new Set<number>();
      const previews: CategoryImportPreview[] = [];

      for (const category of data.categories.slice(0, 10)) {
        const categoryIdResult = safeConvertNumber(category.id || category.categoryId, 'categoryId');
        const orderResult = safeConvertNumber(category.order, 'order');
        const defaultIVAResult = safeConvertNumber(category.defaultIVA, 'defaultIva');
        const defaultProfitMarginResult = safeConvertNumber(category.defaultProfitMargin, 'defaultProfitMargin');

        let validationStatus: 'valid' | 'error' | 'duplicate' = 'valid';
        let validationMessage = '';

        if (categoryIdResult.error) {
          validationStatus = 'error';
          validationMessage = categoryIdResult.error;
        } else if (orderResult.error) {
          validationStatus = 'error';
          validationMessage = orderResult.error;
        } else if (defaultIVAResult.error) {
          validationStatus = 'error';
          validationMessage = defaultIVAResult.error;
        } else if (defaultProfitMarginResult.error) {
          validationStatus = 'error';
          validationMessage = defaultProfitMarginResult.error;
        } else if (categoryIdResult.value !== null && seenIds.has(categoryIdResult.value)) {
          validationStatus = 'duplicate';
          validationMessage = 'ID de categoría duplicado';
        } else if (categoryIdResult.value !== null) {
          seenIds.add(categoryIdResult.value);
        }

        const categoryId = categoryIdResult.value;
        const order = orderResult.value;
        const defaultIVA = defaultIVAResult.value;
        const defaultProfitMargin = defaultProfitMarginResult.value;

        if (validationStatus === 'valid') {
          if (categoryId === null) {
            validationStatus = 'error';
            validationMessage = 'ID de categoría requerido';
          } else if (!category.name) {
            validationStatus = 'error';
            validationMessage = 'Nombre requerido';
          } else if (order === null || order < 0) {
            validationStatus = 'error';
            validationMessage = 'Orden debe ser mayor o igual a 0';
          } else if (defaultIVA === null || ![0, 4, 10, 21].includes(defaultIVA)) {
            validationStatus = 'error';
            validationMessage = 'IVA debe ser 0, 4, 10 o 21';
          } else if (defaultProfitMargin === null || defaultProfitMargin < 0 || defaultProfitMargin > 10000) {
            validationStatus = 'error';
            validationMessage = 'Margen debe estar entre 0 y 10000';
          }
        }

        previews.push({
          categoryId: BigInt(categoryId || 0),
          name: category.name || '',
          order: BigInt(order || 0),
          defaultIVA: BigInt(defaultIVA || 0),
          defaultProfitMargin: BigInt(defaultProfitMargin || 0),
          validationStatus,
          validationMessage,
        });
      }

      setCategoriesFile(file);
      setCategoriesPreview(previews);

      const validCount = previews.filter(c => c.validationStatus === 'valid').length;
      
      if (validCount === 0) {
        setCategoriesStatus('error');
        setCategoriesResult({ success: false, message: 'No hay registros válidos para importar' });
        showError('No hay registros válidos para importar');
        return;
      }

      // Automatically start import
      await handleImportCategories(file, data);
      
    } catch (error) {
      console.error('File parsing error:', error);
      showError('Error al leer el archivo. Asegúrese de que sea un JSON válido.');
      setCategoriesStatus('error');
      setCategoriesResult({ success: false, message: 'Error al leer el archivo' });
    }
  }, [showError]);

  // Orders file handling with automatic import
  const handleOrdersFileUpload = useCallback(async (file: File) => {
    try {
      setOrdersStatus('validating');
      setOrdersResult(null);
      
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data.orders)) {
        showError('Formato de archivo inválido. Falta el array de pedidos.');
        setOrdersStatus('error');
        setOrdersResult({ success: false, message: 'Formato de archivo inválido' });
        return;
      }

      const seenOrderNumbers = new Set<string>();
      const previews: OrderImportPreview[] = [];

      for (const order of data.orders.slice(0, 10)) {
        const orderNumber = order.orderNumber?.toString() || '';
        
        const timestampResult = safeToBigInt(order.timestamp, 'timestamp');
        const totalAmountResult = safeConvertNumber(order.totalAmount, 'totalAmount');
        const discountAmountResult = safeConvertNumber(order.discountAmount, 'discountAmount');

        let validationStatus: 'valid' | 'error' | 'duplicate' = 'valid';
        let validationMessage = '';

        if (timestampResult.error) {
          validationStatus = 'error';
          validationMessage = timestampResult.error;
        } else if (totalAmountResult.error) {
          validationStatus = 'error';
          validationMessage = totalAmountResult.error;
        } else if (discountAmountResult.error) {
          validationStatus = 'error';
          validationMessage = discountAmountResult.error;
        } else if (seenOrderNumbers.has(orderNumber)) {
          validationStatus = 'duplicate';
          validationMessage = 'Número de pedido duplicado';
        } else {
          seenOrderNumbers.add(orderNumber);
        }

        const timestamp = timestampResult.value;
        const totalAmount = totalAmountResult.value;
        const discountAmount = discountAmountResult.value;

        if (validationStatus === 'valid') {
          if (!orderNumber) {
            validationStatus = 'error';
            validationMessage = 'Número de pedido requerido';
          } else if (!order.status || !['valid', 'invalid'].includes(order.status.toLowerCase())) {
            validationStatus = 'error';
            validationMessage = 'Estado debe ser "valid" o "invalid"';
          } else if (!order.paymentMethod || !['cash', 'card', 'transfer'].includes(order.paymentMethod.toLowerCase())) {
            validationStatus = 'error';
            validationMessage = 'Método de pago debe ser "cash", "card" o "transfer"';
          } else if (timestamp === null) {
            validationStatus = 'error';
            validationMessage = 'Timestamp requerido';
          } else if (totalAmount === null || totalAmount < 0) {
            validationStatus = 'error';
            validationMessage = 'Total debe ser mayor o igual a 0';
          } else if (discountAmount === null || discountAmount < 0) {
            validationStatus = 'error';
            validationMessage = 'Descuento debe ser mayor o igual a 0';
          } else if (!Array.isArray(order.items) || order.items.length === 0) {
            validationStatus = 'error';
            validationMessage = 'Pedido debe tener al menos un item';
          }
        }

        previews.push({
          orderId: order.orderId || '',
          orderNumber,
          timestamp: timestamp || BigInt(0),
          status: order.status || '',
          totalAmount: totalAmount || 0,
          discountAmount: discountAmount || 0,
          paymentMethod: order.paymentMethod || '',
          customerNotes: order.customerNotes || '',
          printReceipt: safeConvertBoolean(order.printReceipt),
          items: order.items || [],
          taxBreakdown: order.taxBreakdown || null,
          validationStatus,
          validationMessage,
        });
      }

      setOrdersFile(file);
      setOrdersPreview(previews);

      const validCount = previews.filter(o => o.validationStatus === 'valid').length;
      
      if (validCount === 0) {
        setOrdersStatus('error');
        setOrdersResult({ success: false, message: 'No hay registros válidos para importar' });
        showError('No hay registros válidos para importar');
        return;
      }

      // Automatically start import
      await handleImportOrders(file, data);
      
    } catch (error) {
      console.error('File parsing error:', error);
      showError('Error al leer el archivo. Asegúrese de que sea un JSON válido.');
      setOrdersStatus('error');
      setOrdersResult({ success: false, message: 'Error al leer el archivo' });
    }
  }, [showError]);

  // Import products
  const handleImportProducts = async (file?: File, parsedData?: any) => {
    const fileToUse = file || productsFile;
    if (!fileToUse || !actor) return;

    try {
      setProductsStatus('importing');
      const text = await fileToUse.text();
      const data = parsedData || JSON.parse(text);

      const productsToImport: ProductImportDTO[] = data.products.map((product: any) => {
        const categoryIdResult = safeConvertNumber(product.categoryId, 'categoryId');
        const stockResult = safeConvertNumber(product.stock, 'stock');
        const basePriceResult = safeConvertNumber(product.basePrice, 'basePrice');
        const ivaResult = safeConvertNumber(product.iva, 'iva');
        const profitMarginResult = safeConvertNumber(product.profitMargin, 'profitMargin');
        const createdDateResult = safeToBigInt(product.createdDate, 'createdDate');
        const updatedDateResult = safeToBigInt(product.updatedDate, 'updatedDate');

        return {
          barcode: product.barcode?.toString() || '',
          name: product.name || '',
          description: product.description || '',
          categoryId: BigInt(categoryIdResult.value || 0),
          stock: BigInt(stockResult.value || 0),
          basePrice: basePriceResult.value || 0,
          iva: BigInt(ivaResult.value || 0),
          profitMargin: BigInt(profitMarginResult.value || 0),
          createdDate: createdDateResult.value || BigInt(0),
          updatedDate: updatedDateResult.value || BigInt(0),
        };
      });

      const result: ProductsImportResult = await actor.importProducts(productsToImport);

      if (result.importedCount > 0) {
        showSuccess(`Datos importados correctamente: ${result.importedCount} productos importados, ${result.skippedCount} omitidos`);
        queryClient.invalidateQueries({ queryKey: ['products'] });
        setProductsStatus('completed');
        setProductsResult({
          success: true,
          message: 'Importación completada exitosamente',
          importedCount: Number(result.importedCount),
          skippedCount: Number(result.skippedCount),
          errorCount: Number(result.errorCount),
        });
      } else {
        showError(`No se importaron productos. ${result.errorCount} errores encontrados.`);
        setProductsStatus('error');
        setProductsResult({
          success: false,
          message: 'No se importaron productos',
          errorCount: Number(result.errorCount),
        });
      }

      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
      }
    } catch (error) {
      console.error('Import error:', error);
      showError('Error al importar datos');
      setProductsStatus('error');
      setProductsResult({ success: false, message: 'Error al importar datos' });
    }
  };

  // Import categories
  const handleImportCategories = async (file?: File, parsedData?: any) => {
    const fileToUse = file || categoriesFile;
    if (!fileToUse || !actor) return;

    try {
      setCategoriesStatus('importing');
      const text = await fileToUse.text();
      const data = parsedData || JSON.parse(text);

      const categoriesToImport: CategoryImportDTO[] = data.categories.map((category: any) => {
        const categoryIdResult = safeConvertNumber(category.id || category.categoryId, 'categoryId');
        const orderResult = safeConvertNumber(category.order, 'order');
        const defaultIVAResult = safeConvertNumber(category.defaultIVA, 'defaultIva');
        const defaultProfitMarginResult = safeConvertNumber(category.defaultProfitMargin, 'defaultProfitMargin');

        return {
          categoryId: BigInt(categoryIdResult.value || 0),
          name: category.name || '',
          order: BigInt(orderResult.value || 0),
          defaultIVA: BigInt(defaultIVAResult.value || 0),
          defaultProfitMargin: BigInt(defaultProfitMarginResult.value || 0),
        };
      });

      const result: CategoriesImportResult = await actor.importCategories(categoriesToImport);

      if (result.importedCount > 0) {
        showSuccess(`Datos importados correctamente: ${result.importedCount} categorías importadas, ${result.skippedCount} omitidas`);
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        setCategoriesStatus('completed');
        setCategoriesResult({
          success: true,
          message: 'Importación completada exitosamente',
          importedCount: Number(result.importedCount),
          skippedCount: Number(result.skippedCount),
          errorCount: Number(result.errorCount),
        });
      } else {
        showError(`No se importaron categorías. ${result.errorCount} errores encontrados.`);
        setCategoriesStatus('error');
        setCategoriesResult({
          success: false,
          message: 'No se importaron categorías',
          errorCount: Number(result.errorCount),
        });
      }

      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
      }
    } catch (error) {
      console.error('Import error:', error);
      showError('Error al importar datos');
      setCategoriesStatus('error');
      setCategoriesResult({ success: false, message: 'Error al importar datos' });
    }
  };

  // Import orders
  const handleImportOrders = async (file?: File, parsedData?: any) => {
    const fileToUse = file || ordersFile;
    if (!fileToUse || !actor) return;

    try {
      setOrdersStatus('importing');
      const text = await fileToUse.text();
      const data = parsedData || JSON.parse(text);

      const ordersToImport: OrderImportDTO[] = data.orders.map((order: any) => {
        const timestampResult = safeToBigInt(order.timestamp, 'timestamp');
        const totalAmountResult = safeConvertNumber(order.totalAmount, 'totalAmount');
        const discountAmountResult = safeConvertNumber(order.discountAmount, 'discountAmount');

        const convertedItems = (order.items || []).map((item: any) => {
          const quantityResult = safeConvertNumber(item.quantity, 'quantity');
          const ivaRateResult = safeConvertNumber(item.ivaRate, 'ivaRate');
          const profitMarginResult = safeConvertNumber(item.profitMargin, 'profitMargin');
          const basePriceResult = safeConvertNumber(item.basePrice, 'basePrice');
          const salePriceResult = safeConvertNumber(item.salePrice, 'salePrice');
          const totalPriceResult = safeConvertNumber(item.totalPrice, 'totalPrice');
          const originalStockResult = safeConvertNumber(item.originalStock, 'originalStock');
          const updatedStockResult = safeConvertNumber(item.updatedStock, 'updatedStock');

          return {
            productBarcode: item.productBarcode || '',
            productName: item.productName || '',
            categoryName: item.categoryName || '',
            quantity: BigInt(quantityResult.value || 0),
            ivaRate: BigInt(ivaRateResult.value || 0),
            profitMargin: BigInt(profitMarginResult.value || 0),
            basePrice: basePriceResult.value || 0,
            salePrice: salePriceResult.value || 0,
            totalPrice: totalPriceResult.value || 0,
            originalStock: BigInt(originalStockResult.value || 0),
            updatedStock: BigInt(updatedStockResult.value || 0),
          };
        });

        const convertedTaxBreakdown = order.taxBreakdown ? (order.taxBreakdown || []).map((tax: any) => {
          const ivaRateResult = safeConvertNumber(tax.ivaRate, 'ivaRate');
          const baseAmountResult = safeConvertNumber(tax.baseAmount, 'baseAmount');
          const taxAmountResult = safeConvertNumber(tax.taxAmount, 'taxAmount');
          const taxableAmountResult = safeConvertNumber(tax.taxableAmount, 'taxableAmount');

          return {
            ivaRate: BigInt(ivaRateResult.value || 0),
            baseAmount: baseAmountResult.value || 0,
            taxAmount: taxAmountResult.value || 0,
            taxableAmount: taxableAmountResult.value || 0,
          };
        }) : null;

        return {
          orderId: order.orderId || '',
          orderNumber: order.orderNumber || '',
          timestamp: timestampResult.value || BigInt(0),
          status: order.status || '',
          totalAmount: totalAmountResult.value || 0,
          discountAmount: discountAmountResult.value || 0,
          paymentMethod: order.paymentMethod || '',
          customerNotes: order.customerNotes || '',
          printReceipt: safeConvertBoolean(order.printReceipt),
          items: convertedItems,
          taxBreakdown: convertedTaxBreakdown,
        };
      });

      const result: OrdersImportResult = await importOrdersMutation.mutateAsync({
        orders: ordersToImport,
        config: ordersConfig,
      });

      if (result.importedCount > 0 || result.updatedCount > 0) {
        const nextIdMessage = result.nextOrderId ? ` Siguiente ID de pedido actualizado a: ${result.nextOrderId}` : '';
        showSuccess(`${result.importedCount} pedidos importados exitosamente, ${result.updatedCount} actualizados, ${result.skippedCount} omitidos.${nextIdMessage}`);
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['archivedOrders'] });
        setOrdersStatus('completed');
        setOrdersResult({
          success: true,
          message: 'Importación completada exitosamente',
          importedCount: Number(result.importedCount),
          updatedCount: Number(result.updatedCount),
          skippedCount: Number(result.skippedCount),
          errorCount: Number(result.errorCount),
          nextOrderId: Number(result.nextOrderId),
        });
      } else {
        showError(`No se importaron pedidos. ${result.errorCount} errores encontrados.`);
        setOrdersStatus('error');
        setOrdersResult({
          success: false,
          message: 'No se importaron pedidos',
          errorCount: Number(result.errorCount),
        });
      }

      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
      }
    } catch (error) {
      console.error('Import error:', error);
      showError('Error al importar datos');
      setOrdersStatus('error');
      setOrdersResult({ success: false, message: 'Error al importar datos' });
    }
  };

  // Clear products
  const handleClearProducts = () => {
    setProductsFile(null);
    setProductsPreview([]);
    setProductsStatus('idle');
    setProductsResult(null);
  };

  // Clear categories
  const handleClearCategories = () => {
    setCategoriesFile(null);
    setCategoriesPreview([]);
    setCategoriesStatus('idle');
    setCategoriesResult(null);
  };

  // Clear orders
  const handleClearOrders = () => {
    setOrdersFile(null);
    setOrdersPreview([]);
    setOrdersStatus('idle');
    setOrdersResult(null);
  };

  // Download templates
  const handleDownloadProductsTemplate = () => {
    const template = {
      products: [
        {
          barcode: '1234567890',
          name: 'Producto Ejemplo',
          description: 'Descripción del producto',
          categoryId: 1,
          stock: 10,
          basePrice: 10.0,
          iva: 21,
          profitMargin: 10,
          createdDate: Date.now().toString() + '000000',
          updatedDate: Date.now().toString() + '000000',
        },
      ],
    };

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'productos_plantilla.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCategoriesTemplate = () => {
    const template = {
      categories: [
        {
          categoryId: 1,
          name: 'Categoría Ejemplo',
          order: 1,
          defaultIVA: 21,
          defaultProfitMargin: 10,
        },
      ],
    };

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'categorias_plantilla.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadOrdersTemplate = () => {
    const template = {
      orders: [
        {
          orderId: 'ORD-001',
          orderNumber: 'ORD-001',
          timestamp: Date.now().toString() + '000000',
          status: 'valid',
          totalAmount: 100.0,
          discountAmount: 0.0,
          paymentMethod: 'cash',
          customerNotes: '',
          printReceipt: true,
          items: [
            {
              productBarcode: '1234567890',
              productName: 'Producto Ejemplo',
              categoryName: 'Categoría Ejemplo',
              quantity: 1,
              basePrice: 10.0,
              ivaRate: 21,
              profitMargin: 10,
              salePrice: 13.31,
              totalPrice: 13.31,
              originalStock: 10,
              updatedStock: 9,
            },
          ],
          taxBreakdown: [
            {
              ivaRate: 21,
              baseAmount: 11.0,
              taxAmount: 2.31,
              taxableAmount: 13.31,
            },
          ],
        },
      ],
    };

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pedidos_plantilla.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleProductsDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      handleProductsFileUpload(file);
    } else {
      showError('Por favor, sube un archivo JSON válido');
    }
  };

  const handleCategoriesDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      handleCategoriesFileUpload(file);
    } else {
      showError('Por favor, sube un archivo JSON válido');
    }
  };

  const handleOrdersDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      handleOrdersFileUpload(file);
    } else {
      showError('Por favor, sube un archivo JSON válido');
    }
  };

  // Calculate summary counts
  const productsSummary = {
    total: productsPreview.length,
    valid: productsPreview.filter((p) => p.validationStatus === 'valid').length,
    duplicates: productsPreview.filter((p) => p.validationStatus === 'duplicate').length,
    errors: productsPreview.filter((p) => p.validationStatus === 'error').length,
  };

  const categoriesSummary = {
    total: categoriesPreview.length,
    valid: categoriesPreview.filter((c) => c.validationStatus === 'valid').length,
    duplicates: categoriesPreview.filter((c) => c.validationStatus === 'duplicate').length,
    errors: categoriesPreview.filter((c) => c.validationStatus === 'error').length,
  };

  const ordersSummary = {
    total: ordersPreview.length,
    valid: ordersPreview.filter((o) => o.validationStatus === 'valid').length,
    duplicates: ordersPreview.filter((o) => o.validationStatus === 'duplicate').length,
    errors: ordersPreview.filter((o) => o.validationStatus === 'error').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileUp className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Importación de Datos</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
        </TabsList>

        {/* Categories Import Tab */}
        <TabsContent value="categorias" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Importar Categorías</CardTitle>
              <CardDescription>
                Importa categorías desde un archivo JSON exportado. Las categorías con IDs duplicados serán omitidas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Zone */}
              {categoriesStatus === 'idle' && (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleCategoriesDrop}
                  className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                  onClick={() => document.getElementById('categories-file-input')?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">
                    Arrastra un archivo JSON aquí o haz clic para seleccionar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Formato: Archivo de exportación de categorías
                  </p>
                  <input
                    id="categories-file-input"
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCategoriesFileUpload(file);
                    }}
                  />
                </div>
              )}

              {/* Validating State */}
              {categoriesStatus === 'validating' && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">Validando...</p>
                  <p className="text-sm text-muted-foreground">Verificando datos del archivo</p>
                </div>
              )}

              {/* Importing State */}
              {categoriesStatus === 'importing' && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">Importando...</p>
                  <p className="text-sm text-muted-foreground">Procesando categorías</p>
                  <Progress value={50} className="w-64" />
                </div>
              )}

              {/* Completed State */}
              {categoriesStatus === 'completed' && categoriesResult && (
                <div className="space-y-4">
                  <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      <strong>Importación completada exitosamente</strong>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>• Importadas: {categoriesResult.importedCount}</p>
                        <p>• Omitidas: {categoriesResult.skippedCount}</p>
                        {categoriesResult.errorCount! > 0 && <p>• Errores: {categoriesResult.errorCount}</p>}
                      </div>
                    </AlertDescription>
                  </Alert>
                  <div className="flex justify-center">
                    <Button onClick={handleClearCategories}>
                      <Upload className="mr-2 h-4 w-4" />
                      Nuevo Archivo
                    </Button>
                  </div>
                </div>
              )}

              {/* Error State */}
              {categoriesStatus === 'error' && categoriesResult && (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Error en la importación</strong>
                      <p className="mt-2">{categoriesResult.message}</p>
                      {categoriesResult.errorCount! > 0 && (
                        <p className="mt-1 text-sm">Errores encontrados: {categoriesResult.errorCount}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" onClick={() => handleImportCategories()}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reintentar
                    </Button>
                    <Button onClick={handleClearCategories}>
                      <Upload className="mr-2 h-4 w-4" />
                      Nuevo Archivo
                    </Button>
                  </div>
                </div>
              )}

              {/* Preview (shown during validation/importing) */}
              {(categoriesStatus === 'validating' || categoriesStatus === 'importing') && categoriesPreview.length > 0 && (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Mostrando primeros 10 registros. Total: {categoriesSummary.total} | Válidos: {categoriesSummary.valid} | Duplicados: {categoriesSummary.duplicates} | Errores: {categoriesSummary.errors}
                    </AlertDescription>
                  </Alert>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Orden</TableHead>
                          <TableHead>IVA</TableHead>
                          <TableHead>Margen</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoriesPreview.map((category, index) => (
                          <TableRow key={index}>
                            <TableCell>{category.categoryId.toString()}</TableCell>
                            <TableCell>{category.name}</TableCell>
                            <TableCell>{category.order.toString()}</TableCell>
                            <TableCell>{category.defaultIVA.toString()}%</TableCell>
                            <TableCell>{category.defaultProfitMargin.toString()}%</TableCell>
                            <TableCell>
                              {category.validationStatus === 'valid' && (
                                <Badge variant="default" className="gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Válido
                                </Badge>
                              )}
                              {category.validationStatus === 'duplicate' && (
                                <Badge variant="secondary" className="gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Duplicado
                                </Badge>
                              )}
                              {category.validationStatus === 'error' && (
                                <Badge variant="destructive" className="gap-1">
                                  <X className="h-3 w-3" />
                                  {category.validationMessage}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {/* Actions */}
              {categoriesStatus === 'idle' && (
                <div className="flex items-center justify-between pt-4 border-t gap-4">
                  <Button
                    variant="outline"
                    onClick={handleDownloadCategoriesTemplate}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar Plantilla
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Import Tab */}
        <TabsContent value="productos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Importar Productos</CardTitle>
              <CardDescription>
                Importa productos desde un archivo JSON exportado. Los productos con códigos de barras duplicados serán omitidos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Zone */}
              {productsStatus === 'idle' && (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleProductsDrop}
                  className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                  onClick={() => document.getElementById('products-file-input')?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">
                    Arrastra un archivo JSON aquí o haz clic para seleccionar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Formato: Archivo de exportación de productos
                  </p>
                  <input
                    id="products-file-input"
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleProductsFileUpload(file);
                    }}
                  />
                </div>
              )}

              {/* Validating State */}
              {productsStatus === 'validating' && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">Validando...</p>
                  <p className="text-sm text-muted-foreground">Verificando datos del archivo</p>
                </div>
              )}

              {/* Importing State */}
              {productsStatus === 'importing' && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">Importando...</p>
                  <p className="text-sm text-muted-foreground">Procesando productos</p>
                  <Progress value={50} className="w-64" />
                </div>
              )}

              {/* Completed State */}
              {productsStatus === 'completed' && productsResult && (
                <div className="space-y-4">
                  <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      <strong>Importación completada exitosamente</strong>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>• Importados: {productsResult.importedCount}</p>
                        <p>• Omitidos: {productsResult.skippedCount}</p>
                        {productsResult.errorCount! > 0 && <p>• Errores: {productsResult.errorCount}</p>}
                      </div>
                    </AlertDescription>
                  </Alert>
                  <div className="flex justify-center">
                    <Button onClick={handleClearProducts}>
                      <Upload className="mr-2 h-4 w-4" />
                      Nuevo Archivo
                    </Button>
                  </div>
                </div>
              )}

              {/* Error State */}
              {productsStatus === 'error' && productsResult && (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Error en la importación</strong>
                      <p className="mt-2">{productsResult.message}</p>
                      {productsResult.errorCount! > 0 && (
                        <p className="mt-1 text-sm">Errores encontrados: {productsResult.errorCount}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" onClick={() => handleImportProducts()}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reintentar
                    </Button>
                    <Button onClick={handleClearProducts}>
                      <Upload className="mr-2 h-4 w-4" />
                      Nuevo Archivo
                    </Button>
                  </div>
                </div>
              )}

              {/* Preview (shown during validation/importing) */}
              {(productsStatus === 'validating' || productsStatus === 'importing') && productsPreview.length > 0 && (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Mostrando primeros 10 registros. Total: {productsSummary.total} | Válidos: {productsSummary.valid} | Duplicados: {productsSummary.duplicates} | Errores: {productsSummary.errors}
                    </AlertDescription>
                  </Alert>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código de Barras</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Categoría ID</TableHead>
                          <TableHead>Precio Base</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productsPreview.map((product, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono">{product.barcode}</TableCell>
                            <TableCell>{product.name}</TableCell>
                            <TableCell>{product.categoryId.toString()}</TableCell>
                            <TableCell>€{product.basePrice.toFixed(2)}</TableCell>
                            <TableCell>
                              {product.validationStatus === 'valid' && (
                                <Badge variant="default" className="gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Válido
                                </Badge>
                              )}
                              {product.validationStatus === 'duplicate' && (
                                <Badge variant="secondary" className="gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Duplicado
                                </Badge>
                              )}
                              {product.validationStatus === 'error' && (
                                <Badge variant="destructive" className="gap-1">
                                  <X className="h-3 w-3" />
                                  {product.validationMessage}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {/* Actions */}
              {productsStatus === 'idle' && (
                <div className="flex items-center justify-between pt-4 border-t gap-4">
                  <Button
                    variant="outline"
                    onClick={handleDownloadProductsTemplate}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar Plantilla
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Import Tab */}
        <TabsContent value="pedidos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Importar Pedidos</CardTitle>
              <CardDescription>
                Importa pedidos desde un archivo JSON. Configura el destino y el comportamiento de conflictos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Configuration (always visible) */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h3 className="font-semibold">Configuración de Importación</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dataset">Dataset de Destino</Label>
                    <Select
                      value={ordersConfig.targetDataset}
                      onValueChange={(value) => setOrdersConfig({ ...ordersConfig, targetDataset: value })}
                      disabled={ordersStatus !== 'idle'}
                    >
                      <SelectTrigger id="dataset">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Pedidos Activos</SelectItem>
                        <SelectItem value="archived">Pedidos Archivados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="conflict">Resolución de Conflictos</Label>
                    <Select
                      value={ordersConfig.conflictResolution}
                      onValueChange={(value) => setOrdersConfig({ ...ordersConfig, conflictResolution: value })}
                      disabled={ordersStatus !== 'idle'}
                    >
                      <SelectTrigger id="conflict">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">Omitir Duplicados</SelectItem>
                        <SelectItem value="update">Actualizar Existentes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="update-stock">Actualizar Stock de Productos</Label>
                    <p className="text-sm text-muted-foreground">
                      Modificar el stock actual de productos según los pedidos importados
                    </p>
                  </div>
                  <Switch
                    id="update-stock"
                    checked={ordersConfig.updateStock}
                    onCheckedChange={(checked) => setOrdersConfig({ ...ordersConfig, updateStock: checked })}
                    disabled={ordersStatus !== 'idle'}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="preserve-timestamps">Preservar Timestamps Originales</Label>
                    <p className="text-sm text-muted-foreground">
                      Mantener las fechas originales de los pedidos
                    </p>
                  </div>
                  <Switch
                    id="preserve-timestamps"
                    checked={ordersConfig.preserveTimestamps}
                    onCheckedChange={(checked) => setOrdersConfig({ ...ordersConfig, preserveTimestamps: checked })}
                    disabled={ordersStatus !== 'idle'}
                  />
                </div>
              </div>

              {/* Upload Zone */}
              {ordersStatus === 'idle' && (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleOrdersDrop}
                  className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                  onClick={() => document.getElementById('orders-file-input')?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">
                    Arrastra un archivo JSON aquí o haz clic para seleccionar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Formato: Archivo JSON con array de pedidos
                  </p>
                  <input
                    id="orders-file-input"
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleOrdersFileUpload(file);
                    }}
                  />
                </div>
              )}

              {/* Validating State */}
              {ordersStatus === 'validating' && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">Validando...</p>
                  <p className="text-sm text-muted-foreground">Verificando datos del archivo</p>
                </div>
              )}

              {/* Importing State */}
              {ordersStatus === 'importing' && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">Importando...</p>
                  <p className="text-sm text-muted-foreground">Procesando pedidos</p>
                  <Progress value={50} className="w-64" />
                </div>
              )}

              {/* Completed State */}
              {ordersStatus === 'completed' && ordersResult && (
                <div className="space-y-4">
                  <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      <strong>Importación completada exitosamente</strong>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>• Importados: {ordersResult.importedCount}</p>
                        {ordersResult.updatedCount! > 0 && <p>• Actualizados: {ordersResult.updatedCount}</p>}
                        <p>• Omitidos: {ordersResult.skippedCount}</p>
                        {ordersResult.errorCount! > 0 && <p>• Errores: {ordersResult.errorCount}</p>}
                        {ordersResult.nextOrderId && <p>• Siguiente ID: {ordersResult.nextOrderId}</p>}
                      </div>
                    </AlertDescription>
                  </Alert>
                  <div className="flex justify-center">
                    <Button onClick={handleClearOrders}>
                      <Upload className="mr-2 h-4 w-4" />
                      Nuevo Archivo
                    </Button>
                  </div>
                </div>
              )}

              {/* Error State */}
              {ordersStatus === 'error' && ordersResult && (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Error en la importación</strong>
                      <p className="mt-2">{ordersResult.message}</p>
                      {ordersResult.errorCount! > 0 && (
                        <p className="mt-1 text-sm">Errores encontrados: {ordersResult.errorCount}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" onClick={() => handleImportOrders()}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reintentar
                    </Button>
                    <Button onClick={handleClearOrders}>
                      <Upload className="mr-2 h-4 w-4" />
                      Nuevo Archivo
                    </Button>
                  </div>
                </div>
              )}

              {/* Preview (shown during validation/importing) */}
              {(ordersStatus === 'validating' || ordersStatus === 'importing') && ordersPreview.length > 0 && (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Mostrando primeros 10 registros. Total: {ordersSummary.total} | Válidos: {ordersSummary.valid} | Duplicados: {ordersSummary.duplicates} | Errores: {ordersSummary.errors}
                    </AlertDescription>
                  </Alert>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID Pedido</TableHead>
                          <TableHead>Número</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ordersPreview.map((order, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono">{order.orderId}</TableCell>
                            <TableCell>{order.orderNumber}</TableCell>
                            <TableCell>
                              {new Date(Number(order.timestamp) / 1000000).toLocaleDateString('es-ES')}
                            </TableCell>
                            <TableCell>{order.items.length}</TableCell>
                            <TableCell>€{order.totalAmount.toFixed(2).replace('.', ',')}</TableCell>
                            <TableCell>
                              {order.validationStatus === 'valid' && (
                                <Badge variant="default" className="gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Válido
                                </Badge>
                              )}
                              {order.validationStatus === 'duplicate' && (
                                <Badge variant="secondary" className="gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Duplicado
                                </Badge>
                              )}
                              {order.validationStatus === 'error' && (
                                <Badge variant="destructive" className="gap-1">
                                  <X className="h-3 w-3" />
                                  {order.validationMessage}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedOrderForDetails(order)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {/* Actions */}
              {ordersStatus === 'idle' && (
                <div className="flex items-center justify-between pt-4 border-t gap-4">
                  <Button
                    variant="outline"
                    onClick={handleDownloadOrdersTemplate}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar Plantilla
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Details Modal */}
      <Dialog open={!!selectedOrderForDetails} onOpenChange={() => setSelectedOrderForDetails(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Pedido</DialogTitle>
            <DialogDescription>
              Información completa del pedido {selectedOrderForDetails?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedOrderForDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">ID Pedido</Label>
                  <p className="font-mono">{selectedOrderForDetails.orderId}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Número</Label>
                  <p>{selectedOrderForDetails.orderNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estado</Label>
                  <p className="capitalize">{selectedOrderForDetails.status}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Método de Pago</Label>
                  <p className="capitalize">{selectedOrderForDetails.paymentMethod}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total</Label>
                  <p>€{selectedOrderForDetails.totalAmount.toFixed(2).replace('.', ',')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Descuento</Label>
                  <p>€{selectedOrderForDetails.discountAmount.toFixed(2).replace('.', ',')}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Items ({selectedOrderForDetails.items.length})</Label>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrderForDetails.items.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>€{item.salePrice.toFixed(2).replace('.', ',')}</TableCell>
                          <TableCell>€{item.totalPrice.toFixed(2).replace('.', ',')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {selectedOrderForDetails.taxBreakdown && (
                <div>
                  <Label className="text-muted-foreground">Desglose de IVA</Label>
                  <div className="mt-2 border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>IVA</TableHead>
                          <TableHead>Base Imponible</TableHead>
                          <TableHead>Cuota</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrderForDetails.taxBreakdown.map((tax: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{tax.ivaRate}%</TableCell>
                            <TableCell>€{tax.baseAmount.toFixed(2).replace('.', ',')}</TableCell>
                            <TableCell>€{tax.taxAmount.toFixed(2).replace('.', ',')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
