import type { Variant_valid_invalid, Variant_pending_rejected_processed } from '../backend';

export function formatOrderDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1000000);
  const day = date.getDate();
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

export function getPaymentMethodLabel(method: any): string {
  if (!method) return '—';
  if (typeof method === 'string') {
    switch (method.toLowerCase()) {
      case 'cash': return 'Efectivo';
      case 'card': return 'Tarjeta';
      case 'transfer': return 'Transferencia';
      default: return '—';
    }
  }
  if (typeof method === 'object') {
    if ('cash' in method) return 'Efectivo';
    if ('card' in method) return 'Tarjeta';
    if ('transfer' in method) return 'Transferencia';
  }
  return '—';
}

export function getOrderStatusVariant(status: Variant_valid_invalid): 'default' | 'destructive' {
  return status === 'valid' ? 'default' : 'destructive';
}

export function getOrderStatusLabel(status: Variant_valid_invalid): string {
  return status === 'valid' ? 'Válido' : 'Inválido';
}

export function getReturnStatusVariant(status: Variant_pending_rejected_processed): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case 'pending':
      return 'secondary';
    case 'processed':
      return 'default';
    case 'rejected':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export function getStatusLabel(status: Variant_pending_rejected_processed): string {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'processed':
      return 'Procesada';
    case 'rejected':
      return 'Rechazada';
    default:
      return 'Desconocido';
  }
}

export function isReturnPending(status: Variant_pending_rejected_processed): boolean {
  return status === 'pending';
}

export function getReasonLabel(reason: any): string {
  switch (reason) {
    case 'defective':
      return 'Producto Defectuoso';
    case 'incorrect':
      return 'Producto Incorrecto';
    case 'change_of_mind':
      return 'Cambio de Opinión';
    case 'other':
      return 'Otro';
    default:
      return 'Desconocido';
  }
}

export function getTypeLabel(type: any): string {
  switch (type) {
    case 'full':
      return 'Completa';
    case 'partial':
      return 'Parcial';
    case 'cancellation':
      return 'Cancelación';
    default:
      return 'Desconocido';
  }
}
