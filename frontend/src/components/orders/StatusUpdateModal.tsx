import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface StatusUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnId: bigint | null;
  onUpdate: (returnId: bigint, status: 'processed' | 'rejected', notes: string) => Promise<void>;
}

export default function StatusUpdateModal({ open, onOpenChange, returnId, onUpdate }: StatusUpdateModalProps) {
  const [statusUpdateNotes, setStatusUpdateNotes] = useState('');
  const [newStatus, setNewStatus] = useState<'processed' | 'rejected'>('processed');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (!returnId) return;

    setIsUpdating(true);
    try {
      await onUpdate(returnId, newStatus, statusUpdateNotes);
      resetForm();
    } finally {
      setIsUpdating(false);
    }
  };

  const resetForm = () => {
    setStatusUpdateNotes('');
    setNewStatus('processed');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Actualizar Estado de Devolución</DialogTitle>
          <DialogDescription>
            Cambia el estado de la devolución y añade notas si es necesario
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-status">Nuevo Estado *</Label>
            <Select value={newStatus} onValueChange={(value) => setNewStatus(value as 'processed' | 'rejected')}>
              <SelectTrigger id="new-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="processed">Procesada</SelectItem>
                <SelectItem value="rejected">Rechazada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-notes">Notas del Administrador</Label>
            <Textarea
              id="status-notes"
              value={statusUpdateNotes}
              onChange={(e) => setStatusUpdateNotes(e.target.value)}
              placeholder="Añade notas sobre el cambio de estado..."
              rows={4}
            />
          </div>

          {newStatus === 'processed' && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Al procesar la devolución, el stock de los productos será restaurado automáticamente.
              </p>
            </div>
          )}

          {newStatus === 'rejected' && (
            <div className="p-3 bg-destructive/10 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Al rechazar la devolución, no se restaurará el stock de los productos.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUpdating ? 'Actualizando...' : 'Actualizar Estado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

