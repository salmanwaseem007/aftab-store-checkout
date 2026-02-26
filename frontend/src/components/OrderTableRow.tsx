import { Printer, RotateCcw, FileX, X, Loader2, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToastStore } from '../stores/useToastStore';
import { formatPrice } from '../lib/calculateSalePriceUtil';
import { formatOrderDate, getPaymentMethodLabel, getOrderStatusVariant, getOrderStatusLabel } from '../utils/orderFormatters';
import type { Order, OrderItem } from '../backend';

interface OrderTableRowProps {
  order: Order;
  expandedOrderIds: Set<string>;
  toggleOrderExpansion: (orderId: string) => void;
  printingOrderNumber: string | null;
  onPrint: (order: Order) => void;
  onFullReturn: (order: Order) => void;
  onPartialReturn: (order: Order) => void;
  onCancelOrder: (order: Order) => void;
  isMobile?: boolean;
}

export default function OrderTableRow({
  order,
  expandedOrderIds,
  toggleOrderExpansion,
  printingOrderNumber,
  onPrint,
  onFullReturn,
  onPartialReturn,
  onCancelOrder,
  isMobile = false,
}: OrderTableRowProps) {
  const { showSuccess } = useToastStore();

  const renderProductNames = (items: OrderItem[], orderId: string) => {
    if (items.length === 0) return null;

    const firstItem = items[0];
    const firstProductName = firstItem.productName;
    const firstBarcode = firstItem.productBarcode;
    const firstQuantity = Number(firstItem.quantity);

    const isExpanded = expandedOrderIds.has(orderId);
    const hasMultipleItems = items.length > 1;

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <span className="text-sm truncate max-w-[200px]">
            {firstProductName}
            {firstQuantity > 1 && ` (${firstQuantity})`}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(firstBarcode);
                  showSuccess('Código de barras copiado');
                }}
                aria-label="Copiar código de barras"
              >
                <Clipboard className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copiar código de barras</TooltipContent>
          </Tooltip>
          {hasMultipleItems && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
              onClick={(e) => {
                e.stopPropagation();
                toggleOrderExpansion(orderId);
              }}
            >
              {isExpanded ? 'ocultar' : 'ver todos'}
            </Button>
          )}
        </div>
        {isExpanded && hasMultipleItems && (
          <div className="flex flex-col gap-1 pl-2 border-l-2 border-muted">
            {items.slice(1).map((item, index) => {
              const productName = item.productName;
              const barcode = item.productBarcode;
              const quantity = Number(item.quantity);

              return (
                <div key={index} className="flex items-center gap-1">
                  <span className="text-sm truncate max-w-[200px]">
                    {productName}
                    {quantity > 1 && ` (${quantity})`}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(barcode);
                          showSuccess('Código de barras copiado');
                        }}
                        aria-label="Copiar código de barras"
                      >
                        <Clipboard className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copiar código de barras</TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (isMobile) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-mono font-medium">{order.orderNumber}</div>
              <div className="text-sm text-muted-foreground">{formatOrderDate(order.timestamp)}</div>
            </div>
            <Badge variant={getOrderStatusVariant(order.status)}>
              {getOrderStatusLabel(order.status)}
            </Badge>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Productos:</span>
              <div className="mt-1">{renderProductNames(order.items, order.orderId)}</div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Método de Pago:</span>
              <Badge variant="outline">{getPaymentMethodLabel(order.paymentMethod)}</Badge>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-semibold">Total:</span>
              <span className="font-mono font-semibold text-lg">
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPrint(order)}
              disabled={printingOrderNumber === order.orderNumber}
              className="flex-1"
            >
              {printingOrderNumber === order.orderNumber ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Printer className="h-4 w-4 mr-2" />
              )}
              Imprimir
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFullReturn(order)}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Devolver
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="px-4 py-3 font-mono font-medium">{order.orderNumber}</td>
      <td className="px-4 py-3 text-sm">{formatOrderDate(order.timestamp)}</td>
      <td className="px-4 py-3">{renderProductNames(order.items, order.orderId)}</td>
      <td className="px-4 py-3 text-center">
        <Badge variant={getOrderStatusVariant(order.status)}>
          {getOrderStatusLabel(order.status)}
        </Badge>
      </td>
      <td className="px-4 py-3 text-center">
        <Badge variant="outline">{getPaymentMethodLabel(order.paymentMethod)}</Badge>
      </td>
      <td className="px-4 py-3 text-right font-mono font-semibold">
        {formatPrice(order.totalAmount)}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onPrint(order)}
                disabled={printingOrderNumber === order.orderNumber}
              >
                {printingOrderNumber === order.orderNumber ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Imprimir recibo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onFullReturn(order)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Devolución completa</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onPartialReturn(order)}
              >
                <FileX className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Devolución parcial</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCancelOrder(order)}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cancelar pedido</TooltipContent>
          </Tooltip>
        </div>
      </td>
    </tr>
  );
}

