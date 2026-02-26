import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useCreateReturn } from '../../hooks/useQueries';
import { useToastStore } from '../../stores/useToastStore';
import { formatPrice } from '../../lib/calculateSalePriceUtil';
import type { Order, ReturnItem, ReturnOrderDTO, Variant_full_cancellation_partial, Variant_other_defective_incorrect_change_of_mind } from '../../backend';

interface PartialReturnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrder: Order | null;
  onSuccess: () => void;
}

export default function PartialReturnModal({ open, onOpenChange, selectedOrder, onSuccess }: PartialReturnModalProps) {
  const createReturn = useCreateReturn();
  const { showSuccess, showError } = useToastStore();

  const [returnReason, setReturnReason] = useState<string>('defective');
  const [otherReason, setOtherReason] = useState('');
  const [returnAdminNotes, setReturnAdminNotes] = useState('');
  const [partialReturnQuantities, setPartialReturnQuantities] = useState<Record<string, number>>({});

  const partialReturnTotal = useMemo(() => {
    if (!selectedOrder) return 0;
    let total = 0;
    selectedOrder.items.forEach((item) => {
      const qty = partialReturnQuantities[item.productBarcode] || 0;
      total += item.salePrice * qty;
    });
    return total;
  }, [selectedOrder, partialReturnQuantities]);

  const handleCreatePartialReturn = async () => {
    if (!selectedOrder) return;

    const returnItems: ReturnItem[] = [];
    let totalRefund = 0;

    selectedOrder.items.forEach((item) => {
      const returnedQty = partialReturnQuantities[item.productBarcode] || 0;
      if (returnedQty > 0) {
        const refund = item.salePrice * returnedQty;
        returnItems.push({
          productBarcode: item.productBarcode,
          productName: item.productName,
          categoryName: item.categoryName,
          returnedQuantity: BigInt(returnedQty),
          originalQuantity: item.quantity,
          refundPerUnit: item.salePrice,
          totalRefund: refund,
          stockRestored: false,
        });
        totalRefund += refund;
      }
    });

    if (returnItems.length === 0) {
      showError('Selecciona al menos un producto para devolver');
      return;
    }

    try {
      const returnData: ReturnOrderDTO = {
        originalOrderId: selectedOrder.orderId,
        originalOrderNumber: selectedOrder.orderNumber,
        returnType: 'partial' as Variant_full_cancellation_partial,
        reason: returnReason as Variant_other_defective_incorrect_change_of_mind,
        otherReason: returnReason === 'other' ? otherReason : undefined,
        refundAmount: totalRefund,
        adminNotes: returnAdminNotes,
        items: returnItems,
      };

      const result = await createReturn.mutateAsync(returnData);

      if (result.success) {
        showSuccess('Devolución parcial creada exitosamente');
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
    setPartialReturnQuantities({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Devolución Parcial</DialogTitle>
          <DialogDescription>
            Selecciona los productos y cantidades a devolver del pedido {selectedOrder?.orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Cantidad Original</TableHead>
                  <TableHead className="text-center">Cantidad a Devolver</TableHead>
                  <TableHead className="text-right">Precio Unitario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedOrder?.items.map((item) => (
                  <TableRow key={item.productBarcode}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell className="text-center">{Number(item.quantity)}</TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min="0"
                        max={Number(item.quantity)}
                        value={partialReturnQuantities[item.productBarcode] || 0}
                        onChange={(e) => {
                          const qty = parseInt(e.target.value);
                          if (!isNaN(qty) && qty >= 0 && qty <= Number(item.quantity)) {
                            setPartialReturnQuantities({
                              ...partialReturnQuantities,
                              [item.productBarcode]: qty,
                            });
                          }
                        }}
                        className="w-20 text-center mx-auto"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPrice(item.salePrice)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total a Reembolsar:</span>
              <span className="font-mono font-semibold text-lg">
                {formatPrice(partialReturnTotal)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="partial-return-reason">Motivo de Devolución *</Label>
            <Select value={returnReason} onValueChange={setReturnReason}>
              <SelectTrigger id="partial-return-reason">
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
              <Label htmlFor="partial-other-reason">Especificar Motivo *</Label>
              <Input
                id="partial-other-reason"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Describe el motivo de la devolución"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="partial-admin-notes">Notas del Administrador</Label>
            <Textarea
              id="partial-admin-notes"
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
          <Button onClick={handleCreatePartialReturn} disabled={createReturn.isPending}>
            {createReturn.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {createReturn.isPending ? 'Procesando...' : 'Crear Devolución'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

