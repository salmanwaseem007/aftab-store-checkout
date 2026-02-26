import { Check, Printer, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToastStore } from '../stores/useToastStore';
import { formatPrice } from '../lib/calculateSalePriceUtil';
import { formatOrderDate, getReasonLabel, getTypeLabel, getStatusLabel, getReturnStatusVariant, isReturnPending } from '../utils/orderFormatters';
import type { ReturnOrder } from '../backend';

interface ReturnTableRowProps {
  returnOrder: ReturnOrder;
  onUpdateStatus: (returnId: bigint) => void;
  onViewReceipt: (returnId: bigint) => void;
  isMobile?: boolean;
}

export default function ReturnTableRow({
  returnOrder,
  onUpdateStatus,
  onViewReceipt,
  isMobile = false,
}: ReturnTableRowProps) {
  const { showSuccess } = useToastStore();

  if (isMobile) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-mono font-medium">{returnOrder.returnNumber}</div>
              <div className="text-sm text-muted-foreground">
                Pedido: {returnOrder.originalOrderNumber}
              </div>
              <div className="text-sm text-muted-foreground">{formatOrderDate(returnOrder.createdDate)}</div>
            </div>
            <Badge variant={getReturnStatusVariant(returnOrder.status)}>
              {getStatusLabel(returnOrder.status)}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Tipo:</span>
              <Badge variant="outline">{getTypeLabel(returnOrder.returnType)}</Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Motivo:</span>
              <Badge variant="outline">{getReasonLabel(returnOrder.reason)}</Badge>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-semibold">Reembolso:</span>
              <span className="font-mono font-semibold text-lg">
                {formatPrice(returnOrder.refundAmount)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {isReturnPending(returnOrder.status) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateStatus(returnOrder.returnId)}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            )}
            {returnOrder.status === 'processed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewReceipt(returnOrder.returnId)}
                className="flex-1"
              >
                <Printer className="h-4 w-4 mr-2" />
                Ver Recibo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="px-4 py-3 font-mono font-medium">{returnOrder.returnNumber}</td>
      <td className="px-4 py-3 font-mono">{returnOrder.originalOrderNumber}</td>
      <td className="px-4 py-3 text-sm">{formatOrderDate(returnOrder.createdDate)}</td>
      <td className="px-4 py-3">
        <Badge variant="outline">{getTypeLabel(returnOrder.returnType)}</Badge>
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline">{getReasonLabel(returnOrder.reason)}</Badge>
      </td>
      <td className="px-4 py-3 text-center">
        <Badge variant={getReturnStatusVariant(returnOrder.status)}>
          {getStatusLabel(returnOrder.status)}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right font-mono font-semibold">
        {formatPrice(returnOrder.refundAmount)}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {isReturnPending(returnOrder.status) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onUpdateStatus(returnOrder.returnId)}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Actualizar estado</TooltipContent>
            </Tooltip>
          )}
          {returnOrder.status === 'processed' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewReceipt(returnOrder.returnId)}
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver recibo</TooltipContent>
            </Tooltip>
          )}
        </div>
      </td>
    </tr>
  );
}
