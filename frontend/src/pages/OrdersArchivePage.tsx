import { usePageCleanup } from '../hooks/usePageCleanup';
import OrdersArchivePageContent from '../components/OrdersArchivePage';

export default function OrdersArchivePage() {
  // Use comprehensive cleanup hook
  usePageCleanup(['archived-orders']);

  return <OrdersArchivePageContent />;
}
