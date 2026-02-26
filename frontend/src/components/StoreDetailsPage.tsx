import { useState, useEffect } from 'react';
import { Store, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetStoreDetails, useUpdateStoreDetails } from '../hooks/useQueries';
import { useToastStore } from '../stores/useToastStore';
import type { StoreDetails } from '../backend';

export default function StoreDetailsPage() {
  const { data: storeDetails, isLoading, error } = useGetStoreDetails();
  const updateMutation = useUpdateStoreDetails();
  const { showSuccess, showError, showInfo } = useToastStore();

  const [formData, setFormData] = useState<StoreDetails>({
    storeName: '',
    address: '',
    phone: '',
    whatsapp: '',
    taxId: undefined,
    email: undefined,
    website: undefined,
    lastUpdated: BigInt(0),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [isDefaultData, setIsDefaultData] = useState(false);

  useEffect(() => {
    if (storeDetails) {
      setFormData(storeDetails);
      
      // Check if this is default data
      if (
        storeDetails.storeName === 'AFTAB STORE' &&
        storeDetails.address === 'C. Albertillas, 5, LOCAL, 29003 Málaga' &&
        storeDetails.phone === '952233833' &&
        storeDetails.whatsapp === '695250655'
      ) {
        setIsDefaultData(true);
        showInfo('Valores por defecto configurados automáticamente');
      }
    }
  }, [storeDetails]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.storeName.trim()) {
      newErrors.storeName = 'El nombre de la tienda es obligatorio';
    } else if (formData.storeName.length > 50) {
      newErrors.storeName = 'El nombre no puede exceder 50 caracteres';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'La dirección es obligatoria';
    } else if (formData.address.length > 100) {
      newErrors.address = 'La dirección no puede exceder 100 caracteres';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es obligatorio';
    } else if (!/^\d{9,15}$/.test(formData.phone)) {
      newErrors.phone = 'El teléfono debe contener entre 9 y 15 dígitos';
    }

    if (!formData.whatsapp.trim()) {
      newErrors.whatsapp = 'El WhatsApp es obligatorio';
    } else if (!/^\d{9,15}$/.test(formData.whatsapp)) {
      newErrors.whatsapp = 'El WhatsApp debe contener entre 9 y 15 dígitos';
    }

    if (formData.taxId && formData.taxId.length > 20) {
      newErrors.taxId = 'El NIF/CIF no puede exceder 20 caracteres';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'El sitio web debe comenzar con http:// o https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof StoreDetails, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value || undefined,
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showError('Por favor, corrija los errores en el formulario');
      return;
    }

    try {
      await updateMutation.mutateAsync(formData);
      showSuccess('Datos de la tienda actualizados correctamente');
      setIsDefaultData(false);
    } catch (error) {
      console.error('Error updating store details:', error);
      showError('Error al actualizar los datos de la tienda');
    }
  };

  const handleRestore = () => {
    if (storeDetails) {
      setFormData(storeDetails);
      setErrors({});
      showInfo('Valores restaurados');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Store className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Datos de la Tienda</h1>
        </div>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Store className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Datos de la Tienda</h1>
        </div>
        <p className="text-destructive">Error al cargar los datos de la tienda</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Store className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Datos de la Tienda</h1>
      </div>

      <p className="text-muted-foreground">
        Esta información aparecerá en todos los recibos térmicos impresos.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Información de la Tienda</CardTitle>
          <CardDescription>
            Complete los datos que aparecerán en los recibos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Store Name */}
          <div className="space-y-2">
            <Label htmlFor="storeName">
              Nombre de la Tienda <span className="text-destructive">*</span>
            </Label>
            <Input
              id="storeName"
              value={formData.storeName}
              onChange={(e) => handleInputChange('storeName', e.target.value)}
              maxLength={50}
              placeholder="Ej: AFTAB STORE"
              className={errors.storeName ? 'border-destructive' : ''}
            />
            {errors.storeName && (
              <p className="text-sm text-destructive">{errors.storeName}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">
              Dirección <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              maxLength={100}
              rows={3}
              placeholder="Ej: C. Albertillas, 5, LOCAL, 29003 Málaga"
              className={errors.address ? 'border-destructive' : ''}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">
              Teléfono <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, ''))}
              maxLength={15}
              placeholder="952233833"
              className={errors.phone ? 'border-destructive' : ''}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
          </div>

          {/* WhatsApp */}
          <div className="space-y-2">
            <Label htmlFor="whatsapp">
              WhatsApp <span className="text-destructive">*</span>
            </Label>
            <Input
              id="whatsapp"
              value={formData.whatsapp}
              onChange={(e) => handleInputChange('whatsapp', e.target.value.replace(/\D/g, ''))}
              maxLength={15}
              placeholder="695250655"
              className={errors.whatsapp ? 'border-destructive' : ''}
            />
            {errors.whatsapp && (
              <p className="text-sm text-destructive">{errors.whatsapp}</p>
            )}
          </div>

          {/* Tax ID */}
          <div className="space-y-2">
            <Label htmlFor="taxId">NIF/CIF (Opcional)</Label>
            <Input
              id="taxId"
              value={formData.taxId || ''}
              onChange={(e) => handleInputChange('taxId', e.target.value)}
              maxLength={20}
              placeholder="Ej: B12345678"
              className={errors.taxId ? 'border-destructive' : ''}
            />
            {errors.taxId && (
              <p className="text-sm text-destructive">{errors.taxId}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email (Opcional)</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="info@aftabstore.com"
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Sitio Web (Opcional)</Label>
            <Input
              id="website"
              type="url"
              value={formData.website || ''}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://www.aftabstore.com"
              className={errors.website ? 'border-destructive' : ''}
            />
            {errors.website && (
              <p className="text-sm text-destructive">{errors.website}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Receipt Preview */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setShowPreview(!showPreview)}
        >
          <div className="flex items-center justify-between">
            <CardTitle>Vista Previa del Recibo</CardTitle>
            {showPreview ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </CardHeader>
        {showPreview && (
          <CardContent>
            <div className="bg-white text-black p-6 rounded-lg border-2 border-dashed border-gray-300 font-mono text-sm">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold">{formData.storeName.toUpperCase()}</h2>
                <p className="text-xs font-bold">{formData.address.toUpperCase()}</p>
                <p className="text-xs font-bold">TEL {formData.phone}</p>
                <p className="text-xs font-bold">WHATSAPP {formData.whatsapp}</p>
                {formData.taxId && (
                  <p className="text-xs font-bold">NIF/CIF: {formData.taxId.toUpperCase()}</p>
                )}
                {formData.email && (
                  <p className="text-xs font-bold">{formData.email.toUpperCase()}</p>
                )}
                {formData.website && (
                  <p className="text-xs font-bold">{formData.website.toUpperCase()}</p>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg">
        <div className="mx-auto max-w-[1200px] flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleRestore}
            disabled={updateMutation.isPending}
          >
            Restaurar Valores Originales
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      {/* Spacer for fixed buttons */}
      <div className="h-20" />
    </div>
  );
}
