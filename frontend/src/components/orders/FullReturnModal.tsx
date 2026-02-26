import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useCreateReturn } from '../../hooks/useQueries';
import { useToastStore } from '../../stores/useToastStore';
import { formatPrice } from '../../lib/calculateSalePriceUtil';
import type { Order, ReturnItem, ReturnOrderDTO, Variant_full_cancellation_partial, Variant_other_defective_incorrect_change_of_mind } from '../../backend';

interface FullReturnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrder: Order | null;
  onSuccess: () => void;
}

export default function FullReturnModal({ open, onOpenChange, selectedOrder, onSuccess }: FullReturnModalProps) {
  const createReturn = useCreateReturn();
  const { showSuccess, showError } = useToastStore();

  const [returnReason, setReturnReason] = useState<string>('defective');
  const [otherReason, setOtherReason] = useState('');
  const [returnAdminNotes, setReturnAdminNotes] = useState('');

  const handleCreateFullReturn = async () => {
    if (!selectedOrder) return;

    try {
      const returnItems: ReturnItem[] = selectedOrder.items.map((item) => ({
        productBarcode: item.productBarcode,
        productName: item.productName,
        categoryName: item.categoryName,
        returnedQuantity: item.quantity,
        originalQuantity: item.quantity,
        refundPerUnit: item.salePrice,
        totalRefund: item.totalPrice,
        stockRestored: false,
      }));

      const returnData: ReturnOrderDTO = {
        originalOrderId: selectedOrder.orderId,
        originalOrderNumber: selectedOrder.orderNumber,
        returnType: 'full' as Variant_full_cancellation_partial,
        reason: returnReason as Variant_other_defective_incorrect_change_of_mind,
        otherReason: returnReason === 'other' ? otherReason : undefined,
        refundAmount: selectedOrder.totalAmount,
        adminNotes: returnAdminNotes,
        items: returnItems,
      };

      const result = await createReturn.mutateAsync(returnData);

      if (result.success) {
        showSuccess('Devolución completa creada exitosamente');
        onSuccess();
        resetForm();
      } else {
        showError(result.warnings[0] || 'Error al crear la devolución');
      }
    } catch (error) {
      showError('Error al crear la devolución');
      console.error(error);
    }
  };

  const resetForm = () => {
    setReturnReason('defective');
    setOtherReason('');
    setReturnAdminNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Devolución Completa</DialogTitle>
          <DialogDescription>
            Procesar devolución completa del pedido {selectedOrder?.orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Pedido:</span>
              <span className="font-mono font-medium">{selectedOrder?.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total a Reembolsar:</span>
              <span className="font-mono font-semibold text-lg">
                {selectedOrder ? formatPrice(selectedOrder.totalAmount) : '€0,00'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="return-reason">Motivo de Devolución *</Label>
            <Select value={returnReason} onValueChange={setReturnReason}>
              <SelectTrigger id="return-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="defective">Producto Defectuoso</SelectItem>
                <SelectItem value="incorrect">Producto Incorrecto</SelectItem>
                <SelectItem value="change_of_mind">Cambio de Opinión</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {returnReason === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="other-reason">Especificar Motivo *</Label>
              <Input
                id="other-reason"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Describe el motivo de la devolución"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="admin-notes">Notas del Administrador</Label>
            <Textarea
              id="admin-notes"
              value={returnAdminNotes}
              onChange={(e) => setReturnAdminNotes(e.target.value)}
              placeholder="Notas internas sobre la devolución..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreateFullReturn} disabled={createReturn.isPending}>
            {createReturn.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {createReturn.isPending ? 'Procesando...' : 'Crear Devolución'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

