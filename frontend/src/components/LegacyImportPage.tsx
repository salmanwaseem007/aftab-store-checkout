import { useState } from 'react';
import { Upload, ChevronDown, ChevronUp, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useImportLegacyCategories, useImportLegacyProducts, useGetCategories } from '../hooks/useQueries';
import { useToastStore } from '../stores/useToastStore';
import type { LegacyCategoryImportDTO, LegacyProductImportDTO } from '../backend';

interface CategoryPreview extends LegacyCategoryImportDTO {
  status: 'valid' | 'duplicate' | 'error';
  errorMessage?: string;
}

interface ProductPreview {
  barcode: string;
  name: string;
  description: string;
  category: string;
  stock: number;
  price: number;
  status: 'valid' | 'duplicate' | 'error';
  errorMessage?: string;
  calculatedBasePrice?: number;
  categoryStatus?: 'existing' | 'new';
  categoryIVA?: number;
  categoryMargin?: number;
  createdDate?: number;
  lastUpdatedDate?: number;
}

export default function LegacyImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importación Legacy</h1>
        <p className="text-muted-foreground mt-2">
          Importar categorías y productos desde archivos JSON legacy
        </p>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-6 mt-6">
          <CategoriesImportTab />
        </TabsContent>

        <TabsContent value="products" className="space-y-6 mt-6">
          <ProductsImportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CategoriesImportTab() {
  const [file, setFile] = useState<File | null>(null);
  const [jsonData, setJsonData] = useState<any>(null);
  const [defaultIVA, setDefaultIVA] = useState<string>('21');
  const [defaultProfitMargin, setDefaultProfitMargin] = useState<string>('10');
  const [previews, setPreviews] = useState<CategoryPreview[]>([]);
  const [isFormatOpen, setIsFormatOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const { data: existingCategories = [] } = useGetCategories();
  const importMutation = useImportLegacyCategories();
  const { showSuccess, showError } = useToastStore();

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.json')) {
      showError('Por favor selecciona un archivo JSON válido');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setJsonData(json);
        validateAndPreview(json);
      } catch (error) {
        showError('Error al leer el archivo JSON');
        setFile(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const validateAndPreview = (json: any) => {
    if (!json.categories || !Array.isArray(json.categories)) {
      showError('Formato JSON inválido: se requiere un array "categories"');
      setPreviews([]);
      return;
    }

    const iva = parseInt(defaultIVA);
    const margin = parseInt(defaultProfitMargin);

    const categoryPreviews: CategoryPreview[] = json.categories.map((cat: any) => {
      const preview: CategoryPreview = {
        name: cat.name || '',
        order: BigInt(cat.order || 0),
        defaultIVA: BigInt(iva),
        defaultProfitMargin: BigInt(margin),
        status: 'valid',
      };

      if (!cat.name || cat.name.trim() === '') {
        preview.status = 'error';
        preview.errorMessage = 'Nombre vacío';
      } else {
        const duplicate = existingCategories.find(
          (existing) => existing.name.toLowerCase() === cat.name.toLowerCase()
        );
        if (duplicate) {
          preview.status = 'duplicate';
          preview.errorMessage = 'Ya existe';
        }
      }

      return preview;
    });

    setPreviews(categoryPreviews);
  };

  const handleImport = async () => {
    const validCategories = previews.filter((p) => p.status === 'valid');
    if (validCategories.length === 0) {
      showError('No hay categorías válidas para importar');
      return;
    }

    try {
      const result = await importMutation.mutateAsync(validCategories);
      if (result.successCount > 0) {
        showSuccess(`${result.successCount} categorías importadas exitosamente`);
      }
      if (result.errorCount > 0) {
        showError(`${result.errorCount} categorías fallaron: ${result.errors.join(', ')}`);
      }
      // Reset
      setFile(null);
      setJsonData(null);
      setPreviews([]);
    } catch (error) {
      showError('Error al importar categorías');
    }
  };

  return (
    <div className="space-y-6">
      {/* Format Reference */}
      <Collapsible open={isFormatOpen} onOpenChange={setIsFormatOpen}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                <CardTitle className="text-lg">Formato JSON</CardTitle>
              </div>
              {isFormatOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "categories": [
    {
      "id": 1,          // Ignorado, se genera automáticamente
      "name": "Electrónica",
      "order": 1        // Orden de visualización
    },
    {
      "id": 2,
      "name": "Ropa",
      "order": 2
    }
  ]
}

// Notas:
// - El campo "id" se ignora, se genera automáticamente
// - Los valores de IVA y margen se configuran abajo
// - Los nombres duplicados se omiten`}</pre>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Cargar Archivo JSON</CardTitle>
          <CardDescription>Arrastra y suelta o haz clic para seleccionar</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {file ? file.name : 'Arrastra un archivo JSON aquí'}
              </p>
              <p className="text-xs text-muted-foreground">
                {file ? `Tamaño: ${(file.size / 1024).toFixed(2)} KB` : 'o haz clic para seleccionar'}
              </p>
            </div>
            <input
              type="file"
              accept=".json"
              className="hidden"
              id="category-file-input"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) handleFileSelect(selectedFile);
              }}
            />
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => document.getElementById('category-file-input')?.click()}
            >
              Seleccionar Archivo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      {file && (
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Importación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="default-iva">IVA por Defecto</Label>
                <Select
                  value={defaultIVA}
                  onValueChange={(value) => {
                    setDefaultIVA(value);
                    if (jsonData) validateAndPreview(jsonData);
                  }}
                >
                  <SelectTrigger id="default-iva">
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
                <Label htmlFor="default-margin">Margen de Beneficio por Defecto (%)</Label>
                <Input
                  id="default-margin"
                  type="number"
                  min="1"
                  max="100"
                  value={defaultProfitMargin}
                  onChange={(e) => {
                    setDefaultProfitMargin(e.target.value);
                    if (jsonData) validateAndPreview(jsonData);
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {previews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa (primeras 10 filas)</CardTitle>
            <CardDescription>
              {previews.filter((p) => p.status === 'valid').length} válidas,{' '}
              {previews.filter((p) => p.status === 'duplicate').length} duplicadas,{' '}
              {previews.filter((p) => p.status === 'error').length} errores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead>IVA</TableHead>
                    <TableHead>Margen</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previews.slice(0, 10).map((preview, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{preview.name}</TableCell>
                      <TableCell>{preview.order.toString()}</TableCell>
                      <TableCell>{preview.defaultIVA.toString()}%</TableCell>
                      <TableCell>{preview.defaultProfitMargin.toString()}%</TableCell>
                      <TableCell>
                        {preview.status === 'valid' && (
                          <Badge variant="default">Válida</Badge>
                        )}
                        {preview.status === 'duplicate' && (
                          <Badge variant="secondary">{preview.errorMessage}</Badge>
                        )}
                        {preview.status === 'error' && (
                          <Badge variant="destructive">{preview.errorMessage}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Button */}
      {previews.length > 0 && (
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => {
              setFile(null);
              setJsonData(null);
              setPreviews([]);
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={importMutation.isPending || previews.filter((p) => p.status === 'valid').length === 0}
          >
            {importMutation.isPending ? 'Importando...' : 'Importar Categorías'}
          </Button>
        </div>
      )}
    </div>
  );
}

function ProductsImportTab() {
  const [file, setFile] = useState<File | null>(null);
  const [jsonData, setJsonData] = useState<any>(null);
  const [previews, setPreviews] = useState<ProductPreview[]>([]);
  const [isFormatOpen, setIsFormatOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const { data: existingCategories = [] } = useGetCategories();
  const importMutation = useImportLegacyProducts();
  const { showSuccess, showError } = useToastStore();

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.json')) {
      showError('Por favor selecciona un archivo JSON válido');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setJsonData(json);
        validateAndPreview(json);
      } catch (error) {
        showError('Error al leer el archivo JSON');
        setFile(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const validateAndPreview = (json: any) => {
    if (!json.products || !Array.isArray(json.products)) {
      showError('Formato JSON inválido: se requiere un array "products"');
      setPreviews([]);
      return;
    }

    const productPreviews: ProductPreview[] = json.products.map((prod: any) => {
      const preview: ProductPreview = {
        barcode: prod.barcode || '',
        name: prod.name || '',
        description: prod.description || '',
        category: prod.category || '',
        stock: parseInt(prod.stock || 0),
        price: parseFloat(prod.price || 0),
        status: 'valid',
        createdDate: prod.createdDate,
        lastUpdatedDate: prod.lastUpdatedDate,
      };

      // Validation
      if (!prod.barcode || prod.barcode.trim() === '') {
        preview.status = 'error';
        preview.errorMessage = 'Código de barras vacío';
      } else if (!prod.name || prod.name.trim() === '') {
        preview.status = 'error';
        preview.errorMessage = 'Nombre vacío';
      } else if (!prod.category || prod.category.trim() === '') {
        preview.status = 'error';
        preview.errorMessage = 'Categoría vacía';
      } else if (!prod.price || parseFloat(prod.price) <= 0) {
        preview.status = 'error';
        preview.errorMessage = 'Precio inválido';
      } else {
        // Check if category exists or will be created
        const existingCategory = existingCategories.find(
          (cat) => cat.name.toLowerCase() === prod.category.toLowerCase()
        );
        
        if (existingCategory) {
          preview.categoryStatus = 'existing';
          preview.categoryIVA = Number(existingCategory.defaultIVA);
          preview.categoryMargin = Number(existingCategory.defaultProfitMargin);
        } else {
          preview.categoryStatus = 'new';
          preview.categoryIVA = 21; // Default IVA
          preview.categoryMargin = 10; // Default profit margin
        }

        // Calculate base price from sale price
        const iva = preview.categoryIVA!;
        const margin = preview.categoryMargin!;
        const basePrice = prod.price / (1 + iva / 100) / (1 + margin / 100);
        preview.calculatedBasePrice = basePrice;
      }

      return preview;
    });

    setPreviews(productPreviews);
  };

  const handleImport = async () => {
    const validProducts = previews.filter((p) => p.status === 'valid');
    if (validProducts.length === 0) {
      showError('No hay productos válidos para importar');
      return;
    }

    try {
      // Map to backend DTO format
      const productsToImport: LegacyProductImportDTO[] = validProducts.map((p) => ({
        barcode: p.barcode,
        name: p.name,
        description: p.description,
        categoryName: p.category,
        stock: BigInt(p.stock),
        salePrice: p.price,
      }));

      const result = await importMutation.mutateAsync(productsToImport);
      if (result.successCount > 0) {
        showSuccess(`${result.successCount} productos importados exitosamente`);
      }
      if (result.errorCount > 0) {
        showError(`${result.errorCount} productos fallaron: ${result.errors.join(', ')}`);
      }
      // Reset
      setFile(null);
      setJsonData(null);
      setPreviews([]);
    } catch (error) {
      showError('Error al importar productos');
    }
  };

  return (
    <div className="space-y-6">
      {/* Format Reference */}
      <Collapsible open={isFormatOpen} onOpenChange={setIsFormatOpen}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                <CardTitle className="text-lg">Formato JSON</CardTitle>
              </div>
              {isFormatOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "products": [
    {
      "barcode": "1234567890123",
      "name": "Producto Ejemplo",
      "description": "Descripción del producto",
      "category": "Electrónica",      // Nombre de categoría (texto)
      "stock": 50,
      "price": 99.99,                  // Precio de venta final
      "createdDate": 1234567890,       // Opcional
      "lastUpdatedDate": 1234567890    // Opcional
    }
  ]
}

// Notas importantes:
// - "category" es el NOMBRE de la categoría (texto, no ID)
// - Se busca la categoría por nombre (sin distinguir mayúsculas)
// - Si no existe, se crea automáticamente con:
//   * IVA por defecto: 21%
//   * Margen por defecto: 10%
//   * Orden secuencial
// - "price" es el precio de VENTA final (incluye IVA y margen)
// - El precio base se calcula automáticamente:
//   Precio Base = Precio Venta / (1 + IVA/100) / (1 + Margen/100)
// - Los códigos de barras duplicados se omiten`}</pre>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Cargar Archivo JSON</CardTitle>
          <CardDescription>Arrastra y suelta o haz clic para seleccionar</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {file ? file.name : 'Arrastra un archivo JSON aquí'}
              </p>
              <p className="text-xs text-muted-foreground">
                {file ? `Tamaño: ${(file.size / 1024).toFixed(2)} KB` : 'o haz clic para seleccionar'}
              </p>
            </div>
            <input
              type="file"
              accept=".json"
              className="hidden"
              id="product-file-input"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) handleFileSelect(selectedFile);
              }}
            />
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => document.getElementById('product-file-input')?.click()}
            >
              Seleccionar Archivo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {previews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa (primeras 10 filas)</CardTitle>
            <CardDescription>
              {previews.filter((p) => p.status === 'valid').length} válidos,{' '}
              {previews.filter((p) => p.status === 'error').length} errores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Precios</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previews.slice(0, 10).map((preview, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{preview.barcode}</TableCell>
                      <TableCell className="font-medium">{preview.name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{preview.category}</div>
                          {preview.categoryStatus && (
                            <Badge variant={preview.categoryStatus === 'existing' ? 'default' : 'secondary'} className="text-xs">
                              {preview.categoryStatus === 'existing' ? 'Categoría existente' : 'Nueva categoría a crear'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{preview.stock}</TableCell>
                      <TableCell>
                        {preview.calculatedBasePrice ? (
                          <div className="space-y-1 text-sm">
                            <div className="text-muted-foreground">
                              Venta: <span className="font-medium text-foreground">€{preview.price.toFixed(2)}</span>
                            </div>
                            <div className="text-muted-foreground">
                              Base: <span className="font-medium text-foreground">€{preview.calculatedBasePrice.toFixed(2)}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              (IVA {preview.categoryIVA}% + Margen {preview.categoryMargin}%)
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {preview.status === 'valid' && (
                          <Badge variant="default">Válido</Badge>
                        )}
                        {preview.status === 'error' && (
                          <Badge variant="destructive">{preview.errorMessage}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Button */}
      {previews.length > 0 && (
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => {
              setFile(null);
              setJsonData(null);
              setPreviews([]);
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={importMutation.isPending || previews.filter((p) => p.status === 'valid').length === 0}
          >
            {importMutation.isPending ? 'Importando...' : 'Importar Productos'}
          </Button>
        </div>
      )}
    </div>
  );
}
